/* 练练的后端。零 npm 依赖，只用 Node 内置模块。
 *
 * 只提供 /api/*，静态文件仍由 Nginx（宝塔）直接伺服——不让 Node 去做它不擅长的事。
 *
 * 环境变量：
 *   PORT      监听端口，默认 3000
 *   BIND      监听地址，默认 127.0.0.1（只让本机的 Nginx 能连，不直接暴露到公网）
 *   DB_FILE   SQLite 文件路径
 *
 * 数据库默认落在仓库外的同级目录 lianlian-data/。这不是随手选的：网站根目录就是
 * 仓库根目录，任何放在仓库里的文件都可能被 Nginx 直接伺服出去——数据库一旦落在
 * 里面，https://你的域名/data/gym.db 就能下载到全部用户的密码哈希。
 */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { openDatabase, createQueries } from "./db.js";
import {
  hashPassword, verifyPassword, issueToken, hashToken, newId,
  checkRateLimit, clearRateLimit,
} from "./auth.js";

const PORT = Number(process.env.PORT || 3000);
const BIND = process.env.BIND || "127.0.0.1";
const DB_FILE = process.env.DB_FILE || fileURLToPath(new URL("../../lianlian-data/gym.db", import.meta.url));

const MAX_BODY_BYTES = 2 * 1024 * 1024;   // 一次同步的上限
const MAX_CHANGES = 500;                   // 单次同步最多多少条记录
const MAX_RECORD_BYTES = 64 * 1024;        // 单条记录 body 的上限
const COOKIE_NAME = "lianlian_token";

const db = openDatabase(DB_FILE);
const q = createQueries(db);
q.purgeExpiredTokens.run(new Date().toISOString());

/* ---------- 工具 ---------- */

const json = (res, status, payload, headers = {}) => {
  const text = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(text);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // 超限立刻断开，不等整个请求传完才发现太大
      if (size > MAX_BODY_BYTES) { reject(new HttpError(413, "请求体过大")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new HttpError(400, "请求不是合法 JSON")); }
    });
    req.on("error", reject);
  });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const parseCookies = (header = "") => Object.fromEntries(
  header.split(";").map((part) => part.trim().split("=")).filter((pair) => pair.length === 2)
    .map(([name, value]) => [name, decodeURIComponent(value)]),
);

