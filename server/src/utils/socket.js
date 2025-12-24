// src/utils/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * initializeSocket(server)
 * - server: http server instance
 * Returns the socket.io server instance (or null on failure).
 */
function initializeSocket(server) {
  if (!server) {
    console.warn('[socket] initializeSocket called without server -> returning null');
    return null;
  }

  // Parse allowed origins from env safely
  const raw = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  const origins = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  try {
    io = new Server(server, {
      cors: {
        origin: origins,
        credentials: true,
      },
    });
  } catch (err) {
    console.error('[socket] Failed to create Server:', err && err.stack ? err.stack : err);
    io = null;
    return null;
  }

  // Authentication middleware with multiple token fallbacks
  io.use((socket, next) => {
    try {
      // token can be sent in handshake.auth, query, or Authorization header
      let token =
        socket.handshake?.auth?.token ||
        socket.handshake?.query?.token ||
        (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '') ||
        null;

      if (!token) {
        const err = new Error('Authentication required');
        err.data = { code: 'AUTH_REQUIRED' };
        return next(err);
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        const err = new Error('JWT secret not configured on server');
        err.data = { code: 'NO_JWT_SECRET' };
        console.error('[socket] JWT_SECRET missing in env');
        return next(err);
      }

      const decoded = jwt.verify(token, secret);
      socket.user = decoded || { id: null };
      return next();
    } catch (err) {
      // jwt.verify throws on invalid/expired tokens
      console.warn('[socket] auth error:', err && err.message ? err.message : err);
      const e = new Error('Invalid token');
      e.data = { code: 'INVALID_TOKEN' };
      return next(e);
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    // safe fallback for logging if user or email missing
    const userEmail = socket.user?.email || socket.user?.id || socket.id;
    console.log(`✅ Socket connected: ${userEmail}`);

    // rooms: overseer (OWNER/ADMIN) and branch
    const role = socket.user?.role;
    const branchId = socket.user?.branchId;

    if (role === 'OWNER' || role === 'ADMIN') {
      socket.join('overseer');
      console.log(`👑 ${userEmail} joined overseer room`);
    }

    if (branchId) {
      socket.join(`branch:${branchId}`);
      console.log(`🏪 ${userEmail} joined branch:${branchId} room`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${userEmail} (${reason || 'client disconnect'})`);
    });

    // Example: handle ping event from client
    socket.on('ping-server', (payload) => {
      socket.emit('pong', { now: Date.now(), payload });
    });
  });

  // Useful debug logging
  io.on('error', (err) => {
    console.error('[socket] io error', err && err.stack ? err.stack : err);
  });

  console.log('[socket] initializeSocket completed, io ready');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized — call initializeSocket(server) first');
  return io;
}

// Emitting helpers
function emitToOverseer(event, data) {
  if (io) io.to('overseer').emit(event, data);
}

function emitToBranch(branchId, event, data) {
  if (io && branchId) io.to(`branch:${branchId}`).emit(event, data);
}

function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

module.exports = {
  initializeSocket,
  getIO,
  emitToOverseer,
  emitToBranch,
  emitToAll,
};
