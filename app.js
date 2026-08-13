const DATA_URL = "data/exercises.json";
// 素材默认同源加载。若改用对象存储（腾讯云 COS 等），把 assets/ 目录整个上传到
// 存储桶根目录，然后把这里换成桶域名，例如 "https://your-bucket.cos.ap-guangzhou.myqcloud.com/"。
const MEDIA_ROOT = "assets/";
const MAX_VISIBLE_RESULTS = 160;

const equipmentNames = {
  "body weight": "徒手",
  dumbbell: "哑铃",
  barbell: "杠铃",
  cable: "绳索器械",
  band: "弹力带",
  "leverage machine": "固定器械",
  "smith machine": "史密斯机",
  kettlebell: "壶铃",
  weighted: "负重",
  "stability ball": "健身球",
  "ez barbell": "曲杆杠铃",
  "assisted": "辅助器械",
  "medicine ball": "药球",
  "olympic barbell": "奥杆",
  "resistance band": "阻力带",
  "roller": "泡沫轴",
  "rope": "训练绳",
  "trap bar": "六角杠",
  "bosu ball": "波速球",
};

const bodyPartNames = {
  back: "背部", cardio: "有氧", chest: "胸部", neck: "颈部", shoulders: "肩部",
  waist: "腰腹", "upper arms": "上臂", "lower arms": "前臂", "upper legs": "大腿", "lower legs": "小腿",
};

const muscleNames = {
  abductors: "髋外展肌", abs: "腹肌", abdominals: "腹肌", adductors: "髋内收肌", biceps: "肱二头肌",
  calves: "小腿肌群", "cardiovascular system": "心肺系统", chest: "胸肌", core: "核心肌群", delts: "三角肌",
  deltoids: "三角肌", forearms: "前臂肌群", glutes: "臀肌", hamstrings: "腘绳肌", hands: "手部肌群",
  "hip flexors": "髋屈肌", lats: "背阔肌", "latissimus dorsi": "背阔肌", "levator scapulae": "肩胛提肌",
  "lower back": "下背部", obliques: "腹斜肌", pectorals: "胸大肌", quadriceps: "股四头肌", quads: "股四头肌",
  rhomboids: "菱形肌", "rotator cuff": "肩袖肌群", "serratus anterior": "前锯肌", shoulders: "肩部肌群",
  soleus: "比目鱼肌", spine: "竖脊肌", trapezius: "斜方肌", traps: "斜方肌", triceps: "肱三头肌",
  "upper back": "上背部", "ankle stabilizers": "踝关节稳定肌", ankles: "踝部", "wrist extensors": "腕伸肌",
  "wrist flexors": "腕屈肌", wrists: "腕部",
};

Object.assign(equipmentNames, {
  "elliptical machine": "椭圆机", hammer: "训练锤", "skierg machine": "滑雪机", "sled machine": "雪橇机",
  "stationary bike": "健身车", "stepmill machine": "登阶机", tire: "轮胎", "upper body ergometer": "上肢功率车",
  "wheel roller": "健腹轮",
});

const namePhrases = {
  "bench press": "卧推", "shoulder press": "肩推", "military press": "军用推举", "chest press": "胸推",
  "leg press": "腿举", "push up": "俯卧撑", "pull up": "引体向上", "chin up": "反握引体向上",
  "lat pulldown": "高位下拉", "front raise": "前平举", "lateral raise": "侧平举", "rear delt": "后三角肌",
  "biceps curl": "二头弯举", "bicep curl": "二头弯举", "triceps extension": "三头伸展", "tricep extension": "三头伸展",
  "wrist curl": "腕弯举", "calf raise": "提踵", "hip thrust": "臀推", deadlift: "硬拉",
  "bent over row": "俯身划船", "upright row": "直立划船", "seated row": "坐姿划船", "one arm": "单臂",
  "single arm": "单臂", "single leg": "单腿", "straight leg": "直腿", "close grip": "窄握", "wide grip": "宽握",
  "reverse grip": "反握", "neutral grip": "中立握", "body weight": "徒手", "stability ball": "健身球",
  "medicine ball": "药球", "smith machine": "史密斯机", "ez barbell": "曲杆杠铃", "olympic barbell": "奥杆",
  "resistance band": "阻力带", "incline bench": "上斜凳", "decline bench": "下斜凳", "good morning": "早安式",
  "russian twist": "俄罗斯转体", "sit up": "仰卧起坐", "step up": "登阶", "leg raise": "举腿",
  "leg curl": "腿弯举", "leg extension": "腿屈伸", "chest fly": "夹胸飞鸟", "pec fly": "夹胸飞鸟",
};

