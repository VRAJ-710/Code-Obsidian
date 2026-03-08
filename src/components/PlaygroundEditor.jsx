import { useState, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { config } from '../config'
import { callAI } from '../aiService'
import { processInteraction } from '../skillEngine'
import { dbService } from '../dbService'

// ── Language config ───────────────────────────────────────────────────
const LANGUAGES = [
  {
    id: 'python', label: 'Python', judge0Id: 71, monacoLang: 'python',
    icon: '🐍', color: '#3b82f6', ext: 'py',
    defaultCode: `# Python Playground 🐍
def greet(name):
    return f"Hello, {name}! Welcome to Code Obsidian 🚀"

result = greet("World")
print(result)

# Try changing the function and running it!
numbers = [1, 2, 3, 4, 5]
squares = [x**2 for x in numbers]
print("Squares:", squares)
`,
  },
  {
    id: 'cpp', label: 'C++', judge0Id: 54, monacoLang: 'cpp',
    icon: '⚡', color: '#8b5cf6', ext: 'cpp',
    defaultCode: `// C++ Playground ⚡
#include <iostream>
#include <vector>
#include <string>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "! Welcome to Code Obsidian 🚀";
}

int main() {
    cout << greet("World") << endl;
    
    // Vector demo
    vector<int> nums = {1, 2, 3, 4, 5};
    for (int n : nums) {
        cout << n * n << " ";
    }
    cout << endl;
    return 0;
}
`,
  },
  {
    id: 'javascript', label: 'JavaScript', judge0Id: 63, monacoLang: 'javascript',
    icon: '🟨', color: '#eab308', ext: 'js',
    defaultCode: `// JavaScript Playground 🟨
function greet(name) {
    return \`Hello, \${name}! Welcome to Code Obsidian 🚀\`;
}

console.log(greet("World"));

// Array methods demo
const numbers = [1, 2, 3, 4, 5];
const squares = numbers.map(x => x ** 2);
console.log("Squares:", squares);

const evens = numbers.filter(x => x % 2 === 0);
console.log("Evens:", evens);
`,
  },
  {
    id: 'java', label: 'Java', judge0Id: 62, monacoLang: 'java',
    icon: '☕', color: '#f97316', ext: 'java',
    defaultCode: `// Java Playground ☕
import java.util.Arrays;

public class Main {
    static String greet(String name) {
        return "Hello, " + name + "! Welcome to Code Obsidian 🚀";
    }
    
    public static void main(String[] args) {
        System.out.println(greet("World"));
        
        int[] nums = {1, 2, 3, 4, 5};
        int[] squares = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            squares[i] = nums[i] * nums[i];
        }
        System.out.println("Squares: " + Arrays.toString(squares));
    }
}
`,
  },
  {
    id: 'c', label: 'C', judge0Id: 50, monacoLang: 'c',
    icon: '🔵', color: '#06b6d4', ext: 'c',
    defaultCode: `// C Playground 🔵
#include <stdio.h>

void greet(char* name) {
    printf("Hello, %s! Welcome to Code Obsidian 🚀\\n", name);
}

int main() {
    greet("World");
    
    int nums[] = {1, 2, 3, 4, 5};
    printf("Squares: ");
    for (int i = 0; i < 5; i++) {
        printf("%d ", nums[i] * nums[i]);
    }
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: 'php', label: 'PHP', judge0Id: 68, monacoLang: 'php',
    icon: '🐘', color: '#a855f7', ext: 'php',
    defaultCode: `<?php
// PHP Playground 🐘
function greet($name) {
    return "Hello, $name! Welcome to Code Obsidian 🚀";
}

echo greet("World") . "\\n";

$numbers = [1, 2, 3, 4, 5];
$squares = array_map(fn($n) => $n * $n, $numbers);
echo "Squares: " . implode(", ", $squares) . "\\n";
?>
`,
  },
]

// ── Templates ─────────────────────────────────────────────────────────
const TEMPLATES = {
  python: [
    { name: 'Fibonacci', code: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nfor i in range(10):\n    print(fibonacci(i), end=' ')\nprint()` },
    { name: 'Bubble Sort', code: `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nprint(bubble_sort([64, 34, 25, 12, 22]))` },
    { name: 'Binary Search', code: `def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: left = mid + 1\n        else: right = mid - 1\n    return -1\n\narr = [1, 3, 5, 7, 9, 11]\nprint(binary_search(arr, 7))  # → 3` },
    { name: 'Linked List', code: `class Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n\nclass LinkedList:\n    def __init__(self): self.head = None\n\n    def append(self, data):\n        node = Node(data)\n        if not self.head: self.head = node; return\n        cur = self.head\n        while cur.next: cur = cur.next\n        cur.next = node\n\n    def display(self):\n        cur = self.head\n        while cur:\n            print(cur.data, end=' -> ')\n            cur = cur.next\n        print('None')\n\nll = LinkedList()\nfor v in [1,2,3,4,5]: ll.append(v)\nll.display()` },
  ],
  cpp: [
    { name: 'Fibonacci', code: `#include <iostream>\nusing namespace std;\n\nint fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n}\n\nint main() {\n    for (int i = 0; i < 10; i++)\n        cout << fib(i) << " ";\n    cout << endl;\n    return 0;\n}` },
    { name: 'Bubble Sort', code: `#include <iostream>\nusing namespace std;\n\nvoid bubbleSort(int arr[], int n) {\n    for (int i = 0; i < n-1; i++)\n        for (int j = 0; j < n-i-1; j++)\n            if (arr[j] > arr[j+1]) swap(arr[j], arr[j+1]);\n}\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22};\n    bubbleSort(arr, 5);\n    for (int x : arr) cout << x << " ";\n    return 0;\n}` },
    { name: 'Stack', code: `#include <iostream>\n#include <stack>\nusing namespace std;\n\nint main() {\n    stack<int> s;\n    for (int x : {1,2,3,4,5}) s.push(x);\n    cout << "Top: " << s.top() << endl;\n    while (!s.empty()) { cout << s.top() << " "; s.pop(); }\n    return 0;\n}` },
  ],
  javascript: [
    { name: 'Fibonacci', code: `function fib(n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n}\nconsole.log([...Array(10).keys()].map(fib).join(' '));` },
    { name: 'Array Methods', code: `const nums = [1,2,3,4,5,6,7,8,9,10];\nconst result = nums\n    .filter(n => n % 2 === 0)\n    .map(n => n * 2)\n    .reduce((acc, n) => acc + n, 0);\nconsole.log('Sum of doubled evens:', result);` },
    { name: 'Promises', code: `const delay = ms => new Promise(r => setTimeout(r, ms));\n\nasync function main() {\n    console.log('Start');\n    await delay(100);\n    console.log('After delay');\n    const results = await Promise.all([1,2,3].map(async n => {\n        await delay(n * 50);\n        return n * n;\n    }));\n    console.log('Squares:', results);\n}\n\nmain();` },
  ],
  java: [
    { name: 'Fibonacci', code: `public class Main {\n    static int fib(int n) { return n<=1 ? n : fib(n-1)+fib(n-2); }\n    public static void main(String[] args) {\n        for (int i=0;i<10;i++) System.out.print(fib(i)+" ");\n    }\n}` },
    { name: 'ArrayList', code: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<Integer> list = new ArrayList<>(Arrays.asList(5,2,8,1,9,3));\n        Collections.sort(list);\n        System.out.println(list);\n        System.out.println("Max: " + Collections.max(list));\n    }\n}` },
  ],
  c: [
    { name: 'Fibonacci', code: `#include <stdio.h>\nint fib(int n) { return n<=1 ? n : fib(n-1)+fib(n-2); }\nint main() {\n    for (int i=0;i<10;i++) printf("%d ",fib(i));\n    printf("\\n");\n    return 0;\n}` },
    { name: 'Pointers', code: `#include <stdio.h>\nvoid swap(int *a, int *b) { int t=*a; *a=*b; *b=t; }\nint main() {\n    int x=10, y=20;\n    printf("Before: x=%d y=%d\\n",x,y);\n    swap(&x,&y);\n    printf("After:  x=%d y=%d\\n",x,y);\n    return 0;\n}` },
  ],
  php: [
    { name: 'Fibonacci', code: `<?php\nfunction fib($n) { return $n<=1 ? $n : fib($n-1)+fib($n-2); }\necho implode(' ', array_map('fib', range(0,9))) . "\\n";\n?>` },
    { name: 'Array ops', code: `<?php\n$nums = range(1, 10);\n$evens = array_filter($nums, fn($n) => $n % 2 === 0);\n$squares = array_map(fn($n) => $n*$n, $evens);\necho implode(', ', $squares) . "\\n";\n?>` },
  ],
}

