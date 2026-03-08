import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Skill dependency map
const DEPENDENCIES = {
  'Variables':        [],
  'Data Types':       ['Variables'],
  'Conditionals':     ['Variables', 'Data Types'],
  'Loops':            ['Variables', 'Conditionals'],
  'Functions':        ['Variables', 'Loops'],
  'Arrays':           ['Variables', 'Loops'],
  'Recursion':        ['Functions'],
  'Pointers':         ['Variables', 'Arrays'],
  'OOP':              ['Functions', 'Arrays'],
  'Time Complexity':  ['Loops', 'Recursion', 'Arrays'],
}

// Fixed node positions (normalized 0-1)
const NODE_POSITIONS = {
  'Variables':        { x: 0.5,  y: 0.08 },
  'Data Types':       { x: 0.25, y: 0.22 },
  'Conditionals':     { x: 0.75, y: 0.22 },
  'Loops':            { x: 0.5,  y: 0.38 },
  'Functions':        { x: 0.2,  y: 0.52 },
  'Arrays':           { x: 0.8,  y: 0.52 },
  'Recursion':        { x: 0.2,  y: 0.68 },
  'Pointers':         { x: 0.65, y: 0.68 },
  'OOP':              { x: 0.5,  y: 0.80 },
  'Time Complexity':  { x: 0.5,  y: 0.93 },
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

export default function SkillGraph({ skills }) {
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoveredSkill, setHoveredSkill] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    setDims({ w: width, h: height })
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const getPos = (name) => ({
    x: NODE_POSITIONS[name].x * dims.w,
    y: NODE_POSITIONS[name].y * dims.h,
  })

  // Compute gap detection
  const weakSkills = Object.entries(skills)
    .filter(([, s]) => s.mastery < 40)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Gap detection alert */}
      {weakSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border border-red-500/30 bg-red-500/5"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🔍</span>
            <span className="font-semibold text-red-400">Knowledge Gap Detected</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {weakSkills.map(([name, skill]) => (
              <div key={name} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-white/80">{name}</span>
                <span className="text-red-400 font-semibold">{skill.mastery}%</span>
                <span className="text-white/30">· {skill.errorFreq} errors</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3">
            💡 Suggested: Practice with Sage before attempting advanced topics that depend on these skills
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph canvas */}
        <div className="lg:col-span-2 glass-card p-4" style={{ height: 520 }}>
          <div className="text-sm text-white/40 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Mastered (70+)
            <span className="w-3 h-3 rounded-full bg-yellow-500 ml-3" /> Learning (40–69)
            <span className="w-3 h-3 rounded-full bg-red-500 ml-3" /> Weak (&lt;40)
          </div>
          <div ref={containerRef} className="relative w-full" style={{ height: 460 }}>
            {/* SVG edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {Object.entries(DEPENDENCIES).map(([skill, deps]) =>
                deps.map(dep => {
                  const from = getPos(dep)
                  const to = getPos(skill)
                  const color = getMasteryColor(skills[dep]?.mastery || 0)
                  return (
                    <line
                      key={`${dep}-${skill}`}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
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
              const skill = skills[name] || { mastery: 0, confidence: 'low', errorFreq: 0, lastPracticed: 'never' }
              const pos = getPos(name)
              const color = getMasteryColor(skill.mastery)
              const size = 38 + (skill.mastery / 100) * 16
              const isHovered = hoveredSkill === name

              return (
                <motion.div
                  key={name}
                  className="absolute cursor-pointer"
                  style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
                  onHoverStart={() => setHoveredSkill(name)}
                  onHoverEnd={() => setHoveredSkill(null)}
                  whileHover={{ scale: 1.2 }}
                >
                  {/* Node circle */}
                  <div
                    className="rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all"
                    style={{
                      width: size, height: size,
                      borderColor: color,
                      backgroundColor: color + '22',
                      boxShadow: isHovered ? getMasteryGlow(skill.mastery) : 'none',
                      color: color,
                    }}
                  >
                    {skill.mastery}
                  </div>

                  {/* Label */}
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                    <span className={`text-xs font-medium ${isHovered ? 'text-white' : 'text-white/60'}`}>{name}</span>
                  </div>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: -12, scale: 1 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-card p-3 text-xs min-w-40 z-50 border-white/20"
                    >
                      <div className="font-semibold text-white mb-2">{name}</div>
                      <div className="space-y-1 text-white/60">
                        <div className="flex justify-between gap-4">
                          <span>Mastery</span>
                          <span style={{ color }}>{skill.mastery}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Confidence</span>
                          <span className="capitalize">{skill.confidence}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Errors</span>
                          <span className="text-red-400">{skill.errorFreq}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Last practiced</span>
                          <span>{skill.lastPracticed}</span>
                        </div>
                      </div>
                      <div className="mt-2 bg-white/5 rounded h-1.5">
                        <div className="h-1.5 rounded transition-all" style={{ width: `${skill.mastery}%`, backgroundColor: color }} />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Skill list panel */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white/70 text-sm">All Skills</h3>
          {Object.entries(skills)
            .sort((a, b) => b[1].mastery - a[1].mastery)
            .map(([name, skill]) => {
              const color = getMasteryColor(skill.mastery)
              return (
                <motion.div
                  key={name}
                  whileHover={{ x: 4 }}
                  className="glass-card p-3 cursor-pointer"
                  onHoverStart={() => setHoveredSkill(name)}
                  onHoverEnd={() => setHoveredSkill(null)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-sm font-bold" style={{ color }}>{skill.mastery}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.mastery}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-white/30">
                    <span className="capitalize">{skill.confidence} confidence</span>
                    <span>{skill.lastPracticed}</span>
                  </div>
                </motion.div>
              )
            })}
        </div>
      </div>
    </div>
  )
}