import { motion } from 'framer-motion'

const MODES = [
  {
    id: 'strict',
    icon: '🔒',
    label: 'Strict',
    desc: 'No direct answers — only guiding questions',
    color: 'border-red-500/40 bg-red-500/10 text-red-400',
    active: 'border-red-500 bg-red-500/20 text-red-300',
  },
  {
    id: 'guided',
    icon: '💡',
    label: 'Guided',
    desc: 'Hints + partial suggestions allowed',
    color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    active: 'border-yellow-500 bg-yellow-500/20 text-yellow-300',
  },
  {
    id: 'review',
    icon: '📖',
    label: 'Review',
    desc: 'Full explanations + optimized solutions',
    color: 'border-green-500/40 bg-green-500/10 text-green-400',
    active: 'border-green-500 bg-green-500/20 text-green-300',
  },
]

export default function LearningModeSelector({ mode, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      {MODES.map(m => (
        <motion.button
          key={m.id}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left ${mode === m.id ? m.active : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
          {mode === m.id && (
            <motion.span layoutId="modeCheck" className="ml-auto text-xs">✓</motion.span>
          )}
        </motion.button>
      ))}
    </div>
  )
}
