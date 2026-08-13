/* 本地数据层 + 云同步。所有训练数据都走这里进出。
 *
 * 本地优先：写入永远先落 localStorage 并立刻返回，同步在后台跑。
 * 器械房信号差是常态，记一组不该等网络。
 *
 * 数据分三类，性质不同，公开策略也不同：
 *   sessions 训练记录 —— 某天做了什么、每组重量次数。含个人身体数据，强制私密
 *   tips     动作技巧 —— 私教教的要点，绑在动作上累积。可选择公开
 *   plans    训练计划 —— 动作清单加目标组次，可选择公开
 *
 * 同步用「最后写入胜出」：每条记录带 updatedAt，删除写墓碑而不是真删——
 * 否则在手机上删掉的记录，下次从平板同步回来会复活。
 */

(() => {

const STORAGE_KEY = "lianlian:v1";
const LEGACY_NOTE_PREFIX = "lianlian-note:";
const LEGACY_FAVORITES_KEY = "lianlian-favorites";
const LEGACY_MIGRATED_KEY = "lianlian:migrated-v1";
const API = "/api";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// sv-SE 的本地化格式就是 YYYY-MM-DD，且按本地时区，比 toISOString 少一层 UTC 偏移的坑
const today = () => new Date().toLocaleDateString("sv-SE");
const stamp = () => new Date().toISOString();

const emptyData = () => ({ version: 1, sessions: [], tips: [], plans: [], favorites: [], lastSyncAt: "" });

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return { ...emptyData(), ...parsed };
  } catch (error) {
    console.error("训练数据解析失败，已回退为空数据", error);
    return null;
  }
}

/* 老版本只有「每个动作一段自由文本」和收藏。把文本收成技巧，旧键原样留着兜底。 */
function migrateLegacy(data) {
  if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return false;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LEGACY_NOTE_PREFIX)) continue;
    const text = localStorage.getItem(key);
    if (!text?.trim()) continue;
    data.tips.push({
      id: uid(), exerciseId: key.slice(LEGACY_NOTE_PREFIX.length), text: text.trim(),
      source: "旧笔记", visibility: "private", createdAt: stamp(), updatedAt: stamp(), deletedAt: null,
    });
  }
  try {
    const favorites = JSON.parse(localStorage.getItem(LEGACY_FAVORITES_KEY) || "[]");
    if (Array.isArray(favorites)) data.favorites = [...new Set([...data.favorites, ...favorites])];
  } catch { /* 旧收藏读不出来就算了，不值得挡住启动 */ }
  return true;
}

function saveNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("训练数据写入失败", error);
    emit("store:error", "浏览器存储已满，请导出备份后清理");
    return false;
  }
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveNow(); scheduleSync(); }, 120);
}

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

const data = readRaw() || emptyData();
// 先落盘再打「已迁移」标记：顺序反了的话首次写入失败会让旧笔记再也迁不过来
if (migrateLegacy(data) && saveNow()) localStorage.setItem(LEGACY_MIGRATED_KEY, today());
// 退出前把待写的改动刷掉，免得刚记完一组就切走导致丢失
window.addEventListener("pagehide", () => { clearTimeout(saveTimer); saveNow(); });

const byId = (list, id) => list.find((item) => item.id === id);
const alive = (list) => list.filter((item) => !item.deletedAt);
/* 任何改动都要更新记录自身的 updatedAt——同步是整条记录覆盖，
 * 改了某一组却不动 session 的时间戳，这次改动同步时就会被丢掉 */
const touch = (record) => { if (record) record.updatedAt = stamp(); return record; };

/* ---------- 同步 ---------- */

const KIND_BY_LIST = { sessions: "workout", tips: "tip", plans: "plan" };
const LIST_BY_KIND = { workout: "sessions", tip: "tips", plan: "plans" };

const toRemote = (list, item) => ({
  id: item.id, kind: KIND_BY_LIST[list], exerciseId: item.exerciseId ?? null,
  visibility: item.visibility || "private", updatedAt: item.updatedAt, deletedAt: item.deletedAt || null,
  body: item,
});

let syncTimer;
let syncing = false;
let syncQueued = false;

function scheduleSync() {
  if (!account.user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => sync(), 1500);
}

async function sync() {
  if (!account.user) return { skipped: "未登录" };
  if (syncing) { syncQueued = true; return { skipped: "同步中" }; }
  syncing = true;
  emit("sync:state", "syncing");
  try {
    const since = data.lastSyncAt || "";
    const changes = [];
    for (const list of Object.keys(KIND_BY_LIST)) {
      for (const item of data[list]) {
        if (item.updatedAt > since) changes.push(toRemote(list, item));
      }
    }
    const response = await fetch(`${API}/sync`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ since, changes }),
    });
    if (response.status === 401) { setUser(null); throw new Error("登录已过期，请重新登录"); }
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);

    const result = await response.json();
    for (const remote of result.changes) {
      const list = LIST_BY_KIND[remote.kind];
      if (!list) continue;
      const local = byId(data[list], remote.id);
      // 本地更新则保留本地，下一轮同步会把它推上去
      if (local && local.updatedAt >= remote.updatedAt) continue;
      const merged = { ...remote.body, id: remote.id, updatedAt: remote.updatedAt, deletedAt: remote.deletedAt, visibility: remote.visibility };
      if (local) Object.assign(local, merged);
      else data[list].push(merged);
    }
    data.lastSyncAt = result.now;
    saveNow();
    emit("sync:state", "idle");
    emit("store:changed");
    return { pushed: changes.length, pulled: result.changes.length };
  } catch (error) {
    emit("sync:state", "error");
    emit("sync:error", error.message);
    return { error: error.message };
  } finally {
    syncing = false;
    if (syncQueued) { syncQueued = false; scheduleSync(); }
  }
}

