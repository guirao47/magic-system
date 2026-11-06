/**
 * Servidor Backend - Magic System (Simplificado Radical)
 * Arquitectura: URL raíz única, sesión global única
 * - /              → Vista Espectador (única página web)
 * - /app           → Panel Mago (APK)
 * - Socket.io      → Canal global único (broadcast directo)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Estado global único (sin sesiones, sin IDs)
let viewerConnected = false;
let viewerSocketId = null;
let magicianConnected = false;

// ===== RUTAS API MÍNIMAS =====
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/status', (req, res) => res.json({
  viewerConnected,
  magicianConnected
}));

// ===== RUTAS HTML (ANTES del static) =====
// Raíz única → Vista Espectador (página web pública)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'viewer.html')));

// Panel Mago (APK) - ruta exclusiva para la app instalada
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'magician.html')));

// Legacy redirects
app.get('/magician', (req, res) => res.redirect('/app'));

// ===== STATIC AL FINAL =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== SOCKET.IO - CANAL GLOBAL ÚNICO =====
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Espectador se une (único)
  socket.on('viewer-join', () => {
    if (viewerConnected) {
      // Solo un espectador a la vez
      socket.emit('error', { message: 'Ya hay un espectador conectado' });
      return;
    }
    viewerConnected = true;
    viewerSocketId = socket.id;
    socket.join('viewer');
    console.log('👁️ Espectador conectado');
    socket.emit('viewer-joined', { status: 'connected' });
    // Notificar al mago que hay espectador listo
    io.to('magician').emit('viewer-ready', { status: 'waiting' });
  });

  // Mago se une
  socket.on('magician-join', () => {
    magicianConnected = true;
    socket.join('magician');
    console.log('🎩 Mago conectado');
    socket.emit('magician-joined', {
      viewerReady: viewerConnected
    });
  });

  // Mago envía búsqueda (broadcast directo al espectador único)
  socket.on('search-command', (data) => {
    const { engine, query } = data;
    if (!viewerConnected || !viewerSocketId) {
      socket.emit('error', { message: 'No hay espectador conectado' });
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
    console.log(`🔮 Redirect: ${engine} → ${targetUrl}`);
    // Enviar directo al espectador único
    io.to(viewerSocketId).emit('redirect', { url: targetUrl, engine, query });
    socket.emit('search-sent', { engine, query, targetUrl });
  });

  socket.on('disconnect', (reason) => {
    if (socket.id === viewerSocketId) {
      viewerConnected = false;
      viewerSocketId = null;
      console.log('👁️ Espectador desconectado');
      io.to('magician').emit('viewer-disconnected', { reason });
    }
    if (magicianConnected) {
      magicianConnected = false;
      console.log('🎩 Mago desconectado');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor puerto ${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/health`);
  console.log(`   Espectador: http://localhost:${PORT}/  (URL raíz pública)`);
  console.log(`   Panel Mago: http://localhost:${PORT}/app (APK)`);
});

module.exports = { app, server, io };