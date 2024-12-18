# Real-time Voice Chat Application

A modern web application that enables real-time voice conversations using OpenAI's Realtime API for speech-to-text and text-to-speech capabilities.

## Features

- Real-time voice communication
- Text chat functionality
- Modern and responsive UI
- WebSocket-based communication
- Low-latency audio processing

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key
- Modern web browser with microphone support

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Click the microphone button to start recording
3. Speak your message
4. Click the microphone button again to stop recording and send
5. Alternatively, type your message in the text input and click send

## Technology Stack

- Node.js
- Express.js
- Socket.IO
- WebSocket
- OpenAI Realtime API
- Web Audio API

## License

MIT
