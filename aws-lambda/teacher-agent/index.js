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
const TEACHER_SYSTEM_PROMPT = `You are Sage, a patient and enthusiastic programming teacher who uses the Socratic method.

CORE RULES:
1. NEVER give direct answers on first ask — always respond with guiding questions first
2. Use analogies from everyday life to explain programming concepts
3. Celebrate small wins ("Great thinking!" "You're on the right track!")
4. Keep responses under 150 words unless explaining a complex concept
5. Ask one focused question at a time, don't overwhelm the student
6. When a student is clearly stuck after 2+ attempts, provide a small hint (not the full answer)
7. Use encouraging language — learning to code is hard, be supportive

TEACHING STYLE:
- Lead with curiosity: "What do you think would happen if...?"
- Build on what they know: "You mentioned X — how does that relate to Y?"
- Scaffold understanding: start simple, add complexity gradually
- Make it concrete: use real examples and mental models`

// ── Learning mode modifier ────────────────────────────────────────────
const getModePrompt = (mode) => {
  switch (mode) {
    case 'strict':
      return `\n\nCURRENT MODE: STRICT
- Under NO circumstances give direct answers
- Only respond with guiding questions
- If student asks for the answer directly, redirect with: "What do you think the answer might be?"
- Force the student to think through every step themselves`

    case 'review':
      return `\n\nCURRENT MODE: REVIEW
- Give full, detailed explanations immediately
- Show the complete optimized solution with comments
- Explain WHY each part works the way it does
- Include alternative approaches and trade-offs
- This is a learning review — be thorough and educational`

    case 'guided':
    default:
      return `\n\nCURRENT MODE: GUIDED
- You may give hints and partial suggestions
- If student is stuck, offer a small nudge in the right direction
- Still encourage thinking but don't leave them completely lost
- Balance between Socratic questioning and direct help`
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
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

    // Support custom system prompts (used by Zara examiner)
    const finalSystemPrompt = systemPrompt || (TEACHER_SYSTEM_PROMPT + getModePrompt(learningMode))

    // Load session history from DynamoDB
    let sessionHistory = history
    try {
      const item = await dynamo.send(new GetItemCommand({
        TableName: 'devmentor-sessions',
        Key: marshall({ sessionId })
      }))
      if (item.Item) {
        const session = unmarshall(item.Item)
        sessionHistory = session.history || history
      }
    } catch (dbErr) {
      console.warn('DynamoDB read failed, using provided history:', dbErr.message)
    }

    // Build messages array for Claude
    const messages = [
      ...sessionHistory.slice(-20).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message }
    ]

    // Call AWS Bedrock — Claude Sonnet 4
    const bedrockResponse = await bedrock.send(new InvokeModelCommand({
      modelId: process.env.MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.7,
        system: finalSystemPrompt,
        messages,
      })
    }))

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body))
    const aiMessage = responseBody.content[0].text

    // Save updated session to DynamoDB with 7-day TTL
    const updatedHistory = [
      ...sessionHistory.slice(-30),
      { role: 'user', content: message },
      { role: 'assistant', content: aiMessage },
    ]

    try {
      await dynamo.send(new PutItemCommand({
        TableName: 'devmentor-sessions',
        Item: marshall({
          sessionId,
          history: updatedHistory,
          lastUpdated: new Date().toISOString(),
          agent: 'teacher',
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
        agent: 'teacher',
        message: aiMessage,
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

  } catch (error) {
    console.error('Teacher agent error:', error)
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