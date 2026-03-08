import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Terminal, Zap, Globe, Lock, Search, Save, Send, AlertTriangle, Code, Play, RefreshCw, CheckCircle, Flame, Info, Bug } from 'lucide-react';

const SCENARIOS = [
    {
        id: 'sqli',
        title: 'SQL Injection',
        target: 'SecureBank Login API',
        difficulty: 'Beginner',
        hint: 'Hint: try manipulating the query logic.',
        type: 'login',
        defaultPath: 'POST /api/v1/auth/login'
    },
    {
        id: 'xss',
        title: 'XSS',
        target: 'BlogPost Comment System',
        difficulty: 'Apprentice',
        hint: 'Hint: what if the input is treated as code?',
        type: 'comment',
        defaultPath: 'POST /api/v2/comments/add'
    },
    {
        id: 'cmd',
        title: 'Command Injection',
        target: 'FileServer Utility',
        difficulty: 'Operator',
        hint: 'Hint: can you chain commands?',
        type: 'command',
        defaultPath: 'GET /api/v1/utils/ping?host='
    },
    {
        id: 'jwt',
        title: 'Auth Bypass',
        target: 'AdminPanel JWT Auth',
        difficulty: 'Expert',
        hint: 'Hint: what if you modify the token?',
        type: 'token',
        defaultPath: 'GET /api/v1/admin/dashboard'
    },
    {
        id: 'api',
        title: 'API Exploitation',
        target: 'UserData API',
        difficulty: 'Operator',
        hint: 'Hint: what happens with unexpected values?',
        type: 'api',
        defaultPath: 'GET /api/v3/users/{id}'
    }
];

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

export default function CyberLab({ currentUser, onSkillUpdate, skills }) {
    const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);

    // Engine & Request State
    const [isLoadingEngine, setIsLoadingEngine] = useState(false);
    const [lastEngineResponse, setLastEngineResponse] = useState(null);
    const [requestPayload, setRequestPayload] = useState('');
    const [responsePayload, setResponsePayload] = useState('');
    const [statusCode, setStatusCode] = useState(null);
    const [isExploit, setIsExploit] = useState(false);
    const [vulnerabilityType, setVulnerabilityType] = useState('');
    const [technicalDetail, setTechnicalDetail] = useState('');

    // Cyber Sage State
    const [sageMessages, setSageMessages] = useState([
        { role: 'assistant', content: "Welcome to the attack simulator. I am Cyber Sage. Select a scenario above to begin. Remember, a hacker observes first, then attacks. What's your first move?" }
    ]);
    const [sageInput, setSageInput] = useState('');
    const [isSageTyping, setIsSageTyping] = useState(false);
    const chatEndRef = useRef(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sageMessages, isSageTyping]);

    // Cleanup & Reset on Scenario Change
    useEffect(() => {
        setLastEngineResponse(null);
        setRequestPayload('');
        setResponsePayload('');
        setStatusCode(null);
        setIsExploit(false);
        setVulnerabilityType('');
        setTechnicalDetail('');
        setShowConfetti(false);
        // Add sage message about scenario change
        setSageMessages(prev => [...prev, {
            role: 'assistant',
            content: `We've switched targets to ${activeScenario.target}. ${activeScenario.hint} What are you noticing about the input?`
        }]);
    }, [activeScenario]);

    const callGroqAPI = async (system, messages) => {
        const res = await fetch('http://localhost:3001/api/groq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant', // Fast model for simulated responses
                max_tokens: 1024,
                system: system,
                messages: messages,
            })
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error: ${res.status} - ${err}`);
        }
        return res.json();
    };

    const handleSimulatorSubmit = async (inputData) => {
        if (!inputData || isLoadingEngine) return;

        setIsLoadingEngine(true);
        setIsExploit(false);
        setResponsePayload('');
        setTechnicalDetail('');

        // Build system prompt for simulator
        const simSystem = `You are a vulnerable web application simulator for cybersecurity education. When given a user input/payload and a scenario type, simulate exactly how a real vulnerable backend would respond. 

