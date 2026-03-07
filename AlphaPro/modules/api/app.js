const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup ---
// The HTTP server is passed to the WebSocket server to allow it to handle upgrade requests.
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WSS] Client connected');
  ws.on('close', () => console.log('[WSS] Client disconnected'));
  ws.on('error', console.error);

  // Example: Send periodic health data
  const interval = setInterval(() => {
    // This is where you would broadcast real data from your system modules
    ws.send(JSON.stringify({ type: 'health', payload: { overall: 'healthy', components: [], lastUpdate: new Date().toISOString() } }));
  }, 5000);

  ws.on('close', () => clearInterval(interval));
});

// --- Middleware ---
app.use(express.json());

// --- API Routes ---
// Import API routes
const tradingRoutes = require('./routes/tradingRoutes');

// Mount API routes with /api prefix
app.use('/api', tradingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Production Static File Serving ---
// This block is crucial for the unified Docker image. It will only run when
// the NODE_ENV environment variable is set to 'production'.
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, 'client', 'dist');
  console.log(`[PROD] Serving static files from: ${clientDistPath}`);

  // Serve the static files (JS, CSS, images) from the built React app
  app.use(express.static(clientDistPath));

  // For any other request, serve the index.html file.
  // This allows client-side routing (e.g., React Router) to take over.
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});