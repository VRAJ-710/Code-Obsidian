import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DragonCursor from './DragonCursor';
import { dbService } from '../dbService';

export default function Login({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!username.trim() || !password.trim()) {
            setError('Fields cannot be empty.');
            return;
        }

        setIsLoading(true);

        try {
            if (isLogin) {
                // Login Flow
                const data = await dbService.login(username, password);
                if (data.success) {
                    localStorage.setItem('code_obsidian_current_user', username);
                    if (onLoginSuccess) onLoginSuccess(username);
                }
            } else {
                // Register Flow
                const data = await dbService.register(username, password);
                if (data.success) {
                    setSuccessMsg('Account created! You can now log in.');
                    setIsLogin(true); // Switch back to login
                    setPassword(''); // clear password for safety
                }
            }
        } catch (err) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0a0c] font-sans selection:bg-purple-500/30">

            {/* 1. Custom Dragon Cursor ONLY active on this route */}
            <DragonCursor />

            {/* 2. Abstract dark background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[20%] w-[25vw] h-[25vw] min-w-[250px] min-h-[250px] bg-red-900/10 rounded-full blur-[100px] mix-blend-screen" />
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYzAgMTEuMDQ2IDguOTU0IDIwIDIwIDIwczIwLTguOTU0IDIwLTIwUzMxLjA0NiAwIDIwIDBDOC45NTQgMCAwIDguOTU0IDAgMjB6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==')] opacity-[0.15]" />
            </div>

            {/* 3. Main Glass Auth Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[400px] mx-4"
            >
                <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[2rem] p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">

                    {/* Top glowing accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-2">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p className="text-white/40 text-sm font-mono">
                            {isLogin ? 'Enter your credentials to continue.' : 'Register a new mock presence.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-mono text-white/50 uppercase tracking-widest pl-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="off"
                                spellCheck="false"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                                placeholder="dragon_slayer_99"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center pl-1">
                                <label className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
                                    Password
                                </label>
                                {isLogin && <a href="#" className="text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors">Forgot?</a>}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-mono text-sm tracking-widest"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Error / Success Messages */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                >
                                    {error}
                                </motion.div>
                            )}
                            {successMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-green-400 text-xs font-mono bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                                >
                                    {successMsg}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isLoading}
                            className="w-full relative group overflow-hidden rounded-xl bg-white text-black font-bold py-4 transition-all hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span className="font-mono text-sm tracking-widest uppercase">{isLogin ? 'Authenticating' : 'Registering'}</span>
                                </div>
                            ) : (
                                <span className="font-mono text-sm tracking-widest uppercase">{isLogin ? 'Login' : 'Sign Up'}</span>
                            )}
                        </motion.button>
                    </form>

                    {/* Toggle Register / Login */}
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccessMsg('');
                            }}
                            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                        >
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span className="text-purple-400 border-b border-transparent hover:border-purple-400 transition-colors pb-0.5">
                                {isLogin ? "Register" : "Login"}
                            </span>
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
