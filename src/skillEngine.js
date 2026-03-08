// ── Code Obsidian ML Skill Engine ─────────────────────────────────────────
// Lightweight in-browser ML for real-time skill tracking
// Uses keyword extraction, sentiment analysis, and performance patterns

// ── Skill keyword map ─────────────────────────────────────────────────
const SKILL_KEYWORDS = {
  Variables: [
    'variable', 'var', 'let', 'const', 'declare', 'assign', 'value', 'name',
    'identifier', 'initialize', 'undefined', 'null', 'scope',
  ],
  'Data Types': [
    'integer', 'string', 'float', 'boolean', 'array', 'object', 'type',
    'int', 'char', 'double', 'typeof', 'casting', 'convert', 'parse',
  ],
  Conditionals: [
    'if', 'else', 'switch', 'case', 'condition', 'ternary', 'compare',
    'boolean', 'true', 'false', 'logical', '&&', '||', 'not', 'check',
  ],
  Loops: [
    'for', 'while', 'loop', 'iterate', 'iteration', 'foreach', 'do while',
    'break', 'continue', 'index', 'counter', 'range', 'repeat',
  ],
  Functions: [
    'function', 'method', 'parameter', 'argument', 'return', 'call',
    'invoke', 'define', 'arrow', 'callback', 'void', 'def', 'func',
  ],
  Recursion: [
    'recursion', 'recursive', 'base case', 'call stack', 'factorial',
    'fibonacci', 'self-call', 'stack overflow', 'depth', 'tree',
  ],
  Arrays: [
    'array', 'list', 'index', 'element', 'push', 'pop', 'sort', 'filter',
    'map', 'reduce', 'slice', 'splice', 'length', 'vector', 'append',
  ],
  Pointers: [
    'pointer', 'reference', 'address', 'dereference', 'memory', 'malloc',
    'free', 'null pointer', 'heap', 'stack', '&', '*', 'arrow operator',
  ],
  OOP: [
    'class', 'object', 'inherit', 'polymorphism', 'encapsulation',
    'abstraction', 'interface', 'extends', 'override', 'constructor',
    'instance', 'method', 'property', 'public', 'private', 'protected',
  ],
  'Time Complexity': [
    'complexity', 'big o', 'o(n)', 'o(1)', 'o(log n)', 'efficient',
    'performance', 'algorithm', 'optimize', 'quadratic', 'linear',
    'constant', 'logarithmic', 'space complexity', 'runtime',
  ],
  'Web Hacking': [
    'sql', 'injection', 'xss', 'cross site', 'scripting', 'payload', 'bypass',
    'auth', 'authentication', 'vulnerability', 'exploit', 'parameter',
    'reflected', 'stored', 'blind', 'union', 'sqli',
  ],
  'Network Security': [
    'nmap', 'port', 'scan', 'scanning', 'traffic', 'packet', 'network', 'ip',
    'service', 'version', 'protocol', 'tcp', 'udp', 'firewall', 'enumeration',
    'recon', 'reconnaissance', 'banner',
  ],
  'Cryptography': [
    'hash', 'encrypt', 'encryption', 'decrypt', 'decryption', 'cipher', 'key',
    'brute', 'force', 'password', 'crack', 'cracking', 'md5', 'sha', 'salted',
    'encoding', 'base64', 'hex',
  ],
  'Reverse Engineering': [
    'assembly', 'binary', 'decompile', 'disassemble', 'debug', 'instruction',
    'stack', 'heap', 'register', 'executable', 'asm', 'ghidra', 'radare',
    'control flow', 'patch',
  ],
  'Incident Response': [
    'log', 'forensic', 'analysis', 'timeline', 'evidence', 'compromise',
    'exploit', 'detection', 'malware', 'incident', 'response', 'artifact',
    'hunting', 'threat',
  ],
}

// ── Positive/negative signal words ───────────────────────────────────
const POSITIVE_SIGNALS = [
  'correct', 'exactly', 'great', 'perfect', 'excellent', 'right', 'good job',
  'well done', 'that\'s it', 'you got it', 'spot on', 'nailed it', 'works',
  'solved', 'fixed', 'understand', 'makes sense',
]

