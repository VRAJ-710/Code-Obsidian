import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'

const STARTER_CODE = {
  teacher: `# Ask Sage about anything you're learning!
# Starter: implement a binary search

def binary_search(arr, target):
    # TODO: implement binary search
    # Hint: Think about how you'd look up a word in a dictionary
    pass

# Test it:
print(binary_search([1, 3, 5, 7, 9, 11], 7))  # Should print index 3
`,
  reviewer: `// Share code with Aria for a review!
// Example: simple linked list

class LinkedList {
  constructor() {
    this.head = null
    this.size = 0
  }

  append(data) {
    const node = { data, next: null }
    if (!this.head) {
      this.head = node
    } else {
      let current = this.head
      while (current.next) current = current.next
      current.next = node
    }
    this.size++
  }

  // TODO: add remove(), search(), print() methods
}
`,
  debugger: `# This code has a bug — can Rex help you find it?

def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

# Bug: what happens with an empty list?
data = []
result = calculate_average(data)
print(f"Average: {result}")
`,
}

const LANGUAGE = {
  teacher: 'python',
  reviewer: 'javascript',
  debugger: 'python',
}

export default function CodeEditor({ agentId, sessionId }) {
  const [code, setCode] = useState(STARTER_CODE[agentId] || STARTER_CODE.teacher)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-white/5">
        <div className="flex gap-2">
          {['red', 'yellow', 'green'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-full bg-${c}-500 opacity-60`} />
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="text-xs text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </motion.button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={LANGUAGE[agentId] || 'python'}
          value={code}
          onChange={(val) => setCode(val || '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: 'on',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>

      {/* Tip bar */}
      <div className="px-4 py-2 bg-black/20 border-t border-white/5 text-xs text-white/30">
        💡 Tip: Copy your code into the chat to have {agentId === 'teacher' ? 'Sage' : agentId === 'reviewer' ? 'Aria' : 'Rex'} analyze it
      </div>
    </div>
  )
}