import bcrypt from 'bcryptjs';
import { getDbConnection } from '../../db/database.js';
import { signToken } from './auth.middleware.js';

const SALT_ROUNDS = 10;

// ─── Accounts table bootstrap ─────────────────────────────────────────────────
// Called from database.js initDb — creates the accounts table and seeds admin.
export async function initAccountsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed one admin account if none exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@agenx.dev';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const existing = await db.get('SELECT id FROM accounts WHERE role = ?', ['admin']);

  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    await db.run(
      `INSERT INTO accounts (name, email, password, role) VALUES (?, ?, ?, 'admin')`,
      ['Admin', adminEmail, hashed]
    );
    console.log(`👑 Admin account seeded: ${adminEmail}`);
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register({ name, email, password }) {
  const db = await getDbConnection();

  const existing = await db.get('SELECT id FROM accounts WHERE email = ?', [email]);
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await db.run(
    `INSERT INTO accounts (name, email, password, role) VALUES (?, ?, ?, 'user')`,
    [name, email, hashed]
  );

  const account = await db.get(
    'SELECT id, name, email, role, created_at FROM accounts WHERE id = ?',
    [result.lastID]
  );

  const token = signToken({ id: account.id, name: account.name, email: account.email, role: account.role });
  return { token, user: account };
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login({ email, password }) {
  const db = await getDbConnection();

  const account = await db.get('SELECT * FROM accounts WHERE email = ?', [email]);
  if (!account) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, account.password);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const token = signToken({ id: account.id, name: account.name, email: account.email, role: account.role });

  const { password: _, ...user } = account;
  return { token, user };
}

// ─── Admin: list all users ────────────────────────────────────────────────────
export async function getAllUsers() {
  const db = await getDbConnection();
  return db.all('SELECT id, name, email, role, created_at FROM accounts ORDER BY created_at DESC');
}

// ─── Admin: create user ───────────────────────────────────────────────────────
export async function createUser({ name, email, password }) {
  return register({ name, email, password }); // role always 'user' on creation
}

// ─── Admin: update user ───────────────────────────────────────────────────────
export async function updateUser(id, { name, email }) {
  const db = await getDbConnection();

  const existing = await db.get('SELECT id FROM accounts WHERE id = ?', [id]);
  if (!existing) throw Object.assign(new Error('User not found'), { status: 404 });

  // Check email conflict with another account
  if (email) {
    const conflict = await db.get('SELECT id FROM accounts WHERE email = ? AND id != ?', [email, id]);
    if (conflict) throw Object.assign(new Error('Email already in use'), { status: 409 });
  }

  await db.run(
    `UPDATE accounts SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?`,
    [name ?? null, email ?? null, id]
  );

  return db.get('SELECT id, name, email, role, created_at FROM accounts WHERE id = ?', [id]);
}

// ─── Admin: delete user ───────────────────────────────────────────────────────
export async function deleteUser(id) {
  const db = await getDbConnection();

  const account = await db.get('SELECT role FROM accounts WHERE id = ?', [id]);
  if (!account) throw Object.assign(new Error('User not found'), { status: 404 });
  if (account.role === 'admin') throw Object.assign(new Error('Cannot delete the admin account'), { status: 403 });

  await db.run('DELETE FROM accounts WHERE id = ?', [id]);
  return { deleted: true };
}