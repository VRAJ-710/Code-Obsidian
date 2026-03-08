import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { config } from '../config'
import { callAI } from '../aiService'
import { Zap, User, Star, ThumbsUp, Activity, BookOpen, Sparkles, CalendarDays, MessageSquare, Trophy, Target, RefreshCw, PlusCircle, Clock, HelpCircle, FileText, CheckCircle2 } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────
const EXAM_DURATIONS = [5, 10, 15, 20, 30] // minutes

const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  { id: 'intermediate', label: 'Intermediate', color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  { id: 'advanced', label: 'Advanced', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
]

const POPULAR_TOPICS = [
  'Arrays & Strings', 'Linked Lists', 'Recursion', 'OOP Design',
  'REST API Design', 'Database Schema', 'Sorting Algorithms',
  'Dynamic Programming', 'Tree Traversal', 'System Design',
  'Async/Await', 'Memory Management', 'Design Patterns', 'SQL Queries',
]

// ── Score ring component ─────────────────────────────────────────────
function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (score / 100) * circ }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize="16" fontWeight="bold">{score}</text>
    </svg>
  )
}

// ── Timer component ──────────────────────────────────────────────────
function Timer({ seconds, totalSeconds, onExpire }) {
  useEffect(() => {
    if (seconds <= 0) { onExpire(); return }
  }, [seconds])

  const pct = (seconds / totalSeconds) * 100
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const color = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10">
        <svg className="absolute inset-0" width="40" height="40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <motion.circle
            cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={2 * Math.PI * 16}
            strokeDashoffset={2 * Math.PI * 16 * (1 - pct / 100)}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
            transition={{ duration: 0.5 }}
          />
        </svg>
      </div>
      <span className="font-mono font-bold text-lg" style={{ color }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  )
}

