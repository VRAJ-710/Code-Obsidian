import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { config } from '../config'
import { processInteraction } from '../skillEngine'
import { callAI } from '../aiService'
import { dbService } from '../dbService'
import { Brain, Search, Bug, User, Sparkles, Lock, Lightbulb, BookOpen, Shield } from 'lucide-react'

const AGENT_CONFIG = {
  teacher: {
    name: 'Sage',
    emoji: <Brain className="w-5 h-5 text-current" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    placeholder: "Ask Sage anything — she'll guide you with questions...",
    endpoint: config.endpoints.chat,
    greeting: "Hi! I'm Sage! I use the Socratic method — I won't just give you answers, I'll ask the right questions so you discover them yourself. What are you working on today?",
    systemPrompt: `You are Sage, a patient and enthusiastic programming teacher who uses the Socratic method.

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
- Make it concrete: use real examples and mental models
- Use code examples with comments to illustrate points
- When showing code, use markdown code blocks with the language specified`,
  },
  reviewer: {
    name: 'Aria',
    emoji: <Search className="w-5 h-5 text-current" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    placeholder: "Paste your code or describe what you'd like reviewed...",
    endpoint: config.endpoints.review,
    greeting: "Hey! I'm Aria! Share your code and I'll give you detailed feedback on style, performance, and potential bugs.",
    systemPrompt: `You are Aria, an expert code reviewer at Code Obsidian. You have deep experience with software engineering best practices.

CORE RULES:
1. Always analyze code for: correctness, performance, readability, edge cases, and security
2. Use a structured format for reviews: ✅ What's good, 🔴 Critical issues, 🟡 Warnings, 🔵 Suggestions
3. Explain WHY something is a problem, not just WHAT is wrong
4. Suggest specific fixes with code examples
5. Keep feedback actionable and constructive
6. Rate code quality on aspects like time complexity, space complexity, and maintainability
7. If no code is shared, ask for it politely and explain what you can help review

REVIEW STYLE:
- Be thorough but encouraging — point out strengths alongside weaknesses
- Reference real-world best practices (SOLID, DRY, KISS)
- Suggest industry-standard patterns when applicable
- Use markdown code blocks for code examples
- Provide alternative implementations when there's a clearly better approach`,
  },
  debugger: {
    name: 'Rex',
    emoji: <Bug className="w-5 h-5 text-current" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    placeholder: 'Describe your bug or paste the error message...',
    endpoint: config.endpoints.debug,
    greeting: "Howdy! I'm Rex! Let's squash some bugs. Describe what's happening vs what you expect, and paste any error messages.",
    systemPrompt: `You are Rex, an expert debugging assistant at Code Obsidian. You're methodical, thorough, and great at finding root causes.

CORE RULES:
1. Always use a systematic debugging approach: reproduce → isolate → identify → fix → verify
2. Ask clarifying questions about: error messages, expected vs actual behavior, when it started
3. Read error messages carefully and explain what they mean in plain language
4. Suggest adding strategic console.log/print statements to narrow down the issue
5. Explain the root cause, not just the fix
6. Help prevent similar bugs in the future with best practices
7. If given code, trace through it step by step to find the bug

DEBUGGING STYLE:
- Be like a detective — methodical and curious
- Use the "rubber duck" technique: walk through code line by line
- Common patterns to check: off-by-one errors, null references, scope issues, async timing
- Show the fix with clear before/after code examples using markdown code blocks
- Explain common debugging tools and techniques the student can use independently
- When the bug is found, celebrate it: "Found the culprit! 🎯"`,
  },
  cybersage: {
    name: 'Cyber Sage',
    emoji: <Shield className="w-5 h-5 text-current" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    placeholder: "Ask Cyber Sage for a hint...",
    endpoint: config.endpoints.chat,
    greeting: "Initializing Cyber Sage Protocol... I am your mentor for this lab. I won't give you the flag, but I'll help you find the path. What's your first move?",
    systemPrompt: `You are Cyber Sage, an elite cybersecurity mentor at Code Obsidian. You specialize in penetration testing, ethical hacking, and system defense.

CORE RULES:
1. NEVER give direct answers, flags, or full exploit commands — always respond with Socratic questions.
2. If a user asks for the answer, ask them what they've observed about the target so far.
3. Monitor for common mistakes (e.g., weak nmap flags, lot of enumeration) and suggest better techniques via hints.
4. Explain the "Why" behind vulnerabilities (e.g., Root Cause Analysis).
5. Use professional cybersecurity terminology but explain it if the user seems confused.
6. When a user successfully exploits something, explain the fix immediately.
7. Be encouraging but maintain a "hacker collective" professional tone.

TEACHING STYLE:
- "What happens if you modify the input in this login field?"
- "Does this input appear to be validated by the server?"
- "What kind of vulnerability might exist in this request?"
- "What services usually run on the ports you just discovered?"
- Lead them to the 'Aha!' moment through investigation and reasoning.`,
  }
}

