const API_URL = import.meta.env.VITE_API_URL + '/api';

export const dbService = {
    // --- Auth ---
    async register(username, password) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to register');
        }
        return res.json();
    },

    async login(username, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to login');
        }
        return res.json();
    },

    // --- User Data ---
    async getUserData(username) {
        try {
            const res = await fetch(`${API_URL}/user/${username}`);
            if (!res.ok) return null;
            return res.json();
        } catch {
            return null;
        }
    },

    async updateField(username, field, data) {
        try {
            await fetch(`${API_URL}/user/${username}/${field}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error(`Failed to update ${field}:`, e);
        }
    },

    // --- Chat ---
    async getChatHistory(username, agentId) {
        try {
            const res = await fetch(`${API_URL}/chat/${username}/${agentId}`);
            if (!res.ok) return [];
            const rows = await res.json();
            return rows.map(r => ({
                role: r.role,
                content: r.content,
                timestamp: new Date(r.timestamp).getTime()
            }));
        } catch {
            return [];
        }
    },

    async saveChatMessage(username, agentId, message) {
        try {
            await fetch(`${API_URL}/chat/${username}/${agentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
        } catch (e) {
            console.error("Failed to save chat message:", e);
        }
    }
};
