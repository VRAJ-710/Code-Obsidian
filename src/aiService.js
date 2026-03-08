// ── Code Obsidian AI Service ──────────────────────────────────────────────
// Centralized AI service
// We have switched to Groq (Llama 3.3 70B) because Google Gemini's free tier
// is disabled in many regions (returning instant 429 Quota Exhausted errors).
import axios from 'axios'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Send a message to Groq AI and get a response
 *
 * @param {string} systemPrompt - The system instruction
 * @param {Array} messages - Array of { role: 'user'|'assistant', content: string }
 * @returns {Promise<string>} The AI response text
 */
export async function callAI(systemPrompt, messages) {
    if (!GROQ_API_KEY) {
        throw new Error('VITE_GROQ_KEY not set in .env — get a free key at https://console.groq.com/keys')
    }

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1500,
                top_p: 0.95,
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000,
            }
        )

        const text = response.data?.choices?.[0]?.message?.content
        if (!text) throw new Error('Empty response from Groq')
        return text

    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error('Invalid Groq API Key. Please check your .env file.')
        }
        if (err.response?.status === 429) {
            throw new Error('Groq API Rate Limit Reached. Please wait a moment and try again.')
        }
        throw new Error(`AI Error: ${err.message}`)
    }
}
