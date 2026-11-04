const { randomBytes } = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
	host: process.env.PGHOST,
	port: Number.parseInt(process.env.PGPORT || '5432', 10),
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	max: Number.parseInt(process.env.DB_POOL_SIZE || '8', 10),
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000
});

async function initializeDatabase() {
	const client = await pool.connect();
	let transactionOpen = false;
	try {
		await client.query('SELECT pg_advisory_lock($1)', [26062026]);
		await client.query(`
		CREATE TABLE IF NOT EXISTS app_settings (
			setting_key TEXT PRIMARY KEY,
			setting_value TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			username VARCHAR(24) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS matches (
			id BIGSERIAL PRIMARY KEY,
			home_team VARCHAR(80) NOT NULL,
			away_team VARCHAR(80) NOT NULL,
			kickoff_at TIMESTAMPTZ NOT NULL,
			home_score SMALLINT CHECK (home_score IS NULL OR home_score BETWEEN 0 AND 99),
			away_score SMALLINT CHECK (away_score IS NULL OR away_score BETWEEN 0 AND 99),
			status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
			stage VARCHAR(40) NOT NULL DEFAULT 'Group stage',
			group_name VARCHAR(40),
			stadium VARCHAR(100),
			city VARCHAR(80),
			is_demo BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CHECK (home_team <> away_team)
		);
		CREATE TABLE IF NOT EXISTS predictions (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
			home_score SMALLINT NOT NULL CHECK (home_score BETWEEN 0 AND 99),
			away_score SMALLINT NOT NULL CHECK (away_score BETWEEN 0 AND 99),
			predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			points INTEGER NOT NULL DEFAULT 0,
			exact_hit BOOLEAN NOT NULL DEFAULT FALSE,
			winner_hit BOOLEAN NOT NULL DEFAULT FALSE,
			goal_difference_hit BOOLEAN NOT NULL DEFAULT FALSE,
			UNIQUE (user_id, match_id)
		);
		CREATE TABLE IF NOT EXISTS private_groups (
			id BIGSERIAL PRIMARY KEY,
			name VARCHAR(48) NOT NULL,
			invite_code CHAR(6) UNIQUE NOT NULL,
			created_by BIGINT NOT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS group_members (
			group_id BIGINT NOT NULL REFERENCES private_groups(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (group_id, user_id)
		);
		CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at);
		CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id, match_id);
		CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, group_id);
		`);

		if (!process.env.JWT_SECRET) {
			const candidateSecret = randomBytes(48).toString('base64url');
			await client.query(
				'INSERT INTO app_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING',
				['jwt_secret', candidateSecret]
			);
			const { rows } = await client.query('SELECT setting_value FROM app_settings WHERE setting_key = $1', ['jwt_secret']);
			process.env.JWT_SECRET = rows[0].setting_value;
		}

		const username = process.env.ADMIN_USERNAME || 'admin';
		const password = process.env.ADMIN_PASSWORD || 'Admin-Local-2026!';
		const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [username]);
		if (existingAdmin.rowCount === 0) {
			const passwordHash = await bcrypt.hash(password, 12);
			await client.query(
				'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
				[username, passwordHash, 'admin']
			);
		}

		await client.query('BEGIN');
		transactionOpen = true;
		const count = await client.query('SELECT COUNT(*)::int AS count FROM matches');
		if (count.rows[0].count === 0) {
			const demoMatches = [
				['Argentina', 'Australia', 2, 'Group A', 'Estadio Azteca', 'Ciudad de México'],
				['Japón', 'España', 3, 'Group E', 'SoFi Stadium', 'Inglewood'],
				['Brasil', 'Alemania', 4, 'Group C', 'Hard Rock Stadium', 'Miami Gardens'],
				['México', 'Francia', 5, 'Group A', 'Estadio BBVA', 'Guadalupe']
			];
			for (const [home, away, daysAhead, group, stadium, city] of demoMatches) {
				const kickoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
				await client.query(
					`INSERT INTO matches (home_team, away_team, kickoff_at, group_name, stadium, city, is_demo)
					 VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
					[home, away, kickoff, group, stadium, city]
				);
			}
		}
		await client.query('COMMIT');
		transactionOpen = false;
	} catch (error) {
		if (transactionOpen) await client.query('ROLLBACK');
		throw error;
	} finally {
		await client.query('SELECT pg_advisory_unlock($1)', [26062026]).catch(() => {});
		client.release();
	}
}

module.exports = { initializeDatabase, pool };
