/* 本地数据层。所有训练数据都走这里进出，接后端时只需在这一层加同步，UI 不用动。
 *
 * 数据分三类，性质不同，将来公开策略也不同：
 *   sessions 训练记录 —— 某天做了什么、每组重量次数。含个人身体数据，默认私密
 *   tips     动作技巧 —— 私教教的要点，绑在动作上累积。最有分享价值
 *   plans    训练计划 —— 动作清单加目标组次，没私教时照着练
 */

const STORAGE_KEY = "lianlian:v1";
const LEGACY_NOTE_PREFIX = "lianlian-note:";
const LEGACY_FAVORITES_KEY = "lianlian-favorites";
const LEGACY_MIGRATED_KEY = "lianlian:migrated-v1";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// sv-SE 的本地化格式就是 YYYY-MM-DD，且按本地时区，比 toISOString 少一层 UTC 偏移的坑
const today = () => new Date().toLocaleDateString("sv-SE");

const emptyData = () => ({ version: 1, sessions: [], tips: [], plans: [], favorites: [] });

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
      id: uid(), exerciseId: key.slice(LEGACY_NOTE_PREFIX.length),
      text: text.trim(), source: "旧笔记", createdAt: new Date().toISOString(),
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
    window.dispatchEvent(new CustomEvent("store:error", { detail: "浏览器存储已满，请导出备份后清理" }));
    return false;
  }
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 120);
}

const data = readRaw() || emptyData();
// 先落盘再打「已迁移」标记：顺序反了的话首次写入失败会让旧笔记再也迁不过来
if (migrateLegacy(data) && saveNow()) localStorage.setItem(LEGACY_MIGRATED_KEY, today());
// 退出前把待写的改动刷掉，免得刚记完一组就切走导致丢失
window.addEventListener("pagehide", () => { clearTimeout(saveTimer); saveNow(); });

const byId = (list, id) => list.find((item) => item.id === id);

const store = {
  data,
  save,

  /* ---- 训练记录 ---- */
  sessions: () => [...data.sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id))),
  session: (id) => byId(data.sessions, id),
  createSession({ date = today(), kind = "coach", coach = "" } = {}) {
    const session = { id: uid(), date, kind, coach, feel: "", entries: [], createdAt: new Date().toISOString() };
    data.sessions.push(session);
    save();
    return session;
  },
  updateSession(id, patch) {
    const session = byId(data.sessions, id);
    if (session) Object.assign(session, patch), save();
    return session;
  },
  deleteSession(id) {
    data.sessions = data.sessions.filter((item) => item.id !== id);
    save();
  },

  /* 同一个动作重复加入时合并到已有条目，避免一次训练里出现两块「杠铃深蹲」 */
  addEntry(sessionId, exerciseId) {
    const session = byId(data.sessions, sessionId);
    if (!session) return null;
    const existing = session.entries.find((entry) => entry.exerciseId === exerciseId);
    if (existing) return existing;
    const entry = { id: uid(), exerciseId, sets: [], note: "" };
    session.entries.push(entry);
    save();
    return entry;
  },
  removeEntry(sessionId, entryId) {
    const session = byId(data.sessions, sessionId);
    if (!session) return;
    session.entries = session.entries.filter((entry) => entry.id !== entryId);
    save();
  },
  updateEntry(sessionId, entryId, patch) {
    const entry = byId(byId(data.sessions, sessionId)?.entries || [], entryId);
    if (entry) Object.assign(entry, patch), save();
    return entry;
  },

  /* 新增组默认沿用上一组的重量次数，连续做组时不用反复输入 */
  addSet(sessionId, entryId) {
    const entry = byId(byId(data.sessions, sessionId)?.entries || [], entryId);
    if (!entry) return null;
    const previous = entry.sets[entry.sets.length - 1];
    const set = { id: uid(), weight: previous?.weight ?? "", reps: previous?.reps ?? "" };
    entry.sets.push(set);
    save();
    return set;
  },
  updateSet(sessionId, entryId, setId, patch) {
    const entry = byId(byId(data.sessions, sessionId)?.entries || [], entryId);
    const set = byId(entry?.sets || [], setId);
    if (set) Object.assign(set, patch), save();
    return set;
  },
  removeSet(sessionId, entryId, setId) {
    const entry = byId(byId(data.sessions, sessionId)?.entries || [], entryId);
    if (!entry) return;
    entry.sets = entry.sets.filter((set) => set.id !== setId);
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
  tipsFor: (exerciseId) => data.tips.filter((tip) => tip.exerciseId === exerciseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  addTip(exerciseId, text, source = "") {
    const tip = { id: uid(), exerciseId, text: text.trim(), source: source.trim(), createdAt: new Date().toISOString() };
    data.tips.push(tip);
    save();
    return tip;
  },
  deleteTip(id) {
    data.tips = data.tips.filter((tip) => tip.id !== id);
    save();
  },

  /* ---- 训练计划 ---- */
  plans: () => data.plans,
  plan: (id) => byId(data.plans, id),
  createPlan(name = "新的训练计划") {
    const plan = { id: uid(), name, note: "", entries: [], createdAt: new Date().toISOString() };
    data.plans.push(plan);
    save();
    return plan;
  },
  updatePlan(id, patch) {
    const plan = byId(data.plans, id);
    if (plan) Object.assign(plan, patch), save();
    return plan;
  },
  deletePlan(id) {
    data.plans = data.plans.filter((plan) => plan.id !== id);
    save();
  },
  addPlanEntry(planId, exerciseId) {
    const plan = byId(data.plans, planId);
    if (!plan || plan.entries.some((entry) => entry.exerciseId === exerciseId)) return null;
    const entry = { id: uid(), exerciseId, sets: 3, reps: 10 };
    plan.entries.push(entry);
    save();
    return entry;
  },
  updatePlanEntry(planId, entryId, patch) {
    const entry = byId(byId(data.plans, planId)?.entries || [], entryId);
    if (entry) Object.assign(entry, patch), save();
    return entry;
  },
  removePlanEntry(planId, entryId) {
    const plan = byId(data.plans, planId);
    if (!plan) return;
    plan.entries = plan.entries.filter((entry) => entry.id !== entryId);
    save();
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
  exportBlob: () => new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }),
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
    save();
    return { sessions: data.sessions.length, tips: data.tips.length, plans: data.plans.length };
  },
};

window.store = store;
window.storeHelpers = { uid, today };
