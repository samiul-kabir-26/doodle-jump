import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './connection.js';
import { DEFAULT_THEME } from '../../shared/themeSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(db = null) {
  const database = db || getDatabase();
  const migrationsDir = path.join(__dirname, 'migrations');

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const appliedVersions = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1], 10);
    if (appliedVersions.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const applyTx = database.transaction(() => {
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        version,
        Date.now()
      );
    });
    applyTx();
    appliedVersions.add(version);
  }

  // Seed default theme version 0 if missing
  const v0 = database.prepare('SELECT version FROM theme_versions WHERE version = 0').get();
  if (!v0) {
    database
      .prepare('INSERT INTO theme_versions (version, theme, note, published_at) VALUES (?, ?, ?, ?)')
      .run(0, JSON.stringify(DEFAULT_THEME), 'Bundled default theme', Date.now());
  }

  // Seed draft theme if missing
  const draft = database.prepare('SELECT id FROM theme_draft WHERE id = 1').get();
  if (!draft) {
    database
      .prepare('INSERT INTO theme_draft (id, theme, updated_at, base_version) VALUES (1, ?, ?, 0)')
      .run(JSON.stringify(DEFAULT_THEME), Date.now());
  }

  // Seed default settings if missing
  const defaultSettings = [
    {
      key: 'gameplay',
      value: JSON.stringify({
        difficultyMultiplier: 1.0,
        powerupRateMultiplier: 1.0,
        enabled: {
          monsters: true,
          blackHoles: true,
          jetpack: true,
          propeller: true,
          springShoes: true,
          trampoline: true,
          shooting: true
        }
      })
    },
    {
      key: 'antiCheat',
      value: JSON.stringify({
        maxScoreRate: 450,
        minDurationMs: 3000
      })
    },
    {
      key: 'webhook',
      value: JSON.stringify({
        enabled: false,
        url: '',
        eventTypes: ['score.*', 'milestone.*', 'leaderboard.*', 'game.ended']
      })
    }
  ];

  for (const setting of defaultSettings) {
    const exists = database.prepare('SELECT key FROM settings WHERE key = ?').get(setting.key);
    if (!exists) {
      database
        .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
        .run(setting.key, setting.value, Date.now());
    }
  }

  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
  console.log('✅ Migrations completed successfully.');
}
