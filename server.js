/**
 * Servidor Backend - Magic System
 * Node.js + Express + Socket.io
 * Despliegue gratis en Render, Railway, Fly.io, etc.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// ===== RUTAS API =====
const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/session', (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    viewerSocket: null,
    magicianSocket: null,
    createdAt: Date.now(),
    status: 'waiting'
  });
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, session] of sessions.entries()) {
    if (session.createdAt < oneHourAgo) sessions.delete(id);
  }
  res.json({ sessionId, url: `/v/${sessionId}` });
});

app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json({
    sessionId: req.params.sessionId,
    hasViewer: !!session.viewerSocket,
    hasMagician: !!session.magicianSocket,
    status: session.status
  });
});

app.get('/api/sessions', (req, res) => {
  const active = [];
  for (const [id, session] of sessions.entries()) {
    if (session.viewerSocket) active.push({ sessionId: id, createdAt: session.createdAt });
  }
  res.json({ sessions: active });
});

// ===== RUTAS HTML (ANTES del static) =====
app.get('/v/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'magician.html'));
});
app.get('/magician', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'magician.html'));
});

// ===== STATIC AL FINAL (no captura rutas de arriba) =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('viewer-join', (data) => {
    const { sessionId } = data;
    let session = sessions.get(sessionId);
    if (!session) {
      session = { viewerSocket: null, magicianSocket: null, createdAt: Date.now(), status: 'waiting' };
      sessions.set(sessionId, session);
    }
    session.viewerSocket = socket.id;
    session.status = 'viewer_connected';
    socket.join(`session-${sessionId}`);
    socket.emit('viewer-joined', { sessionId, status: 'connected' });
    io.emit('viewer-waiting', { sessionId });
  });

  socket.on('magician-join', () => {
    socket.join('magicians');
    const activeSessions = [];
    for (const [id, session] of sessions.entries()) {
      if (session.viewerSocket) activeSessions.push({ sessionId: id, createdAt: session.createdAt });
    }
    socket.emit('magician-joined', { sessions: activeSessions });
  });

  socket.on('magician-select-session', (data) => {
    const { sessionId } = data;
    const session = sessions.get(sessionId);
    if (!session || !session.viewerSocket) {
      socket.emit('error', { message: 'Sesión no encontrada o viewer no conectado' });
      return;
    }
    session.magicianSocket = socket.id;
    session.status = 'magician_connected';
    socket.join(`session-${sessionId}`);
    socket.emit('session-selected', { sessionId });
  });

  socket.on('search-command', (data) => {
    const { sessionId, engine, query } = data;
    const session = sessions.get(sessionId);
    if (!session || session.magicianSocket !== socket.id) {
      socket.emit('error', { message: 'No autorizado para esta sesión' });
      return;
    }
    if (!session.viewerSocket) {
      socket.emit('error', { message: 'Viewer no conectado' });
      return;
    }
    const encodedQuery = encodeURIComponent(query.trim());
    const engines = {
      google: `https://www.google.com/search?q=${encodedQuery}`,
      youtube: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      maps: `https://www.google.com/maps/search/${encodedQuery}`,
      wikipedia: `https://es.wikipedia.org/wiki/${encodedQuery}`,
      images: `https://www.google.com/search?tbm=isch&q=${encodedQuery}`
    };
    const targetUrl = engines[engine] || engines.google;
    io.to(`session-${sessionId}`).emit('redirect', { url: targetUrl, engine, query });
    socket.emit('search-sent', { sessionId, engine, query, targetUrl });
  });

  socket.on('viewer-redirected', (data) => console.log(`Viewer redirigido: ${data.sessionId}`));

  socket.on('disconnect', (reason) => {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.viewerSocket === socket.id) {
        session.viewerSocket = null;
        session.status = 'viewer_disconnected';
        io.to('magicians').emit('viewer-disconnected', { sessionId });
        break;
      }
      if (session.magicianSocket === socket.id) {
        session.magicianSocket = null;
        session.status = session.viewerSocket ? 'viewer_connected' : 'waiting';
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Mago:   http://localhost:${PORT}/magician`);
  console.log(`   Viewer: http://localhost:${PORT}/v/SESSION_ID`);
});

module.exports = { app, server, io };