const nameWords = {
  dumbbell: "哑铃", barbell: "杠铃", cable: "绳索", band: "弹力带", kettlebell: "壶铃", lever: "器械",
  weighted: "负重", assisted: "辅助", bodyweight: "徒手", smith: "史密斯机", machine: "器械", rope: "绳索",
  ball: "球", bosu: "波速球", roller: "滚轮", wheel: "健腹轮", hammer: "锤式", sled: "雪橇",
  press: "推举", curl: "弯举", curls: "弯举", row: "划船", raise: "抬举", extension: "伸展", stretch: "拉伸",
  squat: "深蹲", lunge: "弓步", crunch: "卷腹", fly: "飞鸟", pulldown: "下拉", pullover: "上拉", pushdown: "下压",
  dip: "臂屈伸", dips: "臂屈伸", shrug: "耸肩", kickback: "后踢", bridge: "桥式", plank: "平板支撑",
  adduction: "内收", abduction: "外展", rotation: "旋转", twist: "转体", jumping: "跳跃", jump: "跳跃", run: "跑步",
  bike: "单车", clean: "翻举", snatch: "抓举", planche: "俄式挺身", push: "推", pull: "拉", lift: "抬举",
  arm: "手臂", arms: "双臂", leg: "腿", legs: "双腿", chest: "胸部", shoulder: "肩部", back: "背部",
  hip: "髋部", glute: "臀部", hamstring: "腘绳肌", calf: "小腿", calves: "小腿", biceps: "肱二头肌",
  triceps: "肱三头肌", tricep: "肱三头肌", bicep: "肱二头肌", wrist: "手腕", neck: "颈部", knee: "膝部",
  elbow: "肘部", toe: "脚趾", core: "核心", abs: "腹肌", lat: "背阔肌", delt: "三角肌",
  seated: "坐姿", standing: "站姿", lying: "仰卧", prone: "俯卧", supine: "仰卧", kneeling: "跪姿", hanging: "悬垂",
  incline: "上斜", decline: "下斜", reverse: "反向", lateral: "侧向", front: "前侧", rear: "后侧", overhead: "过顶",
  bent: "屈曲", straight: "直", upright: "直立", alternate: "交替", alternating: "交替", single: "单侧", double: "双侧",
  close: "窄距", wide: "宽距", narrow: "窄距", high: "高位", low: "低位", inner: "内侧", outer: "外侧",
  full: "全程", horizontal: "水平", vertical: "垂直", forward: "向前", backward: "向后", inverted: "倒立",
  bench: "卧凳", floor: "地面", wall: "靠墙", preacher: "牧师凳", concentration: "集中式", military: "军用",
  sumo: "相扑式", hack: "哈克式", spider: "蜘蛛式", russian: "俄罗斯式", donkey: "驴式", split: "分腿",
  grip: "握姿", palms: "掌心", palm: "掌心", hands: "双手", head: "头部", behind: "颈后", parallel: "平行",
  male: "男", female: "女", exercise: "训练", support: "支撑", touch: "触碰", hold: "静止保持", walk: "行走",
  side: "侧向", bend: "屈体", air: "空中", all: "全", fours: "四点支撑", squad: "股四头肌", heel: "脚跟",
  touchers: "触碰", ankle: "脚踝", circles: "绕环", archer: "射手式", apart: "分开", overhead: "过顶",
  motion: "动态", chest: "胸部", pectoralis: "胸大肌", rectus: "股直肌", femoris: "股直肌", piriformis: "梨状肌",
  russian: "俄罗斯式", twisting: "转体", circular: "环绕", outer: "外侧", straight: "直", towel: "毛巾",
  horizontal: "水平", fixed: "固定", underhand: "反握", internal: "内旋", through: "穿越", stiff: "直腿",
  behind: "后侧", rear: "后侧", y: "Y字", close: "窄距", alternating: "交替", circular: "环绕",
  clean: "翻举", "clean-grip": "翻举握法", hyperextension: "背部伸展", skull: "仰卧", crusher: "臂屈伸",
  romanian: "罗马尼亚式", roman: "罗马椅", good: "早安式", morning: "", zercher: "泽奇式", landmine: "地雷管式",
  drag: "拖拉", power: "力量式", jerk: "挺举", thruster: "推举深蹲", rollout: "滚轮前伸", rollerout: "滚轮前伸",
  jack: "开合", knife: "折体", jackknife: "折体", mountain: "登山", climber: "跑", burpee: "波比跳",
  bicycle: "自行车式", scissors: "剪刀腿", flutter: "交替踢腿", kick: "踢腿", kicks: "踢腿", swing: "摆动",
  farmer: "农夫", carry: "行走", suitcase: "手提箱式", goblet: "高脚杯式", turkish: "土耳其式", get: "起身",
  up: "", down: "下", around: "环绕", cross: "交叉", crossover: "交叉", open: "打开", rotation: "旋转",
  adductor: "内收肌", abductor: "外展肌", quadriceps: "股四头肌", quadricep: "股四头肌", hamstrings: "腘绳肌",
  pectoral: "胸肌", pectorals: "胸肌", scapula: "肩胛骨", scapular: "肩胛骨", serratus: "前锯肌", spine: "脊柱",
  lower: "下部", upper: "上部", mid: "中部", middle: "中部", long: "长头", short: "短头", head: "头部",
  incline: "上斜", decline: "下斜", flat: "平板", elevated: "垫高", deficit: "加深幅度", partial: "半程",
  stance: "站距", walking: "行走", static: "静态", dynamic: "动态", isometric: "等长", explosive: "爆发式",
  hand: "单手", hands: "双手", feet: "双脚", foot: "单脚", knees: "双膝", elbows: "双肘", seated: "坐姿",
  towel: "毛巾", strap: "拉力带", plate: "杠铃片", rack: "深蹲架", cage: "训练架", attachment: "附件",
  ergometer: "功率车", elliptical: "椭圆机", stationary: "固定式", stepmill: "登阶机", skierg: "滑雪机",
  version: "版本", pov: "主视角", blaster: "弯举托板", stability: "稳定", balance: "平衡", suspended: "悬挂式",
  with: "", on: "", in: "", to: "", and: "", the: "", a: "", of: "", v: "",
};

