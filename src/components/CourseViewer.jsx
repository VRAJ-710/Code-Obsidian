import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { callAI } from '../aiService'

// ── System prompt for generating lesson content ───────────────────────
const LESSON_SYSTEM_PROMPT = `You are the WORLD'S BEST programming instructor for Code Obsidian. You are known for taking absolute beginners (even 7-year-olds) and turning them into experts.

YOUR TEACHING PHILOSOPHY:
- Start EVERY explanation like you're talking to someone who has NEVER seen code before
- Use real-world analogies and stories before showing ANY code
- Think of concepts like building blocks — each one must be rock-solid before adding the next
- NEVER assume prior knowledge — define every term the first time you use it
- After explaining, ALWAYS give a problem to solve — learning happens by DOING
- Gradually increase difficulty within each chapter

PROGRESSIVE DIFFICULTY SYSTEM:
You will receive the chapter number and total chapters. Use this to calibrate difficulty:
- Chapters 1-3 (ABSOLUTE BEGINNER): Explain like talking to a child. Use toy examples. "Imagine a box where you keep your favorite toy — that's what a variable is!"
- Chapters 4-6 (BEGINNER): Still use analogies but introduce real programming patterns. Start connecting concepts.
- Chapters 7-10 (INTERMEDIATE): Less hand-holding, real-world code, discuss tradeoffs, mention edge cases.
- Chapters 11-14 (ADVANCED): Industry-level patterns, optimization, architectural thinking, complex problems.
- Chapters 15+ (EXPERT): Deep internals, performance tuning, system design, interview-level hard problems, production-grade code.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use markdown):

## 📘 [Chapter Title]

### 🎯 What You'll Learn
- Bullet points of key learning outcomes (what the student will be able to DO after this chapter)

### 📖 The Story (Introduction)
Start with an engaging story or real-world scenario that makes the topic click. Use analogies even a child can understand for early chapters, and industry scenarios for later chapters.

### 🔑 Key Concepts

#### Concept 1: [Name]
**The Simple Version:** Explain it so a beginner understands.
**The Real Version:** Now explain it properly with technical accuracy.
**Why It Matters:** Real-world application.

\`\`\`[language]
// Example 1: Simple — baby steps
// Every line has a comment explaining what it does
\`\`\`

\`\`\`[language]
// Example 2: Slightly harder — building on Example 1
\`\`\`

**💡 Key Insight:** One-liner that makes everything click.

#### Concept 2: [Name]
(repeat pattern — but increase difficulty slightly from Concept 1)

#### Concept 3: [Name]
(even harder — combine concepts 1 and 2)

### ⚔️ Challenge Time!
Give 2-3 progressively harder exercises:

**Challenge 1 (Easy):** Simple practice of the basic concept.
\`\`\`[language]
// TODO: Starter code
\`\`\`
**Expected Output:** Show what the correct solution should produce.

**Challenge 2 (Medium):** Combine multiple concepts from this chapter.
\`\`\`[language]
// TODO: Starter code with less guidance
\`\`\`

**Challenge 3 (Hard — Push Yourself! 🔥):** A tricky variation that makes you think.
\`\`\`[language]
// TODO: Minimal guidance — figure it out!
\`\`\`

### 🧠 Knowledge Check
Ask 3-5 questions that test DEEP understanding (not just memorization):
1. "What would happen if..." — test edge case thinking
2. "Why does X work but Y doesn't?" — test conceptual understanding
3. "How would you use this to solve..." — test application ability
4. "What's wrong with this code?" — show buggy code and ask them to spot the issue

### 📝 Chapter Summary
- 4-6 bullet points summarizing what was covered
- Each point should be concise and memorable
- Include "Now you can..." statements showing what they've mastered

### 🚀 What's Next
Briefly preview what's coming in the next chapter and how it builds on what they just learned.

RULES:
- Write thorough, comprehensive lessons — aim for 1500-2500 words per chapter
- ALWAYS include at least 3 progressively harder code examples
- ALWAYS include challenges/exercises — learning is doing
- Use real-world examples (Netflix, Google, Uber, Amazon, Spotify, etc.)
- Early chapters: lots of analogies, stories, encouragement, emojis
- Later chapters: more technical depth, industry patterns, hard problems
- Make code examples RUNNABLE and PRACTICAL — no pseudocode
- Use encouraging language throughout — celebrate small wins
- Include common mistakes and how to avoid them
- Every chapter should make the student feel they've leveled up`

