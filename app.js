const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const SESSION_DIR = '.wwebjs_auth';
let client = null;
let isClientReady = false;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Configure Puppeteer options based on environment
const getPuppeteerConfig = () => {
    const config = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    };

    return config;
};

async function destroyClientWithTimeout(client) {
    return Promise.race([
        client.destroy(),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Client destruction timed out'));
            }, 5000); // 5 second timeout
        })
    ]);
}

async function initializeClient(socket) {
    try {
        if (client) {
            console.log('Destroying existing client...');
            try {
                await destroyClientWithTimeout(client);
            } catch (destroyErr) {
                console.error('Error or timeout while destroying client:', destroyErr);
                // Force cleanup even if destroy times out
                client = null;
                isClientReady = false;
                // Small delay to ensure system resources are released
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('Initializing new WhatsApp client...');
        socket.emit('status', 'Initializing WhatsApp...');

        const puppeteerConfig = {
            ...getPuppeteerConfig(),
            // Add stability options
            waitForInitialPage: true
        };

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-client',
                dataPath: SESSION_DIR
            }),
            puppeteer: puppeteerConfig,
            qrMaxRetries: 5,
            restartOnAuthFail: true
        });

        client.on('qr', async (qr) => {
            console.log('QR Code received');
            try {
                const qrDataURL = await qrcode.toDataURL(qr);
                socket.emit('qr', qrDataURL);
            } catch (err) {
                console.error('QR generation error:', err);
                socket.emit('error', 'Failed to generate QR code');
            }
        });

        client.on('ready', () => {
            console.log('Client is ready!');
            isClientReady = true;
            socket.emit('ready');
        });

        client.on('authenticated', () => {
            console.log('Client is authenticated!');
            socket.emit('authenticated');
        });

        client.on('auth_failure', async (err) => {
            console.error('Auth failure:', err);
            isClientReady = false;
            socket.emit('error', 'Authentication failed');
            // Clean up on auth failure
            try {
                await destroyClientWithTimeout(client);
            } catch (destroyErr) {
                console.error('Error destroying client after auth failure:', destroyErr);
            }
            client = null;
        });

        client.on('disconnected', async (reason) => {
            console.log('Client was disconnected:', reason);
            isClientReady = false;
            socket.emit('disconnected', reason);
            // Ensure proper cleanup
            try {
                await destroyClientWithTimeout(client);
            } catch (destroyErr) {
                console.error('Error destroying client after disconnect:', destroyErr);
            }
            client = null;
        });

        console.log('Initializing client...');
        await client.initialize();
        console.log('Client initialization completed');

    } catch (err) {
        console.error('Error in initializeClient:', err);
        socket.emit('error', 'Failed to initialize WhatsApp client: ' + err.message);
        if (client) {
            try {
                await destroyClientWithTimeout(client);
            } catch (destroyErr) {
                console.error('Error destroying client:', destroyErr);
            }
            client = null;
            isClientReady = false;
        }
    }
}

// Handle socket connections
io.on('connection', async (socket) => {
    console.log('New client connected');

    socket.on('requestQR', async () => {
        console.log('QR code requested');
        await initializeClient(socket);
    });

    // Handle reconnect request
    socket.on('reconnect', async () => {
        console.log('Reconnect requested');
        await initializeClient(socket);
    });

    // Handle message sending
    socket.on('sendMessage', async (data, callback) => {
        if (!client || !isClientReady) {
            callback({ success: false, error: 'WhatsApp client not ready' });
            return;
        }

        try {
            const chatId = data.number.includes('@c.us') ? data.number : `${data.number}@c.us`;
            await client.sendMessage(chatId, data.message);
            callback({ success: true });
        } catch (err) {
            console.error('Error sending message:', err);
            callback({ success: false, error: err.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Cleaning up...');
    if (client) {
        await destroyClientWithTimeout(client);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Cleaning up...');
    if (client) {
        await destroyClientWithTimeout(client);
    }
    process.exit(0);
});

// Error handling
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// Keep app alive
setInterval(() => {
    https.get(`https://${process.env.BACK4APP_APP_ID}.back4app.io/`, (resp) => {
        if (resp.statusCode === 200) {
            console.log('Keep alive ping successful');
        }
    }).on('error', (err) => {
        console.error('Keep alive ping failed:', err);
    });
}, 5 * 60 * 1000); // Ping every 5 minutes

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
