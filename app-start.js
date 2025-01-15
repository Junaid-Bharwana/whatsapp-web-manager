const { spawn } = require('child_process');
const path = require('path');

// Get the current working directory
const cwd = process.cwd();

// Start the application
const app = spawn('node', ['app.js'], {
    cwd: cwd,
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
    }
});

app.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

app.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

app.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