// ── Saved snippets (in-memory) ────────────────────────────────────────
let savedSnippets = []

// ── Main component ────────────────────────────────────────────────────
export default function PlaygroundEditor({ onAskAgent, onSkillUpdate, currentSkills = {}, currentUser, learningMode = 'guided' }) {
  const [activeLangId, setActiveLangId] = useState('python')
  const [tabs, setTabs] = useState([
    { id: 1, name: 'main.py', langId: 'python', code: LANGUAGES[0].defaultCode }
  ])
  const [activeTabId, setActiveTabId] = useState(1)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [snippets, setSnippets] = useState([])
  const [snippetName, setSnippetName] = useState('')
  const [savingSnippet, setSavingSnippet] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHint, setAiHint] = useState(null)
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const nextTabId = useRef(2)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  const currentLang = LANGUAGES.find(l => l.id === activeTab?.langId) || LANGUAGES[0]

  // ── Tab management ────────────────────────────────────────────────
  const addTab = () => {
    const lang = LANGUAGES.find(l => l.id === activeLangId) || LANGUAGES[0]
    const newTab = { id: nextTabId.current++, name: `file${tabs.length + 1}.${lang.ext}`, langId: lang.id, code: lang.defaultCode }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId, e) => {
    e.stopPropagation()
    if (tabs.length === 1) return
    const idx = tabs.findIndex(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) setActiveTabId(newTabs[Math.max(0, idx - 1)].id)
  }

  const updateTabCode = (code) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: code || '' } : t))
  }

  const changeTabLang = (langId) => {
    const lang = LANGUAGES.find(l => l.id === langId)
    setActiveLangId(langId)
    setTabs(prev => prev.map(t => t.id === activeTabId
      ? { ...t, langId, name: t.name.replace(/\.\w+$/, `.${lang.ext}`), code: lang.defaultCode }
      : t
    ))
  }

  // ── Run code via Piston ───────────────────────────────────────────
  const runCode = async () => {
    if (!activeTab?.code?.trim()) return
    setRunning(true)
    setOutput(null)
    setAiHint(null)

    const langLabel = currentLang.label
    let langId = currentLang.id
    // Piston v1 maps some language IDs differently
    if (langId === 'cpp') langId = 'c++'

    try {
      const response = await axios.post('https://emkc.org/api/v1/piston/execute', {
        language: langId,
        source: activeTab.code,
        args: stdin ? stdin.split(' ') : [],
      })

      const data = response.data

      if (data.message) {
        // API level error
        throw new Error(data.message)
      }

      if (data.stderr) {
        setOutput({ type: 'error', text: data.stderr, label: 'Runtime Error', lang: langLabel })
        if (onSkillUpdate && currentSkills) {
          const updated = processInteraction({ userMessage: activeTab.code, agentResponse: data.stderr, isCodeRun: true, codeSuccess: false, currentSkills })
          onSkillUpdate(updated)
        }
      } else {
        const outText = data.stdout || '(program ran with no output)'
        setOutput({
          type: 'success',
          text: outText,
          lang: langLabel
        })
        if (onSkillUpdate && currentSkills) {
          const updated = processInteraction({
            userMessage: activeTab.code,
            agentResponse: '',
            isCodeRun: true,
            codeSuccess: true,
            currentSkills,
          })
          onSkillUpdate(updated)
        }
      }
    } catch (err) {
      console.warn('Execution error:', err.message)
      setOutput({
        type: 'error',
        text: 'Failed to connect to execution server. Please try again.',
        label: 'Network Error',
        lang: langLabel
      })
    } finally {
      setRunning(false)
      recordPlaygroundRun(output?.type === 'success')
    }
  }

  const recordPlaygroundRun = async (isSuccess) => {
    if (!currentUser) return;
    try {
      const data = await dbService.getUserData(currentUser);
      const stats = data?.stats?.playground || { totalRuns: 0, successRuns: 0 };
      stats.totalRuns += 1;
      if (isSuccess) stats.successRuns += 1;

      const updatedStats = { ...data?.stats, playground: stats };
      await dbService.updateField(currentUser, 'stats', updatedStats);

      const today = new Date().toISOString().split('T')[0];
      const activity = data?.activity || {};
      activity[today] = (activity[today] || 0) + 1; // Add 1 active minute per run
      await dbService.updateField(currentUser, 'activity', activity);
    } catch (e) {
      console.error("Failed to save playground stats", e);
    }
  }

  // ── AI Hint ───────────────────────────────────────────────────────
  const getAiHint = async () => {
    setAiLoading(true)
    setAiHint(null)
    try {
      const agentType = output?.type === 'error' ? 'debugger' : 'teacher'

      const modeModifiers = {
        strict: '\nCURRENT MODE: STRICT - Do not explain the answer. Just give a small nudge or ask a guiding question so the user figures it out.',
        guided: '\nCURRENT MODE: GUIDED - Provide a helpful hint and some explanation. Give the solution only if explicitly requested.',
        review: '\nCURRENT MODE: REVIEW - Act as a reviewer. Provide the full solution immediately, highlight what went wrong and explain best practices.'
      };
      const modifier = modeModifiers[learningMode] || '';

      const systemPrompt = agentType === 'debugger'
        ? `You are Rex, an expert debugging assistant. Analyze the code and error, explain what went wrong, and suggest a fix. Be concise but thorough.${modifier}`
        : `You are Sage, a programming teacher. Look at the student's code and give constructive suggestions to improve it. Focus on best practices.${modifier}`
      const userMessage = `I'm coding in ${currentLang.label}. Here's my code:\n\`\`\`${currentLang.id}\n${activeTab.code}\n\`\`\`\n${output?.type === 'error' ? `\nError:\n${output.text}\n\nHelp me debug this.` : '\nAny hints to improve this?'}`

      const response = await callAI(systemPrompt, [{ role: 'user', content: userMessage }])
      setAiHint({ agent: agentType === 'debugger' ? 'Rex 🐛' : 'Sage 🧠', text: response })
    } catch {
      setAiHint({
        agent: output?.type === 'error' ? 'Rex 🐛' : 'Sage 🧠',
        text: output?.type === 'error'
          ? "Read the error message carefully — it tells you the exact line and type of error. What does it say? Once you identify the error TYPE (syntax/runtime/logic), you've already solved 50% of the problem."
          : "Your code is structured well! To level it up: (1) add input validation, (2) consider edge cases like empty/null inputs, (3) think about time complexity — could any loops be eliminated?"
      })
    } finally {
      setAiLoading(false)
    }
  }

  // ── Save snippet ──────────────────────────────────────────────────
  const saveSnippet = () => {
    if (!snippetName.trim()) return
    setSnippets(prev => [{
      id: Date.now(), name: snippetName, langId: activeTab.langId,
      code: activeTab.code, savedAt: new Date().toLocaleString(),
    }, ...prev])
    setSnippetName('')
    setSavingSnippet(false)
  }

  const loadSnippet = (snippet) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, langId: snippet.langId, code: snippet.code } : t))
    setShowSaved(false)
  }

  const loadTemplate = (template) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: template.code, name: template.name + '.' + currentLang.ext } : t))
    setShowTemplates(false)
  }

  return (
    <div className="h-full flex flex-col bg-dark/80">

      {/* ── Language bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/30 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {LANGUAGES.map(lang => (
            <motion.button
              key={lang.id}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => changeTabLang(lang.id)}
              className={`flex items - center gap - 1.5 px - 3 py - 1.5 rounded - md text - xs font - semibold transition - all ${activeTab?.langId === lang.id ? 'text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                } `}
              style={activeTab?.langId === lang.id ? { backgroundColor: lang.color + '33', color: lang.color } : {}}
            >
              <span>{lang.icon}</span>
              <span className="hidden sm:inline">{lang.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Templates */}
          <div className="relative">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowTemplates(!showTemplates); setShowSaved(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >📋 Templates</motion.button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-gray-900/95 border border-white/15 rounded-xl z-50 overflow-hidden shadow-xl"
                >
                  <div className="p-2 border-b border-white/10 text-xs text-white/40 px-3">{currentLang.label} Templates</div>
                  {(TEMPLATES[activeTab?.langId] || []).map(t => (
                    <button key={t.name} onClick={() => loadTemplate(t)}
                      className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >{t.name}</button>
                  ))}
                  {!TEMPLATES[activeTab?.langId]?.length && (
                    <div className="px-3 py-3 text-xs text-white/30">No templates yet</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save */}
          <div className="relative">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setSavingSnippet(!savingSnippet); setShowSaved(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >💾 Save</motion.button>
            <AnimatePresence>
              {savingSnippet && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 border border-white/15 rounded-xl z-50 p-3 shadow-xl"
                >
                  <input autoFocus value={snippetName} onChange={e => setSnippetName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveSnippet()} placeholder="Snippet name..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none mb-2"
                  />
                  <button onClick={saveSnippet} className="w-full bg-primary hover:bg-orange-500 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors">
                    Save
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saved */}
          <div className="relative">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowSaved(!showSaved); setSavingSnippet(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              📁 {snippets.length > 0 && <span className="ml-1 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">{snippets.length}</span>}
            </motion.button>
            <AnimatePresence>
              {showSaved && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-gray-900/95 border border-white/15 rounded-xl z-50 overflow-hidden max-h-72 overflow-y-auto shadow-xl"
                >
                  <div className="p-2 border-b border-white/10 text-xs text-white/40 px-3">Saved Snippets</div>
                  {snippets.length === 0
                    ? <div className="px-3 py-4 text-xs text-white/30 text-center">No saved snippets yet</div>
                    : snippets.map(s => (
                      <button key={s.id} onClick={() => loadSnippet(s)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                      >
                        <div className="text-sm text-white/80 font-medium">{s.name}</div>
                        <div className="text-xs text-white/30 mt-0.5">
                          {LANGUAGES.find(l => l.id === s.langId)?.icon} {LANGUAGES.find(l => l.id === s.langId)?.label} · {s.savedAt}
                        </div>
                      </button>
                    ))
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stdin */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowStdin(!showStdin)}
            className={`flex items - center gap - 1.5 px - 3 py - 1.5 rounded - lg border text - xs font - semibold transition - all ${showStdin ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'} `}
          >⌨️ Input</motion.button>

          {/* Run */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={runCode} disabled={running}
            className="flex items-center gap-2 px-5 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-green-500/20"
          >
            {running ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Running</> : '▶ Run'}
          </motion.button>
        </div>
      </div>

      {/* ── File tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/10 bg-black/20 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => {
          const lang = LANGUAGES.find(l => l.id === tab.langId) || LANGUAGES[0]
          return (
            <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
              className={`flex items - center gap - 2 px - 3 py - 1.5 rounded - t - lg text - xs cursor - pointer transition - all group flex - shrink - 0 ${activeTabId === tab.id ? 'bg-dark border border-b-dark border-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                } `}
            >
              <span>{lang.icon}</span>
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <span onClick={e => closeTab(tab.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1">×</span>
              )}
            </div>
          )
        })}
        <button onClick={addTab} className="flex items-center justify-center w-6 h-6 rounded text-white/30 hover:text-white hover:bg-white/10 transition-all text-base ml-1">+</button>
      </div>

      {/* ── Editor + output ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Stdin */}
        <AnimatePresence>
          {showStdin && (
            <motion.div initial={{ height: 0 }} animate={{ height: 80 }} exit={{ height: 0 }}
              className="overflow-hidden border-b border-white/10 bg-black/20 flex-shrink-0"
            >
              <div className="px-4 py-1 text-xs text-white/40 border-b border-white/5">Standard Input (stdin)</div>
              <textarea value={stdin} onChange={e => setStdin(e.target.value)}
                placeholder="Enter input for your program..."
                className="w-full h-full bg-transparent px-4 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none font-mono"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monaco */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={currentLang.monacoLang}
            value={activeTab?.code || ''}
            onChange={updateTabCode}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontLigatures: true,
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              tabSize: currentLang.id === 'python' ? 4 : 2,
              wordWrap: 'on',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              bracketPairColorization: { enabled: true },
              suggestOnTriggerCharacters: true,
            }}
          />
        </div>

        {/* Output panel */}
        <AnimatePresence>
          {output && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 220, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 bg-black/50 flex-shrink-0 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w - 2 h - 2 rounded - full animate - pulse ${output.type === 'success' ? 'bg-green-400' :
                    output.type === 'demo' ? 'bg-yellow-400' : 'bg-red-400'
                    } `} />
                  <span className="text-xs font-semibold text-white/60">
                    {output.type === 'success' ? `✅ ${output.lang} Output` :
                      output.type === 'demo' ? `🎭 ${output.lang} Demo` :
                        `❌ ${output.label || 'Error'} `}
                  </span>
                  {output.time && <span className="text-xs text-white/25">⏱ {output.time}s · 💾 {output.memory}KB</span>}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={getAiHint} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-all disabled:opacity-50"
                  >
                    {aiLoading
                      ? <><div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" /> Thinking...</>
                      : output.type === 'error' ? '🐛 Debug with Rex' : '🧠 Hint from Sage'
                    }
                  </motion.button>
                  <button onClick={() => { setOutput(null); setAiHint(null) }} className="text-white/30 hover:text-white/70 text-lg px-1">×</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {output.note && (
                  <div className="text-xs text-yellow-400/60 mb-2">{output.note}</div>
                )}
                <pre className={`font - mono text - sm whitespace - pre - wrap leading - relaxed ${output.type === 'success' ? 'text-green-300' :
                  output.type === 'demo' ? 'text-yellow-300' : 'text-red-300'
                  } `}>
                  {output.text}
                </pre>
                <AnimatePresence>
                  {aiHint && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/10 border border-primary/20 rounded-xl p-4"
                    >
                      <div className="text-xs font-semibold text-primary mb-2">{aiHint.agent} says:</div>
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{aiHint.text}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}