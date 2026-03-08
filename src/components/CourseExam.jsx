import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { callAI } from '../aiService'

// ── System prompt for exam question generation ────────────────────────
const EXAM_SYSTEM_PROMPT = `You are an ELITE exam creator for Code Obsidian, an AI learning platform.

This is a FINAL MASTERY EXAM. The student has completed an entire course from absolute beginner to expert level. This exam must verify they have reached EXPERT-LEVEL mastery.

DIFFICULTY: ADVANCED TO EXPERT LEVEL
- Questions should be at the level of senior developer interviews at top tech companies (Google, Meta, Amazon)
- Include complex code that requires deep understanding to analyze
- Require architectural thinking and optimization awareness
- Test edge cases, performance considerations, and production-readiness
- Some questions should combine multiple advanced concepts

QUESTION TYPES (mix ALL of these — aim for maximum variety):
1. **Code Output**: Show COMPLEX code with subtle behavior (closures, async, recursion, edge cases). Ask what it outputs and WHY.
2. **Bug Fix**: Show production-level code with a subtle, hard-to-find bug. The bug should NOT be obvious (no typos — think logic errors, race conditions, off-by-one, memory issues).
3. **Write Code**: "Implement a function/class that..." — require handling edge cases, optimal time/space complexity, clean code.
4. **System Design**: "Design a system that..." — ask about architecture, data structures, scalability, trade-offs.
5. **Explain Concept**: Deep "why" questions — "Why does X work this way internally?", "What are the trade-offs between X and Y?"
6. **Real-World Problem**: "You're a senior engineer at [company]. Production is down because of X. How do you diagnose and fix it?"
7. **Optimization**: "This code works but is O(n²). Optimize it to O(n log n) or better."

FORMAT EACH QUESTION EXACTLY LIKE THIS:

---QUESTION---
[QTYPE:code_output|bug_fix|write_code|system_design|explain|real_world|optimization]
[QNUM:1]
[DIFFICULTY:advanced|expert]

**Question:** [Clear, specific, CHALLENGING question]

\`\`\`[language]
[code if applicable — make it realistic and complex]
\`\`\`

[Additional context, constraints, requirements if needed]

---END_QUESTION---

Generate exactly the requested number of questions.
Questions 1-3: ADVANCED level (senior developer)
Questions 4-6: EXPERT level (staff/principal engineer)
Questions 7-8: ELITE level (the hardest — only true masters will score well)
Mix question types. Every question MUST be specific to the course content.
Make code examples production-grade and realistic.
NO easy questions. This exam proves mastery.`

const GRADING_SYSTEM_PROMPT = `You are an ELITE exam grader for Code Obsidian. This is an EXPERT-LEVEL mastery exam.

Grade the student's answer RIGOROUSLY. This exam proves they have gone from zero to expert.

Respond in EXACTLY this format:

[SCORE:XX] (0-100)
[FEEDBACK]
Detailed, technical explanation of what was right/wrong.
- Reference specific parts of their answer
- If partially right, explain exactly what's missing and why it matters
- If wrong, explain the correct approach with enough detail that they learn
- Comment on code quality, edge case handling, and optimization if applicable
- Mention if their approach would work in production or not
[/FEEDBACK]

Scoring guide (STRICT — this is expert level):
- 90-100: Flawless. Production-ready answer. Handles edge cases. Optimal approach. Senior+ engineer level.
- 75-89: Strong answer with minor gaps. Good understanding but missing some nuance or optimization.
- 60-74: Adequate. Shows understanding but significant room for improvement. Would need mentoring.
- 40-59: Partial understanding. Major gaps in knowledge or approach. Not yet expert level.
- 20-39: Fundamental misunderstanding. Needs to review the material.
- 0-19: Wrong or irrelevant. Did not demonstrate understanding.

Be honest and technical. This exam determines if someone has truly mastered the subject.
Give credit where it's due, but don't inflate scores. Expert means expert.`


// ── Score ring ────────────────────────────────────────────────────────
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

