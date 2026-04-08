import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.resolve(__dirname, 'agenx.db');

export async function getDbConnection() {
    return open({
        filename: dbPath,
        driver: sqlite3.Database
    });
}

export async function initDb() {
    const db = await getDbConnection();

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    console.log('📦 Inicializando base de datos SQLite...');

    // Create tables
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS incident_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL UNIQUE,
      assigned_team TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Check if we need to seed data
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');

    if (userCount.count === 0) {
        console.log('🌱 Poblando base de datos con ingenieros iniciales (Seed)...');

        await db.exec(`
      INSERT INTO users (name, email, role, experience_years) VALUES 
        ('Ana García', 'ana.garcia@agenx.dev', 'Backend Engineer', 5),
        ('Carlos Ruiz', 'carlos.ruiz@agenx.dev', 'Frontend Engineer', 3),
        ('Elena Torres', 'elena.torres@agenx.dev', 'DevOps Engineer', 6),
        ('Javier Mendoza', 'javier.mendoza@agenx.dev', 'Backend Engineer', 2),
        ('Lucía Castro', 'lucia.castro@agenx.dev', 'Fullstack Engineer', 4),
        ('Miguel Ortiz', 'miguel.ortiz@agenx.dev', 'Site Reliability Engineer', 5),
        ('Carmen Solís', 'carmen.solis@agenx.dev', 'Frontend Engineer', 2),
        ('Roberto Pineda', 'roberto.pineda@agenx.dev', 'Backend Engineer', 8);

      INSERT INTO skills (name) VALUES 
        ('Node.js'),
        ('React'),
        ('AWS / Infraestructura');

      INSERT INTO user_skills (user_id, skill_id, level) VALUES 
        (1, 1, 5), (1, 3, 2),
        (2, 2, 5), (2, 1, 2),
        (3, 3, 5), (3, 1, 3),
        (4, 1, 3),
        (5, 1, 4), (5, 2, 4),
        (6, 3, 5), (6, 1, 2),
        (7, 2, 3),
        (8, 1, 5), (8, 3, 4);
    `);
        console.log('✅ Base de datos inicializada y poblada.');
    } else {
        console.log('✅ Base de datos lista.');
    }

    return db;
}
