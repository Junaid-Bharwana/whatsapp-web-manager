const fs = require('fs');
const path = require('path');

// Create necessary directories
const sessionDir = path.join(__dirname, '.wwebjs_auth');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Set proper permissions
fs.chmodSync(sessionDir, '755');

console.log('Post-install setup completed successfully');
