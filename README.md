# WhatsApp Advanced Bot

A Node.js-based WhatsApp automation bot with a web dashboard, AI-powered message generation, and bulk messaging support.

## Features

- Connects to WhatsApp Web using Selenium
- Send messages (text/media) to multiple recipients
- Real-time status updates via WebSocket
- AI message/content generation (Google Gemini API)
- Modern dashboard UI (HTML + Tailwind CSS)
- CSV import/export for bulk messaging

## Prerequisites

- Node.js 18+
- Google Gemini API key (for AI features)
- Chrome browser (for Selenium WebDriver)

## Installation

1. Clone the repository or download the source code.
2. Install dependencies:
   ```sh
   npm install
   ```

## Usage

1. Start the server:
   ```sh
   npm start
   ```
2. Open `index.html` in your browser for the dashboard UI.
3. Click **Connect WhatsApp** to launch WhatsApp Web (Chrome will open via Selenium).
4. Scan the QR code with your WhatsApp mobile app.
5. Use the dashboard to send messages, import/export CSV, or generate content with AI.

## API Endpoints

- `GET /connect-whatsapp` — Launches WhatsApp Web for authentication
- `POST /send-messages` — Send messages to recipients (JSON: `{ recipients, message, media }`)
- `POST /generate-message` — Generate message content using AI (JSON: `{ prompt, language, wordLength, tone }`)

## Configuration

- Update your Google Gemini API key in `server.js`:
  ```js
  const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
  ```

## Notes

- Chrome must be installed and accessible in your system PATH.
- Media file paths must be accessible to the server (local file system).
- For production, secure your API keys and consider deploying with HTTPS.

## License

MIT