// ── Zara message bubble ──────────────────────────────────────────────
function ZaraMessage({ msg, onScoreUpdate }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isUser ? 'bg-primary/20' : 'bg-purple-500/20'}`}>
        {isUser ? <User className="w-5 h-5 text-primary" /> : <Zap className="w-5 h-5 text-purple-400" />}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
        ? 'bg-primary/15 border border-primary/25 text-white rounded-tr-sm'
        : 'bg-purple-500/10 border border-purple-500/25 text-white/90 rounded-tl-sm'
        }`}>
        {/* Render code blocks */}
        {msg.content.includes('```')
          ? msg.content.split(/(```[\s\S]*?```)/g).map((part, i) =>
            part.startsWith('```')
              ? <pre key={i} className="code-block bg-black/50 rounded-lg p-3 mt-2 mb-2 overflow-x-auto text-green-300 text-xs">{part.replace(/```\w*\n?/, '').replace(/```$/, '')}</pre>
              : <span key={i} className="whitespace-pre-wrap">{part}</span>
          )
          : <p className="whitespace-pre-wrap">{msg.content}</p>
        }

        {/* Score badge if present */}
        {msg.score !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3"
          >
            <ScoreRing score={msg.score} size={56} />
            <div>
              <div className="text-xs font-bold text-white/60">Your Score</div>
              <div className={`text-sm font-bold flex items-center gap-1.5 ${msg.score >= 80 ? 'text-green-400' : msg.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {msg.score >= 80 ? <><Star className="w-4 h-4" /> Excellent!</> : msg.score >= 60 ? <><ThumbsUp className="w-4 h-4" /> Good effort!</> : msg.score >= 40 ? <><Activity className="w-4 h-4" /> Keep practicing!</> : <><BookOpen className="w-4 h-4" /> Review needed</>}
              </div>
              {msg.skillUpdated && (
                <div className="text-xs text-purple-400 mt-0.5 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Skill graph updated: {msg.skillUpdated}</div>
              )}
            </div>
          </motion.div>
        )}

        <div className={`text-xs mt-2 ${isUser ? 'text-primary/40 text-right' : 'text-white/25'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Typing indicator ─────────────────────────────────────────────────
function ZaraTyping() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-base flex-shrink-0"><Zap className="w-5 h-5 text-purple-400" /></div>
      <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => <div key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-purple-400" />)}
        </div>
      </div>
    </div>
  )
}

// ── Setup screen ─────────────────────────────────────────────────────
function ExamSetup({ onStart, mode, isPeriodicTest }) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [duration, setDuration] = useState(10)
  const [questionCount, setQuestionCount] = useState(5)

  const handleStart = () => {
    if (!topic.trim()) return
    onStart({ topic: topic.trim(), difficulty, duration, questionCount })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      {/* Zara avatar */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-purple-500/30"
      >
        <Zap className="w-12 h-12 text-white" />
      </motion.div>

      <h2 className="text-3xl font-display font-black mb-2">
        {isPeriodicTest ? 'Periodic Assessment' : <>Meet <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Zara</span></>}
      </h2>
      <p className="text-white/50 text-sm mb-8 max-w-sm leading-relaxed">
        {isPeriodicTest
          ? "It's time for an assessment. Choose a topic to evaluate your progress and update your skill profile."
          : "I'll challenge you with real-world problems based on your chosen topic. No multiple choice — prove you can actually apply what you know."}
      </p>

      <div className="w-full max-w-md space-y-5 text-left">

        {/* Topic input */}
        <div>
          <label className="text-xs font-semibold text-white/50 mb-2 block">What topic should I test you on?</label>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="e.g. Recursion, REST API Design, OOP..."
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {/* Popular topics */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {POPULAR_TOPICS.slice(0, 8).map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${topic === t ? 'border-purple-500/60 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/35 hover:border-white/30 hover:text-white/60'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-xs font-semibold text-white/50 mb-2 block">Difficulty Level</label>
          <div className="flex gap-2">
            {DIFFICULTY_LEVELS.map(d => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${difficulty === d.id ? `${d.bg} ${d.border} ${d.color}` : 'border-white/10 text-white/35 hover:bg-white/5'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode-specific settings */}
        {mode === 'exam' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time Limit</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                {EXAM_DURATIONS.map(d => <option key={d} value={d} className="bg-gray-900">{d} minutes</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5"><HelpCircle className="w-3 h-3" /> Questions</label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                {[3, 5, 7, 10].map(n => <option key={n} value={n} className="bg-gray-900">{n} questions</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 15px 40px rgba(168,85,247,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={!topic.trim()}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
        >
          {isPeriodicTest ? <><CalendarDays className="w-5 h-5" /> Start {duration}-min Assessment</> : (mode === 'exam' ? <><Zap className="w-5 h-5" /> Start {duration}-min Exam</> : <><MessageSquare className="w-5 h-5" /> Start Challenge Chat</>)}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Exam summary screen ──────────────────────────────────────────────
function ExamSummary({ scores, topic, onRestart, onNewTopic }) {
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F'
  const gradeColor = avg >= 80 ? 'text-green-400' : avg >= 60 ? 'text-yellow-400' : 'text-red-400'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      <div className="mb-4 flex items-center justify-center">{avg >= 80 ? <Trophy className="w-12 h-12 text-yellow-400" /> : avg >= 60 ? <Target className="w-12 h-12 text-orange-400" /> : <BookOpen className="w-12 h-12 text-blue-400" />}</div>
      <h2 className="text-3xl font-display font-black mb-1">Exam Complete!</h2>
      <p className="text-white/40 text-sm mb-8">Topic: <span className="text-purple-400 font-semibold">{topic}</span></p>

      <div className="flex items-center gap-8 mb-8">
        <ScoreRing score={avg} size={100} />
        <div className="text-left">
          <div className={`text-6xl font-display font-black ${gradeColor}`}>{grade}</div>
          <div className="text-white/50 text-sm">Final Grade</div>
          <div className="text-white/30 text-xs mt-1">{scores.length} questions answered</div>
        </div>
      </div>

      {/* Per-question breakdown */}
      {scores.length > 0 && (
        <div className="w-full max-w-sm mb-8">
          <div className="text-xs text-white/40 mb-3 text-left">Question Breakdown</div>
          <div className="space-y-2">
            {scores.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-6">Q{i + 1}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s}%` }}
                    transition={{ delay: i * 0.1, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: s >= 80 ? '#22c55e' : s >= 60 ? '#eab308' : '#ef4444' }}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: s >= 80 ? '#22c55e' : s >= 60 ? '#eab308' : '#ef4444' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Same Topic
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onNewTopic}
          className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold text-sm transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> New Topic
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Main Zara component ──────────────────────────────────────────────
export default function ZaraExaminer({ onSkillUpdate, isPeriodicTest }) {
  const [mode, setMode] = useState(isPeriodicTest ? 'exam' : 'chat') // 'chat' | 'exam'
  const [phase, setPhase] = useState('setup') // 'setup' | 'active' | 'summary'
  const [examConfig, setExamConfig] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [scores, setScores] = useState([])
  const [questionCount, setQuestionCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [examEnded, setExamEnded] = useState(false)
  const bottomRef = useRef(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Timer countdown for exam mode
  useEffect(() => {
    if (phase === 'active' && mode === 'exam' && timeLeft > 0 && !examEnded) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleTimeExpired()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase, mode, examEnded])

  const handleTimeExpired = () => {
    setExamEnded(true)
    recordExamStats(scores)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `⏰ Time's up! The exam has ended.\n\nYou answered ${scores.length} question(s). Let me calculate your final results...`,
      timestamp: Date.now(),
    }])
    setTimeout(() => setPhase('summary'), 1500)
  }

  // Build Zara's system prompt
  const buildSystemPrompt = (cfg) => {
    const modeInstructions = cfg.mode === 'exam'
      ? `You are running a TIMED EXAM with ${cfg.questionCount} questions. Track question number carefully. After each answer, score it 0-100 and move to the next question. After ${cfg.questionCount} questions, summarize performance.`
      : `You are in CHALLENGE CHAT mode. Ask real-world problems one at a time. After each answer, give detailed feedback, score it, then ask if they want to go deeper or try a new problem.`

    return `You are Zara ⚡, an elite technical examiner and challenge creator for Code Obsidian.

YOUR MISSION: Test students with REAL-WORLD problems, not textbook definitions.

TOPIC: ${cfg.topic}
DIFFICULTY: ${cfg.difficulty}
MODE: ${modeInstructions}

REAL-WORLD PROBLEM FORMAT (always use this):
🌍 **Real-World Scenario** — Set the context (company, system, situation)
❓ **The Challenge** — What needs to be solved
💡 **Constraints** — Any limitations or requirements
📝 **Expected** — What kind of answer you're looking for (code, explanation, design)

EXAMPLES OF REAL-WORLD PROBLEMS:
- "You're a backend engineer at Uber. Design a function that calculates surge pricing based on supply/demand ratios..."
- "Netflix's recommendation system is returning duplicates. Given this array of movie IDs, write code to remove duplicates while preserving order..."
- "A startup's login system is crashing with 'maximum call stack exceeded'. Here's the recursive auth function — find and fix the bug..."

AFTER EACH ANSWER:
1. Give a score 0-100 in this EXACT format: [SCORE:XX] where XX is the number
2. Identify which skill this tests in this EXACT format: [SKILL:SkillName] — use one of: Variables, Data Types, Conditionals, Loops, Functions, Recursion, Arrays, Pointers, OOP, Time Complexity
3. Give 2-3 sentences of specific, actionable feedback
4. In chat mode: ask a follow-up question to go deeper OR offer a new problem
5. In exam mode: immediately present the next question

PERSONALITY:
- Direct and professional but encouraging
- Use real company names and scenarios (Google, Amazon, Stripe, Airbnb)
- Be specific — generic problems are boring
- Celebrate genuine insight: "That's exactly how engineers at Google approach this!"
- Never accept vague answers — push for specifics

Start by greeting the student warmly and immediately presenting the first real-world problem.`
  }

  const startSession = async (cfg) => {
    const fullConfig = { ...cfg, mode }
    setExamConfig(fullConfig)
    setMessages([])
    setScores([])
    setQuestionCount(0)
    setExamEnded(false)

    if (mode === 'exam') {
      const secs = cfg.duration * 60
      setTimeLeft(secs)
      setTotalTime(secs)
    }

    setPhase('active')
    setLoading(true)

    try {
      const aiText = await callAI(
        buildSystemPrompt(fullConfig),
        [{ role: 'user', content: `START_SESSION: Topic="${cfg.topic}", Difficulty="${cfg.difficulty}", Mode="${mode}"${mode === 'exam' ? `, Questions=${cfg.questionCount}` : ''}` }]
      )

      setMessages([{ role: 'assistant', content: aiText, timestamp: Date.now() }])
    } catch (err) {
      if (err.message && err.message.includes('Quota Exhausted')) {
        setMessages([{ role: 'assistant', content: `❌ **API Rate Limit Reached**\n\n${err.message}`, timestamp: Date.now() }])
      } else {
        setMessages([{ role: 'assistant', content: getDefaultOpener(cfg), timestamp: Date.now() }])
      }
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const getDefaultOpener = (cfg) => {
    return `⚡ Challenge accepted! Let's test your **${cfg.topic}** skills at ${cfg.difficulty} level.\n\n🌍 **Real-World Scenario**\nYou've just joined the engineering team at a fast-growing startup. On your first day, your tech lead drops a production bug in your lap:\n\n❓ **The Challenge**\nThe system is experiencing performance issues. Given an array of ${cfg.topic === 'Arrays & Strings' ? 'user IDs with duplicates' : 'data'}, write a solution that handles this efficiently.\n\n💡 **Constraints**\n- Must work in O(n) time complexity\n- Cannot use built-in library shortcuts\n- Must handle edge cases (empty input, single element)\n\n📝 **Expected**: Explain your approach first, then write the code.\n\nShow me what you've got! 🚀`
  }

  const sendAnswer = async () => {
    const text = input.trim()
    if (!text || loading || examEnded) return

    const userMsg = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const newQCount = questionCount + 1
    setQuestionCount(newQCount)

    try {
      const aiText = await callAI(
        buildSystemPrompt({ ...examConfig, mode }),
        [
          ...messages.slice(-20).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: text }
        ]
      )

      // Parse score from response [SCORE:XX]
      const scoreMatch = aiText.match(/\[SCORE:(\d+)\]/)
      const skillMatch = aiText.match(/\[SKILL:([^\]]+)\]/)
      const parsedScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : null
      const parsedSkill = skillMatch ? skillMatch[1].trim() : null

      // Clean tags from display text
      const cleanText = aiText.replace(/\[SCORE:\d+\]/g, '').replace(/\[SKILL:[^\]]+\]/g, '').trim()

      // Update scores
      if (parsedScore !== null) setScores(prev => [...prev, parsedScore])

      // Update skill graph
      if (parsedSkill && parsedScore !== null && onSkillUpdate) {
        const delta = parsedScore >= 70 ? 3 : parsedScore >= 40 ? 1 : -2
        onSkillUpdate(parsedSkill, delta)
      }

      const aiMsg = {
        role: 'assistant',
        content: cleanText,
        timestamp: Date.now(),
        score: parsedScore,
        skillUpdated: parsedSkill,
      }

      setMessages(prev => [...prev, aiMsg])

      // Check if exam is done
      if (mode === 'exam' && examConfig && newQCount >= examConfig.questionCount) {
        clearInterval(timerRef.current)
        setExamEnded(true)
        recordExamStats(prevScores => {
          const newScores = [...prevScores, parsedScore].filter(s => s !== null)
          return newScores
        })
        setTimeout(() => setPhase('summary'), 2000)
      }

    } catch (err) {
      if (err.message && err.message.includes('Quota Exhausted')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **API Rate Limit Reached**\n\n${err.message}`,
          timestamp: Date.now()
        }])

        // Check if we should end the exam early due to rate limit to record what we have
        if (mode === 'exam' && examConfig) {
          clearInterval(timerRef.current)
          setExamEnded(true)
          recordExamStats(scores)
          setTimeout(() => setPhase('summary'), 2000)
        }

        return
      }
      const fallback = getFallbackFeedback(text)
      const mockScore = Math.floor(Math.random() * 30) + 55
      setScores(prev => [...prev, mockScore])
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `[Demo Mode]\n\n${fallback}`,
        timestamp: Date.now(),
        score: mockScore,
        skillUpdated: examConfig?.topic?.split(' ')[0] || 'Functions',
      }])
    } finally {
      setLoading(false)
    }
  }

  const getFallbackFeedback = (answer) => {
    const feedbacks = [
      "Good attempt! Your approach shows understanding of the core concept. However, you missed handling the edge case where the input is empty — in production systems, this would cause a crash. For a score of 70+, always validate inputs first.\n\nFollow-up: How would you modify your solution to handle 10x the data volume?",
      "Solid thinking! You identified the right algorithm, but the time complexity of your solution is O(n²). Real-world systems at scale (think millions of users) need O(n) solutions. Can you optimize it?\n\nHint: Think about using a hash map to trade space for time.",
      "Excellent solution! 🌟 That's exactly how engineers at Google approach this — you validated inputs, chose the right data structure, and considered edge cases. The only improvement would be adding error handling for invalid types.\n\nNext challenge: Can you extend this to handle concurrent requests?",
    ]
    return feedbacks[Math.floor(Math.random() * feedbacks.length)]
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer() }
  }

  const resetToSetup = (keepTopic = false) => {
    clearInterval(timerRef.current)
    setPhase('setup')
    setMessages([])
    setScores([])
    setQuestionCount(0)
    setExamEnded(false)
    setTimeLeft(0)
    if (!keepTopic) setExamConfig(null)
  }

  const recordExamStats = (currentScoresOrFn) => {
    // Allow passing a function to get the latest scores if state hasn't updated
    const finalScores = typeof currentScoresOrFn === 'function' ? currentScoresOrFn(scores) : currentScoresOrFn
    const validScores = finalScores.filter(s => s !== null && s !== undefined)
    if (validScores.length === 0) return

    try {
      // Update Stats based on mode
      const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length

      if (isPeriodicTest) {
        const weeklyStats = JSON.parse(localStorage.getItem('code_obsidian_weekly_tests') || '[]')
        weeklyStats.push({
          id: Date.now(),
          topic: examConfig?.topic || 'Unknown',
          score: Math.round(avgScore),
          date: new Date().toISOString()
        })
        localStorage.setItem('code_obsidian_weekly_tests', JSON.stringify(weeklyStats))
      } else {
        const zaraStats = JSON.parse(localStorage.getItem('code_obsidian_zara_stats') || '{"examsTaken": 0, "totalScore": 0}')
        zaraStats.examsTaken += 1
        zaraStats.totalScore += avgScore
        localStorage.setItem('code_obsidian_zara_stats', JSON.stringify(zaraStats))
      }

      // Update Activity Streaks
      const today = new Date().toISOString().split('T')[0]
      const activity = JSON.parse(localStorage.getItem('code_obsidian_activity_streaks') || '{}')
      const durationMins = examConfig?.duration || 5
      activity[today] = (activity[today] || 0) + durationMins
      localStorage.setItem('code_obsidian_activity_streaks', JSON.stringify(activity))
    } catch (e) {
      console.error("Failed to save exam stats", e)
    }
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-purple-500/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-lg shadow-lg shadow-purple-500/20">{isPeriodicTest ? <CalendarDays className="w-5 h-5" /> : <Zap className="w-5 h-5" />}</div>
          <div>
            <div className="font-bold text-sm text-purple-300">{isPeriodicTest ? 'Periodic Assessment' : 'Zara — The Examiner'}</div>
            <div className="text-xs text-white/35">
              {phase === 'setup' ? (isPeriodicTest ? 'Awaiting topic selection' : 'Ready to challenge you') :
                phase === 'active' ? `${examConfig?.topic} · ${examConfig?.difficulty}` :
                  'Session complete'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle — only show in setup */}
          {phase === 'setup' && !isPeriodicTest && (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              {[
                { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Chat' },
                { id: 'exam', icon: <FileText className="w-4 h-4" />, label: 'Exam' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === m.id ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'}`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Timer for active exam */}
          {phase === 'active' && mode === 'exam' && totalTime > 0 && (
            <Timer seconds={timeLeft} totalSeconds={totalTime} onExpire={handleTimeExpired} />
          )}

          {/* Progress for exam mode */}
          {phase === 'active' && mode === 'exam' && examConfig && (
            <div className="text-xs text-white/40 font-mono">
              Q{Math.min(questionCount, examConfig.questionCount)}/{examConfig.questionCount}
            </div>
          )}

          {/* End session button */}
          {phase === 'active' && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { clearInterval(timerRef.current); setPhase('summary') }}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/40 hover:text-white hover:border-white/30 transition-all"
            >
              End Session
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Content area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* Setup screen */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
              <ExamSetup onStart={startSession} mode={mode} isPeriodicTest={isPeriodicTest} />
            </motion.div>
          )}

          {/* Active session */}
          {phase === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">

              {/* Score strip for exam mode */}
              {mode === 'exam' && scores.length > 0 && (
                <div className="flex items-center gap-2 px-5 py-2 bg-black/20 border-b border-white/5 flex-shrink-0 overflow-x-auto">
                  <span className="text-xs text-white/30 flex-shrink-0">Scores:</span>
                  {scores.map((s, i) => (
                    <span key={i} className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${s >= 80 ? 'bg-green-500/20 text-green-400' : s >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      Q{i + 1}: {s}
                    </span>
                  ))}
                  {scores.length > 0 && (
                    <span className="text-xs text-white/30 ml-2 flex-shrink-0">
                      Avg: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}
                    </span>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5">
                {messages.map((msg, i) => (
                  <ZaraMessage key={i} msg={msg} />
                ))}
                {loading && <ZaraTyping />}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                {examEnded ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-white/40 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Session ended — viewing results...
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write your answer here — explain your approach, then show your code..."
                        rows={3}
                        className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none transition-colors"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={sendAnswer}
                        disabled={!input.trim() || loading}
                        className="w-12 self-end rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 disabled:opacity-40 flex items-center justify-center h-12 shadow-lg shadow-purple-500/20"
                      >
                        {loading
                          ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        }
                      </motion.button>
                    </div>
                    <p className="text-xs text-white/20 mt-2 text-center">Enter to submit · Shift+Enter for new line · Be specific — Zara rewards detail</p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Summary screen */}
          {phase === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
              <ExamSummary
                scores={scores}
                topic={examConfig?.topic || ''}
                onRestart={() => resetToSetup(true) && startSession(examConfig)}
                onNewTopic={() => resetToSetup(false)}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}