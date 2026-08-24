const express = require('express');
const { get, all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/dashboard ──────────────────────────────────────────────
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const byStatus = all(
      `SELECT status, COUNT(*) as count FROM complaints GROUP BY status`
    );

    const byCategory = all(
      `SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC`
    );

    const overdueRow = get(
      `SELECT COUNT(*) as count FROM complaints WHERE is_overdue = 1 AND status != 'Resolved'`
    );
    const overdueCount = overdueRow ? overdueRow.count : 0;

    const totalRow = get('SELECT COUNT(*) as count FROM complaints');
    const totalComplaints = totalRow ? totalRow.count : 0;

    const residentRow = get("SELECT COUNT(*) as count FROM users WHERE role = 'resident'");
    const totalResidents = residentRow ? residentRow.count : 0;

    const recentComplaints = all(
      `SELECT c.id, c.title, c.category, c.status, c.priority, c.is_overdue, c.created_at,
              u.name as resident_name, u.apartment_no
       FROM complaints c
       JOIN users u ON c.resident_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 5`
    );

    const byPriority = all(
      `SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority`
    );

    res.json({
      totalComplaints,
      totalResidents,
      overdueCount,
      byStatus,
      byCategory,
      byPriority,
      recentComplaints,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
