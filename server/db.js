/* SQLite 数据层。用 Node 内置的 node:sqlite，不需要 node-gyp 和编译工具链。
 *
 * 三类数据（训练记录 / 动作技巧 / 训练计划）共用 records 一张表，body 存 JSON。
 * 这个应用从不跨用户查询组内数据（不会问「所有重量大于 100kg 的组」），
 * 拆成三层关系表只会让同步逻辑复杂三倍，而收益是零。
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id);

CREATE TABLE IF NOT EXISTS records (
  id          TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('workout', 'tip', 'plan')),
  exercise_id TEXT,
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  body        TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
-- 同步只按「这个用户在 since 之后改过什么」取数
CREATE INDEX IF NOT EXISTS idx_records_sync ON records(user_id, updated_at);
-- 动作详情页要取所有人公开的技巧
CREATE INDEX IF NOT EXISTS idx_records_public ON records(kind, visibility, exercise_id, updated_at);
`;

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  // WAL 让读写不互相阻塞；busy_timeout 避免并发写直接抛 SQLITE_BUSY
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function createQueries(db) {
  const statements = {
    insertUser: db.prepare("INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)"),
    userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
    userById: db.prepare("SELECT id, email, display_name, created_at FROM users WHERE id = ?"),

    insertToken: db.prepare("INSERT INTO auth_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"),
    tokenOwner: db.prepare(`
      SELECT u.id, u.email, u.display_name FROM auth_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ? AND t.expires_at > ?`),
    deleteToken: db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?"),
    purgeExpiredTokens: db.prepare("DELETE FROM auth_tokens WHERE expires_at <= ?"),

    // 最后写入胜出：只有更新的版本能覆盖，乱序到达的旧数据会被忽略
    upsertRecord: db.prepare(`
      INSERT INTO records (id, user_id, kind, exercise_id, visibility, updated_at, deleted_at, body)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, id) DO UPDATE SET
        kind = excluded.kind, exercise_id = excluded.exercise_id, visibility = excluded.visibility,
        updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, body = excluded.body
      WHERE excluded.updated_at > records.updated_at`),
    changedSince: db.prepare("SELECT id, kind, exercise_id, visibility, updated_at, deleted_at, body FROM records WHERE user_id = ? AND updated_at > ? ORDER BY updated_at LIMIT ?"),

    publicTips: db.prepare(`
      SELECT r.id, r.exercise_id, r.updated_at, r.body, u.display_name FROM records r
      JOIN users u ON u.id = r.user_id
      WHERE r.kind = 'tip' AND r.visibility = 'public' AND r.deleted_at IS NULL AND r.exercise_id = ?
      ORDER BY r.updated_at DESC LIMIT 50`),
    publicPlans: db.prepare(`
      SELECT r.id, r.updated_at, r.body, u.display_name FROM records r
      JOIN users u ON u.id = r.user_id
      WHERE r.kind = 'plan' AND r.visibility = 'public' AND r.deleted_at IS NULL
      ORDER BY r.updated_at DESC LIMIT 100`),
  };

  return {
    ...statements,
    // 一次同步里的多条写入必须整体成功或整体失败，否则中途断连会留下半套数据
    transaction(run) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = run();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
