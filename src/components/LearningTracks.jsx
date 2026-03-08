import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateCourseOutline } from './CourseViewer'
import { Search, BookOpen, Code, Trophy, Cpu, Monitor, Layers, Globe, Database, Plug, Zap, Building2, Server, GitCommitHorizontal, GraduationCap } from 'lucide-react'

// ── Popular search suggestions ────────────────────────────────────────
const POPULAR_SEARCHES = [
  { label: 'Python for Beginners', icon: <Code className="w-4 h-4" /> },
  { label: 'Machine Learning in Python', icon: <Cpu className="w-4 h-4" /> },
  { label: 'React.js Fundamentals', icon: <Monitor className="w-4 h-4" /> },
  { label: 'Data Structures & Algorithms', icon: <Layers className="w-4 h-4" /> },
  { label: 'Web Development', icon: <Globe className="w-4 h-4" /> },
  { label: 'JavaScript ES6+', icon: <Code className="w-4 h-4 text-orange-400" /> },
  { label: 'SQL & Databases', icon: <Database className="w-4 h-4" /> },
  { label: 'REST API Design', icon: <Plug className="w-4 h-4" /> },
  { label: 'C++ Programming', icon: <Zap className="w-4 h-4 text-orange-400" /> },
  { label: 'System Design', icon: <Building2 className="w-4 h-4" /> },
  { label: 'Node.js Backend', icon: <Server className="w-4 h-4" /> },
  { label: 'Git & Version Control', icon: <GitCommitHorizontal className="w-4 h-4 text-orange-400" /> },
]

// ── Featured tracks (kept from original) ──────────────────────────────
const FEATURED_TRACKS = [
  {
    id: 'cpp-beginner',
    title: 'Beginner C++ Developer',
    icon: <Zap className="w-6 h-6 text-white" />,
    color: 'from-purple-600 to-violet-500',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    accent: 'text-purple-400',
    level: 'Beginner',
    duration: '8 weeks',
    description: 'Master C++ from scratch. Build real programs using the most powerful systems language.',
    language: 'cpp',
    chapterCount: 6,
  },
  {
    id: 'python-beginner',
    title: 'Beginner Python + OOP',
    icon: <Code className="w-6 h-6 text-white" />,
    color: 'from-orange-600 to-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    accent: 'text-orange-400',
    level: 'Beginner',
    duration: '6 weeks',
    description: 'Python from zero to OOP mastery. Perfect for absolute beginners.',
    language: 'python',
    chapterCount: 6,
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer Path',
    icon: <Server className="w-6 h-6 text-white" />,
    color: 'from-neutral-700 to-neutral-500',
    border: 'border-neutral-500/30',
    bg: 'bg-neutral-500/10',
    accent: 'text-neutral-400',
    level: 'Intermediate',
    duration: '12 weeks',
    description: 'Go from coder to backend engineer. APIs, databases, system design.',
    language: 'python',
    chapterCount: 4,
  },
  {
    id: 'competitive-programming',
    title: 'Competitive Programming',
    icon: <Trophy className="w-6 h-6 text-white" />,
    color: 'from-orange-600 to-red-500',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    accent: 'text-orange-400',
    level: 'Advanced',
    duration: '16 weeks',
    description: 'LeetCode, Codeforces, ICPC prep. From arrays to dynamic programming.',
    language: 'python',
    chapterCount: 3,
  },
  {
    id: 'ai-ml-beginner',
    title: 'AI/ML Beginner Path',
    icon: <Cpu className="w-6 h-6 text-white" />,
    color: 'from-zinc-600 to-zinc-400',
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/10',
    accent: 'text-zinc-400',
    level: 'Intermediate',
    duration: '10 weeks',
    description: 'Math, ML theory, and hands-on Python ML. From numpy to neural nets.',
    language: 'python',
    chapterCount: 3,
  },
]

