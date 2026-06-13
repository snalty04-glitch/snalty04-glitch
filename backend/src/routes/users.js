const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const user = db.prepare(
    'SELECT id, username, email, avatar, bio, country, created_at, is_online, last_seen FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get media count
  const mediaCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE user_id = ?').get(userId);
  user.media_count = mediaCount.count;

  res.json(user);
});

// Get all online users
router.get('/', authMiddleware, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, avatar, country, is_online, last_seen FROM users WHERE id != ? ORDER BY is_online DESC, last_seen DESC'
  ).all(req.user.id);
  res.json(users);
});

// Search users
router.get('/search/:query', authMiddleware, (req, res) => {
  const { query } = req.params;
  const users = db.prepare(
    'SELECT id, username, avatar, country, is_online FROM users WHERE username LIKE ? AND id != ?'
  ).all(`%${query}%`, req.user.id);
  res.json(users);
});

module.exports = router;
