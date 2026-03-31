import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/todos
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, text, done, created_at, done_at
       FROM todos WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ todos: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO todos (user_id, org_id, text) VALUES ($1, $2, $3)
       RETURNING id, text, done, created_at, done_at`,
      [req.user.id, req.orgId, text.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/todos/:id — toggle done or update text
router.patch('/:id', async (req, res) => {
  const { done, text } = req.body;
  try {
    const fields = [];
    const vals = [];
    if (text !== undefined)  { fields.push(`text = $${vals.length + 1}`);    vals.push(text.trim()); }
    if (done !== undefined)  {
      fields.push(`done = $${vals.length + 1}`);
      vals.push(done);
      fields.push(`done_at = $${vals.length + 1}`);
      vals.push(done ? new Date() : null);
    }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.params.id, req.user.id);
    const { rows } = await db.query(
      `UPDATE todos SET ${fields.join(', ')}
       WHERE id = $${vals.length - 1} AND user_id = $${vals.length}
       RETURNING id, text, done, created_at, done_at`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Todo not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Todo not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