/* Secure 只在 HTTPS 下加：本地用 http 调试时带上 Secure 浏览器会直接丢弃 cookie */
function cookieHeader(token, expiresAt, secure) {
  const parts = [
    `${COOKIE_NAME}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

const clearCookieHeader = () => `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// 走 Nginx 反代时 req.socket 永远是明文，得看 X-Forwarded-Proto
const isSecure = (req) => (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
const clientIp = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";

function currentUser(req) {
  const token = parseCookies(req.headers.cookie).lianlian_token;
  if (!token) return null;
  return q.tokenOwner.get(hashToken(token), new Date().toISOString()) || null;
}

function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, "请先登录");
  return user;
}

const isEmail = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 160;

/* ---------- 接口 ---------- */

async function register(req, res) {
  const { email, password, displayName } = await readBody(req);
  if (!isEmail(email)) throw new HttpError(400, "邮箱格式不对");
  if (typeof password !== "string" || password.length < 8) throw new HttpError(400, "密码至少 8 位");
  if (password.length > 200) throw new HttpError(400, "密码过长");
  const name = String(displayName || email.split("@")[0]).trim().slice(0, 24) || "训练者";

  const normalized = email.trim().toLowerCase();
  if (q.userByEmail.get(normalized)) throw new HttpError(409, "这个邮箱已经注册过了");

  const user = { id: newId(), email: normalized, hash: await hashPassword(password), name, at: new Date().toISOString() };
  q.insertUser.run(user.id, user.email, user.hash, user.name, user.at);

  const { token, tokenHash, expiresAt } = issueToken();
  q.insertToken.run(tokenHash, user.id, expiresAt, user.at);
  json(res, 201, { id: user.id, email: user.email, displayName: user.name },
    { "Set-Cookie": cookieHeader(token, expiresAt, isSecure(req)) });
}

async function login(req, res) {
  const { email, password } = await readBody(req);
  if (!isEmail(email) || typeof password !== "string") throw new HttpError(400, "邮箱或密码不正确");
  const normalized = email.trim().toLowerCase();

  const limit = checkRateLimit(`${normalized}|${clientIp(req)}`);
  if (!limit.allowed) throw new HttpError(429, `尝试过于频繁，请 ${Math.ceil(limit.retryAfter / 60)} 分钟后再试`);

  const record = q.userByEmail.get(normalized);
  // 邮箱不存在时也要走一次哈希校验，否则响应快慢会暴露哪些邮箱注册过
  const ok = record
    ? await verifyPassword(password, record.password_hash)
    : await verifyPassword(password, await hashPassword("dummy-password-for-timing"));
  if (!record || !ok) throw new HttpError(401, "邮箱或密码不正确");

  clearRateLimit(`${normalized}|${clientIp(req)}`);
  const { token, tokenHash, expiresAt } = issueToken();
  q.insertToken.run(tokenHash, record.id, expiresAt, new Date().toISOString());
  json(res, 200, { id: record.id, email: record.email, displayName: record.display_name },
    { "Set-Cookie": cookieHeader(token, expiresAt, isSecure(req)) });
}

function logout(req, res) {
  const token = parseCookies(req.headers.cookie).lianlian_token;
  if (token) q.deleteToken.run(hashToken(token));
  json(res, 200, { ok: true }, { "Set-Cookie": clearCookieHeader() });
}

function me(req, res) {
  const user = currentUser(req);
  json(res, 200, user ? { id: user.id, email: user.email, displayName: user.display_name } : null);
}

/* 同步：客户端推本地改动、拉服务端改动，双向都按 updated_at 最后写入胜出。
 * 删除写墓碑而不是真删——否则在手机上删掉的记录，下次从平板同步回来会复活。 */
async function sync(req, res) {
  const user = requireUser(req);
  const { since = "", changes = [] } = await readBody(req);
  if (!Array.isArray(changes)) throw new HttpError(400, "changes 必须是数组");
  if (changes.length > MAX_CHANGES) throw new HttpError(413, `一次最多同步 ${MAX_CHANGES} 条`);

  let accepted = 0;
  q.transaction(() => {
    for (const change of changes) {
      const record = normalizeRecord(change);
      // 训练记录含个人重量数据，v1 一律私密，不给客户端把它设成公开的余地
      const visibility = record.kind === "workout" ? "private" : record.visibility;
      const result = q.upsertRecord.run(
        record.id, user.id, record.kind, record.exerciseId, visibility,
        record.updatedAt, record.deletedAt, record.body,
      );
      accepted += result.changes;
    }
  });

  const now = new Date().toISOString();
  const incoming = q.changedSince.all(user.id, String(since), MAX_CHANGES).map((row) => ({
    id: row.id, kind: row.kind, exerciseId: row.exercise_id, visibility: row.visibility,
    updatedAt: row.updated_at, deletedAt: row.deleted_at, body: JSON.parse(row.body),
  }));
  json(res, 200, { now, accepted, changes: incoming });
}

function normalizeRecord(change) {
  if (!change || typeof change !== "object") throw new HttpError(400, "记录格式不对");
  const { id, kind, exerciseId = null, visibility = "private", updatedAt, deletedAt = null, body } = change;
  if (typeof id !== "string" || !id || id.length > 64) throw new HttpError(400, "记录 id 不合法");
  if (!["workout", "tip", "plan"].includes(kind)) throw new HttpError(400, `未知的记录类型 ${kind}`);
  if (!["private", "public"].includes(visibility)) throw new HttpError(400, "visibility 不合法");
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) throw new HttpError(400, "updatedAt 不是合法时间");
  const text = JSON.stringify(body ?? {});
  if (text.length > MAX_RECORD_BYTES) throw new HttpError(413, "单条记录过大");
  return {
    id, kind, exerciseId: exerciseId == null ? null : String(exerciseId).slice(0, 32),
    visibility, updatedAt, deletedAt: deletedAt || null, body: text,
  };
}

function publicTips(req, res, url) {
  const exerciseId = url.searchParams.get("exerciseId");
  if (!exerciseId) throw new HttpError(400, "缺少 exerciseId");
  json(res, 200, q.publicTips.all(exerciseId).map((row) => ({
    id: row.id, exerciseId: row.exercise_id, updatedAt: row.updated_at,
    author: row.display_name, body: JSON.parse(row.body),
  })));
}

function publicPlans(req, res) {
  json(res, 200, q.publicPlans.all().map((row) => ({
    id: row.id, updatedAt: row.updated_at, author: row.display_name, body: JSON.parse(row.body),
  })));
}

/* ---------- 路由 ---------- */

const routes = [
  ["POST", "/api/auth/register", register],
  ["POST", "/api/auth/login", login],
  ["POST", "/api/auth/logout", logout],
  ["GET", "/api/me", me],
  ["POST", "/api/sync", sync],
  ["GET", "/api/public/tips", publicTips],
  ["GET", "/api/public/plans", publicPlans],
];

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    const route = routes.find(([method, path]) => path === url.pathname && method === req.method);
    if (!route) {
      // 路径存在但方法不对，返回 405 比 404 更好排查
      const pathExists = routes.some(([, path]) => path === url.pathname);
      throw new HttpError(pathExists ? 405 : 404, pathExists ? "方法不允许" : "接口不存在");
    }
    await route[2](req, res, url);
  } catch (error) {
    if (error instanceof HttpError) return json(res, error.status, { error: error.message });
    console.error(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`, error);
    // 不把内部错误细节回给客户端
    json(res, 500, { error: "服务器出错了" });
  }
});

server.listen(PORT, BIND, () => {
  console.log(`练练后端已启动 http://${BIND}:${PORT}  数据库 ${DB_FILE}`);
});

const shutdown = () => {
  server.close(() => { db.close(); process.exit(0); });
  // 强制兜底，避免长连接把关闭拖住
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
