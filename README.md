# WhatsApp Web Manager

A powerful WhatsApp Web automation tool built with Node.js, Express, and Socket.IO.

## Features

- QR Code Authentication
- Message Management
- Contact Management
- Group Management
- Bulk Messaging
- Profile Settings
- Real-time Updates
- Mobile Responsive UI

## Requirements

- Node.js >= 14.0.0
- NPM >= 6.0.0
- Chrome/Chromium browser

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsapp-web-manager.git
cd whatsapp-web-manager
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Deployment Instructions

### cPanel Deployment

1. Log in to your cPanel account
2. Navigate to "Setup Node.js App"
3. Create a new application:
   - Application root: /whatsapp-manager
   - Application URL: yourdomain.com/whatsapp
   - Application startup file: app.js
   - Node.js version: Select version 14 or higher
4. Upload project files to the specified directory
5. Install dependencies:
   ```bash
   cd /home/username/whatsapp-manager
   npm install
   ```
6. Start the application from cPanel Node.js App interface

### Render.com Deployment

1. Create a new Web Service on Render
2. Connect your repository
3. Configure the service:
   - Name: whatsapp-web-manager
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Set environment variables if needed
5. Deploy

## Environment Variables

- `PORT`: Server port (default: 3002)
- `NODE_ENV`: Environment mode (development/production)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: Set to true for custom Chrome path
- `CHROME_PATH`: Custom Chrome executable path (if needed)

## License

MIT License

## Support

For support, email your-email@example.com or open an issue on GitHub.
