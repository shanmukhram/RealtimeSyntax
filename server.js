import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import WebSocket from "ws";

// Initialize environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Add CORS headers
app.use((req, res, next) => {
    const allowedOrigins = ['https://realtime-syntax-ad5r.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
});

const server = createServer(app);
const wss = new WebSocketServer({
    server,
    verifyClient: (info, cb) => {
        const origin = info.origin;
        const allowedOrigins = ['https://realtime-syntax-ad5r.vercel.app', 'http://localhost:3000'];
        if (allowedOrigins.includes(origin)) {
            cb(true);
        } else {
            cb(false);
        }
    },
});

// Logger function for server-side events
function logEvent(eventType, details = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[SERVER][${timestamp}] ${eventType}:`, details);
}

// Serve static files
app.use(express.static("public"));

// API endpoint to get OpenAI key
app.get("/api/key", (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res
            .status(500)
            .json({
                error: "OpenAI API key not found in environment variables",
            });
    }
    res.json({ apiKey });
});

// Serve the main page
app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "public", "index.html"));
});

// When a client connects to our server
wss.on("connection", async (ws) => {
    logEvent("Client connected", { clientsCount: wss.clients.size });
    let openAiWs = null;

    try {
        // Initialize OpenAI WebSocket
        logEvent("Initializing OpenAI WebSocket");
        openAiWs = new WebSocket(
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "OpenAI-Beta": "realtime=v1",
                },
            },
        );

        // Handle OpenAI WebSocket events
        openAiWs.on("open", () => {
            logEvent("OpenAI WebSocket connected");

            // Configure the session
            const sessionConfig = {
                type: "session.update",
                session: {
                    modalities: ["text", "audio"],
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    voice: "sage",
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500,
                    },
                },
            };
            logEvent("Sending session configuration", sessionConfig);
            openAiWs.send(JSON.stringify(sessionConfig));
        });

        // Forward all OpenAI messages to client
        openAiWs.on("message", (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                const message = data.toString();
                const parsed = JSON.parse(message);

                logEvent("OpenAI message received", { type: parsed.type });

                switch (parsed.type) {
                    case "session.created":
                        logEvent("Session created", parsed);
                        break;
                    case "session.updated":
                        logEvent("Session updated", parsed);
                        break;
                    case "conversation.created":
                        logEvent("Conversation created", parsed);
                        break;
                    case "error":
                        logEvent("OpenAI error", { error: parsed.error });
                        break;
                }

                ws.send(message);
                logEvent("Message forwarded to client", { type: parsed.type });
            }
        });

        openAiWs.on("error", (error) => {
            logEvent("OpenAI WebSocket error", { error: error.message });
        });

        openAiWs.on("close", () => {
            logEvent("OpenAI WebSocket closed");
        });

        // Handle messages from client
        ws.on("message", async (message) => {
            try {
                if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
                    const data = JSON.parse(message.toString());
                    logEvent("Client message received", { type: data.type });

                    // Forward the message to OpenAI
                    openAiWs.send(message.toString());
                    logEvent("Message forwarded to OpenAI", {
                        type: data.type,
                    });
                }
            } catch (error) {
                logEvent("Error processing client message", {
                    error: error.message,
                });
            }
        });

        ws.on("close", () => {
            logEvent("Client disconnected", {
                remainingClients: wss.clients.size,
            });
            if (openAiWs) {
                openAiWs.close();
            }
        });

        ws.on("error", (error) => {
            logEvent("Client WebSocket error", { error: error.message });
        });
    } catch (error) {
        logEvent("Error in connection handler", { error: error.message });
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    }
});

// Function to start server
function startServer(port) {
    const host = '0.0.0.0'; // Listen on all available network interfaces
    server
        .listen(port, host)
        .on("listening", () => {
            logEvent("Server started", { port, host });
            console.log(`Server running at http://${host}:${port}`);
        })
        .on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                logEvent("Port in use", { port });
                console.log(`Port ${port} is busy, trying ${port + 1}`);
                startServer(port + 1);
            } else {
                logEvent("Server error", { error: err.message });
                console.error("Server error:", err);
            }
        });
}

// Start server on specified port or default to 3000
const port = process.env.PORT || 3000;
startServer(port);