function translateExerciseName(name) {
  let text = name.toLowerCase().replace(/-/g, " ");
  const placeholders = [];
  Object.entries(namePhrases).sort((a, b) => b[0].length - a[0].length).forEach(([phrase, chinese]) => {
    text = text.replace(new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "g"), () => {
      placeholders.push(chinese);
      return ` __zh${placeholders.length - 1}__ `;
    });
  });
  const translated = text.replace(/[()]/g, " ").split(/\s+/).filter(Boolean).map((word) => {
    const marker = word.match(/^__zh(\d+)__$/);
    if (marker) return placeholders[Number(marker[1])];
    if (/^\d+(?:\.\d+)?$/.test(word)) return word;
    return nameWords[word] ?? "";
  }).join("").replace(/\s+/g, " ").trim();
  return translated || "训练动作";
}

const state = {
  exercises: [], byId: new Map(), filtered: [], equipment: "all", bodyPart: "all", selectedId: null, search: "",
  view: "library", openSessionId: null, openPlanId: null,
  // 挑选模式：从训练或计划点「添加动作」后进入，此时点卡片直接加入而不是打开详情
  picker: null,
};
const $ = (selector) => document.querySelector(selector);
const elements = {
  dataStatus: $("#dataStatus"), equipmentList: $("#equipmentList"), bodyPartList: $("#bodyPartList"), exerciseList: $("#exerciseList"),
  resultCount: $("#resultCount"), searchInput: $("#searchInput"), resetButton: $("#resetButton"),
  detailOverlay: $("#detailOverlay"), detailContent: $("#detailContent"), detailIndex: $("#detailIndex"),
  exerciseMedia: $("#exerciseMedia"), bodyPart: $("#bodyPart"), exerciseName: $("#exerciseName"),
  exerciseEnglishName: $("#exerciseEnglishName"),
  tags: $("#tags"), instructionList: $("#instructionList"),
  saveStatus: $("#saveStatus"), favoriteButton: $("#favoriteButton"), closeDetailButton: $("#closeDetailButton"),
  viewNav: $("#viewNav"), views: { library: $("#viewLibrary"), log: $("#viewLog"), plans: $("#viewPlans") },
  sessionList: $("#sessionList"), planList: $("#planList"),
  newSessionButton: $("#newSessionButton"), newPlanButton: $("#newPlanButton"),
  tipList: $("#tipList"), tipInput: $("#tipInput"), tipSource: $("#tipSource"), addTipButton: $("#addTipButton"),
  lastPerformance: $("#lastPerformance"),
  addToSessionButton: $("#addToSessionButton"), addToSessionHint: $("#addToSessionHint"),
  exportButton: $("#exportButton"), importButton: $("#importButton"), importFile: $("#importFile"),
};

const mediaUrl = (path) => `${MEDIA_ROOT}${String(path || "").replace(/^\.\//, "")}`;
// 技巧、教练名这些是用户输入，阶段二还要展示别人写的内容，拼进 innerHTML 前一律转义
const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => escapes[char]);
const exerciseName = (id) => state.byId.get(id)?.localizedName || `动作 ${id}`;
const localName = (value, dictionary) => dictionary[value?.toLowerCase()] || value || "未知";
const debounce = (fn, wait = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; };

