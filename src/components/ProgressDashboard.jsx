import { motion } from 'framer-motion'

function RadialProgress({ value, size = 80, color = '#FF6B35', label }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {value}%
        </text>
      </svg>
      {label && <span className="text-xs text-white/50 text-center">{label}</span>}
    </div>
  )
}

export default function ProgressDashboard({ skills }) {
  const skillList = Object.entries(skills)
  const avgMastery = Math.round(skillList.reduce((s, [, v]) => s + v.mastery, 0) / skillList.length)
  const mastered = skillList.filter(([, v]) => v.mastery >= 70).length
  const weakest = skillList.sort((a, b) => a[1].mastery - b[1].mastery).slice(0, 3)
  const strongest = [...skillList].sort((a, b) => b[1].mastery - a[1].mastery).slice(0, 3)
  const totalErrors = skillList.reduce((s, [, v]) => s + v.errorFreq, 0)

  // Cognitive load: inverse of avg mastery, weighted by error frequency
  const cognitiveLoad = Math.min(100, Math.round(
    skillList.reduce((s, [, v]) => s + (100 - v.mastery) * (v.errorFreq / 10), 0) / skillList.length
  ))

  // Suggested next tasks based on weakest skills
  const suggestions = weakest.map(([name]) => ({
    Variables: '📝 Practice declaring variables in 3 different data types',
    'Data Types': '🔢 Write a type conversion program',
    Conditionals: '🌿 Build a decision tree with nested if/else',
    Loops: '🔄 Implement FizzBuzz using while and for loops',
    Functions: '🧩 Write 5 pure functions with different return types',
    Recursion: '🌀 Implement factorial and Fibonacci recursively',
    Arrays: '📦 Build a custom array sort algorithm',
    Pointers: '👉 Practice pointer arithmetic in C++',
    OOP: '🏗️ Design a class hierarchy for a school system',
    'Time Complexity': '⏱️ Analyze Big-O for 5 sorting algorithms',
  }[name] || `📚 Practice ${name} fundamentals`))

  return (
    <div className="space-y-6">
      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Mastery', value: `${avgMastery}%`, icon: '🎯', color: 'from-orange-500/20 to-red-500/10', border: 'border-orange-500/20' },
          { label: 'Skills Mastered', value: `${mastered}/10`, icon: '✅', color: 'from-green-500/20 to-teal-500/10', border: 'border-green-500/20' },
          { label: 'Total Errors', value: totalErrors, icon: '⚠️', color: 'from-red-500/20 to-pink-500/10', border: 'border-red-500/20' },
          { label: 'Cognitive Load', value: `${cognitiveLoad}%`, icon: '🧠', color: 'from-purple-500/20 to-blue-500/10', border: 'border-purple-500/20' },
        ].map(stat => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={`glass-card p-5 bg-gradient-to-br ${stat.color} border ${stat.border}`}
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-display font-black text-white">{stat.value}</div>
            <div className="text-xs text-white/50 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radial skill overview */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold mb-6 text-white/80">Skill Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            {skillList.slice(0, 6).map(([name, skill]) => (
              <RadialProgress
                key={name}
                value={skill.mastery}
                size={70}
                color={skill.mastery >= 70 ? '#22c55e' : skill.mastery >= 40 ? '#eab308' : '#ef4444'}
                label={name}
              />
            ))}
          </div>
        </div>

        {/* Weakest areas + suggestions */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold mb-4 text-white/80">🔴 Focus Areas</h3>
          <div className="space-y-4">
            {weakest.map(([name, skill], i) => (
              <motion.div key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{name}</span>
                  <span className="text-red-400 font-bold">{skill.mastery}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${skill.mastery}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                  />
                </div>
                <p className="text-xs text-white/30">{skill.errorFreq} errors · {skill.lastPracticed}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <h4 className="text-xs font-semibold text-white/50 mb-3">💡 SUGGESTED NEXT</h4>
            {suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="text-xs text-white/60 py-2 border-b border-white/5 last:border-0 leading-relaxed"
              >
                {s}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Strongest areas + improvement */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold mb-4 text-white/80">🟢 Strengths</h3>
          <div className="space-y-4">
            {strongest.map(([name, skill], i) => (
              <motion.div key={name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{name}</span>
                  <span className="text-green-400 font-bold">{skill.mastery}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${skill.mastery}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500"
                  />
                </div>
                <p className="text-xs text-white/30">{skill.errorFreq} errors · {skill.lastPracticed}</p>
              </motion.div>
            ))}
          </div>

          {/* Cognitive load explainer */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <h4 className="text-xs font-semibold text-white/50 mb-3">🧠 COGNITIVE LOAD</h4>
            <div className="flex items-center gap-3">
              <RadialProgress
                value={cognitiveLoad}
                size={64}
                color={cognitiveLoad > 60 ? '#ef4444' : cognitiveLoad > 30 ? '#eab308' : '#22c55e'}
              />
              <p className="text-xs text-white/40 leading-relaxed">
                {cognitiveLoad > 60
                  ? 'High load — consider reviewing fundamentals before tackling advanced topics.'
                  : cognitiveLoad > 30
                  ? 'Moderate load — you\'re progressing well. Keep practicing weak areas.'
                  : 'Low load — you\'re handling the material well! Try harder challenges.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}