const account = { user: null };

function setUser(user) {
  account.user = user;
  emit("auth:changed", user);
}

/* ---------- 对外接口 ---------- */

const store = {
  data,
  save,
  get user() { return account.user; },

  /* ---- 账号 ---- */
  auth: {
    async me() {
      try {
        const response = await fetch(`${API}/me`, { credentials: "same-origin" });
        if (!response.ok) return null;
        setUser(await response.json());
        if (account.user) sync();
        return account.user;
      } catch { return null; }   // 后端没起来时不该挡住整个应用
    },
    async register(email, password, displayName) {
      const user = await post("/auth/register", { email, password, displayName });
      setUser(user);
      // 注册后把本地已有的数据整批推上去，不然之前记的东西留在这台机器上
      data.lastSyncAt = "";
      await sync();
      return user;
    },
    async login(email, password) {
      const user = await post("/auth/login", { email, password });
      setUser(user);
      data.lastSyncAt = "";
      await sync();
      return user;
    },
    async logout() {
      await post("/auth/logout", {});
      setUser(null);
      // 本地数据保留：退出登录不该让这台设备上的记录消失
    },
  },
  sync,

  /* ---- 训练记录 ---- */
  sessions: () => alive(data.sessions).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id))),
  session: (id) => byId(alive(data.sessions), id),
  createSession({ date = today(), kind = "coach", coach = "" } = {}) {
    const session = { id: uid(), date, kind, coach, feel: "", entries: [], visibility: "private", createdAt: stamp(), updatedAt: stamp(), deletedAt: null };
    data.sessions.push(session);
    save();
    return session;
  },
  updateSession(id, patch) {
    const session = byId(data.sessions, id);
    if (session) Object.assign(session, patch), touch(session), save();
    return session;
  },
  deleteSession(id) {
    const session = byId(data.sessions, id);
    if (session) { session.deletedAt = stamp(); touch(session); save(); }
  },

  /* 同一个动作重复加入时合并到已有条目，避免一次训练里出现两块「杠铃深蹲」 */
  addEntry(sessionId, exerciseId) {
    const session = byId(data.sessions, sessionId);
    if (!session) return null;
    const existing = session.entries.find((entry) => entry.exerciseId === exerciseId);
    if (existing) return existing;
    const entry = { id: uid(), exerciseId, sets: [], note: "" };
    session.entries.push(entry);
    touch(session);
    save();
    return entry;
  },
  removeEntry(sessionId, entryId) {
    const session = byId(data.sessions, sessionId);
    if (!session) return;
    session.entries = session.entries.filter((entry) => entry.id !== entryId);
    touch(session);
    save();
  },

  /* 新增组默认沿用上一组的重量次数，连续做组时不用反复输入 */
  addSet(sessionId, entryId) {
    const session = byId(data.sessions, sessionId);
    const entry = byId(session?.entries || [], entryId);
    if (!entry) return null;
    const previous = entry.sets[entry.sets.length - 1];
    const set = { id: uid(), weight: previous?.weight ?? "", reps: previous?.reps ?? "" };
    entry.sets.push(set);
    touch(session);
    save();
    return set;
  },
  updateSet(sessionId, entryId, setId, patch) {
    const session = byId(data.sessions, sessionId);
    const set = byId(byId(session?.entries || [], entryId)?.sets || [], setId);
    if (set) Object.assign(set, patch), touch(session), save();
    return set;
  },
  removeSet(sessionId, entryId, setId) {
    const session = byId(data.sessions, sessionId);
    const entry = byId(session?.entries || [], entryId);
    if (!entry) return;
    entry.sets = entry.sets.filter((set) => set.id !== setId);
    touch(session);
    save();
  },

  /* 上一次练这个动作的成绩，用于在动作详情里提示「上次做到多少」 */
  lastPerformance(exerciseId, exceptSessionId) {
    for (const session of store.sessions()) {
      if (session.id === exceptSessionId) continue;
      const entry = session.entries.find((item) => item.exerciseId === exerciseId && item.sets.length);
      if (entry) return { date: session.date, sets: entry.sets };
    }
    return null;
  },

  /* ---- 动作技巧 ---- */
  tipsFor: (exerciseId) => alive(data.tips).filter((tip) => tip.exerciseId === exerciseId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  addTip(exerciseId, text, source = "") {
    const tip = {
      id: uid(), exerciseId, text: text.trim(), source: source.trim(),
      visibility: "private", createdAt: stamp(), updatedAt: stamp(), deletedAt: null,
    };
    data.tips.push(tip);
    save();
    return tip;
  },
  deleteTip(id) {
    const tip = byId(data.tips, id);
    if (tip) { tip.deletedAt = stamp(); touch(tip); save(); }
  },

  /* ---- 训练计划 ---- */
  plans: () => alive(data.plans),
  plan: (id) => byId(alive(data.plans), id),
  createPlan(name = "新的训练计划") {
    const plan = { id: uid(), name, note: "", entries: [], visibility: "private", createdAt: stamp(), updatedAt: stamp(), deletedAt: null };
    data.plans.push(plan);
    save();
    return plan;
  },
  updatePlan(id, patch) {
    const plan = byId(data.plans, id);
    if (plan) Object.assign(plan, patch), touch(plan), save();
    return plan;
  },
  deletePlan(id) {
    const plan = byId(data.plans, id);
    if (plan) { plan.deletedAt = stamp(); touch(plan); save(); }
  },
  addPlanEntry(planId, exerciseId) {
    const plan = byId(data.plans, planId);
    if (!plan || plan.entries.some((entry) => entry.exerciseId === exerciseId)) return null;
    const entry = { id: uid(), exerciseId, sets: 3, reps: 10 };
    plan.entries.push(entry);
    touch(plan);
    save();
    return entry;
  },
  updatePlanEntry(planId, entryId, patch) {
    const plan = byId(data.plans, planId);
    const entry = byId(plan?.entries || [], entryId);
    if (entry) Object.assign(entry, patch), touch(plan), save();
    return entry;
  },
  removePlanEntry(planId, entryId) {
    const plan = byId(data.plans, planId);
    if (!plan) return;
    plan.entries = plan.entries.filter((entry) => entry.id !== entryId);
    touch(plan);
    save();
  },

  /* 训练记录含个人重量数据，只有技巧和计划能公开 */
  setVisibility(kind, id, visibility) {
    const list = kind === "tip" ? data.tips : data.plans;
    const record = byId(list, id);
    if (!record) return null;
    record.visibility = visibility === "public" ? "public" : "private";
    touch(record);
    save();
    return record;
  },

  /* 别人公开的技巧，汇总在动作详情页 */
  async publicTips(exerciseId) {
    try {
      const response = await fetch(`${API}/public/tips?exerciseId=${encodeURIComponent(exerciseId)}`, { credentials: "same-origin" });
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  /* 从计划开一次训练：动作照搬，重量次数留空等现场填 */
  startFromPlan(planId) {
    const plan = byId(data.plans, planId);
    if (!plan) return null;
    const session = store.createSession({ kind: "self" });
    session.feel = `按计划：${plan.name}`;
    plan.entries.forEach((entry) => store.addEntry(session.id, entry.exerciseId));
    save();
    return session;
  },

  /* 把一次训练存成计划，「不上私教课之后照着自己练」就靠这个 */
  planFromSession(sessionId) {
    const session = byId(data.sessions, sessionId);
    if (!session) return null;
    const plan = store.createPlan(`${session.date} 的训练`);
    session.entries.forEach((entry) => {
      const added = store.addPlanEntry(plan.id, entry.exerciseId);
      if (added && entry.sets.length) {
        added.sets = entry.sets.length;
        added.reps = Number(entry.sets[entry.sets.length - 1].reps) || 10;
      }
    });
    save();
    return plan;
  },

  /* ---- 收藏 ---- */
  isFavorite: (exerciseId) => data.favorites.includes(exerciseId),
  toggleFavorite(exerciseId) {
    const index = data.favorites.indexOf(exerciseId);
    index >= 0 ? data.favorites.splice(index, 1) : data.favorites.push(exerciseId);
    save();
    return index < 0;
  },

  /* ---- 备份 ---- */
  exportBlob: () => new Blob([JSON.stringify({ ...data, exportedAt: stamp() }, null, 2)], { type: "application/json" }),
  importJSON(text) {
    const incoming = JSON.parse(text);
    if (!incoming || typeof incoming !== "object") throw new Error("文件格式不对");
    // 按 id 合并而不是覆盖，导入备份不会抹掉这台设备上的新记录
    for (const key of ["sessions", "tips", "plans"]) {
      if (!Array.isArray(incoming[key])) continue;
      const seen = new Set(data[key].map((item) => item.id));
      data[key].push(...incoming[key].filter((item) => item?.id && !seen.has(item.id)));
    }
    if (Array.isArray(incoming.favorites)) data.favorites = [...new Set([...data.favorites, ...incoming.favorites])];
    // 导入的记录时间戳可能早于上次同步，重置游标才能把它们推上云端
    data.lastSyncAt = "";
    save();
    return { sessions: alive(data.sessions).length, tips: alive(data.tips).length, plans: alive(data.plans).length };
  },
};

async function post(path, payload) {
  const response = await fetch(API + path, {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}

window.store = store;
window.storeHelpers = { uid, today };

})();