const NEGATIVE_SIGNALS = [
  'wrong', 'incorrect', 'error', 'mistake', 'bug', 'issue', 'problem',
  'fix', 'broken', 'fail', 'crash', 'exception', 'undefined', 'not quite',
  'try again', 'think about', 'missing', 'off by',
]

const BREAKTHROUGH_SIGNALS = [
  'excellent', 'perfect', 'brilliant', 'outstanding', 'exactly right',
  'that\'s exactly', 'great insight', 'you nailed', 'very well done',
]

// ── Core analysis functions ───────────────────────────────────────────

/**
 * Extract which skills are mentioned in a message
 * Returns { skillName: relevanceScore } — higher = more relevant
 */
export const extractSkills = (text) => {
  if (!text) return {}
  const lower = text.toLowerCase()
  const found = {}

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Weight longer/more specific keywords higher
        score += kw.split(' ').length > 1 ? 2 : 1
      }
    }
    if (score > 0) found[skill] = score
  }

  return found
}

/**
 * Analyze sentiment of an AI agent response toward the student
 * Returns: 'positive' | 'negative' | 'neutral' | 'breakthrough'
 */
export const analyzeSentiment = (agentText) => {
  if (!agentText) return 'neutral'
  const lower = agentText.toLowerCase()

  for (const sig of BREAKTHROUGH_SIGNALS) {
    if (lower.includes(sig)) return 'breakthrough'
  }
  let pos = 0, neg = 0
  for (const sig of POSITIVE_SIGNALS) if (lower.includes(sig)) pos++
  for (const sig of NEGATIVE_SIGNALS) if (lower.includes(sig)) neg++

  if (pos > neg + 1) return 'positive'
  if (neg > pos) return 'negative'
  return 'neutral'
}

/**
 * Calculate mastery delta based on interaction
 * @param {string} sentiment - 'positive'|'negative'|'neutral'|'breakthrough'
 * @param {number} score - optional explicit score 0-100 (from Zara)
 * @param {boolean} isCodeRun - whether triggered by running code
 * @param {boolean} codeSuccess - whether code ran without errors
 */
export const calcMasteryDelta = (sentiment, score = null, isCodeRun = false, codeSuccess = false) => {
  // Explicit score from Zara — most accurate signal
  if (score !== null) {
    if (score >= 90) return +5
    if (score >= 75) return +3
    if (score >= 60) return +2
    if (score >= 45) return +1
    if (score >= 30) return -1
    return -2
  }

  // Code execution result
  if (isCodeRun) {
    return codeSuccess ? +2 : -1
  }

  // Agent response sentiment
  switch (sentiment) {
    case 'breakthrough': return +5
    case 'positive': return +2
    case 'negative': return -1
    default: return +1 // neutral interaction still shows engagement
  }
}

/**
 * Update confidence level based on recent mastery trend
 */
export const updateConfidence = (currentMastery, previousMastery, currentConf) => {
  const trend = currentMastery - previousMastery
  if (trend >= 5) return 'high'
  if (trend >= 2) return currentConf === 'low' ? 'medium' : currentConf
  if (trend <= -3) return currentConf === 'high' ? 'medium' : 'low'
  return currentConf
}

/**
 * Main function — processes a full interaction and returns skill updates
 * @param {object} params
 * @param {string} params.userMessage    - what student wrote
 * @param {string} params.agentResponse  - what agent replied
 * @param {number|null} params.zaraScore - score from Zara (0-100) or null
 * @param {boolean} params.isCodeRun     - triggered from playground
 * @param {boolean} params.codeSuccess   - code ran without errors
 * @param {object} params.currentSkills  - current skill state
 * @returns {object} updatedSkills — new skill state
 */