// ── System prompt for generating course outline ───────────────────────
const OUTLINE_SYSTEM_PROMPT = `You are a world-class curriculum designer for Code Obsidian, an AI learning platform.

Your mission: Design a COMPLETE course that takes someone from ABSOLUTE ZERO knowledge to EXPERT/MASTERY level.

The course must follow this progression:
- Chapters 1-3: ABSOLUTE BEGINNER (never touched this subject before, explain like they're 7)
- Chapters 4-6: BEGINNER (understands basics, ready for real coding)
- Chapters 7-10: INTERMEDIATE (building real things, connecting concepts)
- Chapters 11-14: ADVANCED (complex patterns, optimization, architecture)
- Chapters 15-18: EXPERT/MASTERY (industry-level, interview-ready, production code)

Generate the outline in EXACTLY this JSON format, nothing else:

{
  "title": "Course Title",
  "description": "One-line description",
  "level": "Beginner to Expert",
  "estimatedHours": 25,
  "chapters": [
    { "id": 1, "title": "Chapter Title", "description": "Brief description", "topics": ["topic1", "topic2"], "difficulty": "absolute-beginner" },
    { "id": 2, "title": "Chapter Title", "description": "Brief description", "topics": ["topic1", "topic2"], "difficulty": "beginner" }
  ]
}

RULES:
- Generate 15-18 chapters (this is a COMPLETE mastery course)
- Start from absolute zero — chapter 1 should assume the student knows NOTHING
- Each chapter builds on the previous — strict progressive difficulty
- Each chapter should have 3-5 topics
- difficulty field must be one of: "absolute-beginner", "beginner", "intermediate", "advanced", "expert"
- Chapter titles should clearly show the difficulty progression
- Early chapters: "What is X?", "Your First Y", "Understanding Z"
- Late chapters: "Advanced X Patterns", "Optimizing Y at Scale", "Production-Grade Z"
- ALWAYS end with a capstone chapter like "Mastery Project" or "Expert-Level Capstone"
- Respond with ONLY valid JSON, no markdown, no explanation, no commentary`