// Build system prompt with learning mode modifier
const getSystemPrompt = (agentId, learningMode) => {
  const base = AGENT_CONFIG[agentId]?.systemPrompt || ''
  const modeModifiers = {
    strict: `\n\nCURRENT MODE: STRICT\n- Under NO circumstances give direct answers\n- Only respond with guiding questions\n- If student asks for the answer directly, redirect with: "What do you think the answer might be?"\n- Force the student to think through every step themselves`,
    record: `\n\nCURRENT MODE: RECORD\n- Focus on observing and documenting the user's attack path\n- provide minimal hints only if the user is completely stuck`,
    review: `\n\nCURRENT MODE: REVIEW\n- Give full, detailed explanations immediately\n- Show the complete optimized solution with comments\n- Explain WHY each part works the way it does\n- Include alternative approaches and trade-offs\n- This is a learning review — be thorough and educational`,
    guided: `\n\nCURRENT MODE: GUIDED\n- You may give hints and partial suggestions\n- If student is stuck, offer a small nudge in the right direction\n- Still encourage thinking but don't leave them completely lost\n- Balance between Socratic questioning and direct help`,
  }
  return base + (modeModifiers[learningMode] || modeModifiers.guided)
}

// Rich fallback responses — varied by message hash so never repeats
const FALLBACK_POOL = {
  teacher: {
    guided: [
      "Interesting question! Before I answer — what's your intuition here? Sometimes your first instinct is closer to right than you think. Walk me through your reasoning.",
      "Good thinking! Let me flip this back to you: what would happen if you traced through this code step by step with a simple input, like the number 3?",
      "I love that you're asking about this! Here's a hint — think about what the computer needs to 'remember' as it runs through your code. What data needs to persist?",
      "Let's think about this differently. If you were explaining this concept to a friend who's never coded, what analogy would you use? That often unlocks the answer.",
      "You're on the right track! Now — what's the simplest possible case where this would work? Start there, then build up to the complex case.",
    ],
    strict: [
      "I won't just tell you — but I will ask: what does the error message actually say? Error messages are your best friend, not your enemy.",
      "What have you tried so far? Before we go further, I need to know where your thinking currently is.",
      "Interesting! What do you think the output would be if you ran this with input = 0? Work through it mentally first.",
      "I want you to figure this out. What's the ONE thing you're most unsure about right now? Name it specifically.",
    ],
    review: [
      "Great question! Here's the full breakdown:\n\nThe concept works through **decomposition** — breaking big problems into smaller ones. First identify your base case (the simplest version that needs no further breakdown). Then handle the general case by assuming the smaller version already works.\n\nKey insight: trust the recursion. Don't try to trace every level mentally — just verify the base case and the recursive step are correct.",
      "Let me give you the complete picture:\n\n**Core concept**: Every loop can be rewritten as recursion, and vice versa. The choice depends on readability and the natural shape of the problem.\n\n**When to use each**:\n- Loop: simple repetition, performance-critical code\n- Recursion: tree structures, divide-and-conquer, naturally self-similar problems\n\nHere's a concrete example comparing both approaches for summing an array...",
    ],
  },
  reviewer: {
    guided: [
      "Looking at this code, I can see a few things to improve. Before I point them out — can you spot anything that might cause issues if the input is empty or null?",
      "Good structure overall! I want you to look at your loop conditions carefully. What happens at the boundary — when the index equals the array length?",
      "Your logic is mostly sound. Think about naming — would someone reading this in 6 months understand what each variable does without reading the whole function?",
      "I see a potential performance issue here. What's the time complexity of your current approach? Is there a data structure that could make this faster?",
    ],
    strict: [
      "I see issues but I want you to find them. Add a console.log before and after your main operation. What do the values look like?",
      "Read your code out loud as if explaining it to someone. Where does it stop making sense?",
    ],
    review: [
      "Full code review:\n\n**✅ What's good**: Clean structure, readable variable names in most places.\n\n**🔴 Critical**: Missing null check — if input is undefined this crashes.\n**🟡 Warning**: O(n²) nested loop — use a Map for O(n).\n**🔵 Suggestion**: Extract the inner logic into a named helper function.\n\n**Key takeaway**: Always validate inputs at function entry. This single habit prevents 40% of production bugs.",
      "Here's my complete analysis:\n\n**Correctness** ✅: Logic is sound for the happy path.\n**Edge cases** ⚠️: Empty array, negative numbers, and non-integer inputs aren't handled.\n**Performance**: Current O(n log n) is fine for small data but consider if this runs on large datasets.\n**Readability**: Great! Code reads like prose.\n\n**One improvement** that would level this up significantly: add input validation and document the expected types.",
    ],
  },
  debugger: {
    guided: [
      "Let's debug this systematically!\n\nStep 1: Can you reproduce it every time, or is it intermittent?\nStep 2: What's the EXACT error message — copy it in full.\nStep 3: What line does it point to?\n\nThese three questions solve 80% of bugs.",
      "Classic! This looks like it might be a scope issue. Add a print statement right before the line that crashes and print every variable you're using. What do you see?",
      "Before we dive in — when did this start? Did it ever work, or has it always been broken? That question narrows the search space enormously.",
      "The error is telling you something specific. Read it literally — what object or variable is it complaining about? Find where that gets created/modified.",
    ],
    strict: [
      "I can see the bug area. Rather than telling you — add a console.log/print on line 1, then midway, then at the crash. Which one stops appearing?",
      "Use the scientific method: form a hypothesis about what's wrong, then write a test that would prove/disprove it. What's your hypothesis?",
    ],
    review: [
      "Found it! The bug is a classic **off-by-one error**. Your loop runs `i <= arr.length` but arrays are 0-indexed, so the last valid index is `arr.length - 1`. Change to `i < arr.length`.\n\n**Why this happens**: Most humans think in 1-indexed terms (1st, 2nd, 3rd) but computers use 0-indexed. Until it becomes muscle memory, always ask: 'is my boundary inclusive or exclusive?'\n\n**Prevention**: Use higher-order functions like `.forEach()`, `.map()`, `.filter()` — they handle bounds automatically.",
      "Root cause identified: **null reference error**. The variable is undefined when you try to access its property.\n\n**Fix**: Add a guard clause at the top of your function:\n```\nif (!input) return null; // or throw an error\n```\n\n**Deeper fix**: Use TypeScript or add JSDoc types so your editor catches this before runtime.\n\n**Rule of thumb**: Every function that receives an object should validate it exists before using it.",
    ],
  },
  cybersage: {
    guided: [
      "Interesting observation! What does the service version tell you about potential vulnerabilities? Have you searched for documented exploits for this version?",
      "Good discovery! Before you proceed with an exploit, what's your plan for persistence if you gain access?",
      "I see what you're trying. Think about the input field — if you were the developer, how would you have sanitized this to prevent what you're doing now?",
      "Reconnaissance is key. You've found an open port, but have you enumerated the specific service running on it yet?",
    ]
  }
}

