const express = require('express');
const { get, all, run } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendNoticeEmail } = require('../services/email');

const router = express.Router();

// ─── POST /api/notices ───────────────────────────────────────────────
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, content, is_important } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const result = run(
      `INSERT INTO notices (title, content, is_important, posted_by) VALUES (?, ?, ?, ?)`,
      [title, content, is_important ? 1 : 0, req.user.id]
    );

    // If important, email all residents
    if (is_important) {
      const residents = all("SELECT email, name FROM users WHERE role = 'resident'");
      for (const resident of residents) {
        try {
          await sendNoticeEmail({
            residentEmail: resident.email,
            residentName: resident.name,
            noticeTitle: title,
            noticeContent: content,
          });
        } catch (emailErr) {
          console.error(`Email to ${resident.email} failed:`, emailErr.message);
        }
      }
    }

    const notice = get('SELECT * FROM notices WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ notice });
  } catch (err) {
    console.error('Create notice error:', err);
    res.status(500).json({ error: 'Failed to create notice.' });
  }
});

// ─── GET /api/notices ────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    const notices = all(
      `SELECT n.*, u.name as posted_by_name
       FROM notices n
       JOIN users u ON n.posted_by = u.id
       ORDER BY n.is_important DESC, n.created_at DESC`
    );
    res.json({ notices });
  } catch (err) {
    console.error('List notices error:', err);
    res.status(500).json({ error: 'Failed to fetch notices.' });
  }
});

// ─── DELETE /api/notices/:id ─────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const notice = get('SELECT * FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    console.error('Delete notice error:', err);
    res.status(500).json({ error: 'Failed to delete notice.' });
  }
});

module.exports = router;
