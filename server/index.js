const express = require('express');
const cors = require('cors');
const db = require('./db');
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.VITE_GROQ_KEY,
});

// Debug middleware to see all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

// Proxy route for Groq API
app.post('/api/groq', async (req, res) => {
    console.log('HIT GROQ ROUTE');
    try {
        const { system, messages, max_tokens, model } = req.body;

        // Groq requires system prompts as the first message in the array
        const groqMessages = [];
        if (system) {
            groqMessages.push({ role: 'system', content: system });
        }
        if (messages && messages.length > 0) {
            groqMessages.push(...messages);
        }

        const response = await groq.chat.completions.create({
            model: model || 'llama-3.1-8b-instant',
            max_tokens: max_tokens || 1024,
            messages: groqMessages
        });

        res.json(response);
    } catch (error) {
        console.error('Groq API Error:', error);
        res.status(500).json({ error: error.message || 'Failed to call Groq API' });
    }
});

// Registration
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'User registered' });
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row || row.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        res.json({ success: true, user: row.username });
    });
});

// Get User Data
app.get('/api/user/:username', (req, res) => {
    const { username } = req.params;
    db.get(`SELECT skills_json, stats_json, activity_json, courses_json, completed_courses_json FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });

        try {
            res.json({
                skills: JSON.parse(row.skills_json || '{}'),
                stats: JSON.parse(row.stats_json || '{}'),
                activity: JSON.parse(row.activity_json || '{}'),
                courses: JSON.parse(row.courses_json || '{}'),
                completed_courses: JSON.parse(row.completed_courses_json || '[]')
            });
        } catch (e) {
            res.status(500).json({ error: 'Data parsing error' });
        }
    });
});

// Update User Data field dynamically
const updateField = (req, res, field) => {
    const { username } = req.params;
    const data = req.body;
    const jsonStr = JSON.stringify(data);

    db.run(`UPDATE users SET ${field} = ? WHERE username = ?`, [jsonStr, username], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
};

app.post('/api/user/:username/skills', (req, res) => updateField(req, res, 'skills_json'));
app.post('/api/user/:username/stats', (req, res) => updateField(req, res, 'stats_json'));
app.post('/api/user/:username/activity', (req, res) => updateField(req, res, 'activity_json'));
app.post('/api/user/:username/courses', (req, res) => updateField(req, res, 'courses_json'));
app.post('/api/user/:username/completed_courses', (req, res) => updateField(req, res, 'completed_courses_json'));

// Get Chat History
app.get('/api/chat/:username/:agentId', (req, res) => {
    const { username, agentId } = req.params;
    db.all(`SELECT role, content, timestamp FROM chat_messages WHERE user_username = ? AND agent_id = ? ORDER BY timestamp ASC`,
        [username, agentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        }
    );
});

// Save Chat Message
app.post('/api/chat/:username/:agentId', (req, res) => {
    const { username, agentId } = req.params;
    const { role, content, timestamp } = req.body;
    const timeToSave = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    db.run(`INSERT INTO chat_messages (user_username, agent_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [username, agentId, role, content, timeToSave],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        }
    );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
