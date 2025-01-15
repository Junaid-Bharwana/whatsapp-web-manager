#!/bin/bash

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Clean up
rm -rf node_modules package-lock.json
npm cache clean --force

# Set environment variable to skip Puppeteer download
export PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies
npm install --production

# Start the app
npm start