Return a JSON object with these fields:
- "response": the simulated server response text shown to the user
- "statusCode": HTTP status code (200, 401, 403, 500, etc.)
- "isExploit": boolean — true if the input successfully exploits a vulnerability
- "vulnerabilityType": if exploit, name it (e.g. "SQL Injection", "XSS", "Command Injection")
- "technicalDetail": brief technical explanation of what happened internally (e.g. "Query became: SELECT * FROM users WHERE username='' OR '1'='1'")

Be realistic. Common SQL injection payloads like admin' OR '1'='1 should work. XSS payloads with <script> tags should reflect. Command injection with ; ls or && whoami should return fake directory listings. Auth bypass with manipulated JWTs should succeed. Return ONLY valid JSON, no markdown.`;

        const userMsg = `Scenario: ${activeScenario.title} (${activeScenario.target})
Input Payload: ${JSON.stringify(inputData)}`;

        setRequestPayload(JSON.stringify(inputData, null, 2));

        try {
            const data = await callGroqAPI(simSystem, [{ role: 'user', content: userMsg }]);
            let textRes = data.choices?.[0]?.message?.content || '{}';

            // Clean markdown if any robustly by finding exact JSON boundaries
            const startIdx = textRes.indexOf('{');
            const endIdx = textRes.lastIndexOf('}');

            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                textRes = textRes.substring(startIdx, endIdx + 1);
            }

            // Scrub unescaped control characters like newlines within strings before parsing
            // textRes = textRes.replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r'); // Wait, let's just delete the block

            const result = JSON.parse(textRes);

            setResponsePayload(result.response);
            setStatusCode(result.statusCode);
            setIsExploit(result.isExploit);
            if (result.isExploit) {
                setVulnerabilityType(result.vulnerabilityType);
                setTechnicalDetail(result.technicalDetail);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);

                // Trigger Sage auto-message for exploit success
                handleSageAutoResponse(result);
            } else {
                // Not an exploit, subtle hint from sage occasionally
                if (Math.random() > 0.5) {
                    handleSageHint(result);
                }
            }
        } catch (err) {
            console.error('Simulation error:', err);
            setResponsePayload('Error reaching simulation engine: ' + err.message);
            setStatusCode(500);
        } finally {
            setIsLoadingEngine(false);
        }
    };

    const handleSageHint = async (simResult) => {
        setIsSageTyping(true);
        const sageSystem = `You are Cyber Sage, a cybersecurity mentor. Guide users through hacking simulations with hints and Socratic questions. Never give direct answers. Be encouraging. Use cybersecurity terminology. 
Output your response as a valid JSON object with a single lowercase "response" key: {"response": "..."}`;

        const contextMsg = `The user tried an input on the ${activeScenario.title} scenario but it failed. The server responded with ${simResult.statusCode}. Can you give a brief, subtle 1-2 sentence hint?`;

        try {
            const data = await callGroqAPI(sageSystem, [
                ...sageMessages.slice(-5), // keep small context window
                { role: 'user', content: contextMsg }
            ]);
            let textRes = data.choices?.[0]?.message?.content || '{"response": "Connection lost."}';

            // Clean markdown if any robustly by finding exact JSON boundaries
            const startIdx = textRes.indexOf('{');
            const endIdx = textRes.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                textRes = textRes.substring(startIdx, endIdx + 1);
            }
            const result = JSON.parse(textRes);

            setSageMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
        } catch (e) {
            console.error('Sage hint error:', e);
        } finally {
            setIsSageTyping(true); // wait we need it false
            setIsSageTyping(false);
        }
    };

    const handleSageAutoResponse = async (result) => {
        setIsSageTyping(true);
        const sageSystem = `You are Cyber Sage, a cybersecurity mentor. Guide users through hacking simulations. After successful exploits, explain: what the vulnerability was, why it worked, what was vulnerable, and how to fix it. Be encouraging. Use cybersecurity terminology. Keep it structured but conversational. 
Output your response as a valid JSON object with a single lowercase "response" key: {"response": "..."}`;

        const contextMsg = `The user successfully exploited the ${activeScenario.title} scenario! 