export const processInteraction = ({
  userMessage = '',
  agentResponse = '',
  zaraScore = null,
  isCodeRun = false,
  codeSuccess = false,
  currentSkills,
}) => {
  const combinedText = userMessage + ' ' + agentResponse
  const mentionedSkills = extractSkills(combinedText)

  // If no skills detected and not a scored interaction, return unchanged
  if (Object.keys(mentionedSkills).length === 0 && zaraScore === null && !isCodeRun) {
    return currentSkills
  }

  const sentiment = analyzeSentiment(agentResponse)
  const updatedSkills = { ...currentSkills }
  let skillsToUpdate = Object.keys(mentionedSkills)

  // For Zara-scored answers — use top 2 most relevant skills
  if (zaraScore !== null) {
    skillsToUpdate = skillsToUpdate
      .sort((a, b) => mentionedSkills[b] - mentionedSkills[a])
      .slice(0, 2)
    // If no skills detected from Zara, still update a generic one
    if (skillsToUpdate.length === 0) skillsToUpdate = ['Functions']
  }

  for (const skill of skillsToUpdate) {
    if (!updatedSkills[skill]) continue

    const prev = updatedSkills[skill]
    const delta = calcMasteryDelta(sentiment, zaraScore, isCodeRun, codeSuccess)

    // Weight by relevance score (more mentions = bigger impact)
    const relevance = mentionedSkills[skill] || 1
    const weightedDelta = delta * Math.min(1.5, 0.5 + relevance * 0.25)

    const newMastery = Math.min(100, Math.max(0, prev.mastery + weightedDelta))
    const newErrorFreq = sentiment === 'negative' || (isCodeRun && !codeSuccess)
      ? Math.min(30, prev.errorFreq + 1)
      : Math.max(0, prev.errorFreq - 0.5)

    updatedSkills[skill] = {
      ...prev,
      mastery: Math.round(newMastery),
      confidence: updateConfidence(newMastery, prev.mastery, prev.confidence),
      errorFreq: Math.round(newErrorFreq * 10) / 10,
      lastPracticed: 'just now',
    }
  }

  return updatedSkills
}

/**
 * Get knowledge gap analysis — which skills need most work
 * @param {object} skills
 * @returns {Array} sorted list of gap objects
 */
export const analyzeGaps = (skills) => {
  return Object.entries(skills)
    .map(([name, data]) => ({
      name,
      ...data,
      gapScore: (100 - data.mastery) * (data.errorFreq / 10 + 1),
    }))
    .sort((a, b) => b.gapScore - a.gapScore)
}

/**
 * Get overall progress score (0-100)
 */
export const getOverallProgress = (skills) => {
  const vals = Object.values(skills)
  return Math.round(vals.reduce((sum, s) => sum + s.mastery, 0) / vals.length)
}

/**
 * Get cognitive load score — how much the student is being challenged
 * Higher = more challenged (could be good or overwhelming)
 */
export const getCognitiveLoad = (skills) => {
  const vals = Object.values(skills)
  const avgErrors = vals.reduce((s, v) => s + v.errorFreq, 0) / vals.length
  const avgMastery = vals.reduce((s, v) => s + v.mastery, 0) / vals.length
  // High errors + low mastery = high cognitive load
  return Math.min(100, Math.round((avgErrors * 3) + ((100 - avgMastery) * 0.4)))
}

/**
 * Suggest next skill to practice based on gaps and dependencies
 */
const SKILL_DEPENDENCIES = {
  'Recursion': ['Functions'],
  'Pointers': ['Variables', 'Data Types'],
  'OOP': ['Functions', 'Data Types'],
  'Time Complexity': ['Arrays', 'Loops'],
  'Arrays': ['Variables', 'Loops'],
  'Functions': ['Variables', 'Conditionals'],
  'Web Hacking': ['Functions'],
  'Network Security': ['Variables'],
  'Cryptography': ['Variables', 'Data Types'],
  'Reverse Engineering': ['Pointers', 'Data Types'],
  'Incident Response': ['Web Hacking', 'Network Security'],
}

export const suggestNextSkill = (skills) => {
  const gaps = analyzeGaps(skills)
  for (const gap of gaps) {
    const deps = SKILL_DEPENDENCIES[gap.name] || []
    const depsReady = deps.every(d => !skills[d] || skills[d].mastery >= 40)
    if (depsReady && gap.mastery < 70) return gap.name
  }
  return gaps[0]?.name || 'Functions'
}