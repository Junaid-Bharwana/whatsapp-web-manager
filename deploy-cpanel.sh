#!/bin/bash

# Configuration
NODE_VERSION="18"
APP_PATH="/home4/pakhost2/public_html/junaidbharwana.site/tv"
NPM_INSTALL_TIMEOUT=300

# Create necessary directories
mkdir -p "$APP_PATH/node_modules"
mkdir -p "$APP_PATH/.wwebjs_auth"

# Set proper permissions
chmod 755 "$APP_PATH"
chmod -R 755 "$APP_PATH/node_modules"
chmod -R 755 "$APP_PATH/.wwebjs_auth"

# Install dependencies in chunks to avoid memory issues
echo "Installing core dependencies..."
cd "$APP_PATH"
npm install --no-package-lock --production express socket.io

echo "Installing WhatsApp dependencies..."
npm install --no-package-lock --production whatsapp-web.js qrcode

echo "Installing Puppeteer..."
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install --no-package-lock --production puppeteer

# Create or update .env file
cat > "$APP_PATH/.env" << EOL
NODE_ENV=production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
CHROME_PATH=/usr/bin/google-chrome
PORT=3002
EOL

# Create startup script
cat > "$APP_PATH/start.js" << EOL
const { spawn } = require('child_process');
const path = require('path');

const app = spawn('node', ['app.js'], {
    cwd: __dirname,
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
        CHROME_PATH: '/usr/bin/google-chrome'
    }
});

app.stdout.on('data', (data) => {
    console.log(\`stdout: \${data}\`);
});

app.stderr.on('data', (data) => {
    console.error(\`stderr: \${data}\`);
});

app.on('close', (code) => {
    console.log(\`Child process exited with code \${code}\`);
});
EOL

# Set proper permissions for the startup script
chmod 755 "$APP_PATH/start.js"

echo "Deployment completed. Please start the application using: node start.js"