// ── Chapter sidebar item ──────────────────────────────────────────────
function ChapterItem({ chapter, index, isActive, isCompleted, onClick }) {
    return (
        <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/10 border border-orange-500/30'
                : isCompleted
                    ? 'bg-green-500/8 border border-green-500/20 hover:bg-green-500/15'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
        >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isCompleted
                ? 'bg-green-500/30 text-green-400'
                : isActive
                    ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white'
                    : 'bg-white/10 text-white/40'
                }`}>
                {isCompleted ? '✓' : index + 1}
            </div>
            <div className="min-w-0">
                <div className={`text-sm font-semibold truncate ${isActive ? 'text-orange-300' : isCompleted ? 'text-green-400' : 'text-white/70'
                    }`}>
                    {chapter.title}
                </div>
                <div className="text-xs text-white/30 mt-0.5 line-clamp-1">{chapter.description}</div>
            </div>
        </motion.button>
    )
}

// ── Lesson content renderer ───────────────────────────────────────────
function LessonContent({ content, isLoading }) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-3 border-white/10 border-t-orange-500 rounded-full"
                />
                <div className="text-white/50 text-sm font-mono">Generating lesson content...</div>
                <div className="text-white/25 text-xs">This may take a few seconds</div>
            </div>
        )
    }

    if (!content) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="text-5xl">📚</div>
                <h3 className="text-white/70 text-lg font-semibold">Select a chapter to start learning</h3>
                <p className="text-white/40 text-sm max-w-md">
                    Click any chapter from the sidebar to load the lesson content. Work through them in order for the best experience.
                </p>
            </div>
        )
    }

    // Parse markdown-like content into rendered elements
    const renderMarkdown = (text) => {
        const lines = text.split('\n')
        const elements = []
        let inCodeBlock = false
        let codeLines = []
        let codeLang = ''
        let key = 0

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Code block toggle
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    elements.push(
                        <div key={key++} className="my-4 rounded-xl overflow-hidden border border-white/10">
                            <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10">
                                <span className="text-xs font-mono text-white/40">{codeLang || 'code'}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(codeLines.join('\n'))}
                                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                                >
                                    📋 Copy
                                </button>
                            </div>
                            <pre className="p-4 bg-black/40 overflow-x-auto text-sm leading-relaxed">
                                <code className="text-green-300 font-mono">{codeLines.join('\n')}</code>
                            </pre>
                        </div>
                    )
                    codeLines = []
                    codeLang = ''
                    inCodeBlock = false
                } else {
                    codeLang = line.trim().replace('```', '').trim()
                    inCodeBlock = true
                }
                continue
            }

            if (inCodeBlock) {
                codeLines.push(line)
                continue
            }

            // Headers
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={key++} className="text-2xl font-display font-black text-white mt-8 mb-4 flex items-center gap-2">
                        {line.replace('## ', '')}
                    </h2>
                )
            } else if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={key++} className="text-lg font-display font-bold text-white/90 mt-6 mb-3 flex items-center gap-2">
                        {line.replace('### ', '')}
                    </h3>
                )
            } else if (line.startsWith('#### ')) {
                elements.push(
                    <h4 key={key++} className="text-base font-bold text-orange-300 mt-5 mb-2">
                        {line.replace('#### ', '')}
                    </h4>
                )
            }
            // Bold text lines (key points)
            else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                elements.push(
                    <p key={key++} className="text-white/90 font-semibold my-2 pl-4 border-l-2 border-orange-500/40 py-1">
                        {line.replace(/\*\*/g, '')}
                    </p>
                )
            }
            // Bullet points
            else if (line.trim().startsWith('- ')) {
                elements.push(
                    <div key={key++} className="flex items-start gap-2 ml-4 my-1">
                        <span className="text-orange-400 mt-1.5 text-xs">●</span>
                        <span className="text-white/70 text-sm leading-relaxed">
                            {renderInlineFormatting(line.trim().substring(2))}
                        </span>
                    </div>
                )
            }
            // Numbered items
            else if (/^\d+\.\s/.test(line.trim())) {
                const num = line.trim().match(/^(\d+)\./)[1]
                elements.push(
                    <div key={key++} className="flex items-start gap-2 ml-4 my-1">
                        <span className="text-orange-400 font-bold text-sm min-w-[1.2rem]">{num}.</span>
                        <span className="text-white/70 text-sm leading-relaxed">
                            {renderInlineFormatting(line.trim().replace(/^\d+\.\s/, ''))}
                        </span>
                    </div>
                )
            }
            // Empty line = paragraph break
            else if (line.trim() === '') {
                elements.push(<div key={key++} className="h-2" />)
            }
            // Regular paragraph
            else if (line.trim()) {
                elements.push(
                    <p key={key++} className="text-white/65 text-sm leading-relaxed my-1.5">
                        {renderInlineFormatting(line)}
                    </p>
                )
            }
        }

        return elements
    }

    // Handle inline formatting: **bold**, `code`, *italic*
    const renderInlineFormatting = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white/90 font-semibold">{part.slice(2, -2)}</strong>
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-orange-300 text-xs font-mono">{part.slice(1, -1)}</code>
            }
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                return <em key={i} className="text-white/50 italic">{part.slice(1, -1)}</em>
            }
            return part
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose-custom px-2"
        >
            {renderMarkdown(content)}
        </motion.div>
    )
}