async function loadExercises() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.exercises = (await response.json()).map((item) => ({ ...item, localizedName: translateExerciseName(item.name) }));
    state.byId = new Map(state.exercises.map((item) => [item.id, item]));
    elements.dataStatus.textContent = `${state.exercises.length.toLocaleString("zh-CN")} 个动作已就绪`;
    $(".pulse").style.background = "var(--acid-dark)";
    renderEquipment();
    renderBodyParts();
    applyFilters();
    renderSessions();
    renderPlans();
  } catch (error) {
    elements.dataStatus.textContent = "动作库载入失败";
    elements.exerciseList.innerHTML = `<div class="no-results"><strong>暂时无法读取动作数据</strong><span>请检查网络后刷新页面</span></div>`;
    console.error(error);
  }
}

function renderBodyParts() {
  const order = ["chest", "back", "shoulders", "upper arms", "lower arms", "waist", "upper legs", "lower legs", "cardio", "neck"];
  const counts = state.exercises.reduce((map, item) => map.set(item.body_part, (map.get(item.body_part) || 0) + 1), new Map());
  elements.bodyPartList.innerHTML = [
    `<button class="body-part-chip active" data-body-part="all">全部<small>${state.exercises.length}</small></button>`,
    ...order.filter((name) => counts.has(name)).map((name) => `<button class="body-part-chip" data-body-part="${name}">${localName(name, bodyPartNames)}<small>${counts.get(name)}</small></button>`),
  ].join("");
  elements.bodyPartList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-body-part]");
    if (!button) return;
    state.bodyPart = button.dataset.bodyPart;
    elements.bodyPartList.querySelectorAll(".body-part-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    applyFilters();
  });
}

function renderEquipment() {
  const counts = state.exercises.reduce((map, item) => map.set(item.equipment, (map.get(item.equipment) || 0) + 1), new Map());
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  elements.equipmentList.innerHTML = [
    `<button class="equipment-chip active" data-equipment="all">全部 <small>${state.exercises.length}</small></button>`,
    ...sorted.map(([name, count]) => `<button class="equipment-chip" data-equipment="${name}">${localName(name, equipmentNames)} <small>${count}</small></button>`),
  ].join("");
  elements.equipmentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-equipment]");
    if (!button) return;
    state.equipment = button.dataset.equipment;
    elements.equipmentList.querySelectorAll(".equipment-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    applyFilters();
  });
}

function applyFilters() {
  const term = state.search.trim().toLowerCase();
  state.filtered = state.exercises.filter((item) => {
    const matchesEquipment = state.equipment === "all" || item.equipment === state.equipment;
    const matchesBodyPart = state.bodyPart === "all" || item.body_part === state.bodyPart;
    const haystack = `${item.name} ${item.localizedName} ${item.target} ${localName(item.target, muscleNames)} ${item.body_part} ${item.equipment}`.toLowerCase();
    return matchesEquipment && matchesBodyPart && (!term || haystack.includes(term));
  });
  renderExerciseList();
}

function renderExerciseList() {
  elements.resultCount.textContent = state.picker
    ? `${state.filtered.length} 个动作 · 点击即可加入`
    : `${state.filtered.length} 个动作`;
  if (!state.filtered.length) {
    elements.exerciseList.innerHTML = `<div class="no-results"><strong>没有找到相符动作</strong><span>换个器械或搜索词试试</span></div>`;
    return;
  }
  const visible = state.filtered.slice(0, MAX_VISIBLE_RESULTS);
  elements.exerciseList.innerHTML = visible.map((item) => `
    <button class="exercise-card ${item.id === state.selectedId ? "active" : ""}" data-id="${item.id}">
      <span class="card-media">
        <img src="${mediaUrl(item.image)}" alt="" loading="lazy" />
        <span class="card-equipment">${localName(item.equipment, equipmentNames)}</span>
      </span>
      <span class="card-body">
        <strong>${item.localizedName}</strong>
        <span class="card-original">${item.name}</span>
        <span class="card-meta"><span>${localName(item.body_part, bodyPartNames)}</span><span>${localName(item.target, muscleNames)}</span></span>
      </span>
    </button>`).join("") + (state.filtered.length > visible.length
      ? `<div class="grid-message">已显示前 ${visible.length} 个动作 · 输入名称可快速定位</div>`
      : "");
}