// Pick a varied response based on message content hash
const getVariedFallback = (agentId, mode, userMessage) => {
  const pool = FALLBACK_POOL[agentId]?.[mode] || FALLBACK_POOL[agentId]?.guided || []
  if (pool.length === 0) return "Let me think about that... (Demo mode — connect your API for full AI responses)"
  // Hash the user message to pick different response each time
  const hash = userMessage.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return pool[hash % pool.length]
}

// ── Typing indicator ──────────────────────────────────────────────────
function TypingIndicator({ agent }) {
  const agentConf = AGENT_CONFIG[agent]
  if (!agentConf) return null;
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${agentConf.bg}`}>
        {agentConf.emoji}
      </div>
      <div className={`${agentConf.bg} ${agentConf.border} border rounded-2xl rounded-tl-sm px-4 py-3`}>
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────
function Message({ msg, agent }) {
  const agentConf = AGENT_CONFIG[agent]
  const isUser = msg.role === 'user'
  if (!agentConf && !isUser) return null;

  const renderContent = (content) => {
    if (!content.includes('```')) {
      return <p className="whitespace-pre-wrap">{content}</p>
    }
    return content.split(/(```[\s\S]*?```)/g).map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```\w*\n?/, '').replace(/```$/, '')
        return (
          <pre key={i} className="bg-black/50 rounded-lg p-3 mt-2 mb-2 overflow-x-auto text-green-300 text-xs font-mono leading-relaxed">
            {code}
          </pre>
        )
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${isUser ? 'bg-primary/20 text-primary' : agentConf.bg}`}>
        {isUser ? <User className="w-4 h-4 text-current" /> : agentConf.emoji}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
        ? 'bg-primary/20 border border-primary/30 text-white rounded-tr-sm'
        : `${agentConf.bg} border ${agentConf.border} text-white/90 rounded-tl-sm`
        }`}>
        {renderContent(msg.content)}
        {msg.skillsUpdated?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1"
          >
            {msg.skillsUpdated.map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {s}
              </span>
            ))}
          </motion.div>
        )}
        <div className={`text-xs mt-1.5 ${isUser ? 'text-primary/40 text-right' : 'text-white/25'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function AgentChat({
  agentId,
  sessionId,
  learningMode = 'guided',
  onSkillUpdate,
  initialMessage = null,  // for Learning Tracks pre-loading
  currentSkills = {},
  currentUser,
  isCyberSage = false,
  inline = false,
}) {
  const effectiveAgentId = isCyberSage ? 'cybersage' : agentId;
  const agentConf = AGENT_CONFIG[effectiveAgentId]
  const [messages, setMessages] = useState([
    { role: 'assistant', content: agentConf?.greeting || 'Hello!', timestamp: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const historyRef = useRef([]) // persistent history across renders

  // Reset on agent change
  useEffect(() => {
    const conf = AGENT_CONFIG[effectiveAgentId]
    if (!conf) return
    const greeting = { role: 'assistant', content: conf.greeting, timestamp: Date.now() }

    // Fetch History if logged in
    if (currentUser) {
      dbService.getChatHistory(currentUser, effectiveAgentId).then(hist => {
        if (hist && hist.length > 0) {
          setMessages(hist);
          historyRef.current = hist;
        } else {
          setMessages([greeting]);
          historyRef.current = [];
        }
      });
    } else {
      setMessages([greeting]);
      historyRef.current = [];
    }

    setInput('')
    inputRef.current?.focus()
  }, [agentId, currentUser, effectiveAgentId])

  // Auto-send initial message (from Learning Tracks)
  useEffect(() => {
    if (initialMessage) {
      setTimeout(() => sendMessage(initialMessage), 500)
    }
  }, [initialMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (overrideText = null) => {
    const text = (overrideText || input).trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Add user message to history
    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    try {
      const aiText = await callAI(
        getSystemPrompt(effectiveAgentId, learningMode),
        historyRef.current.slice(-20).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }))
      )

      // Update history ref with assistant response
      historyRef.current = [...historyRef.current, { role: 'assistant', content: aiText }]

      // Run ML skill analysis
      let skillsUpdated = []
      if (onSkillUpdate && currentSkills) {
        const updatedSkills = processInteraction({
          userMessage: text,
          agentResponse: aiText,
          currentSkills,
        })
        const changed = Object.keys(updatedSkills).filter(
          k => updatedSkills[k].mastery !== currentSkills[k]?.mastery
        )
        skillsUpdated = changed
        if (changed.length > 0) onSkillUpdate(updatedSkills)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiText,
        timestamp: Date.now(),
        skillsUpdated,
      }])

      if (currentUser) {
        dbService.saveChatMessage(currentUser, effectiveAgentId, { role: 'user', content: text, timestamp: userMsg.timestamp });
        dbService.saveChatMessage(currentUser, effectiveAgentId, { role: 'assistant', content: aiText, timestamp: Date.now() });
      }

    } catch (err) {
      console.error('AI Error:', err.message)

      if (err.message && err.message.includes('Quota Exhausted')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **API Rate Limit Reached**\n\n${err.message}`,
          timestamp: Date.now()
        }])
        return
      }

      const fallbackText = getVariedFallback(effectiveAgentId, learningMode, text)

      // Simulate skill update
      let skillsUpdated = []
      if (onSkillUpdate && currentSkills) {
        const updatedSkills = processInteraction({
          userMessage: text,
          agentResponse: fallbackText,
          currentSkills,
        })
        const changed = Object.keys(updatedSkills).filter(
          k => updatedSkills[k].mastery !== currentSkills[k]?.mastery
        )
        skillsUpdated = changed
        if (changed.length > 0) onSkillUpdate(updatedSkills)
      }

      historyRef.current = [...historyRef.current, { role: 'assistant', content: fallbackText }]

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `[Demo Mode]\n\n${fallbackText}`,
        timestamp: Date.now(),
        skillsUpdated: skillsUpdated.length > 0 ? skillsUpdated.join(', ') : undefined
      }])

      if (currentUser) {
        dbService.saveChatMessage(currentUser, effectiveAgentId, { role: 'user', content: text, timestamp: userMsg.timestamp });
        dbService.saveChatMessage(currentUser, effectiveAgentId, { role: 'assistant', content: `[Demo Mode]\n\n${fallbackText}`, timestamp: Date.now() });
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!agentConf) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      {!inline && (
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 ${agentConf.bg} flex-shrink-0`}>
          <div className="flex items-center justify-center">{agentConf.emoji}</div>
          <div>
            <div className={`font-semibold text-sm ${agentConf.color}`}>{agentConf.name}</div>
            <div className="text-xs text-white/40">
              {effectiveAgentId === 'cybersage' ? 'Cybersecurity Mentor' : effectiveAgentId === 'teacher' ? 'Teaching Agent' : effectiveAgentId === 'reviewer' ? 'Code Review Agent' : 'Debugging Agent'}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 flex items-center gap-1.5 rounded-full border font-semibold ${learningMode === 'strict' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              learningMode === 'guided' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-green-500/20 text-green-400 border-green-500/30'
              }`}>
              {learningMode === 'strict' ? <Lock className="w-3 h-3" /> : learningMode === 'guided' ? <Lightbulb className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />} {learningMode}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} agent={effectiveAgentId} />
          ))}
          {loading && <TypingIndicator agent={effectiveAgentId} />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agentConf.placeholder}
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 self-end rounded-xl bg-orange-500 disabled:opacity-40 flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              : <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            }
          </motion.button>
        </div>
        <p className="text-xs text-white/20 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
