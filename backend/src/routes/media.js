const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const uploadDir = isVideo ? 'uploads/videos' : 'uploads/photos';
    cb(null, path.join(__dirname, '../../', uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Upload media to album
router.post('/upload', authMiddleware, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const caption = req.body.caption || '';
    const mediaItems = [];

    const insertMedia = db.prepare(
      'INSERT INTO media (id, user_id, filename, original_name, mimetype, size, type, caption) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const file of req.files) {
      const mediaId = uuidv4();
      const type = file.mimetype.startsWith('video/') ? 'video' : 'photo';

      insertMedia.run(
        mediaId,
        req.user.id,
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        type,
        caption
      );

      mediaItems.push({
        id: mediaId,
        filename: file.filename,
        original_name: file.originalname,
        type,
        size: file.size,
        caption
      });
    }

    res.status(201).json({ media: mediaItems });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading files' });
  }
});

// Get user's album
router.get('/album/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const media = db.prepare(
    'SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
  res.json(media);
});

// Delete media
router.delete('/:mediaId', authMiddleware, (req, res) => {
  const { mediaId } = req.params;
  const media = db.prepare('SELECT * FROM media WHERE id = ? AND user_id = ?').get(mediaId, req.user.id);

  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);

  // Delete file from disk
  const fs = require('fs');
  const filePath = path.join(__dirname, '../../uploads', media.type === 'video' ? 'videos' : 'photos', media.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  res.json({ message: 'Media deleted successfully' });
});

module.exports = router;