function selectExercise(id) {
  const item = state.exercises.find((exercise) => exercise.id === id);
  if (!item) return;
  state.selectedId = id;
  renderExerciseList();
  elements.detailOverlay.hidden = false;
  elements.detailContent.hidden = false;
  document.body.classList.add("modal-open");
  elements.detailIndex.textContent = `#${item.id}`;
  // 动画是 WebP，老浏览器放不出来时退回静态缩略图
  elements.exerciseMedia.onerror = () => {
    elements.exerciseMedia.onerror = null;
    elements.exerciseMedia.src = mediaUrl(item.image);
  };
  elements.exerciseMedia.src = mediaUrl(item.gif_url || item.image);
  elements.exerciseMedia.alt = `${item.name} 动作示范`;
  elements.bodyPart.textContent = localName(item.body_part, bodyPartNames);
  elements.exerciseName.textContent = item.localizedName;
  elements.exerciseEnglishName.textContent = item.name;
  elements.tags.innerHTML = `
    <span class="tag accent">${localName(item.equipment, equipmentNames)}</span>
    <span class="tag">目标 · ${localName(item.target, muscleNames)}</span>
    ${item.muscle_group ? `<span class="tag">辅助 · ${localName(item.muscle_group, muscleNames)}</span>` : ""}`;
  const steps = item.instruction_steps?.zh?.filter(Boolean)
    || item.instruction_steps?.en?.filter(Boolean)
    || splitInstructions(item.instructions?.zh || item.instructions?.en || "暂无动作说明");
  elements.instructionList.innerHTML = steps.map((step) => `<li>${step}</li>`).join("");
  renderTips(id);
  renderLastPerformance(id);
  updateAddToSessionHint();
  updateFavoriteButton();
}

function renderTips(exerciseId) {
  const tips = store.tipsFor(exerciseId);
  elements.tipList.innerHTML = tips.length
    ? tips.map((tip) => `
      <li class="tip" data-tip="${tip.id}">
        <p>${esc(tip.text)}</p>
        <div class="tip-meta">
          <span>${tip.source ? esc(tip.source) + " · " : ""}${tip.createdAt.slice(0, 10)}</span>
          <button class="text-button danger" data-action="delete-tip" type="button">删除</button>
        </div>
      </li>`).join("")
    : `<li class="tip empty">还没有记录。上完课把教练纠正你的点写下来，下次自己练就有据可依。</li>`;
}

function renderLastPerformance(exerciseId) {
  const last = store.lastPerformance(exerciseId);
  elements.lastPerformance.hidden = !last;
  if (!last) return;
  const sets = last.sets.map((set) => `${set.weight || "—"}kg × ${set.reps || "—"}`).join("，");
  elements.lastPerformance.innerHTML = `<span class="lp-label">上次 ${last.date}</span><span class="lp-sets">${esc(sets)}</span>`;
}

/* 加入训练默认落到「今天」那次记录上，没有就现建一个，省掉先去建记录再回来找动作 */
function todaySession() {
  return store.sessions().find((session) => session.date === storeHelpers.today());
}

function updateAddToSessionHint() {
  const session = todaySession();
  const inSession = session?.entries.some((entry) => entry.exerciseId === state.selectedId);
  elements.addToSessionButton.textContent = inSession ? "已在今天的训练里" : "加入训练记录";
  elements.addToSessionButton.disabled = Boolean(inSession);
  elements.addToSessionHint.textContent = session
    ? `${session.date}${session.kind === "coach" ? " 私教课" : " 自主训练"}`
    : "会新建一次今天的训练";
}

function closeDetail() {
  elements.detailOverlay.hidden = true;
  elements.detailContent.hidden = true;
  document.body.classList.remove("modal-open");
}

function splitInstructions(text) {
  return text.split(/(?<=[。！？.!?])\s*/).map((step) => step.trim()).filter(Boolean);
}

function flashStatus(text) {
  elements.saveStatus.textContent = text;
  elements.saveStatus.classList.add("saved");
  setTimeout(() => { elements.saveStatus.textContent = "教练教的要点记这里"; elements.saveStatus.classList.remove("saved"); }, 1400);
}

function updateFavoriteButton() {
  const active = store.isFavorite(state.selectedId);
  elements.favoriteButton.classList.toggle("active", active);
  elements.favoriteButton.setAttribute("aria-label", active ? "取消收藏" : "收藏动作");
}

/* ---------- 视图切换 ---------- */

