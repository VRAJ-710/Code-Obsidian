import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { callAI } from '../aiService'
import ZaraExaminer from './ZaraExaminer'
import { dbService } from '../dbService'
import { Target, CheckCircle, AlertTriangle, Brain, Search, CheckCircle2, AlertCircle, Flame, TrendingUp, Map } from 'lucide-react'

// ── Dependency / Graph Info (From SkillGraph) ──────────────────────────
const DEPENDENCIES = {
  'Variables': [],
  'Data Types': ['Variables'],
  'Conditionals': ['Variables', 'Data Types'],
  'Loops': ['Variables', 'Conditionals'],
  'Functions': ['Variables', 'Loops'],
  'Arrays': ['Variables', 'Loops'],
  'Recursion': ['Functions'],
  'Pointers': ['Variables', 'Arrays'],
  'OOP': ['Functions', 'Arrays'],
  'Time Complexity': ['Loops', 'Recursion', 'Arrays'],
}

const NODE_POSITIONS = {
  'Variables': { x: 0.5, y: 0.08 },
  'Data Types': { x: 0.25, y: 0.22 },
  'Conditionals': { x: 0.75, y: 0.22 },
  'Loops': { x: 0.5, y: 0.38 },
  'Functions': { x: 0.2, y: 0.52 },
  'Arrays': { x: 0.8, y: 0.52 },
  'Recursion': { x: 0.2, y: 0.68 },
  'Pointers': { x: 0.65, y: 0.68 },
  'OOP': { x: 0.5, y: 0.80 },
  'Time Complexity': { x: 0.5, y: 0.93 },
}

function getMasteryColor(mastery) {
  if (mastery >= 70) return '#22c55e'
  if (mastery >= 40) return '#eab308'
  return '#ef4444'
}

function getMasteryGlow(mastery) {
  if (mastery >= 70) return '0 0 20px rgba(34,197,94,0.4)'
  if (mastery >= 40) return '0 0 20px rgba(234,179,8,0.4)'
  return '0 0 20px rgba(239,68,68,0.4)'
}

// ── Components ────────────────────────────────────────────────────────
function RadialProgress({ value, size = 80, color = '#FF6B35', label }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {Math.round(value)}%
        </text>
      </svg>
      {label && <span className="text-xs text-white/50 text-center">{label}</span>}
    </div>
  )
}

