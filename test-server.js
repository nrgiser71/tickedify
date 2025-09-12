const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting minimal test server...');

// Test basic imports one by one
try {
    console.log('Testing database import...');
    const database = require('./database');
    console.log('✅ Database import successful');
} catch (error) {
    console.error('❌ Database import failed:', error.message);
    console.error('Full error:', error);
}

try {
    console.log('Testing storage manager import...');
    const storage = require('./storage-manager');
    console.log('✅ Storage manager import successful');
} catch (error) {
    console.error('❌ Storage manager import failed:', error.message);
    console.error('Full error:', error);
}

try {
    console.log('Testing forensic logger import...');
    const forensic = require('./forensic-logger');
    console.log('✅ Forensic logger import successful');
} catch (error) {
    console.error('❌ Forensic logger import failed:', error.message);
    console.error('Full error:', error);
}

// Basic middleware
app.use(express.json());

// Simple test endpoint
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/version', (req, res) => {
    res.json({ version: 'test-server', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
});