function setView(view) {
  state.view = view;
  Object.entries(elements.views).forEach(([name, node]) => { node.hidden = name !== view; });
  elements.viewNav.querySelectorAll(".view-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  if (view === "log") renderSessions();
  if (view === "plans") renderPlans();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startPicking(type, id) {
  state.picker = { type, id };
  setView("library");
  renderPickerBanner();
  renderExerciseList();
}

function stopPicking() {
  const picker = state.picker;
  state.picker = null;
  renderPickerBanner();
  renderExerciseList();
  if (picker) setView(picker.type === "plan" ? "plans" : "log");
}

function renderPickerBanner() {
  let banner = $("#pickerBanner");
  if (!state.picker) { banner?.remove(); return; }
  const target = state.picker.type === "plan" ? store.plan(state.picker.id) : store.session(state.picker.id);
  if (!target) { state.picker = null; banner?.remove(); return; }
  const label = state.picker.type === "plan" ? target.name : `${target.date} 的训练`;
  const count = target.entries.length;
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "pickerBanner";
    banner.className = "picker-banner";
    elements.views.library.prepend(banner);
  }
  banner.innerHTML = `
    <span>正在为「${esc(label)}」添加动作 · 已选 <strong>${count}</strong> 个</span>
    <button class="primary-button" data-action="done" type="button">完成</button>`;
}

/* ---------- 训练记录 ---------- */

function renderSessions() {
  const sessions = store.sessions();
  if (!sessions.length) {
    elements.sessionList.innerHTML = `<div class="empty-state">
      <strong>还没有训练记录</strong>
      <span>上完私教课，把做过的动作和组数记下来。练得越久，这里越值钱。</span>
    </div>`;
    return;
  }
  elements.sessionList.innerHTML = sessions.map(renderSessionCard).join("");
}

function renderSessionCard(session) {
  const open = session.id === state.openSessionId;
  const totalSets = session.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const summary = session.entries.length
    ? `${session.entries.length} 个动作 · ${totalSets} 组`
    : "还没有动作";
  return `
    <article class="session-card ${open ? "open" : ""}" data-session="${session.id}">
      <button class="session-head" data-action="toggle-session" type="button">
        <span class="session-date">${session.date}</span>
        <span class="session-kind ${session.kind}">${session.kind === "coach" ? "私教课" : "自主训练"}</span>
        <span class="session-summary">${summary}</span>
        <span class="session-caret">${open ? "收起" : "展开"}</span>
      </button>
      ${open ? renderSessionBody(session) : ""}
    </article>`;
}

function renderSessionBody(session) {
  return `
    <div class="session-body">
      <div class="session-fields">
        <label>日期<input type="date" data-field="date" value="${session.date}" /></label>
        <label>类型
          <select data-field="kind">
            <option value="coach" ${session.kind === "coach" ? "selected" : ""}>私教课</option>
            <option value="self" ${session.kind === "self" ? "selected" : ""}>自主训练</option>
          </select>
        </label>
        <label>教练<input type="text" data-field="coach" value="${esc(session.coach)}" placeholder="选填" maxlength="30" /></label>
      </div>
      <label class="session-feel">这次的感受
        <textarea data-field="feel" rows="2" maxlength="500" placeholder="哪里酸、哪里没感觉、下次想调整什么…">${esc(session.feel)}</textarea>
      </label>
      <div class="entry-list">${session.entries.map(renderEntry).join("") || `<p class="entry-empty">还没有动作，点下面的按钮从动作库里挑。</p>`}</div>
      <div class="session-tools">
        <button class="primary-button" data-action="pick-exercise" type="button">添加动作</button>
        <button class="text-button" data-action="save-as-plan" type="button">存成训练计划</button>
        <button class="text-button danger" data-action="delete-session" type="button">删除这次记录</button>
      </div>
    </div>`;
}

function renderEntry(entry) {
  const last = store.lastPerformance(entry.exerciseId, state.openSessionId);
  return `
    <div class="entry" data-entry="${entry.id}">
      <div class="entry-head">
        <strong>${esc(exerciseName(entry.exerciseId))}</strong>
        <button class="text-button danger" data-action="remove-entry" type="button">移除</button>
      </div>
      ${last ? `<p class="entry-last">上次 ${last.date}：${esc(last.sets.map((set) => `${set.weight || "—"}×${set.reps || "—"}`).join(" "))}</p>` : ""}
      <div class="set-list">
        ${entry.sets.map((set, index) => `
          <div class="set-row" data-set="${set.id}">
            <span class="set-index">${index + 1}</span>
            <input type="number" inputmode="decimal" step="0.5" min="0" data-field="weight" value="${esc(set.weight)}" placeholder="kg" aria-label="第${index + 1}组重量" />
            <span class="set-x">kg ×</span>
            <input type="number" inputmode="numeric" step="1" min="0" data-field="reps" value="${esc(set.reps)}" placeholder="次" aria-label="第${index + 1}组次数" />
            <button class="set-remove" data-action="remove-set" type="button" aria-label="删除这一组">×</button>
          </div>`).join("")}
      </div>
      <button class="text-button" data-action="add-set" type="button">+ 加一组</button>
    </div>`;
}

/* ---------- 训练计划 ---------- */

function renderPlans() {
  const plans = store.plans();
  if (!plans.length) {
    elements.planList.innerHTML = `<div class="empty-state">
      <strong>还没有训练计划</strong>
      <span>可以直接新建，也可以在某次训练记录里点「存成训练计划」。</span>
    </div>`;
    return;
  }
  elements.planList.innerHTML = plans.map(renderPlanCard).join("");
}

function renderPlanCard(plan) {
  const open = plan.id === state.openPlanId;
  return `
    <article class="plan-card ${open ? "open" : ""}" data-plan="${plan.id}">
      <button class="plan-head" data-action="toggle-plan" type="button">
        <span class="plan-name">${esc(plan.name)}</span>
        <span class="plan-summary">${plan.entries.length} 个动作</span>
        <span class="session-caret">${open ? "收起" : "展开"}</span>
      </button>
      ${open ? `
        <div class="plan-body">
          <label class="plan-field">计划名称<input type="text" data-field="name" value="${esc(plan.name)}" maxlength="40" /></label>
          <label class="plan-field">说明<textarea data-field="note" rows="2" maxlength="300" placeholder="练哪些部位、注意什么…">${esc(plan.note)}</textarea></label>
          <div class="plan-entries">
            ${plan.entries.map((entry) => `
              <div class="plan-entry" data-entry="${entry.id}">
                <strong>${esc(exerciseName(entry.exerciseId))}</strong>
                <span class="plan-target">
                  <input type="number" min="1" step="1" data-field="sets" value="${esc(entry.sets)}" aria-label="组数" /> 组 ×
                  <input type="number" min="1" step="1" data-field="reps" value="${esc(entry.reps)}" aria-label="次数" /> 次
                </span>
                <button class="text-button danger" data-action="remove-plan-entry" type="button">移除</button>
              </div>`).join("") || `<p class="entry-empty">还没有动作。</p>`}
          </div>
          <div class="session-tools">
            <button class="primary-button" data-action="start-plan" type="button">按这个计划开练</button>
            <button class="text-button" data-action="pick-exercise" type="button">添加动作</button>
            <button class="text-button danger" data-action="delete-plan" type="button">删除计划</button>
          </div>
        </div>` : ""}
    </article>`;
}

elements.exerciseList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const exerciseId = button.dataset.id;
  if (!state.picker) return selectExercise(exerciseId);
  // 挑选模式下连点多个动作，不打断节奏
  if (state.picker.type === "plan") store.addPlanEntry(state.picker.id, exerciseId);
  else store.addEntry(state.picker.id, exerciseId);
  button.classList.add("just-added");
  setTimeout(() => button.classList.remove("just-added"), 600);
  renderPickerBanner();
});
elements.searchInput.addEventListener("input", debounce((event) => { state.search = event.target.value; applyFilters(); }));
elements.resetButton.addEventListener("click", () => {
  state.equipment = "all"; state.bodyPart = "all"; state.search = ""; elements.searchInput.value = "";
  elements.equipmentList.querySelectorAll(".equipment-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.equipment === "all"));
  elements.bodyPartList.querySelectorAll(".body-part-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.bodyPart === "all"));
  applyFilters();
});
elements.favoriteButton.addEventListener("click", () => {
  if (!state.selectedId) return;
  store.toggleFavorite(state.selectedId);
  updateFavoriteButton();
});
elements.closeDetailButton.addEventListener("click", closeDetail);
elements.detailOverlay.addEventListener("click", (event) => { if (event.target === elements.detailOverlay) closeDetail(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !elements.detailOverlay.hidden) closeDetail(); });

/* ---- 详情弹层里的技巧与加入训练 ---- */

elements.addTipButton.addEventListener("click", () => {
  const text = elements.tipInput.value.trim();
  if (!text || !state.selectedId) return;
  store.addTip(state.selectedId, text, elements.tipSource.value);
  elements.tipInput.value = "";
  renderTips(state.selectedId);
  flashStatus("已记下");
});
elements.tipList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete-tip"]');
  if (!button) return;
  store.deleteTip(button.closest("[data-tip]").dataset.tip);
  renderTips(state.selectedId);
});
elements.addToSessionButton.addEventListener("click", () => {
  if (!state.selectedId) return;
  const session = todaySession() || store.createSession();
  store.addEntry(session.id, state.selectedId);
  state.openSessionId = session.id;
  updateAddToSessionHint();
  renderSessions();
  flashStatus("已加入训练");
});