// ── Tab 1: Dashboard ──────────────────────────────────────────────────
function DashboardTab({ skills, currentUser }) {
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoveredSkill, setHoveredSkill] = useState(null)
  const [stats, setStats] = useState({ activity: {}, zara: null, playground: null, courses: {}, completed: [] })

  useEffect(() => {
    if (currentUser) {
      dbService.getUserData(currentUser).then(data => {
        if (data) {
          setStats({
            activity: data.activity || {},
            zara: data.stats?.zara || { एग्जाम्सTaken: 0, totalScore: 0 },
            playground: data.stats?.playground || { totalRuns: 0, successRuns: 0 },
            courses: data.courses || {},
            completed: data.completed_courses || []
          });
        }
      });
    }
  }, [currentUser])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setDims({ w: entries[0].contentRect.width, h: entries[0].contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const getPos = (name) => ({
    x: NODE_POSITIONS[name].x * dims.w,
    y: NODE_POSITIONS[name].y * dims.h,
  })

  const skillList = Object.entries(skills)
  const avgMastery = Math.round(skillList.reduce((s, [, v]) => s + v.mastery, 0) / skillList.length) || 0
  const mastered = skillList.filter(([, v]) => v.mastery >= 70).length
  const totalErrors = skillList.reduce((s, [, v]) => s + (v.errorFreq || 0), 0)
  const cognitiveLoad = Math.min(100, Math.round(
    skillList.reduce((s, [, v]) => s + (100 - v.mastery) * ((v.errorFreq || 0) / 10), 0) / skillList.length
  )) || 0

  const weakSkills = skillList.filter(([, s]) => s.mastery < 40).sort((a, b) => a[1].mastery - b[1].mastery).slice(0, 3)
  const strongest = [...skillList].sort((a, b) => b[1].mastery - a[1].mastery).slice(0, 3)

  // 365 days streak logic instead of 90
  const activityDays = Array.from({ length: 365 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (364 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, mins: stats.activity[dateStr] || 0 }
  })

  const getActivityColor = (mins) => {
    if (mins === 0) return 'bg-white/5 border border-white/5'
    if (mins < 10) return 'bg-green-500/30 border border-green-500/20'
    if (mins < 30) return 'bg-green-500/60 border border-green-500/40'
    return 'bg-green-500 border border-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.5)]'
  }

  const enrolledCoursesCount = Object.keys(stats.courses || {}).length
  const completedCoursesCount = Array.isArray(stats.completed) ? stats.completed.length : 0

  return (
    <div className="space-y-6">
      {currentUser && (
        <div className="glass-card px-6 py-4 border-l-4 border-l-purple-500 bg-purple-500/5 mb-4 rounded-lg">
          <h2 className="text-xl font-display font-semibold text-white">
            Welcome back, <span className="text-purple-400">{currentUser}</span>!
          </h2>
          <p className="text-sm font-mono tracking-wide text-white/50 mt-1">Here is your continuous learning progress.</p>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Mastery', value: `${avgMastery}%`, icon: <Target className="w-6 h-6 text-orange-400" />, color: 'from-orange-500/20 to-red-500/10', border: 'border-orange-500/20' },
          { label: 'Skills Mastered', value: `${mastered}/${skillList.length}`, icon: <CheckCircle className="w-6 h-6 text-green-400" />, color: 'from-green-500/20 to-teal-500/10', border: 'border-green-500/20' },
          { label: 'Total Errors', value: totalErrors, icon: <AlertTriangle className="w-6 h-6 text-red-400" />, color: 'from-red-500/20 to-pink-500/10', border: 'border-red-500/20' },
          { label: 'Cognitive Load', value: `${cognitiveLoad}%`, icon: <Brain className="w-6 h-6 text-purple-400" />, color: 'from-purple-500/20 to-blue-500/10', border: 'border-purple-500/20' },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass-card p-5 bg-gradient-to-br ${stat.color} border ${stat.border}`}>
            <div className="mb-2">{stat.icon}</div>
            <div className="text-3xl font-display font-black text-white">{stat.value}</div>
            <div className="text-xs text-white/50 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {weakSkills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-6 h-6 text-red-500" />
            <span className="font-semibold text-red-400">Knowledge Gaps Detected</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {weakSkills.map(([name, skill]) => (
              <div key={name} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
                <span className="text-white/80">{name}</span>
                <span className="text-red-400 font-semibold">{skill.mastery}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 glass-card p-4" style={{ height: 520 }}>
          <div className="text-sm text-white/40 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Mastered (70+)
            <span className="w-3 h-3 rounded-full bg-yellow-500 ml-3" /> Learning (40–69)
            <span className="w-3 h-3 rounded-full bg-red-500 ml-3" /> Weak (&lt;40)
          </div>
          <div ref={containerRef} className="relative w-full" style={{ height: 460 }}>
            {/* Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {Object.entries(DEPENDENCIES).map(([skill, deps]) =>
                deps.map(dep => {
                  const from = getPos(dep)
                  const to = getPos(skill)
                  const color = getMasteryColor(skills[dep]?.mastery || 0)
                  return (
                    <line
                      key={`${dep}-${skill}`}
                      x1={from?.x || 0} y1={from?.y || 0} x2={to?.x || 0} y2={to?.y || 0}
                      stroke={color} strokeWidth={hoveredSkill === skill || hoveredSkill === dep ? 2.5 : 1}
                      strokeOpacity={hoveredSkill && hoveredSkill !== skill && hoveredSkill !== dep ? 0.1 : 0.4}
                      strokeDasharray={skills[dep]?.mastery < 40 ? '4 4' : '0'}
                    />
                  )
                })
              )}
            </svg>
            {/* Nodes */}
            {Object.entries(NODE_POSITIONS).map(([name]) => {
              const skill = skills[name] || { mastery: 0, errorFreq: 0 }
              const pos = getPos(name)
              const color = getMasteryColor(skill.mastery)
              const size = 38 + (skill.mastery / 100) * 16
              const isHovered = hoveredSkill === name
              return (
                <motion.div
                  key={name}
                  className="absolute cursor-pointer"
                  style={{ left: pos?.x || 0, top: pos?.y || 0, transform: 'translate(-50%, -50%)' }}
                  onHoverStart={() => setHoveredSkill(name)}
                  onHoverEnd={() => setHoveredSkill(null)}
                  whileHover={{ scale: 1.2 }}
                >
                  <div className="rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all"
                    style={{ width: size, height: size, borderColor: color, backgroundColor: color + '22', boxShadow: isHovered ? getMasteryGlow(skill.mastery) : 'none', color }}>
                    {skill.mastery}
                  </div>
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                    <span className={`text-xs font-medium ${isHovered ? 'text-white' : 'text-white/60'}`}>{name}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Strongest/Weakest List */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="font-display font-bold mb-4 text-white/80 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400" /> Top Strengths</h3>
            <div className="space-y-3">
              {strongest.map(([name, skill]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-green-400 font-bold">{skill.mastery}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${skill.mastery}%` }} className="h-full bg-green-500 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="font-display font-bold mb-4 text-white/80 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-400" /> Focus Areas</h3>
            <div className="space-y-3">
              {weakSkills.map(([name, skill]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-red-400 font-bold">{skill.mastery}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${skill.mastery}%` }} className="h-full bg-red-500 rounded-full" />
                  </div>
                </div>
              ))}
              {weakSkills.length === 0 && <p className="text-xs text-white/40">No major weaknesses detected! Keep going.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* New Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Activity Streaks */}
        <div className="md:col-span-2 glass-card p-5">
          <h3 className="font-display font-bold mb-4 text-white/80 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Practice Activity (Current & Longest Streak)</h3>
          <div className="overflow-x-auto min-w-full pb-2 custom-scrollbar">
            <div className="flex gap-1.5 min-w-max">
              {activityDays.map(d => (
                <div key={d.date} title={`${d.date}: ${d.mins} mins`} className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-colors hover:scale-125 hover:z-10 ${getActivityColor(d.mins)}`} />
              ))}
            </div>
          </div>
          <div className="text-[10px] text-white/40 flex items-center justify-end gap-2 mt-2">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/5" />
            <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/20" />
            <div className="w-3 h-3 rounded-sm bg-green-500/60 border border-green-500/40" />
            <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span>More</span>
          </div>
        </div>

        {/* 2. Practice & Course Stats */}
        <div className="glass-card p-5 flex flex-col gap-4 justify-center">
          <div>
            <div className="text-xs text-white/50 mb-1 uppercase tracking-wider font-semibold">Learning Tracks</div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-display font-black text-blue-400">{enrolledCoursesCount} <span className="text-sm font-normal text-white/40">enrolled</span></div>
              <div className="text-3xl font-display font-black text-pink-400">{completedCoursesCount} <span className="text-sm font-normal text-white/40">completed</span></div>
            </div>
          </div>

          <div className="border-t border-white/10 my-1"></div>

          <div>
            <div className="text-xs text-white/50 mb-1 uppercase tracking-wider font-semibold">Zara Examiner</div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-display font-black text-purple-400">{stats.zara?.examsTaken || 0} <span className="text-sm font-normal text-white/40">exams</span></div>
              <div className="text-3xl font-display font-black text-yellow-400">{stats.zara?.totalScore ? Math.round(stats.zara.totalScore / stats.zara.examsTaken) : 0} <span className="text-sm font-normal text-white/40">avg score</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: AI Predictions ─────────────────────────────────────────────
function PredictionsTab({ skills }) {
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const historyData = localStorage.getItem('code_obsidian_skill_history')
        let history = []
        if (historyData) {
          try { history = JSON.parse(historyData) } catch (e) { }
        }

        const historySummary = history.length > 0
          ? `User has ${history.length} historical skill snapshots. Latest mastery: ${JSON.stringify(history[history.length - 1].skills)}`
          : "No history yet."

        const zaraStats = localStorage.getItem('code_obsidian_zara_stats') || 'No Zara exams taken'
        const playgroundStats = localStorage.getItem('code_obsidian_playground_stats') || 'No code run in playground'
        const weeklyTests = localStorage.getItem('code_obsidian_weekly_tests') || '[]'
        const enrolledCourses = Object.keys(JSON.parse(localStorage.getItem('code_obsidian_courses') || '{}')).length
        const completedCourses = (JSON.parse(localStorage.getItem('code_obsidian_completed') || '[]')).length

        const prompt = `You are an AI learning analyst.
Analyze this user's current skills and history, and predict their learning trajectory.

Current Skills: ${JSON.stringify(skills)}
History Snippet: ${historySummary}
Zara Practice Runs: ${zaraStats}
Playground Code Runs: ${playgroundStats}
Periodic Test Results: ${weeklyTests}
Courses Enrolled/Completed: ${enrolledCourses}/${completedCourses}

Return EXACTLY this JSON format:
{
  "projectedMastery": [
    { "skill": "SkillName1", "daysToMastery": 3, "confidence": "high" },
    { "skill": "SkillName2", "daysToMastery": 5, "confidence": "medium" }
  ],
  "learningPath": [
    "Step 1 to take today based on weaknesses",
    "Step 2 for tomorrow",
    "Step 3 for next week"
  ],
  "velocityStatus": "Accelerating | Steady | Needs Focus",
  "insight": "One paragraph summarizing their learning trend and what they should focus on."
}`

        const resp = await callAI("You are an expert ML learning analyst. Output only valid JSON.", [{ role: 'user', content: prompt }])

        let jsonStr = resp.trim()
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?\n?/, '').replace(/```$/, '').trim()
        setPredictions(JSON.parse(jsonStr))
      } catch (err) {
        setPredictions({
          projectedMastery: [
            { skill: 'Variables', daysToMastery: 1, confidence: 'high' },
            { skill: 'Functions', daysToMastery: 4, confidence: 'medium' }
          ],
          learningPath: ["Practice basic syntax", "Build a small project", "Review advanced topics"],
          velocityStatus: "Steady",
          insight: "Keep practicing consistently to improve your mastery."
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPredictions()
  }, [skills])

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm font-mono tracking-widest uppercase">Calculating Trajectory...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h3 className="font-display font-bold text-lg text-white">Learning Trajectory</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded bg-white/10 text-white/60">{predictions?.velocityStatus}</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-6">{predictions?.insight}</p>

          <h4 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">Estimated Time to Mastery (90%+)</h4>
          <div className="space-y-3">
            {predictions?.projectedMastery?.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm font-medium text-white/80">{p.skill}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-400">~{p.daysToMastery} days</div>
                  <div className="text-xs text-white/30">{p.confidence} confidence</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Map className="w-6 h-6 text-white" />
            <h3 className="font-display font-bold text-lg text-white">Recommended Learning Path</h3>
          </div>
          <div className="relative border-l-2 border-white/10 ml-3 space-y-8 pb-4">
            {predictions?.learningPath?.map((step, i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-black border-2 border-purple-500" />
                <div className="text-xs font-bold text-purple-400 mb-1">STEP {i + 1}</div>
                <p className="text-sm text-white/80 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Tab 3: AI Mentor ──────────────────────────────────────────────────
function MentorTab({ skills, courses }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your continuous learning mentor. I analyze your skill graph, exam scores, and practice history. What would you like to focus on today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return

    setInput('')
    const newMsgs = [...messages, { role: 'user', content: text }]
    setMessages(newMsgs)
    setLoading(true)

    try {
      const zaraStats = localStorage.getItem('code_obsidian_zara_stats') || '{"examsTaken":0,"totalScore":0}'
      const playgroundStats = localStorage.getItem('code_obsidian_playground_stats') || '{"totalRuns":0,"successRuns":0}'
      const weeklyTests = localStorage.getItem('code_obsidian_weekly_tests') || '[]'
      const activityStreaks = localStorage.getItem('code_obsidian_activity_streaks') || '{}'

      const systemPrompt = `You are an expert AI Learning Mentor for Code Obsidian.
You have FULL context of this user's current progress.

User's Real-time Skills Data:
${JSON.stringify(skills, null, 2)}

User's Completed Courses:
${JSON.stringify(courses || [], null, 2)}

Zara Exam Practice: ${zaraStats}
Playground Code Execution: ${playgroundStats}
Periodic Skill Assessments: ${weeklyTests}
Recent Activity Minutes: ${activityStreaks}

Your personality: Encouraging, deeply analytical, and highly personalized.
NEVER give generic advice. ALWAYS reference their actual skills ("I see you're struggling with Recursion (20%)...") and recent activity ("I see you did 15 minutes of practice today...").
Provide concrete, actionable code exercises or study plans. Use markdown. Keep responses concise and practical.`

      const response = await callAI(systemPrompt, newMsgs.map(m => ({ role: m.role, content: m.content })))
      setMessages([...newMsgs, { role: 'assistant', content: response }])
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: "Sorry, I'm having trouble analyzing your data right now. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[600px] flex gap-6">
      {/* Mentor Context/Suggestions sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">Quick Actions</h4>
          <div className="space-y-2">
            {[
              "What should I practice next?",
              "Explain my weakest skill",
              "Create a 3-day study plan",
              "Give me a coding challenge"
            ].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="w-full text-left text-xs text-white/70 hover:text-white p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card p-4 bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-400">Context Active</span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            The mentor observes your Skill Graph and history in real-time to provide personalized guidance.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${msg.role === 'user'
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                : 'bg-white/10 text-white/80 border border-white/5'
                }`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-3 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask your mentor for personalized advice..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 4: Periodic Tests ─────────────────────────────────────────────
function TestsTab({ onSkillUpdate }) {
  return (
    <div className="h-[600px] glass-card overflow-hidden">
      <ZaraExaminer isPeriodicTest={true} onSkillUpdate={onSkillUpdate} />
    </div>
  )
}


// ── Main Layout ───────────────────────────────────────────────────────
export default function SkillTrack({ skills, onSkillUpdate, currentUser }) {
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard | predictions | mentor | tests
  const [completedCourses, setCompletedCourses] = useState([])

  useEffect(() => {
    try {
      const completed = JSON.parse(localStorage.getItem('code_obsidian_completed') || '[]')
      setCompletedCourses(completed)
    } catch { }
  }, [])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Skill <span className="gradient-text">Track</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Real-time tracking · ML predictions · Personal Mentor
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-black/20 p-1.5 rounded-xl border border-white/5 w-fit">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'predictions', label: '🤖 AI Predictions' },
          { id: 'mentor', label: '🧑‍🏫 AI Mentor' },
          { id: 'tests', label: '📅 Periodic Tests' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <DashboardTab skills={skills} currentUser={currentUser} />}
          {activeTab === 'predictions' && <PredictionsTab skills={skills} />}
          {activeTab === 'mentor' && <MentorTab skills={skills} courses={completedCourses} />}
          {activeTab === 'tests' && <TestsTab onSkillUpdate={onSkillUpdate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
