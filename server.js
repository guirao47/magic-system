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

// Configuración CORS para permitir conexiones desde cualquier origen
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Permitir conexiones WebSocket y polling
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check para Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API para crear/obtener sesiones
const sessions = new Map(); // sessionId -> { viewerSocket, magicianSocket, createdAt }

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Crear nueva sesión (llama el viewer al cargar)
app.post('/api/session', (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    viewerSocket: null,
    magicianSocket: null,
    createdAt: Date.now(),
    status: 'waiting'
  });

  // Limpiar sesiones viejas (> 1 hora)
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, session] of sessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      sessions.delete(id);
    }
  }

  res.json({ sessionId, url: `/v/${sessionId}` });
});

// Obtener info de sesión
app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }
  res.json({
    sessionId: req.params.sessionId,
    hasViewer: !!session.viewerSocket,
    hasMagician: !!session.magicianSocket,
    status: session.status
  });
});

// Listar sesiones activas (para el panel del mago)
app.get('/api/sessions', (req, res) => {
  const active = [];
  for (const [id, session] of sessions.entries()) {
    if (session.viewerSocket) {
      active.push({ sessionId: id, createdAt: session.createdAt });
    }
  }
  res.json({ sessions: active });
});

// Servir archivos estáticos del viewer en /v/:sessionId
app.get('/v/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Servir panel del mago en raíz y /magician
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'magician.html'));
});
app.get('/magician', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'magician.html'));
});

// ===== SOCKET.IO EVENTOS =====

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Viewer se une a una sesión
  socket.on('viewer-join', (data) => {
    const { sessionId } = data;
    let session = sessions.get(sessionId);

    if (!session) {
      session = {
        viewerSocket: null,
        magicianSocket: null,
        createdAt: Date.now(),
        status: 'waiting'
      };
      sessions.set(sessionId, session);
    }

    session.viewerSocket = socket.id;
    session.status = 'viewer_connected';
    socket.join(`session-${sessionId}`);

    console.log(`Viewer unido a sesión: ${sessionId}`);

    // Confirmar al viewer
    socket.emit('viewer-joined', { sessionId, status: 'connected' });

    // Notificar a magicians que hay un viewer esperando
    io.emit('viewer-waiting', { sessionId });
  });

  // Magician se conecta
  socket.on('magician-join', () => {
    socket.join('magicians');
    console.log(`Magician conectado: ${socket.id}`);

    // Enviar lista de sesiones con viewers esperando
    const activeSessions = [];
    for (const [id, session] of sessions.entries()) {
      if (session.viewerSocket) {
        activeSessions.push({ sessionId: id, createdAt: session.createdAt });
      }
    }
    socket.emit('magician-joined', { sessions: activeSessions });
  });

  // Magician selecciona una sesión para controlar
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

    console.log(`Magician ${socket.id} controlando sesión ${sessionId}`);
    socket.emit('session-selected', { sessionId });
  });

  // Magician envía búsqueda
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

    // Construir URL de destino según motor
    const encodedQuery = encodeURIComponent(query.trim());
    let targetUrl;

    const engines = {
      google: `https://www.google.com/search?q=${encodedQuery}`,
      youtube: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      maps: `https://www.google.com/maps/search/${encodedQuery}`,
      wikipedia: `https://es.wikipedia.org/wiki/${encodedQuery}`,
      images: `https://www.google.com/search?tbm=isch&q=${encodedQuery}`
    };

    targetUrl = engines[engine] || engines.google;

    console.log(`Redirigiendo sesión ${sessionId} a: ${targetUrl}`);

    // Enviar comando de redirección al viewer
    io.to(`session-${sessionId}`).emit('redirect', {
      url: targetUrl,
      engine,
      query
    });

    // Confirmar al magician
    socket.emit('search-sent', { sessionId, engine, query, targetUrl });
  });

  // Viewer confirma redirección (opcional, para analytics)
  socket.on('viewer-redirected', (data) => {
    console.log(`Viewer confirmó redirección: ${data.sessionId}`);
  });

  // Desconexión
  socket.on('disconnect', (reason) => {
    console.log(`Desconectado: ${socket.id}, razón: ${reason}`);

    // Limpiar sesión si era viewer
    for (const [sessionId, session] of sessions.entries()) {
      if (session.viewerSocket === socket.id) {
        session.viewerSocket = null;
        session.status = 'viewer_disconnected';
        // Notificar a magicians
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

// Puerto - Render usa process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Panel Mago:   http://localhost:${PORT}/magician`);
  console.log(`   Viewer:       http://localhost:${PORT}/v/SESSION_ID`);
});

module.exports = { app, server, io };