/* ---- 视图切换与挑选模式 ---- */

elements.viewNav.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-view]");
  if (tab) setView(tab.dataset.view);
});
elements.views.library.addEventListener("click", (event) => {
  if (event.target.closest('#pickerBanner [data-action="done"]')) stopPicking();
});
elements.newSessionButton.addEventListener("click", () => {
  const session = store.createSession();
  state.openSessionId = session.id;
  renderSessions();
});
elements.newPlanButton.addEventListener("click", () => {
  const plan = store.createPlan();
  state.openPlanId = plan.id;
  renderPlans();
});

/* ---- 训练记录的编辑 ---- */

elements.sessionList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-session]");
  if (!card) return;
  const sessionId = card.dataset.session;
  const action = event.target.closest("[data-action]")?.dataset.action;
  const entryId = event.target.closest("[data-entry]")?.dataset.entry;
  const setId = event.target.closest("[data-set]")?.dataset.set;
  if (action === "toggle-session") {
    state.openSessionId = state.openSessionId === sessionId ? null : sessionId;
    renderSessions();
  } else if (action === "add-set") {
    store.addSet(sessionId, entryId);
    renderSessions();
  } else if (action === "remove-set") {
    store.removeSet(sessionId, entryId, setId);
    renderSessions();
  } else if (action === "remove-entry") {
    store.removeEntry(sessionId, entryId);
    renderSessions();
  } else if (action === "pick-exercise") {
    startPicking("session", sessionId);
  } else if (action === "save-as-plan") {
    const plan = store.planFromSession(sessionId);
    state.openPlanId = plan.id;
    setView("plans");
  } else if (action === "delete-session") {
    if (!confirm("删除这次训练记录？该操作无法撤销。")) return;
    store.deleteSession(sessionId);
    if (state.openSessionId === sessionId) state.openSessionId = null;
    renderSessions();
  }
});

