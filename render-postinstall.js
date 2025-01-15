const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Install Chrome on Linux
function installChrome() {
    if (process.platform === 'linux') {
        console.log('Installing Chrome on Linux...');
        try {
            execSync('apt-get update && apt-get install -y chromium-browser');
        } catch (error) {
            console.error('Error installing Chrome:', error);
        }
    }
}

// Create necessary directories
const sessionDir = path.join(__dirname, '.wwebjs_auth');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Set proper permissions
fs.chmodSync(sessionDir, '755');

// Install Chrome if needed
installChrome();

console.log('Post-install setup completed successfully');