// ── Featured track card ───────────────────────────────────────────────
function FeaturedTrackCard({ track, onClick, completionStatus }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass-card border ${track.border} overflow-hidden cursor-pointer group`}
    >
      <div className={`p-5 ${track.bg} transition-all`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${track.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
            {track.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base text-white truncate">{track.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${track.border} ${track.bg} ${track.accent}`}>
                {track.level}
              </span>
              <span className="text-xs text-white/30">{track.duration}</span>
            </div>
          </div>
          {completionStatus === 'completed' && (
            <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-400 text-sm">✓</div>
          )}
        </div>
        <p className="text-sm text-white/45 leading-relaxed line-clamp-2">{track.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/25">{track.chapterCount} chapters</span>
          <span className={`text-xs font-semibold ${track.accent} group-hover:translate-x-1 transition-transform`}>
            Start Course →
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── My course card (in-progress or completed) ─────────────────────────
function MyCourseCard({ course, onClick }) {
  const progress = course.totalChapters > 0
    ? Math.round((course.completed?.length || 0) / course.totalChapters * 100)
    : 0

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card border border-white/10 p-4 cursor-pointer hover:border-orange-500/30 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-white truncate flex-1 mr-3">{course.title}</h4>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${progress >= 100 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
          {progress >= 100 ? '✓ Done' : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-pink-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-white/25">
          {course.completed?.length || 0}/{course.totalChapters} chapters
        </span>
        <span className="text-xs text-orange-400 font-semibold">
          {progress >= 100 ? 'Review →' : 'Continue →'}
        </span>
      </div>
    </motion.div>
  )
}


// ── Main component ────────────────────────────────────────────────────
export default function LearningTracks({ skills, onStartCourse }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [myCourses, setMyCourses] = useState({})
  const [completedCourses, setCompletedCourses] = useState([])
  const [error, setError] = useState(null)

  // Load saved courses from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('code_obsidian_courses') || '{}')
      setMyCourses(saved)
      const completed = JSON.parse(localStorage.getItem('code_obsidian_completed') || '[]')
      setCompletedCourses(completed)
    } catch { /* ignore */ }
  }, [])

  // Handle search / course generation
  const handleSearch = async (query = searchQuery) => {
    const topic = query.trim()
    if (!topic || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const courseOutline = await generateCourseOutline(topic)
      onStartCourse(courseOutline)
    } catch (err) {
      setError('Failed to generate course. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle featured track click
  const handleFeaturedClick = (track) => {
    handleSearch(track.title)
  }

  const myCourseList = Object.values(myCourses).filter(c => c.title).sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
  const completedIds = new Set(completedCourses.map(c => c.id))

  return (
    <div className="space-y-10">

      {/* ── Search Section ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border border-white/10 p-8 text-center relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-pink-500/5 pointer-events-none" />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5"
          >
            <span className="text-4xl mb-3 block">🎓</span>
            <h2 className="text-xl font-display font-black text-white mb-2">
              What do you want to <span className="gradient-text">learn</span> today?
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Search any topic — AI will generate a complete course with lessons, examples, and a final exam.
            </p>
          </motion.div>

          {/* Search input */}
          <div className="max-w-2xl mx-auto mb-5">
            <div className="relative group">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Machine Learning in Python, React Hooks, Data Structures..."
                disabled={isGenerating}
                className="w-full bg-white/5 border-2 border-white/10 focus:border-orange-500/50 rounded-2xl px-6 py-4 pl-12 text-base text-white placeholder-white/25 focus:outline-none transition-all disabled:opacity-60"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-white/50" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSearch()}
                disabled={!searchQuery.trim() || isGenerating}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 transition-all"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : 'Start Course'}
              </motion.button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm mb-4"
            >
              {error}
            </motion.div>
          )}

          {/* Loading overlay */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-3 border-white/10 border-t-orange-500 rounded-full"
                />
                <p className="text-white/50 text-sm font-mono">
                  Building your course on <span className="text-orange-400 font-semibold">"{searchQuery}"</span>...
                </p>
                <p className="text-white/25 text-xs">Creating curriculum, chapters, and learning objectives</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular suggestions */}
          {!isGenerating && (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {POPULAR_SEARCHES.map(s => (
                <motion.button
                  key={s.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSearchQuery(s.label); handleSearch(s.label) }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${searchQuery === s.label
                    ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                    : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/60 hover:bg-white/5'
                    }`}
                >
                  {s.icon} {s.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── My Courses (if any) ──────────────────────────────────────── */}
      {myCourseList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-400" /> My Courses
                <span className="text-xs font-mono text-white/30 font-normal">({myCourseList.length})</span>
              </h3>
              <p className="text-xs text-white/30 mt-0.5">Continue where you left off</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCourseList.slice(0, 6).map(course => (
              <MyCourseCard
                key={course.title}
                course={course}
                onClick={() => handleSearch(course.title)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Completed Courses ─────────────────────────────────────────── */}
      {completedCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-orange-400" /> Completed Courses
            <span className="text-xs font-mono text-white/30 font-normal">({completedCourses.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {completedCourses.map(c => (
              <motion.div
                key={c.id}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/8 border border-green-500/20 text-sm"
              >
                <span className="text-green-400">✓</span>
                <span className="text-white/70">{c.title}</span>
                <span className="text-xs text-green-400/60 font-mono">
                  {c.score}%
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Featured Tracks ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              ⭐ Featured Tracks
            </h3>
            <p className="text-xs text-white/30 mt-0.5">Curated learning paths by our AI</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_TRACKS.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
            >
              <FeaturedTrackCard
                track={track}
                onClick={() => handleFeaturedClick(track)}
                completionStatus={completedIds.has(track.id) ? 'completed' : null}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card border border-white/5 p-6"
      >
        <h3 className="text-base font-display font-bold text-white mb-4 text-center">
          How It <span className="gradient-text">Works</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', icon: <Search className="w-8 h-8 text-neutral-400 mx-auto" />, title: 'Search', desc: 'Type any topic you want to learn' },
            { step: '2', icon: <BookOpen className="w-8 h-8 text-neutral-400 mx-auto" />, title: 'Learn', desc: 'AI generates personalized lessons' },
            { step: '3', icon: <Code className="w-8 h-8 text-neutral-400 mx-auto" />, title: 'Practice', desc: 'Try code examples and exercises' },
            { step: '4', icon: <GraduationCap className="w-8 h-8 text-neutral-400 mx-auto" />, title: 'Certify', desc: 'Pass the final exam to complete' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center p-4"
            >
              <div className="mb-3">{item.icon}</div>
              <div className="text-xs font-mono text-orange-400 mb-1">Step {item.step}</div>
              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-white/35">{item.desc}</p>
              {i < 3 && <div className="text-white/15 text-lg mt-2 hidden md:block">→</div>}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}