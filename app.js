const DATA_URL = "data/exercises.json";
// 素材默认同源加载。若改用对象存储（腾讯云 COS 等），把 assets/ 目录整个上传到
// 存储桶根目录，然后把这里换成桶域名，例如 "https://your-bucket.cos.ap-guangzhou.myqcloud.com/"。
const MEDIA_ROOT = "assets/";
const NOTE_PREFIX = "lianlian-note:";
const FAVORITES_KEY = "lianlian-favorites";
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

const state = { exercises: [], filtered: [], equipment: "all", bodyPart: "all", selectedId: null, search: "", favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")) };
const $ = (selector) => document.querySelector(selector);
const elements = {
  dataStatus: $("#dataStatus"), equipmentList: $("#equipmentList"), bodyPartList: $("#bodyPartList"), exerciseList: $("#exerciseList"),
  resultCount: $("#resultCount"), searchInput: $("#searchInput"), resetButton: $("#resetButton"),
  detailOverlay: $("#detailOverlay"), detailContent: $("#detailContent"), detailIndex: $("#detailIndex"),
  exerciseMedia: $("#exerciseMedia"), bodyPart: $("#bodyPart"), exerciseName: $("#exerciseName"),
  exerciseEnglishName: $("#exerciseEnglishName"),
  tags: $("#tags"), instructionList: $("#instructionList"), noteInput: $("#noteInput"),
  saveStatus: $("#saveStatus"), characterCount: $("#characterCount"), clearNoteButton: $("#clearNoteButton"),
  favoriteButton: $("#favoriteButton"), closeDetailButton: $("#closeDetailButton"),
};

const mediaUrl = (path) => `${MEDIA_ROOT}${String(path || "").replace(/^\.\//, "")}`;
const localName = (value, dictionary) => dictionary[value?.toLowerCase()] || value || "未知";
const debounce = (fn, wait = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; };

async function loadExercises() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.exercises = (await response.json()).map((item) => ({ ...item, localizedName: translateExerciseName(item.name) }));
    elements.dataStatus.textContent = `${state.exercises.length.toLocaleString("zh-CN")} 个动作已就绪`;
    $(".pulse").style.background = "var(--acid-dark)";
    renderEquipment();
    renderBodyParts();
    applyFilters();
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
  elements.resultCount.textContent = `${state.filtered.length} 个动作`;
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
  elements.noteInput.value = localStorage.getItem(NOTE_PREFIX + id) || "";
  updateCharacterCount();
  updateFavoriteButton();
}

function closeDetail() {
  elements.detailOverlay.hidden = true;
  elements.detailContent.hidden = true;
  document.body.classList.remove("modal-open");
}

function splitInstructions(text) {
  return text.split(/(?<=[。！？.!?])\s*/).map((step) => step.trim()).filter(Boolean);
}

function saveNote() {
  if (!state.selectedId) return;
  const key = NOTE_PREFIX + state.selectedId;
  const value = elements.noteInput.value;
  value.trim() ? localStorage.setItem(key, value) : localStorage.removeItem(key);
  elements.saveStatus.textContent = "已保存";
  elements.saveStatus.classList.add("saved");
  setTimeout(() => { elements.saveStatus.textContent = "自动保存"; elements.saveStatus.classList.remove("saved"); }, 1200);
}

function updateCharacterCount() { elements.characterCount.textContent = `${elements.noteInput.value.length} / 3000`; }
function updateFavoriteButton() {
  const active = state.favorites.has(state.selectedId);
  elements.favoriteButton.classList.toggle("active", active);
  elements.favoriteButton.setAttribute("aria-label", active ? "取消收藏" : "收藏动作");
}

elements.exerciseList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (button) selectExercise(button.dataset.id);
});
elements.searchInput.addEventListener("input", debounce((event) => { state.search = event.target.value; applyFilters(); }));
elements.noteInput.addEventListener("input", () => { updateCharacterCount(); debouncedSave(); });
const debouncedSave = debounce(saveNote, 450);
elements.clearNoteButton.addEventListener("click", () => { elements.noteInput.value = ""; updateCharacterCount(); saveNote(); elements.noteInput.focus(); });
elements.resetButton.addEventListener("click", () => {
  state.equipment = "all"; state.bodyPart = "all"; state.search = ""; elements.searchInput.value = "";
  elements.equipmentList.querySelectorAll(".equipment-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.equipment === "all"));
  elements.bodyPartList.querySelectorAll(".body-part-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.bodyPart === "all"));
  applyFilters();
});
elements.favoriteButton.addEventListener("click", () => {
  if (!state.selectedId) return;
  state.favorites.has(state.selectedId) ? state.favorites.delete(state.selectedId) : state.favorites.add(state.selectedId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  updateFavoriteButton();
});
elements.closeDetailButton.addEventListener("click", closeDetail);
elements.detailOverlay.addEventListener("click", (event) => { if (event.target === elements.detailOverlay) closeDetail(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !elements.detailOverlay.hidden) closeDetail(); });

loadExercises();