// ── Main CourseViewer component ────────────────────────────────────────
export default function CourseViewer({ course, onBack, onTakeExam, onSkillUpdate }) {
    const [activeChapter, setActiveChapter] = useState(0)
    const [chapterContents, setChapterContents] = useState({})
    const [completedChapters, setCompletedChapters] = useState(new Set())
    const [loading, setLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const contentRef = useRef(null)

    // Load progress from localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('code_obsidian_courses') || '{}')
            if (saved[course.id]?.completed) {
                setCompletedChapters(new Set(saved[course.id].completed))
            }
        } catch { /* ignore */ }
    }, [course.id])

    // Save progress to localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('code_obsidian_courses') || '{}')
            saved[course.id] = {
                ...saved[course.id],
                title: course.title,
                completed: Array.from(completedChapters),
                totalChapters: course.chapters.length,
                lastAccessed: Date.now(),
            }
            localStorage.setItem('code_obsidian_courses', JSON.stringify(saved))
        } catch { /* ignore */ }
    }, [completedChapters, course])

    // Load chapter content
    const loadChapter = async (index) => {
        setActiveChapter(index)
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

        if (chapterContents[index]) return // Already loaded

        const chapter = course.chapters[index]
        setLoading(true)

        try {
            // Determine difficulty level based on chapter position
            const totalCh = course.chapters.length
            const positionPct = index / totalCh
            let difficultyLabel, difficultyInstruction
            if (positionPct < 0.2) {
                difficultyLabel = 'ABSOLUTE BEGINNER'
                difficultyInstruction = 'Explain like you are talking to a 7-year-old who has never seen code. Use toys, games, and everyday objects as analogies. Every single term must be defined. Be extremely encouraging. Use lots of emojis and fun examples.'
            } else if (positionPct < 0.35) {
                difficultyLabel = 'BEGINNER'
                difficultyInstruction = 'Student now knows the very basics. Use simple analogies but start introducing real code patterns. Define new terms but you can reference concepts from previous chapters. Give easy-to-medium exercises.'
            } else if (positionPct < 0.55) {
                difficultyLabel = 'INTERMEDIATE'
                difficultyInstruction = 'Student is getting comfortable. Introduce real-world coding patterns, discuss tradeoffs, mention edge cases. Less hand-holding, more problem-solving. Give medium difficulty exercises with one hard challenge.'
            } else if (positionPct < 0.8) {
                difficultyLabel = 'ADVANCED'
                difficultyInstruction = 'Student is skilled. Teach industry-level patterns, optimization techniques, architectural decisions. Discuss performance, scalability, best practices. Give hard exercises that require combining multiple concepts. Include interview-style questions.'
            } else {
                difficultyLabel = 'EXPERT / MASTERY'
                difficultyInstruction = 'Student is almost an expert. Teach deep internals, production-grade patterns, system design thinking, performance tuning. Give very hard challenges — the kind asked in FAANG interviews. Show code that handles edge cases, concurrency, scale. After this chapter, they should be able to teach others.'
            }

            const chapterDifficulty = chapter.difficulty || difficultyLabel.toLowerCase()

            const content = await callAI(
                LESSON_SYSTEM_PROMPT,
                [{
                    role: 'user',
                    content: `Generate a lesson for:\n\nCourse: "${course.title}"\nChapter ${index + 1} of ${course.chapters.length}: "${chapter.title}"\nTopics to cover: ${chapter.topics.join(', ')}\nChapter difficulty tag: ${chapterDifficulty}\nPosition in course: ${Math.round(positionPct * 100)}% through the course\n\nDIFFICULTY LEVEL FOR THIS CHAPTER: ${difficultyLabel}\n${difficultyInstruction}\n\nProgramming language: ${course.language || 'Python'}\n\nRemember: This course takes someone from ABSOLUTE ZERO to EXPERT. This chapter is at the ${difficultyLabel} stage. Make the teaching depth and challenge difficulty match this level exactly.`
                }]
            )
            setChapterContents(prev => ({ ...prev, [index]: content }))
        } catch (err) {
            const fallback = generateFallbackContent(chapter, course, index)
            setChapterContents(prev => ({ ...prev, [index]: fallback }))
        } finally {
            setLoading(false)
        }
    }

    // Mark current chapter as complete and go next
    const completeAndNext = () => {
        setCompletedChapters(prev => {
            const next = new Set(prev)
            next.add(activeChapter)
            return next
        })
        if (activeChapter < course.chapters.length - 1) {
            loadChapter(activeChapter + 1)
        }
    }

    // Generate fallback content when AI fails
    const generateFallbackContent = (chapter, course, index) => {
        return `## 📘 ${chapter.title}

### 🎯 What You'll Learn
${chapter.topics.map(t => `- ${t}`).join('\n')}

### 📖 Introduction
Welcome to Chapter ${index + 1} of **${course.title}**! In this lesson, we'll dive deep into ${chapter.title.toLowerCase()}.

${chapter.description}

### 🔑 Key Concepts

#### Concept 1: ${chapter.topics[0] || 'Core Basics'}
This is one of the fundamental building blocks you'll need to master. Let's explore how it works with a practical example.

\`\`\`${course.language || 'python'}
# Example: ${chapter.topics[0] || 'Basic concept'}
# This demonstrates the core idea

print("Hello from ${chapter.title}!")
# TODO: Try modifying this code to experiment
\`\`\`

**💡 Key Point:** Understanding ${chapter.topics[0] || 'this concept'} is essential for everything that follows in this course.

${chapter.topics.length > 1 ? `#### Concept 2: ${chapter.topics[1]}
Building on what we just learned, ${chapter.topics[1].toLowerCase()} takes things further.

\`\`\`${course.language || 'python'}
# Example: ${chapter.topics[1]}
# Practice this pattern
\`\`\`

**💡 Key Point:** ${chapter.topics[1]} is widely used in real-world applications.` : ''}

