const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Ultra simple test endpoint
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        env_vars: {
            NODE_ENV: process.env.NODE_ENV || 'not_set',
            PORT: process.env.PORT || 'not_set',
            has_database_url: !!process.env.DATABASE_URL,
            has_postgres_url: !!process.env.POSTGRES_URL
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`🚀 Simple server running on port ${PORT}`);
});