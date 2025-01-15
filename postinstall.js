const fs = require('fs');
const path = require('path');

// Create necessary directories
const dirs = [
    '.wwebjs_auth',
    '.wwebjs_auth/session',
    'public',
    'logs'
];

dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Set environment variable to skip Puppeteer download
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