### 🛠️ Try It Yourself
Now it's your turn! Try creating a small program that uses what you've learned in this chapter.

### 📝 Chapter Summary
${chapter.topics.map(t => `- Learned about **${t}** and how it applies in practice`).join('\n')}

### 🧠 Quick Check
1. Can you explain ${chapter.topics[0]} in your own words?
2. What would happen if you changed the key parameter in the example above?
${chapter.topics.length > 1 ? `3. How does ${chapter.topics[1]} relate to ${chapter.topics[0]}?` : ''}`
    }

    // Auto-load first chapter
    useEffect(() => {
        if (course.chapters.length > 0 && !chapterContents[0]) {
            loadChapter(0)
        }
    }, [course])

    const progress = course.chapters.length > 0
        ? Math.round((completedChapters.size / course.chapters.length) * 100)
        : 0
    const allComplete = completedChapters.size >= course.chapters.length

    return (
        <div className="h-screen flex flex-col">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="text-white/50 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-all"
                    >
                        ← Back
                    </motion.button>
                    <div>
                        <h1 className="font-display font-bold text-base text-white">{course.title}</h1>
                        <p className="text-xs text-white/35 font-mono mt-0.5">
                            {course.level} · {course.chapters.length} chapters · {course.estimatedHours || '~5'}h estimated
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <span className="text-xs font-mono text-white/40">{progress}%</span>
                    </div>

                    {/* Take Exam */}
                    {allComplete && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(255,107,53,0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onTakeExam(course)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                        >
                            🎓 Take Final Exam
                        </motion.button>
                    )}

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-white/40 hover:text-white text-sm transition-colors"
                    >
                        {sidebarOpen ? '◀' : '▶'} Chapters
                    </button>
                </div>
            </div>

            {/* ── Content area ───────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Sidebar */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0"
                            style={{ background: 'rgba(0,0,0,0.3)' }}
                        >
                            <div className="px-4 py-3 border-b border-white/5">
                                <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">Chapters</div>
                                <div className="flex items-center gap-2 text-xs text-white/40">
                                    <span className="text-green-400">{completedChapters.size}</span>
                                    <span>/</span>
                                    <span>{course.chapters.length}</span>
                                    <span className="text-white/20">completed</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {course.chapters.map((ch, i) => (
                                    <ChapterItem
                                        key={ch.id}
                                        chapter={ch}
                                        index={i}
                                        isActive={activeChapter === i}
                                        isCompleted={completedChapters.has(i)}
                                        onClick={() => loadChapter(i)}
                                    />
                                ))}
                            </div>

                            {/* Take exam from sidebar */}
                            <div className="p-3 border-t border-white/5">
                                {allComplete ? (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        onClick={() => onTakeExam(course)}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-lg"
                                    >
                                        🎓 Take Final Exam
                                    </motion.button>
                                ) : (
                                    <div className="text-xs text-white/25 text-center py-2">
                                        Complete all chapters to unlock the final exam
                                    </div>
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-8 py-8">
                        <LessonContent
                            content={chapterContents[activeChapter]}
                            isLoading={loading}
                        />

                        {/* Navigation buttons */}
                        {chapterContents[activeChapter] && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center justify-between mt-12 pt-8 border-t border-white/10"
                            >
                                {activeChapter > 0 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.03, x: -4 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => loadChapter(activeChapter - 1)}
                                        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm"
                                    >
                                        ← {course.chapters[activeChapter - 1]?.title}
                                    </motion.button>
                                ) : <div />}

                                {activeChapter < course.chapters.length - 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.03, x: 4, boxShadow: '0 10px 30px rgba(255,107,53,0.2)' }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={completeAndNext}
                                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/20"
                                    >
                                        {completedChapters.has(activeChapter) ? 'Next' : 'Complete & Next'} → {course.chapters[activeChapter + 1]?.title}
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.03, boxShadow: '0 10px 30px rgba(255,107,53,0.3)' }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            setCompletedChapters(prev => {
                                                const next = new Set(prev)
                                                next.add(activeChapter)
                                                return next
                                            })
                                        }}
                                        className={`px-5 py-3 rounded-xl text-sm font-semibold ${completedChapters.has(activeChapter)
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20'
                                            }`}
                                    >
                                        {completedChapters.has(activeChapter) ? '✓ Chapter Complete' : '✓ Mark Complete'}
                                    </motion.button>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Export the outline generation function for LearningTracks to use
export async function generateCourseOutline(topic) {
    try {
        const response = await callAI(
            OUTLINE_SYSTEM_PROMPT,
            [{ role: 'user', content: `Create a course outline for: "${topic}". Determine the most appropriate programming language for this topic.` }]
        )

        // Parse JSON from response (handle potential markdown wrapping)
        let jsonStr = response.trim()
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/, '').replace(/```$/, '').trim()
        }
        const outline = JSON.parse(jsonStr)

        // Add an ID and language to the course
        outline.id = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
        outline.language = detectLanguage(topic)
        outline.searchTopic = topic

        return outline
    } catch (err) {
        // Return a fallback outline
        return generateFallbackOutline(topic)
    }
}