/* 输入类改动只写库不重渲染，否则每敲一个字都会重建 DOM、光标会跳走 */
elements.sessionList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  const sessionId = event.target.closest("[data-session]").dataset.session;
  const entryId = event.target.closest("[data-entry]")?.dataset.entry;
  const setId = event.target.closest("[data-set]")?.dataset.set;
  if (setId) store.updateSet(sessionId, entryId, setId, { [field]: event.target.value });
  else store.updateSession(sessionId, { [field]: event.target.value });
});
// 日期和类型改完需要重排顺序、刷新标签，等失焦再渲染
elements.sessionList.addEventListener("change", (event) => {
  if (["date", "kind"].includes(event.target.dataset.field)) renderSessions();
});

/* ---- 训练计划的编辑 ---- */

elements.planList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-plan]");
  if (!card) return;
  const planId = card.dataset.plan;
  const action = event.target.closest("[data-action]")?.dataset.action;
  const entryId = event.target.closest("[data-entry]")?.dataset.entry;
  if (action === "toggle-plan") {
    state.openPlanId = state.openPlanId === planId ? null : planId;
    renderPlans();
  } else if (action === "remove-plan-entry") {
    store.removePlanEntry(planId, entryId);
    renderPlans();
  } else if (action === "pick-exercise") {
    startPicking("plan", planId);
  } else if (action === "start-plan") {
    const session = store.startFromPlan(planId);
    state.openSessionId = session.id;
    setView("log");
  } else if (action === "delete-plan") {
    if (!confirm("删除这个训练计划？该操作无法撤销。")) return;
    store.deletePlan(planId);
    if (state.openPlanId === planId) state.openPlanId = null;
    renderPlans();
  }
});
elements.planList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  const planId = event.target.closest("[data-plan]").dataset.plan;
  const entryId = event.target.closest("[data-entry]")?.dataset.entry;
  if (entryId) store.updatePlanEntry(planId, entryId, { [field]: event.target.value });
  else store.updatePlan(planId, { [field]: event.target.value });
});

/* ---- 备份 ---- */

elements.exportButton.addEventListener("click", () => {
  const url = URL.createObjectURL(store.exportBlob());
  const link = Object.assign(document.createElement("a"), { href: url, download: `练练备份-${storeHelpers.today()}.json` });
  link.click();
  URL.revokeObjectURL(url);
});
elements.importButton.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const counts = store.importJSON(await file.text());
    renderSessions();
    renderPlans();
    alert(`导入完成：${counts.sessions} 次训练、${counts.tips} 条技巧、${counts.plans} 个计划。`);
  } catch (error) {
    alert(`导入失败：${error.message}`);
  }
  event.target.value = "";
});
window.addEventListener("store:error", (event) => alert(event.detail));

loadExercises();