Vulnerability Type: ${result.vulnerabilityType}
Technical Detail: ${result.technicalDetail}
Respond with an explanation of what they just did, why it worked, and how to fix it in actual code. Complete the mission!`;

        try {
            const data = await callGroqAPI(sageSystem, [
                ...sageMessages.slice(-5),
                { role: 'user', content: contextMsg }
            ]);
            let textRes = data.choices?.[0]?.message?.content || '{"response": "Connection lost."}';
            const startIdx = textRes.indexOf('{');
            const endIdx = textRes.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                textRes = textRes.substring(startIdx, endIdx + 1);
            }
            const parsed = JSON.parse(textRes);

            setSageMessages(prev => [...prev, { role: 'assistant', content: parsed.response }]);
        } catch (e) {
            console.error('Sage auto error:', e);
        } finally {
            setIsSageTyping(false);
        }
    };

    const handleSageUserSubmit = async (e) => {
        e.preventDefault();
        if (!sageInput.trim() || isSageTyping) return;

        const newUserMsg = { role: 'user', content: sageInput };
        setSageMessages(prev => [...prev, newUserMsg]);
        setSageInput('');
        setIsSageTyping(true);

        const sageSystem = `You are Cyber Sage, a cybersecurity mentor. Guide users through hacking simulations with hints and Socratic questions. Never give direct answers. Be encouraging. Use cybersecurity terminology. Current scenario: ${activeScenario.title} (${activeScenario.target}). 