function detectLanguage(topic) {
    const lower = topic.toLowerCase()
    if (lower.includes('python') || lower.includes('ml') || lower.includes('machine learning') || lower.includes('data') || lower.includes('django') || lower.includes('flask')) return 'python'
    if (lower.includes('javascript') || lower.includes('js') || lower.includes('react') || lower.includes('node') || lower.includes('next') || lower.includes('vue')) return 'javascript'
    if (lower.includes('c++') || lower.includes('cpp')) return 'cpp'
    if (lower.includes('java') && !lower.includes('javascript')) return 'java'
    if (lower.includes('rust')) return 'rust'
    if (lower.includes('go ') || lower.includes('golang')) return 'go'
    if (lower.includes('typescript') || lower.includes('ts')) return 'typescript'
    if (lower.includes('c#') || lower.includes('csharp') || lower.includes('.net')) return 'csharp'
    if (lower.includes('sql') || lower.includes('database')) return 'sql'
    if (lower.includes('html') || lower.includes('css') || lower.includes('web')) return 'html'
    if (lower.includes('php')) return 'php'
    if (lower.includes('ruby') || lower.includes('rails')) return 'ruby'
    if (lower.includes('swift') || lower.includes('ios')) return 'swift'
    if (lower.includes('kotlin') || lower.includes('android')) return 'kotlin'
    return 'python' // default
}

