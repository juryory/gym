/* 密码与会话令牌。全部用 node:crypto，没有外部依赖。
 *
 * 用 scrypt 而不是 PBKDF2：scrypt 是内存硬的，同样的算力下暴力破解成本高得多。
 * （Cloudflare Workers 上只能用 PBKDF2，自己的服务器没这个限制。）
 */

import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// N=16384 约 16MB 内存、单次约 50-100ms。登录不是高频操作，这个代价值得。
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const TOKEN_DAYS = 30;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, key] = String(stored).split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT_PARAMS.maxmem,
  });
  // 定长比较，避免按字节提前返回泄漏信息
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* 令牌明文只发给客户端，库里存哈希。数据库被拖走也无法直接拿去冒充登录。 */
export function issueToken() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 86400_000).toISOString();
  return { token, tokenHash: hashToken(token), expiresAt };
}

export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export const newId = () => randomBytes(12).toString("base64url");

/* 登录限速：同一邮箱或同一 IP 连续失败就拉长等待，挡住在线撞库。
 * 进程内存即可——这是单实例服务，重启清空也没关系。 */
const attempts = new Map();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

export function checkRateLimit(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.first + WINDOW_MS - now) / 1000) };
  }
  return { allowed: true };
}

export function clearRateLimit(key) {
  attempts.delete(key);
}

// 定期清掉过期条目，否则长期运行会缓慢堆积
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of attempts) if (entry.first < cutoff) attempts.delete(key);
}, WINDOW_MS).unref();