// ── Question type badge ───────────────────────────────────────────────
function QuestionTypeBadge({ type }) {
    const config = {
        code_output: { label: '📤 Code Output', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
        bug_fix: { label: '🐛 Bug Fix', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
        write_code: { label: '✍️ Write Code', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' },
        system_design: { label: '🏗️ System Design', color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30' },
        explain: { label: '💡 Deep Explain', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
        real_world: { label: '🌍 Production Scenario', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
        optimization: { label: '⚡ Optimization', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    }
    const c = config[type] || config.explain
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${c.color} ${c.bg} ${c.border}`}>{c.label}</span>
    )
}

// ── Render question content (with code blocks) ────────────────────────
function QuestionContent({ text }) {
    if (!text) return null
    const parts = text.split(/(```[\s\S]*?```)/g)
    return (
        <div className="space-y-2">
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const code = part.replace(/```\w*\n?/, '').replace(/```$/, '')
                    return (
                        <pre key={i} className="bg-black/50 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm">
                            <code className="text-green-300 font-mono">{code}</code>
                        </pre>
                    )
                }
                // Handle bold text
                const formatted = part.split(/(\*\*[^*]+\*\*)/g).map((p, j) => {
                    if (p.startsWith('**') && p.endsWith('**')) {
                        return <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>
                    }
                    return <span key={j} className="text-white/75 whitespace-pre-wrap">{p}</span>
                })
                return <div key={i} className="leading-relaxed text-sm">{formatted}</div>
            })}
        </div>
    )
}


// ── Main CourseExam component ─────────────────────────────────────────
export default function CourseExam({ course, onBack, onComplete, onSkillUpdate }) {
    const [phase, setPhase] = useState('loading')  // loading | active | grading | results
    const [questions, setQuestions] = useState([])
    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState({})
    const [scores, setScores] = useState({})
    const [feedbacks, setFeedbacks] = useState({})
    const [input, setInput] = useState('')
    const [grading, setGrading] = useState(false)
    const inputRef = useRef(null)
    const QUESTION_COUNT = 8

    // Generate exam questions on mount
    useEffect(() => {
        generateExam()
    }, [])

    const generateExam = async () => {
        setPhase('loading')
        try {
            const chapterSummary = course.chapters.map(ch =>
                `Chapter: ${ch.title} — Topics: ${ch.topics.join(', ')}`
            ).join('\n')

            const response = await callAI(
                EXAM_SYSTEM_PROMPT,
                [{
                    role: 'user',
                    content: `Generate a ${QUESTION_COUNT}-question EXPERT-LEVEL mastery exam for:\n\nCourse: "${course.title}"\nLevel: EXPERT (this is the FINAL exam after completing the entire course from beginner to expert)\nLanguage: ${course.language || 'Python'}\n\nChapters covered (the student studied ALL of these):\n${chapterSummary}\n\nIMPORTANT: This exam must be HARD. The student has completed the ENTIRE course from absolute beginner to expert level. This exam proves they are now an expert. Questions 1-3 should be Advanced, Questions 4-6 should be Expert, Questions 7-8 should be Elite/FAANG-interview level.\n\nGenerate ${QUESTION_COUNT} questions. Use ALL question types. Make them genuinely challenging.`
                }]
            )

            const parsed = parseQuestions(response)
            if (parsed.length > 0) {
                setQuestions(parsed)
                setPhase('active')
            } else {
                setQuestions(getFallbackQuestions(course))
                setPhase('active')
            }
        } catch (err) {
            setQuestions(getFallbackQuestions(course))
            setPhase('active')
        }
    }

    // Parse questions from AI response
    const parseQuestions = (text) => {
        const questionBlocks = text.split('---QUESTION---').filter(b => b.trim())
        return questionBlocks.map((block, i) => {
            const typeMatch = block.match(/\[QTYPE:([^\]]+)\]/)
            const numMatch = block.match(/\[QNUM:(\d+)\]/)
            const cleanContent = block
                .replace(/---END_QUESTION---/g, '')
                .replace(/\[QTYPE:[^\]]+\]/g, '')
                .replace(/\[QNUM:\d+\]/g, '')
                .trim()

            return {
                id: i + 1,
                type: typeMatch ? typeMatch[1].trim() : 'explain',
                number: numMatch ? parseInt(numMatch[1]) : i + 1,
                content: cleanContent,
            }
        }).filter(q => q.content.length > 10).slice(0, QUESTION_COUNT)
    }

    // Grade an answer
    const gradeAnswer = async () => {
        const answer = input.trim()
        if (!answer || grading) return

        setAnswers(prev => ({ ...prev, [currentQ]: answer }))
        setInput('')
        setGrading(true)

        try {
            const question = questions[currentQ]
            const response = await callAI(
                GRADING_SYSTEM_PROMPT,
                [{
                    role: 'user',
                    content: `QUESTION:\n${question.content}\n\nSTUDENT'S ANSWER:\n${answer}\n\nCourse: ${course.title}\nLanguage: ${course.language || 'Python'}\n\nGrade this answer.`
                }]
            )

            const scoreMatch = response.match(/\[SCORE:(\d+)\]/)
            const feedbackMatch = response.match(/\[FEEDBACK\]([\s\S]*?)\[\/FEEDBACK\]/)
            const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50
            const feedback = feedbackMatch ? feedbackMatch[1].trim() : response.replace(/\[SCORE:\d+\]/, '').trim()

            setScores(prev => ({ ...prev, [currentQ]: score }))
            setFeedbacks(prev => ({ ...prev, [currentQ]: feedback }))
        } catch (err) {
            // Fallback scoring
            const score = answer.length > 50 ? 65 : answer.length > 20 ? 50 : 35
            setScores(prev => ({ ...prev, [currentQ]: score }))
            setFeedbacks(prev => ({ ...prev, [currentQ]: 'Unable to get detailed feedback. Based on the length and effort of your answer, here is an estimated score.' }))
        } finally {
            setGrading(false)
        }
    }

    // Move to next question or results
    const nextQuestion = () => {
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1)
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            finishExam()
        }
    }

    // Finish exam and calculate results
    const finishExam = () => {
        const avgScore = Object.values(scores).length > 0
            ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
            : 0
        const passed = avgScore >= 60

        // Save to localStorage
        try {
            const completed = JSON.parse(localStorage.getItem('code_obsidian_completed') || '[]')
            if (passed && !completed.find(c => c.id === course.id)) {
                completed.push({
                    id: course.id,
                    title: course.title,
                    score: avgScore,
                    completedAt: Date.now(),
                })
                localStorage.setItem('code_obsidian_completed', JSON.stringify(completed))
            }
        } catch { /* ignore */ }

        // Update skill graph
        if (onSkillUpdate && passed) {
            const topicSkills = course.chapters.flatMap(ch => ch.topics)
            const uniqueSkills = [...new Set(topicSkills)]
            uniqueSkills.forEach(skill => {
                const delta = avgScore >= 80 ? 5 : avgScore >= 60 ? 3 : 1
                onSkillUpdate(skill, delta)
            })
        }

        setPhase('results')
    }

    const avgScore = Object.values(scores).length > 0
        ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
        : 0
    const passed = avgScore >= 60

    // ── Loading screen ──────────────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 border-4 border-white/10 border-t-orange-500 rounded-full"
                />
                <h2 className="text-white/70 text-lg font-display font-bold">Generating Expert-Level Exam</h2>
                <p className="text-white/35 text-sm font-mono">
                    Creating {QUESTION_COUNT} advanced questions for "{course.title}"...
                </p>
                <p className="text-white/20 text-xs mt-1">
                    ⚠️ This is an expert-level final exam — prepare yourself!
                </p>
            </div>
        )
    }

    // ── Results screen ──────────────────────────────────────────────────
    if (phase === 'results') {
        const grade = avgScore >= 90 ? 'A+' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 50 ? 'D' : 'F'
        const gradeColor = avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'

        return (
            <div className="h-screen flex flex-col">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎓</span>
                        <div>
                            <h1 className="font-display font-bold text-base text-white">Exam Results</h1>
                            <p className="text-xs text-white/35 font-mono">{course.title}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center max-w-lg w-full"
                    >
                        <div className="text-6xl mb-4">{passed ? '🏆' : '📚'}</div>
                        <h2 className="text-3xl font-display font-black mb-2">
                            {passed ? 'Congratulations!' : 'Keep Learning!'}
                        </h2>
                        <p className="text-white/40 text-sm mb-8">
                            {passed
                                ? `You've proven expert-level mastery of ${course.title}! 🔥`
                                : `The expert-level exam requires 60% to pass. Review the advanced chapters and try again.`}
                        </p>

                        <div className="flex items-center justify-center gap-8 mb-8">
                            <ScoreRing score={avgScore} size={100} />
                            <div className="text-left">
                                <div className={`text-6xl font-display font-black ${gradeColor}`}>{grade}</div>
                                <div className="text-white/50 text-sm">Final Grade</div>
                                <div className="text-white/30 text-xs mt-1">{Object.keys(scores).length} questions</div>
                            </div>
                        </div>

                        {/* Per-question breakdown */}
                        <div className="w-full mb-8 glass-card p-4">
                            <div className="text-xs text-white/40 mb-3 text-left font-semibold">Question Breakdown</div>
                            <div className="space-y-2">
                                {Object.entries(scores).map(([qi, s]) => (
                                    <div key={qi} className="flex items-center gap-3">
                                        <span className="text-xs text-white/40 w-6 font-mono">Q{parseInt(qi) + 1}</span>
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${s}%` }}
                                                transition={{ delay: parseInt(qi) * 0.1, duration: 0.8 }}
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: s >= 80 ? '#22c55e' : s >= 60 ? '#eab308' : '#ef4444' }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold w-8 text-right" style={{ color: s >= 80 ? '#22c55e' : s >= 60 ? '#eab308' : '#ef4444' }}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-center">
                            {!passed && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={onBack}
                                    className="px-6 py-3 rounded-xl border border-white/20 text-white/70 font-semibold text-sm hover:text-white hover:border-white/40 transition-all"
                                >
                                    📖 Review Course
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setScores({})
                                    setAnswers({})
                                    setFeedbacks({})
                                    setCurrentQ(0)
                                    setInput('')
                                    generateExam()
                                }}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/20"
                            >
                                🔁 {passed ? 'Try Again' : 'Retry Exam'}
                            </motion.button>
                            {passed && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => onComplete?.(course, avgScore)}
                                    className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all"
                                >
                                    ✓ Done
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    // ── Active exam ─────────────────────────────────────────────────────
    const question = questions[currentQ]
    const hasAnswered = scores[currentQ] !== undefined

    return (
        <div className="h-screen flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="text-white/50 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-all"
                    >
                        ← Back to Course
                    </motion.button>
                    <div>
                        <h1 className="font-display font-bold text-base text-white">
                            📝 Final Exam: <span className="gradient-text">{course.title}</span>
                        </h1>
                        <p className="text-xs text-white/35 font-mono">
                            Question {currentQ + 1} of {questions.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${i === currentQ
                                    ? 'bg-orange-500 scale-125'
                                    : scores[i] !== undefined
                                        ? scores[i] >= 60 ? 'bg-green-500' : 'bg-red-500'
                                        : 'bg-white/15'
                                    }`}
                                onClick={() => scores[i] !== undefined && setCurrentQ(i)}
                            />
                        ))}
                    </div>

                    {/* Running average */}
                    {Object.keys(scores).length > 0 && (
                        <div className="text-xs font-mono text-white/40 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                            Avg: <span className={avgScore >= 60 ? 'text-green-400' : 'text-red-400'}>{avgScore}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Question area */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQ}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {/* Question header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                    {currentQ + 1}
                                </div>
                                {question && <QuestionTypeBadge type={question.type} />}
                            </div>

                            {/* Question content */}
                            <div className="glass-card p-6 mb-6 border border-white/10">
                                {question && <QuestionContent text={question.content} />}
                            </div>

                            {/* Answer area */}
                            {!hasAnswered ? (
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-white/50 block">Your Answer</label>
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) gradeAnswer() }}
                                        placeholder="Type your answer here... For code answers, include your code with explanation."
                                        rows={8}
                                        className="w-full bg-white/5 border border-white/10 focus:border-orange-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-vertical focus:outline-none transition-colors font-mono"
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-white/20">Ctrl+Enter to submit</p>
                                        <motion.button
                                            whileHover={{ scale: 1.03, boxShadow: '0 10px 30px rgba(255,107,53,0.3)' }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={gradeAnswer}
                                            disabled={!input.trim() || grading}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                                        >
                                            {grading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    Grading...
                                                </span>
                                            ) : 'Submit Answer'}
                                        </motion.button>
                                    </div>
                                </div>
                            ) : (
                                /* Feedback */
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Your answer */}
                                    <div className="glass-card p-4 border border-white/10">
                                        <div className="text-xs font-semibold text-white/40 mb-2">📝 Your Answer</div>
                                        <pre className="text-sm text-white/60 whitespace-pre-wrap font-mono">{answers[currentQ]}</pre>
                                    </div>

                                    {/* Score + feedback */}
                                    <div className={`glass-card p-5 border ${scores[currentQ] >= 60 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                        <div className="flex items-center gap-4 mb-3">
                                            <ScoreRing score={scores[currentQ]} size={56} />
                                            <div>
                                                <div className="text-xs font-bold text-white/60">Score</div>
                                                <div className={`text-lg font-bold ${scores[currentQ] >= 80 ? 'text-green-400' : scores[currentQ] >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {scores[currentQ] >= 80 ? '🌟 Excellent!' : scores[currentQ] >= 60 ? '👍 Good!' : scores[currentQ] >= 40 ? '💪 Needs Work' : '📚 Review Needed'}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{feedbacks[currentQ]}</p>
                                    </div>

                                    {/* Next button */}
                                    <div className="flex justify-end">
                                        <motion.button
                                            whileHover={{ scale: 1.03, x: 4 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={nextQuestion}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20"
                                        >
                                            {currentQ < questions.length - 1 ? 'Next Question →' : '📊 View Results'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// ── Fallback questions (EXPERT LEVEL) ────────────────────────────────
function getFallbackQuestions(course) {
    const lang = course.language || 'python'
    const topic = course.title

    return [
        {
            id: 1, type: 'explain', number: 1,
            content: `**Question (Advanced):** Explain the internal architecture of ${topic} in detail. How does it work under the hood? Discuss:\n1. The core data structures used internally\n2. The algorithmic complexity of common operations\n3. Memory management considerations\n4. Why this design was chosen over alternatives\n\nYour answer should demonstrate deep understanding, not surface-level knowledge.`
        },
        {
            id: 2, type: 'code_output', number: 2,
            content: `**Question (Advanced):** This code uses advanced features of ${topic}. Analyze it carefully and predict the EXACT output. Explain each step of execution, including any non-obvious behavior.\n\nExplain not just WHAT it outputs, but WHY. What would change if you modified the key line?`
        },
        {
            id: 3, type: 'write_code', number: 3,
            content: `**Question (Advanced):** Implement a production-ready solution in ${lang} that demonstrates mastery of ${topic}. Requirements:\n- Handle ALL edge cases (empty input, invalid data, concurrent access)\n- Optimal time and space complexity\n- Clean, well-documented code following industry best practices\n- Include error handling and input validation\n- The solution should be something you'd put in production, not a toy example\n\nExplain your design decisions and the trade-offs you considered.`
        },
        {
            id: 4, type: 'system_design', number: 4,
            content: `**Question (Expert):** You're a senior engineer at a company with 10 million users. Design a system that heavily leverages ${topic} to handle:\n- 100,000+ concurrent requests\n- Sub-100ms response times\n- 99.99% uptime\n- Horizontal scalability\n\nDescribe the architecture. Discuss:\n1. Core components and their responsibilities\n2. Data flow between components\n3. How ${topic} concepts are applied at each layer\n4. Failure modes and recovery strategies\n5. Monitoring and observability`
        },
        {
            id: 5, type: 'bug_fix', number: 5,
            content: `**Question (Expert):** This production code has been causing intermittent failures under high load. The bug is subtle and only manifests in specific conditions. Identify the root cause, explain why it occurs, and provide a fix that handles all edge cases.\n\nHint: Think about race conditions, boundary cases, resource leaks. The code passes all unit tests but fails in production.\n\nAlso explain: How would you write a test to catch this bug?`
        },
        {
            id: 6, type: 'optimization', number: 6,
            content: `**Question (Expert):** A solution related to ${topic} works correctly but has poor performance characteristics (O(n²) or worse). Optimize it to achieve O(n log n) or O(n) while maintaining correctness:\n\n1. Analyze the current time and space complexity\n2. Identify the performance bottleneck\n3. Propose and implement an optimized solution in ${lang}\n4. Prove that your optimization is correct\n5. Discuss any trade-offs (memory vs speed, readability vs performance)\n\nShow both the analysis and the optimized code.`
        },
        {
            id: 7, type: 'real_world', number: 7,
            content: `**Question (Elite):** It's 3 AM. You get paged. The system is down and losing the company $50,000/minute. The error logs show issues deep in the ${topic} layer. Walk through your COMPLETE incident response:\n\n1. First 5 minutes: How do you triage?\n2. Diagnosis: What tools and techniques do you use?\n3. Mitigation: How do you stop the bleeding while you investigate?\n4. Root cause: What advanced ${topic} issues could cause production outages?\n5. Prevention: What do you change to prevent this from happening again?\n6. Post-mortem: What do you document?\n\nBe specific and technical. Show you can handle production pressure.`
        },
        {
            id: 8, type: 'write_code', number: 8,
            content: `**Question (Elite):** This is the ultimate challenge. Implement a complete, production-grade component using ${topic} in ${lang} that:\n\n1. Solves a non-trivial real-world problem\n2. Handles concurrent access safely\n3. Includes comprehensive error handling\n4. Has optimal algorithmic complexity\n5. Follows SOLID principles\n6. Includes inline documentation\n7. Could be deployed to production as-is\n\nThis question tests your ability to write code at a principal engineer level. Quality matters more than quantity.`
        },
    ]
}
