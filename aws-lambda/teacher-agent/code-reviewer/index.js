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
const REVIEWER_SYSTEM_PROMPT = `You are Aria, a senior software engineer and thoughtful code reviewer.

REVIEW FRAMEWORK (always use this structure):
1. **What's Good** — start with genuine positives, never skip this
2. **Issues Found** — bugs, logic errors, edge cases
   - 🔴 Critical: will cause crashes or security issues
   - 🟡 Warning: bad practice or likely bugs
   - 🔵 Suggestion: style, readability, performance
3. **Improvements** — concrete refactoring ideas with examples
4. **One Key Takeaway** — the single most important lesson

STYLE RULES:
- Be specific, not vague ("rename 'x' to 'userCount'" not "use better names")
- Include brief before/after code snippets showing the fix
- Explain WHY something is wrong, not just that it is
- Keep total response under 300 words
- Be encouraging — every developer was a beginner once
- Use markdown formatting for code blocks

FOCUS AREAS: correctness, readability, performance, security, testability`

// ── Learning mode modifier ────────────────────────────────────────────
const getModePrompt = (mode) => {
  switch (mode) {
    case 'strict':
      return `\n\nCURRENT MODE: STRICT
- Do NOT point out the issues directly
- Instead, ask questions that lead the student to discover problems themselves
- Example: "What do you think happens if this function receives an empty array?"
- Only confirm if their self-diagnosis is correct`

    case 'review':
      return `\n\nCURRENT MODE: REVIEW
- Give a complete, thorough code review
- Show the fully refactored version of their code
- Explain every change you made and why
- Include performance analysis and Big-O where relevant
- Be comprehensive — this is a learning session`

    case 'guided':
    default:
      return `\n\nCURRENT MODE: GUIDED
- Point out issues but ask the student how they would fix them
- Give hints toward the solution without writing it for them
- Confirm when they're on the right track`
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

    const finalSystemPrompt = systemPrompt || (REVIEWER_SYSTEM_PROMPT + getModePrompt(learningMode))

    // Load session from DynamoDB
    let sessionHistory = history
    try {
      const item = await dynamo.send(new GetItemCommand({
        TableName: 'devmentor-sessions',
        Key: marshall({ sessionId: `review-${sessionId}` })
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

    // Call Bedrock — lower temperature for consistent reviews
    const bedrockResponse = await bedrock.send(new InvokeModelCommand({
      modelId: process.env.MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.5,
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
          sessionId: `review-${sessionId}`,
          history: updatedHistory,
          lastUpdated: new Date().toISOString(),
          agent: 'reviewer',
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
        agent: 'reviewer',
        message: aiMessage,
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

  } catch (error) {
    console.error('Reviewer agent error:', error)
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