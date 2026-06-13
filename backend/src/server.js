require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');

// Import database
const db = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'World Chat API is running' });
});

// Track connected users and video room participants
const connectedUsers = new Map();
const videoRoomParticipants = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins the app
  socket.on('user:online', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id
    });

    // Update user online status in DB
    db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(userData.id);

    // Broadcast to all that user is online
    io.emit('user:status', { userId: userData.id, isOnline: true, username: userData.username });
    io.emit('users:online', Array.from(connectedUsers.values()));
  });

  // Join a chat room
  socket.on('room:join', ({ roomId, user }) => {
    socket.join(roomId);

    // Add to room members in DB
    db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, user.id);

    // Notify room
    socket.to(roomId).emit('room:user-joined', {
      userId: user.id,
      username: user.username,
      avatar: user.avatar
    });

    // Send current room users
    const roomUsers = Array.from(connectedUsers.values()).filter(u => {
      const rooms = io.sockets.sockets.get(u.socketId)?.rooms;
      return rooms && rooms.has(roomId);
    });
    socket.emit('room:users', roomUsers);
  });

  // Leave a chat room
  socket.on('room:leave', ({ roomId, user }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('room:user-left', {
      userId: user.id,
      username: user.username
    });
  });

  // Send a message
  socket.on('message:send', ({ roomId, message }) => {
    const msgId = uuidv4();
    const messageData = {
      id: msgId,
      room_id: roomId,
      user_id: message.userId,
      username: message.username,
      content: message.content,
      type: message.type || 'text',
      created_at: new Date().toISOString(),
      avatar: message.avatar
    };

    // Save to database
    db.prepare(
      'INSERT INTO messages (id, room_id, user_id, username, content, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(msgId, roomId, message.userId, message.username, message.content, message.type || 'text');

    // Broadcast to room
    io.to(roomId).emit('message:received', messageData);
  });

  // Typing indicator
  socket.on('typing:start', ({ roomId, username }) => {
    socket.to(roomId).emit('typing:update', { username, isTyping: true });
  });

  socket.on('typing:stop', ({ roomId, username }) => {
    socket.to(roomId).emit('typing:update', { username, isTyping: false });
  });

  // ==================== VIDEO CALL (WebRTC Signaling) ====================

  // Join video room
  socket.on('video:join', ({ roomId, user }) => {
    socket.join(`video-${roomId}`);

    if (!videoRoomParticipants.has(roomId)) {
      videoRoomParticipants.set(roomId, new Map());
    }

    videoRoomParticipants.get(roomId).set(socket.id, {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      socketId: socket.id
    });

    // Send existing participants to the new user
    const participants = Array.from(videoRoomParticipants.get(roomId).values())
      .filter(p => p.socketId !== socket.id);

    socket.emit('video:participants', participants);

    // Notify others that a new user joined
    socket.to(`video-${roomId}`).emit('video:user-joined', {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      socketId: socket.id
    });

    console.log(`User ${user.username} joined video room ${roomId}. Total: ${videoRoomParticipants.get(roomId).size}`);
  });

  // WebRTC offer
  socket.on('video:offer', ({ targetSocketId, offer, from }) => {
    socket.to(targetSocketId).emit('video:offer', {
      offer,
      from: { ...from, socketId: socket.id }
    });
  });

  // WebRTC answer
  socket.on('video:answer', ({ targetSocketId, answer, from }) => {
    socket.to(targetSocketId).emit('video:answer', {
      answer,
      from: { ...from, socketId: socket.id }
    });
  });

  // ICE candidate
  socket.on('video:ice-candidate', ({ targetSocketId, candidate }) => {
    socket.to(targetSocketId).emit('video:ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Leave video room
  socket.on('video:leave', ({ roomId }) => {
    socket.leave(`video-${roomId}`);

    if (videoRoomParticipants.has(roomId)) {
      videoRoomParticipants.get(roomId).delete(socket.id);

      if (videoRoomParticipants.get(roomId).size === 0) {
        videoRoomParticipants.delete(roomId);
      }
    }

    socket.to(`video-${roomId}`).emit('video:user-left', { socketId: socket.id });
  });

  // Toggle audio/video
  socket.on('video:toggle-media', ({ roomId, type, enabled }) => {
    socket.to(`video-${roomId}`).emit('video:media-toggled', {
      socketId: socket.id,
      type,
      enabled
    });
  });

  // ==================== DISCONNECT ====================

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);

    if (user) {
      // Update offline status
      db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      // Broadcast offline status
      io.emit('user:status', { userId: user.id, isOnline: false, username: user.username });

      connectedUsers.delete(socket.id);
      io.emit('users:online', Array.from(connectedUsers.values()));
    }

    // Remove from all video rooms
    for (const [roomId, participants] of videoRoomParticipants.entries()) {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        io.to(`video-${roomId}`).emit('video:user-left', { socketId: socket.id });

        if (participants.size === 0) {
          videoRoomParticipants.delete(roomId);
        }
      }
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`World Chat server running on port ${PORT}`);
  console.log(`WebSocket ready for connections`);
});
