const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Usa un usuario de 3 a 24 caracteres y una contraseña de 8 a 128 caracteres.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
      [username, passwordHash]
    );
    const user = result.rows[0];
    return res.status(201).json({ user, token: generateToken(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El usuario ya existe' });
    throw error;
  }
}

async function login(req, res) {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const result = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const safeUser = { id: user.id, username: user.username, role: user.role };
  return res.json({ user: safeUser, token: generateToken(safeUser) });
}

module.exports = { register, login };