Output your response as a valid JSON object with a single lowercase "response" key: {"response": "..."}`;

        try {
            const data = await callGroqAPI(sageSystem, [...sageMessages, newUserMsg]);
            let textRes = data.choices?.[0]?.message?.content || '{"response": "Connection lost."}';
            const startIdx = textRes.indexOf('{');
            const endIdx = textRes.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                textRes = textRes.substring(startIdx, endIdx + 1);
            }
            const parsed = JSON.parse(textRes);

            setSageMessages(prev => [...prev, { role: 'assistant', content: parsed.response }]);
        } catch (e) {
            console.error('Sage error:', e);
            setSageMessages(prev => [...prev, { role: 'assistant', content: "My connection to the mainframe was interrupted. Try that again." }]);
        } finally {
            setIsSageTyping(false);
        }
    };

    // Components for the Target Interface
    const TargetForm = () => {
        const [formData, setFormData] = useState({});

        const onSubmit = (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const data = Object.fromEntries(form.entries());
            // Fallback to React state formData for fields not picked up by native form
            handleSimulatorSubmit({ ...formData, ...data });
        };

        return (
            <div className="flex flex-col h-full bg-[#0a0a0f] text-white overflow-y-auto">
                <div className="p-6 border-b border-white/5 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-orange-500" />
                            <h2 className="text-xl font-black">{activeScenario.title}</h2>
                        </div>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-cyan-400 capitalize">
                            {activeScenario.difficulty}
                        </span>
                    </div>
                    <p className="text-sm text-white/60 mb-2 font-mono">{activeScenario.target}</p>
                    <p className="text-xs text-orange-400/80 italic font-mono bg-orange-500/5 p-2 rounded border border-orange-500/10">
                        {activeScenario.hint}
                    </p>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                    <AnimatePresence>
                        {isExploit && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-4 left-4 right-4 bg-green-500/10 border border-green-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,136,0.2)] z-20"
                            >
                                <div className="flex items-center gap-3 justify-center text-green-400 font-black uppercase tracking-widest text-lg">
                                    <Flame className="w-6 h-6 animate-pulse" />
                                    Vulnerability Detected
                                </div>
                                <div className="text-center font-mono text-xs text-green-400/80 mt-2">
                                    [{vulnerabilityType}]
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scanlines effect overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0.5)_50%,rgba(255,255,255,0))] bg-[length:100%_4px] mix-blend-overlay z-0"></div>

                    <form onSubmit={onSubmit} className={`w-full max-w-sm glass-card p-8 rounded-2xl border ${isExploit ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_50px_rgba(0,255,136,0.1)]' : 'border-cyan-500/20 bg-black/40 shadow-2xl'} relative z-10 transition-all duration-500`}>
                        {activeScenario.type === 'login' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner"
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {activeScenario.type === 'comment' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Add Comment</label>
                                    <textarea
                                        rows="4"
                                        name="comment"
                                        onChange={e => setFormData({ ...formData, comment: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner resize-none"
                                        placeholder="<b>Awesome post!</b>"
                                    />
                                </div>
                            </div>
                        )}

                        {activeScenario.type === 'command' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Host to Ping</label>
                                    <input
                                        type="text"
                                        name="host"
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner"
                                        placeholder="127.0.0.1"
                                    />
                                </div>
                            </div>
                        )}

                        {activeScenario.type === 'token' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Authorization Token</label>
                                    <textarea
                                        rows="3"
                                        name="token"
                                        onChange={e => setFormData({ ...formData, token: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-[10px] break-all font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner resize-none"
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    />
                                </div>
                            </div>
                        )}

                        {activeScenario.type === 'api' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">User ID (Numeric)</label>
                                    <input
                                        type="text"
                                        name="id"
                                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                                        className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-white transition-all shadow-inner"
                                        placeholder="42"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoadingEngine}
                            className={`w-full mt-6 py-3 rounded-lg font-black uppercase tracking-widest transition-all ${isLoadingEngine ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] hover:bg-cyan-400 scale-[1.02] active:scale-95'}`}
                        >
                            {isLoadingEngine ? (
                                <span className="flex items-center justify-center gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    PROCESSING...
                                </span>
                            ) : (
                                'Submit Payload'
                            )}
                        </button>
                    </form>

                    {/* Output Viewer within Target Panel below the form */}
                    <AnimatePresence>
                        {responsePayload && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-sm mt-6 mb-10"
                            >
                                <div className="text-[10px] font-mono text-white/40 uppercase mb-2">Simulated Output</div>
                                <div className={`p-4 rounded-xl border font-mono text-xs overflow-x-auto ${isExploit ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/5 border-white/10 text-white/70'}`}>
                                    {responsePayload}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Confetti Effects */}
                {showConfetti && (
                    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                        <div className="w-full h-full absolute inset-0 mix-blend-screen bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.3)_0%,transparent_70%)] animate-pulse"></div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen bg-[#0a0a0f] text-white flex flex-col font-body selection:bg-cyan-500/30 overflow-hidden">
            {/* Top Navigation / Scenario Selector */}
            <div className="flex-shrink-0 h-16 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center px-6 gap-6 relative z-30">
                <div className="flex items-center gap-3 w-[360px]">
                    <Terminal className="w-6 h-6 text-cyan-400" />
                    <h1 className="text-xl font-display font-black tracking-tight text-white/90">
                        AI <span className="text-cyan-400">Attack Simulator</span>
                    </h1>
                </div>

                <div className="flex-1 flex justify-center gap-2 overflow-x-auto hide-scrollbar">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveScenario(s)}
                            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap border ${activeScenario.id === s.id ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.2)]' : 'bg-transparent border-transparent text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                        >
                            {s.title}
                        </button>
                    ))}
                </div>

                <div className="w-[360px] flex justify-end">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest">Simulator Active</span>
                    </div>
                </div>
            </div>

            {/* Main Content Panels */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT PANEL: CYBER SAGE */}
                <div className="w-[360px] border-r border-white/10 bg-black/40 flex flex-col z-20">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/60 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-orange-400 tracking-wide">Cyber Sage</h3>
                                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">AI Mentor Active</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-black/0 to-black/20">
                        {sageMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white/10 text-white rounded-br-sm' : 'bg-orange-500/5 border border-orange-500/20 text-orange-50/90 rounded-bl-sm shadow-[0_4px_20px_rgba(249,115,22,0.05)]'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isSageTyping && (
                            <div className="flex justify-start">
                                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl rounded-bl-sm p-4 flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 border-t border-white/5 bg-black/60">
                        <form onSubmit={handleSageUserSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={sageInput}
                                onChange={e => setSageInput(e.target.value)}
                                placeholder="Ask Cyber Sage for a hint..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder-white/20"
                            />
                            <button
                                type="submit"
                                disabled={isSageTyping || !sageInput.trim()}
                                className="w-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* CENTER PANEL: TARGET SYSTEM */}
                <div className="flex-1 border-r border-white/10 relative shadow-2xl z-10 flex flex-col">
                    <TargetForm />

                    {/* Next Scenario Button if Exploit success */}
                    <AnimatePresence>
                        {isExploit && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
                            >
                                <button className="bg-green-500 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> Mission Complete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT PANEL: ATTACK CONSOLE */}
                <div className="w-[400px] bg-[#050508] flex flex-col z-20">
                    <div className="p-4 border-b border-white/5 bg-black/80 flex items-center gap-2 shadow-md">
                        <Code className="w-4 h-4 text-white/40" />
                        <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest">Attack Console</h3>
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                        {/* Request Logger Viewer */}
                        <div className="flex flex-col flex-1">
                            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2 flex justify-between">
                                <span>Raw HTTP Request</span>
                                <span className="text-cyan-400">{activeScenario.defaultPath}</span>
                            </label>
                            <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-[10px] text-white/70 overflow-x-auto shadow-inner h-[200px]">
                                {requestPayload ? (
                                    <>
                                        <div className="text-cyan-300/80 mb-2">Host: vulnerable.host.local</div>
                                        <div className="text-cyan-300/80 mb-4">Content-Type: application/json</div>
                                        <pre className="text-orange-400 whitespace-pre-wrap">{requestPayload}</pre>
                                    </>
                                ) : (
                                    <div className="text-white/20 italic h-full flex items-center justify-center">Awaiting payload injection...</div>
                                )}
                            </div>
                        </div>

                        {/* Direct Payload Injector area (for aesthetics / advanced user feel) */}
                        <div className="glass-card bg-cyan-500/5 border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] font-mono text-cyan-400/80 leading-relaxed uppercase pr-2">
                                Notice: Raw payload interception is active. The AI Engine interprets attacks based on realistic vulnerability patterns. Be precise.
                            </p>
                        </div>

                        {/* Raw Response Viewer */}
                        <div className="flex flex-col flex-1 mt-2">
                            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2 flex justify-between items-center">
                                <span>Raw Server Response</span>
                                {statusCode && (
                                    <span className={`px-2 py-0.5 rounded text-[9px] ${statusCode >= 400 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                        HTTP {statusCode}
                                    </span>
                                )}
                            </label>
                            <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-[10px] shadow-inner h-[220px] overflow-y-auto relative text-white/70">
                                {isLoadingEngine ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-400/50">
                                        <RefreshCw className="w-6 h-6 animate-spin mb-3" />
                                        <div className="uppercase tracking-widest text-[9px]">Awaiting Server Response</div>
                                    </div>
                                ) : responsePayload ? (
                                    <div className="whitespace-pre-wrap overflow-hidden" style={{ animation: 'typewriter 0.5s steps(40, end)' }}>
                                        {responsePayload}
                                    </div>
                                ) : (
                                    <div className="text-white/20 italic h-full flex items-center justify-center">No response received...</div>
                                )}

                                <style dangerouslySetInnerHTML={{
                                    __html: `
                                    @keyframes typewriter {
                                        from { width: 0; opacity: 0; }
                                        to { width: 100%; opacity: 1; }
                                    }
                                `}} />
                            </div>

                            {/* Technical Detail if Exploit */}
                            <AnimatePresence>
                                {isExploit && technicalDetail && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 p-4 border border-green-500/30 bg-green-500/10 rounded-xl overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-green-400 font-black uppercase mb-2">
                                            <Bug className="w-3 h-3" /> Technical Breakdown
                                        </div>
                                        <div className="text-[10px] font-mono text-green-300/80 leading-relaxed">
                                            {technicalDetail}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
