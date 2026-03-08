import { motion } from 'framer-motion'
import { Brain, Search, Bug, TrendingUp, Zap, Lock } from 'lucide-react'

const features = [
  {
    icon: <Brain className="w-8 h-8 text-orange-400" />,
    title: 'Socratic Method',
    description: 'Sage never just gives you answers. She asks guiding questions that build real, lasting understanding of programming concepts.',
    color: 'from-orange-500/20 to-red-500/10',
    border: 'border-orange-500/20',
  },
  {
    icon: <Search className="w-8 h-8 text-blue-400" />,
    title: 'Real-Time Code Review',
    description: "Aria analyzes your code as you write it — catching bugs, suggesting improvements, and explaining best practices in plain English.",
    color: 'from-blue-500/20 to-cyan-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: <Bug className="w-8 h-8 text-purple-400" />,
    title: 'Debugging Coach',
    description: 'Rex teaches you systematic debugging methodology. Find root causes, not just symptoms. Build intuition that lasts.',
    color: 'from-purple-500/20 to-pink-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-green-400" />,
    title: 'Progress Tracking',
    description: 'Sessions stored in DynamoDB. Track what you\'ve learned, revisit past conversations, see your skill growth over time.',
    color: 'from-green-500/20 to-teal-500/10',
    border: 'border-green-500/20',
  },
  {
    icon: <Zap className="w-8 h-8 text-yellow-400" />,
    title: 'Multi-Agent Architecture',
    description: 'Three specialized AI agents built on Claude Sonnet 4 via AWS Bedrock. Each with unique personality and teaching style.',
    color: 'from-yellow-500/20 to-orange-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: <Lock className="w-8 h-8 text-gray-400" />,
    title: 'Serverless & Scalable',
    description: 'Built on AWS Lambda + API Gateway. Zero server management. Scales from 1 to 1M students without any configuration.',
    color: 'from-gray-500/20 to-slate-500/10',
    border: 'border-gray-500/20',
  },
]

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className={`glass-card p-6 bg-gradient-to-br ${f.color} border ${f.border} group cursor-default`}
        >
          <div className="mb-4 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
          <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
          <p className="text-white/60 text-sm leading-relaxed">{f.description}</p>
        </motion.div>
      ))}
    </div>
  )
}