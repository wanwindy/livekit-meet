import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import {config} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = mysql.createPool({
  ...config.mysql,
  waitForConnections: true,
  namedPlaceholders: true,
});

export const query = async (sql, params = {}) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const queryOne = async (sql, params = {}) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const transaction = async callback => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const migrate = async () => {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  const statements = schema
    .split(/;\s*$/m)
    .map(statement => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
};

export const ensureBootstrapAdmin = async () => {
  const {username, password, displayName} = config.bootstrapAdmin;
  if (!username || !password) {
    return;
  }

  const existing = await queryOne(
    'select id from accounts where username = :username and deleted_at is null',
    {username},
  );

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `insert into accounts
      (username, display_name, password_hash, role, status, max_devices)
     values
      (:username, :displayName, :passwordHash, 'super_admin', 'active', 5)`,
    {username, displayName, passwordHash},
  );
};

