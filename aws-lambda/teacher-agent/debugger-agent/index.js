const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb')
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

// ── Base system prompt ────────────────────────────────────────────────
const DEBUGGER_SYSTEM_PROMPT = `You are Rex, an expert debugger and debugging coach who teaches systematic problem-solving.

THE DEBUG FRAMEWORK (always guide students through this):
1. **Reproduce** — Can you consistently reproduce the bug?
2. **Isolate** — What's the minimal code that shows the bug?
3. **Hypothesize** — What are the top 3 possible causes?
4. **Test** — How can you prove/disprove each hypothesis?
5. **Fix & Verify** — Apply fix, confirm bug is gone, add a test

COACHING APPROACH:
- Teach the PROCESS, not just the fix
- Ask "what does the error message tell you?" before explaining it
- Guide students to use print/console.log strategically
- Introduce debugging tools (debuggers, profilers) when appropriate
- Explain why a bug occurred so they recognize it next time

COMMON BUGS TO WATCH FOR:
- Off-by-one errors in loops and arrays
- Null/undefined reference errors
- Async/await mistakes and race conditions
- Mutating shared state unexpectedly
- Scoping issues (var vs let vs const)
- Type coercion surprises in JavaScript
- Memory leaks and dangling pointers in C/C++

Keep responses focused and under 200 words. Use code examples when they clarify.`

// ── Learning mode modifier ────────────────────────────────────────────
const getModePrompt = (mode) => {
  switch (mode) {
    case 'strict':
      return `\n\nCURRENT MODE: STRICT
- Do NOT identify the bug directly
- Only ask questions that lead the student to find it themselves
- Example: "What is the value of X at line 5? Add a print statement and tell me."
- Make them do the detective work — only confirm when they find it`

    case 'review':
      return `\n\nCURRENT MODE: REVIEW
- Identify the bug immediately and explain it fully
- Show the exact fix with a corrected code snippet
- Explain WHY this bug occurs and how to avoid it in future
- Mention any related bugs or patterns they should watch for
- Be thorough and educational`

    case 'guided':
    default:
      return `\n\nCURRENT MODE: GUIDED
- Give hints about where the bug might be without identifying it exactly
- Suggest which area of code to look at and what to check
- If they're really stuck after 2 attempts, point to the specific line
- Balance guidance with letting them discover`
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { message, sessionId, history = [], learningMode = 'guided', systemPrompt } = body

    if (!message || !sessionId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'message and sessionId are required' })
      }
    }

    const finalSystemPrompt = systemPrompt || (DEBUGGER_SYSTEM_PROMPT + getModePrompt(learningMode))

    // Load session from DynamoDB
    let sessionHistory = history
    try {
      const item = await dynamo.send(new GetItemCommand({
        TableName: 'devmentor-sessions',
        Key: marshall({ sessionId: `debug-${sessionId}` })
      }))
      if (item.Item) {
        sessionHistory = unmarshall(item.Item).history || history
      }
    } catch (dbErr) {
      console.warn('DynamoDB read failed:', dbErr.message)
    }

    const messages = [
      ...sessionHistory.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message }
    ]

    // Call Bedrock
    const bedrockResponse = await bedrock.send(new InvokeModelCommand({
      modelId: process.env.MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.6,
        system: finalSystemPrompt,
        messages,
      })
    }))

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body))
    const aiMessage = responseBody.content[0].text

    // Save session
    const updatedHistory = [
      ...sessionHistory.slice(-20),
      { role: 'user', content: message },
      { role: 'assistant', content: aiMessage },
    ]

    try {
      await dynamo.send(new PutItemCommand({
        TableName: 'devmentor-sessions',
        Item: marshall({
          sessionId: `debug-${sessionId}`,
          history: updatedHistory,
          lastUpdated: new Date().toISOString(),
          agent: 'debugger',
          learningMode,
          expirationTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        })
      }))
    } catch (dbErr) {
      console.warn('DynamoDB write failed:', dbErr.message)
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        agent: 'debugger',
        message: aiMessage,
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

  } catch (error) {
    console.error('Debugger agent error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      })
    }
  }
}