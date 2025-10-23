const fs = require('fs');

// Read server.js
let content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

// Extract messaging routes (lines 13257-13485, 0-indexed so 13256-13484)
const messagingRoutes = lines.slice(13256, 13485);

// Remove messaging routes from their current position
const beforeMessaging = lines.slice(0, 13256);
const afterMessaging = lines.slice(13485);

// Find the 404 handler
const combined = beforeMessaging.concat(afterMessaging);
const handler404Index = combined.findIndex(line => line.includes('// 404 handler - MUST be after all routes!'));

if (handler404Index === -1) {
  console.error('Could not find 404 handler');
  process.exit(1);
}

// Insert messaging routes BEFORE the 404 handler
const fixed = [
  ...combined.slice(0, handler404Index),
  '',
  ...messagingRoutes,
  '',
  ...combined.slice(handler404Index)
];

// Write back
fs.writeFileSync('server.js', fixed.join('\n'));
console.log('✅ Routes moved before 404 handler');
console.log(`   Messaging routes: ${messagingRoutes.length} lines`);
console.log(`   404 handler now at line: ${handler404Index + messagingRoutes.length + 2}`);
