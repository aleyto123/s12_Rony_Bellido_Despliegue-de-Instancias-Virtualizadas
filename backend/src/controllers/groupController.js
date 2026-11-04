const { randomBytes } = require('crypto');
const { pool } = require('../models/db');

async function createGroup(req, res) {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 48) {
    return res.status(400).json({ error: 'El nombre de la sala debe tener entre 1 y 48 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inviteCode = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      result = await client.query(
        `INSERT INTO private_groups (name, invite_code, created_by) VALUES ($1, $2, $3)
         ON CONFLICT (invite_code) DO NOTHING
         RETURNING id, name, invite_code, created_by, created_at`,
        [name, inviteCode, req.user.id]
      );
      if (result.rowCount) break;
    }
    if (!result?.rowCount) throw new Error('No se pudo reservar un código único. Intenta de nuevo.');

    const group = result.rows[0];
    await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [group.id, req.user.id]);
    await client.query('COMMIT');
    return res.status(201).json(group);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function joinGroup(req, res) {
  const inviteCode = typeof req.body.invite_code === 'string' ? req.body.invite_code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
    return res.status(400).json({ error: 'El código debe tener 6 letras o números.' });
  }

  const result = await pool.query('SELECT id, name, invite_code, created_by, created_at FROM private_groups WHERE invite_code = $1', [inviteCode]);
  const group = result.rows[0];
  if (!group) {
    return res.status(404).json({ error: 'Código de invitación inválido.' });
  }

  const membership = await pool.query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING group_id',
    [group.id, req.user.id]
  );
  if (!membership.rowCount) {
    return res.status(409).json({ error: 'Ya perteneces a esta sala.' });
  }

  return res.json({ message: 'Te uniste a la sala.', group });
}

async function getGroups(req, res) {
  const { rows } = await pool.query(`
    SELECT g.*, creator.username AS created_by_username, COUNT(all_members.user_id)::int AS member_count
    FROM private_groups g
    INNER JOIN group_members membership ON membership.group_id = g.id AND membership.user_id = $1
    INNER JOIN users creator ON creator.id = g.created_by
    LEFT JOIN group_members all_members ON all_members.group_id = g.id
    GROUP BY g.id, creator.username
    ORDER BY g.created_at DESC
  `, [req.user.id]);
  res.json(rows);
}

async function getGroupLeaderboard(req, res) {
  const groupId = Number(req.params.id);
  if (!Number.isSafeInteger(groupId)) return res.status(400).json({ error: 'Sala inválida.' });
  const membership = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, req.user.id]
  );
  if (!membership.rowCount) return res.status(404).json({ error: 'Sala no encontrada.' });

  const { rows } = await pool.query(`
    SELECT u.id AS user_id, u.username, COALESCE(SUM(p.points), 0)::int AS total_points
    FROM group_members gm
    INNER JOIN users u ON u.id = gm.user_id
    LEFT JOIN predictions p ON p.user_id = u.id
    WHERE gm.group_id = $1
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, u.username ASC
  `, [groupId]);
  res.json(rows);
}

module.exports = { createGroup, joinGroup, getGroups, getGroupLeaderboard };
