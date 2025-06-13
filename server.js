const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.static('public'));

// Ensure data directory exists
const ensureDataDirectory = async () => {
    try {
        await fs.access('./data');
    } catch (error) {
        console.log('📁 Creating data directory...');
        await fs.mkdir('./data', { recursive: true });
    }
};

// Initialize data directory on startup
ensureDataDirectory();

app.get('/api/lijsten', async (req, res) => {
    try {
        const files = await fs.readdir('./data');
        const lijsten = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        res.json(lijsten);
    } catch (error) {
        res.json([]);
    }
});

app.get('/api/tellingen', async (req, res) => {
    try {
        const files = await fs.readdir('./data');
        const tellingen = {};
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const lijstNaam = file.replace('.json', '');
                try {
                    const filePath = path.join('./data', file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const items = JSON.parse(data);
                    tellingen[lijstNaam] = Array.isArray(items) ? items.length : 0;
                } catch (error) {
                    tellingen[lijstNaam] = 0;
                }
            }
        }
        
        res.json(tellingen);
    } catch (error) {
        res.json({});
    }
});

app.get('/api/lijst/:naam', async (req, res) => {
    try {
        const { naam } = req.params;
        const filePath = path.join('./data', `${naam}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(404).json({ error: 'Lijst niet gevonden' });
    }
});

app.post('/api/lijst/:naam', async (req, res) => {
    try {
        const { naam } = req.params;
        const filePath = path.join('./data', `${naam}.json`);
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Fout bij opslaan' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Tickedify server running on port ${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    if (NODE_ENV === 'development') {
        console.log(`🌐 Local: http://localhost:${PORT}`);
    }
});