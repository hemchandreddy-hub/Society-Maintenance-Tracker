const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, all, run } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendStatusChangeEmail } = require('../services/email');

const router = express.Router();

// ─── Multer Config ───────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
    }
  },
});

// ─── Helper: Update overdue flags ────────────────────────────────────
function updateOverdueFlags() {
  const setting = get('SELECT value FROM settings WHERE key = ?', ['overdue_days']);
  const overdueDays = setting ? parseInt(setting.value, 10) : 7;

  run(
    `UPDATE complaints
     SET is_overdue = 1
     WHERE status IN ('Open', 'In Progress')
       AND is_overdue = 0
       AND created_at <= datetime('now', '-' || ? || ' days')`,
    [overdueDays]
  );
}

// ─── POST /api/complaints ────────────────────────────────────────────
router.post('/', authenticate, authorize('resident'), upload.single('photo'), (req, res) => {
  try {
    const { category, title, description } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ error: 'Category, title, and description are required.' });
    }

    const validCategories = ['Plumbing', 'Electrical', 'Elevator', 'Parking', 'Common Area', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = run(
      `INSERT INTO complaints (resident_id, category, title, description, photo_url)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, category, title, description, photoUrl]
    );

    // Create initial history entry
    run(
      `INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note)
       VALUES (?, NULL, 'Open', ?, 'Complaint created')`,
      [result.lastInsertRowid, req.user.id]
    );

    const complaint = get('SELECT * FROM complaints WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ complaint });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ error: 'Failed to create complaint.' });
  }
});

// ─── GET /api/complaints ─────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    updateOverdueFlags();

    let query = '';
    const params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT c.*, u.name as resident_name, u.apartment_no
        FROM complaints c
        JOIN users u ON c.resident_id = u.id
        WHERE 1=1
      `;

      if (req.query.category) {
        query += ' AND c.category = ?';
        params.push(req.query.category);
      }
      if (req.query.status) {
        query += ' AND c.status = ?';
        params.push(req.query.status);
      }
      if (req.query.priority) {
        query += ' AND c.priority = ?';
        params.push(req.query.priority);
      }
      if (req.query.dateFrom) {
        query += ' AND c.created_at >= ?';
        params.push(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        query += ' AND c.created_at <= ?';
        params.push(req.query.dateTo + 'T23:59:59');
      }

      query += ' ORDER BY c.is_overdue DESC, c.created_at DESC';
    } else {
      query = `
        SELECT c.*, u.name as resident_name, u.apartment_no
        FROM complaints c
        JOIN users u ON c.resident_id = u.id
        WHERE c.resident_id = ?
        ORDER BY c.created_at DESC
      `;
      params.push(req.user.id);
    }

    const complaints = all(query, params);
    res.json({ complaints });
  } catch (err) {
    console.error('List complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// ─── GET /api/complaints/:id ─────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  try {
    const complaint = get(
      `SELECT c.*, u.name as resident_name, u.email as resident_email, u.apartment_no
       FROM complaints c
       JOIN users u ON c.resident_id = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (req.user.role === 'resident' && complaint.resident_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const history = all(
      `SELECT ch.*, u.name as changed_by_name
       FROM complaint_history ch
       JOIN users u ON ch.changed_by = u.id
       WHERE ch.complaint_id = ?
       ORDER BY ch.created_at ASC`,
      [req.params.id]
    );

    res.json({ complaint, history });
  } catch (err) {
    console.error('Get complaint error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint.' });
  }
});

// ─── PATCH /api/complaints/:id/status ────────────────────────────────
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Open', 'In Progress', 'Resolved'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const complaint = get(
      `SELECT c.*, u.email as resident_email, u.name as resident_name
       FROM complaints c
       JOIN users u ON c.resident_id = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (complaint.status === 'Resolved') {
      return res.status(400).json({ error: 'Cannot update a resolved complaint.' });
    }

    const oldStatus = complaint.status;
    const now = new Date().toISOString();

    if (status === 'Resolved') {
      run(
        `UPDATE complaints SET status = ?, updated_at = ?, resolved_at = ?, is_overdue = 0 WHERE id = ?`,
        [status, now, now, req.params.id]
      );
    } else {
      run(
        `UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?`,
        [status, now, req.params.id]
      );
    }

    // Record in history
    run(
      `INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, oldStatus, status, req.user.id, note || null]
    );

    // Send email notification
    try {
      await sendStatusChangeEmail({
        residentEmail: complaint.resident_email,
        residentName: complaint.resident_name,
        complaintTitle: complaint.title,
        oldStatus,
        newStatus: status,
        note,
      });
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr.message);
    }

    const updated = get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ complaint: updated });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update complaint status.' });
  }
});

// ─── PATCH /api/complaints/:id/priority ──────────────────────────────
router.patch('/:id/priority', authenticate, authorize('admin'), (req, res) => {
  try {
    const { priority } = req.body;
    const validPriorities = ['Low', 'Medium', 'High'];

    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }

    const complaint = get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    run('UPDATE complaints SET priority = ?, updated_at = ? WHERE id = ?',
      [priority, new Date().toISOString(), req.params.id]);

    const updated = get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ complaint: updated });
  } catch (err) {
    console.error('Update priority error:', err);
    res.status(500).json({ error: 'Failed to update priority.' });
  }
});

// ─── POST /api/complaints/:id/overdue ────────────────────────────────
router.post('/:id/overdue', authenticate, authorize('admin'), (req, res) => {
  try {
    const complaint = get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (complaint.status === 'Resolved') {
      return res.status(400).json({ error: 'Cannot flag a resolved complaint as overdue.' });
    }

    run('UPDATE complaints SET is_overdue = 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), req.params.id]);

    const updated = get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ complaint: updated });
  } catch (err) {
    console.error('Flag overdue error:', err);
    res.status(500).json({ error: 'Failed to flag complaint as overdue.' });
  }
});

module.exports = router;
