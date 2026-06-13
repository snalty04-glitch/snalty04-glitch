const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all public rooms
router.get('/', authMiddleware, (req, res) => {
  const rooms = db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
    FROM rooms r 
    WHERE r.type = 'public' OR r.type = 'video'
    ORDER BY r.created_at ASC
  `).all();
  res.json(rooms);
});

// Get room messages
router.get('/:roomId/messages', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const messages = db.prepare(`
    SELECT m.*, u.avatar 
    FROM messages m 
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.room_id = ? 
    ORDER BY m.created_at DESC 
    LIMIT ? OFFSET ?
  `).all(roomId, limit, offset);

  res.json(messages.reverse());
});

// Get online users in a room
router.get('/:roomId/users', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const users = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.country, u.is_online
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
  `).all(roomId);
  res.json(users);
});

module.exports = router;
