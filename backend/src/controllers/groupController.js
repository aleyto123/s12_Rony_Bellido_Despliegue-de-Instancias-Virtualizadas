const db = require('../models/db');

function createGroup(req, res) {
  const { name } = req.body;
  const createdBy = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'El nombre del grupo es requerido' });
  }

  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const group = db.prepare('INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?)')
    .run(name, inviteCode, createdBy);

  db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(group.lastInsertRowid, createdBy);

  res.status(201).json({ id: group.lastInsertRowid, name, invite_code: inviteCode, created_by: createdBy });
}

function joinGroup(req, res) {
  const { invite_code } = req.body;
  const userId = req.user.id;

  if (!invite_code) {
    return res.status(400).json({ error: 'Código de invitación requerido' });
  }

  const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(invite_code.toUpperCase());
  if (!group) {
    return res.status(404).json({ error: 'Código de invitación inválido' });
  }

  const existing = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group.id, userId);
  if (existing) {
    return res.status(409).json({ error: 'Ya eres miembro del grupo' });
  }

  db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(group.id, userId);
  res.json({ message: 'Te uniste al grupo', group });
}

function getGroups(req, res) {
  const userId = req.user.id;
  const groups = db.prepare(`
    SELECT g.*
    FROM groups g
    INNER JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(userId);

  res.json(groups);
}

function getGroupLeaderboard(req, res) {
  const { id } = req.params;
  const rows = db.prepare(`
    SELECT u.username, COALESCE(SUM(p.points), 0) AS total_points
    FROM group_members gm
    INNER JOIN users u ON u.id = gm.user_id
    LEFT JOIN predictions p ON p.user_id = u.id
    LEFT JOIN matches m ON m.id = p.match_id
    WHERE gm.group_id = ?
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, u.username ASC
  `).all(id);

  res.json(rows);
}

module.exports = { createGroup, joinGroup, getGroups, getGroupLeaderboard };
