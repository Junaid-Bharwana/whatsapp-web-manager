const fs = require('fs');
const path = require('path');

const pidFile = path.join(__dirname, 'server.pid');

try {
    if (fs.existsSync(pidFile)) {
        const pid = fs.readFileSync(pidFile, 'utf8');
        process.kill(parseInt(pid));
        fs.unlinkSync(pidFile);
        console.log('Server stopped successfully');
    } else {
        console.log('Server is not running');
    }
} catch (error) {
    console.error('Error stopping server:', error);
}
