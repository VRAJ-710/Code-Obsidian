import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOverallProgress, suggestNextSkill } from '../skillEngine'
import { Target, Brain, CheckCircle, Bug, Zap, Play, Search, Code, Map } from 'lucide-react'

function Ring({ value, size = 64, stroke = 5, color = '#FF6B35' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill="white"
        fontSize={size * 0.22} fontWeight="700" fontFamily="var(--font-display)">{value}%</text>
    </svg>
  )
}

function SkillRow({ name, mastery }) {
  const color = mastery >= 70 ? '#22c55e' : mastery >= 45 ? '#eab308' : '#ef4444'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color }}>{mastery}%</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div style={{ height: '100%', borderRadius: 2, background: color }}
          initial={{ width: 0 }} animate={{ width: `${mastery}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  )
}

export default function SlidingDashboard({ skills, onNavigate, isOpen, onClose }) {
  const [tab, setTab] = useState('skills')
  const overall = getOverallProgress(skills)
  const nextSkill = suggestNextSkill(skills)
  const allSkills = Object.entries(skills).sort((a, b) => b[1].mastery - a[1].mastery)
  const weakSkills = Object.entries(skills).sort((a, b) => a[1].mastery - b[1].mastery).slice(0, 4)
  const ringColor = overall >= 70 ? '#22c55e' : overall >= 45 ? '#eab308' : '#FF6B35'

  const ACTIVITIES = [
    { icon: <Brain className="w-3 h-3 text-current" />, text: 'Sage helped with Recursion concepts', time: '2 min ago', color: '#FF6B35' },
    { icon: <CheckCircle className="w-3 h-3 text-current" />, text: 'Conditionals mastery +2% after practice', time: '15 min ago', color: '#22c55e' },
    { icon: <Bug className="w-3 h-3 text-current" />, text: 'Rex debugged a null pointer error', time: '1h ago', color: '#a855f7' },
    { icon: <Zap className="w-3 h-3 text-current" />, text: 'Zara scored 78/100 on OOP challenge', time: '2h ago', color: '#eab308' },
    { icon: <Play className="w-3 h-3 text-current" />, text: 'Ran Python code — 0 errors', time: '3h ago', color: '#3b82f6' },
    { icon: <Search className="w-3 h-3 text-current" />, text: 'Aria reviewed bubble sort implementation', time: '5h ago', color: '#06b6d4' },
  ]

  const QUICK = [
    { icon: <Brain className="w-5 h-5 text-current" />, label: 'Ask Sage', sub: 'Guided teaching', page: 'studio', color: '#FF6B35' },
    { icon: <Search className="w-5 h-5 text-current" />, label: 'Code Review', sub: 'With Aria', page: 'studio', color: '#3b82f6' },
    { icon: <Bug className="w-5 h-5 text-current" />, label: 'Debug', sub: 'With Rex', page: 'studio', color: '#a855f7' },
    { icon: <Zap className="w-5 h-5 text-current" />, label: 'Challenge', sub: 'Zara exam', page: 'zara', color: '#eab308' },
    { icon: <Code className="w-5 h-5 text-current" />, label: 'Playground', sub: 'Write code', page: 'playground', color: '#22c55e' },
    { icon: <Map className="w-5 h-5 text-current" />, label: 'Tracks', sub: 'Learning paths', page: 'tracks', color: '#06b6d4' },
  ]

  const label = { fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }
  const viewBtn = { width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div key="panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ position: 'fixed', right: 0, top: 0, height: '100%', zIndex: 50, width: 320, display: 'flex', flexDirection: 'column', background: 'rgba(8,8,10,0.95)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', margin: 0 }}>Dashboard</h2>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>Live Progress</p>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {/* Overall */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Ring value={overall} color={ringColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>Overall Mastery</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {overall >= 70 ? 'Strong progress 🔥' : overall >= 45 ? 'Keep going 💪' : 'Just starting 🌱'}
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                    {Object.values(skills).map((s, i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, opacity: 0.65, background: s.mastery >= 70 ? '#22c55e' : s.mastery >= 45 ? '#eab308' : '#ef4444' }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Next focus */}
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target className="w-5 h-5 text-orange-400" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,107,53,0.8)' }}>Focus next</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem' }}>{nextSkill}</div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { onNavigate('studio'); onClose() }}
                  style={{ padding: '4px 10px', borderRadius: 8, background: '#FF6B35', border: 'none', color: 'white', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer' }}>
                  Go →
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              {['skills', 'activity', 'quick'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '10px 0', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #FF6B35' : '2px solid transparent', color: tab === t ? '#FF6B35' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <AnimatePresence mode="wait">

                {tab === 'skills' && (
                  <motion.div key="s" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={label}>Needs Work ↑</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {weakSkills.map(([n, d]) => <SkillRow key={n} name={n} mastery={d.mastery} />)}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                      <div style={label}>All Skills</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {allSkills.map(([n, d]) => <SkillRow key={n} name={n} mastery={d.mastery} />)}
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { onNavigate('skills'); onClose() }} style={viewBtn}>
                      View Skill Graph →
                    </motion.button>
                  </motion.div>
                )}

                {tab === 'activity' && (
                  <motion.div key="a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={label}>Recent Activity</div>
                    {ACTIVITIES.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: a.color + '22', border: `1px solid ${a.color}44`, marginTop: 2 }}>{a.icon}</div>
                        <div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.4 }}>{a.text}</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>{a.time}</p>
                        </div>
                      </div>
                    ))}
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { onNavigate('progress'); onClose() }} style={viewBtn}>
                      Full Progress Report →
                    </motion.button>
                  </motion.div>
                )}

                {tab === 'quick' && (
                  <motion.div key="q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={label}>Jump To</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {QUICK.map((a, i) => (
                        <motion.button key={i} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                          onClick={() => { onNavigate(a.page); onClose() }}
                          style={{ padding: 14, borderRadius: 12, textAlign: 'left', background: a.color + '11', border: `1px solid ${a.color}25`, cursor: 'pointer' }}>
                          <div style={{ marginBottom: 6, color: 'white' }}>{a.icon}</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>{a.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{a.sub}</div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}