function generateFallbackOutline(topic) {
    return {
        id: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: `Master ${topic}: Zero to Expert`,
        description: `Complete mastery course — from absolute beginner to expert in ${topic}.`,
        level: 'Beginner to Expert',
        estimatedHours: 25,
        language: detectLanguage(topic),
        searchTopic: topic,
        chapters: [
            // ABSOLUTE BEGINNER (Chapters 1-3)
            { id: 1, title: `What is ${topic}? Your Very First Steps`, description: 'No experience needed — start from zero', topics: ['What it is', 'Why it matters', 'Your first program'], difficulty: 'absolute-beginner' },
            { id: 2, title: 'The Building Blocks', description: 'Core concepts explained simply', topics: ['Basic Concepts', 'Key Terminology', 'Simple Examples'], difficulty: 'absolute-beginner' },
            { id: 3, title: 'Your First Real Program', description: 'Build something that works!', topics: ['Putting Basics Together', 'Your First Project', 'Common Mistakes'], difficulty: 'absolute-beginner' },
            // BEGINNER (Chapters 4-6)
            { id: 4, title: 'Core Patterns & Techniques', description: 'The patterns every developer uses', topics: ['Essential Patterns', 'Code Organization', 'Problem Solving'], difficulty: 'beginner' },
            { id: 5, title: 'Working with Data', description: 'Handle real data like a pro', topics: ['Data Structures', 'Manipulation', 'Storage'], difficulty: 'beginner' },
            { id: 6, title: 'Building Real Features', description: 'Create features people actually use', topics: ['Feature Development', 'User Input', 'Output Formatting'], difficulty: 'beginner' },
            // INTERMEDIATE (Chapters 7-10)
            { id: 7, title: 'Intermediate Patterns', description: 'Level up your coding skills', topics: ['Design Patterns', 'Code Reuse', 'Modularity'], difficulty: 'intermediate' },
            { id: 8, title: 'Error Handling & Testing', description: 'Write code that never breaks', topics: ['Error Handling', 'Testing Basics', 'Debugging'], difficulty: 'intermediate' },
            { id: 9, title: 'Real-World Applications', description: 'Industry-standard implementations', topics: ['APIs', 'Libraries', 'Frameworks'], difficulty: 'intermediate' },
            { id: 10, title: 'Algorithms & Problem Solving', description: 'Think like a computer scientist', topics: ['Common Algorithms', 'Complexity', 'Optimization'], difficulty: 'intermediate' },
            // ADVANCED (Chapters 11-14)
            { id: 11, title: 'Advanced Architecture', description: 'Design systems, not just code', topics: ['System Design', 'Architecture Patterns', 'Scalability'], difficulty: 'advanced' },
            { id: 12, title: 'Performance & Optimization', description: 'Make everything blazing fast', topics: ['Profiling', 'Optimization', 'Memory Management'], difficulty: 'advanced' },
            { id: 13, title: 'Industry Best Practices', description: 'Code like a senior engineer', topics: ['Clean Code', 'Code Review', 'Documentation'], difficulty: 'advanced' },
            { id: 14, title: 'Complex Problem Solving', description: 'Tackle the hardest challenges', topics: ['Hard Problems', 'Edge Cases', 'Trade-offs'], difficulty: 'advanced' },
            // EXPERT (Chapters 15-16)
            { id: 15, title: 'Expert-Level Deep Dive', description: 'Master the internals', topics: ['Internal Mechanics', 'Advanced Patterns', 'Production Code'], difficulty: 'expert' },
            { id: 16, title: 'Mastery Capstone: Build & Ship', description: 'Build an expert-level project from scratch', topics: ['Capstone Project', 'Full Implementation', 'Deployment'], difficulty: 'expert' },
        ],
    }
}
