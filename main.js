import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const FULL = 6;
const DEFAULT = { count: 0, visible: true, roll: null };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ตำแหน่ง pip ใน grid 3x3 (1-9)
const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };
// มุมหมุน [x, y] ที่ทำให้หน้านั้นหันมาทางผู้ดู
const ORI = { 1:[0,0], 2:[0,-90], 3:[-90,0], 4:[90,0], 5:[0,90], 6:[0,180] };

const $ = (id) => document.getElementById(id);
const el = { n:$("n"), hint:$("hint"), tray:$("tray"), lock:$("lock"), banner:$("banner"),
  gm:$("gm"), role:$("role"), odds:$("odds"), meter:document.querySelector(".meter"),
  addTime:$("addTime"), addNoise:$("addNoise"), remove:$("remove"), roll:$("roll"),
  reset:$("reset"), visible:$("visible") };

let state = { ...DEFAULT };
let isGM = false;
let trayKey = "";
let seenRoll = null;
let shownPool = 0;
let timers = [];

/* ---------- เต๋า ---------- */
function makeDie(value) {
  const die = document.createElement("div");
  die.className = "die" + (value ? "" : " blank idle");
  const cube = document.createElement("div");
  cube.className = "cube";
  for (let f = 1; f <= 6; f++) {
    const face = document.createElement("div");
    face.className = "face f" + f;
    if (value) {
      PIPS[f].forEach((cell) => {
        const p = document.createElement("i");
        p.className = "pip";
        p.style.gridArea = `${Math.ceil(cell / 3)} / ${((cell - 1) % 3) + 1}`;
        face.append(p);
      });
    }
    cube.append(face);
  }
  die.append(cube);
  return die;
}

const spin = () => 360 * (2 + Math.floor(Math.random() * 3));
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function showSettled(values) {
  el.tray.classList.remove("empty", "rumble");
  el.tray.replaceChildren(...values.map((v) => {
    const d = makeDie(v);
    const [x, y] = ORI[v];
    d.querySelector(".cube").style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    d.classList.add(v === 1 ? "hit" : "safe");
    return d;
  }));
  showBanner(values, false);
}

function rollDice(values) {
  clearTimers();
  el.banner.hidden = true;
  el.tray.classList.remove("empty");
  el.tray.classList.add("rumble");
  el.tray.replaceChildren();
  let longest = 0;

  values.forEach((v, i) => {
    const die = makeDie(v);
    const cube = die.querySelector(".cube");
    const dur = reduceMotion ? 200 : 1500 + i * 260 + Math.random() * 500;
    longest = Math.max(longest, dur);
    cube.style.transform = `rotateX(${Math.random() * 90}deg) rotateY(${Math.random() * 90}deg)`;
    cube.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.2,1)`;
    if (!reduceMotion) die.style.animation = `hop ${dur}ms ease-out`;
    el.tray.append(die);

    const [x, y] = ORI[v];
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cube.style.transform = `rotateX(${x + spin()}deg) rotateY(${y + spin()}deg)`;
    }));
    later(() => { die.style.animation = ""; die.classList.add(v === 1 ? "hit" : "safe"); }, dur);
  });

  later(() => { el.tray.classList.remove("rumble"); showBanner(values, true); }, longest + 250);
}

function showBanner(values, animate) {
  const ones = values.filter((v) => v === 1).length;
  el.banner.className = "banner " + (ones ? "bad" : "good");
  el.banner.innerHTML = ones
    ? `เหตุการณ์แทรกซ้อน!<small>ออกหน้า 1 จำนวน ${ones} ลูก</small>`
    : `ปลอดภัย… ครั้งนี้<small>ไม่มีลูกใดออกหน้า 1</small>`;
  el.banner.style.animation = animate ? "" : "none";
  el.banner.hidden = false;
}

/* ---------- แสดงผล ---------- */
function renderPool(count) {
  el.tray.classList.remove("rumble");
  el.tray.classList.toggle("empty", count === 0);
  el.tray.replaceChildren(...Array.from({ length: count }, (_, i) => {
    const d = makeDie(null);
    if (i >= shownPool && !reduceMotion) d.classList.add("drop");
    return d;
  }));
  shownPool = count;
}

function render() {
  const hidden = !isGM && !state.visible;
  const rolled = !!state.roll;
  el.role.textContent = isGM ? "DM" : "ผู้เล่น";
  el.gm.hidden = !isGM;
  el.lock.hidden = !hidden;
  el.meter.hidden = el.tray.hidden = hidden;

  el.n.textContent = state.count;
  el.meter.classList.toggle("full", state.count >= FULL);
  el.hint.textContent = rolled ? "ทอยแล้ว รอ DM เริ่มใหม่"
    : state.count >= FULL ? "Pool เต็มแล้ว ถึงเวลาทอย"
    : `อีก ${FULL - state.count} ลูกจะเต็ม`;

  const key = hidden ? "h" : rolled ? "r" + state.roll.id : "p" + state.count;
  if (key !== trayKey) {
    trayKey = key;
    if (hidden) {
      clearTimers(); el.banner.hidden = true;
    } else if (rolled) {
      const fresh = state.roll.id !== seenRoll && Math.abs(Date.now() - state.roll.id) < 15000;
      seenRoll = state.roll.id;
      fresh ? rollDice(state.roll.values) : (clearTimers(), showSettled(state.roll.values));
    } else {
      clearTimers(); el.banner.hidden = true; renderPool(state.count);
    }
  }

  if (isGM) {
    el.addTime.disabled = el.addNoise.disabled = rolled;
    el.remove.disabled = rolled || state.count === 0;
    el.roll.disabled = rolled || state.count === 0;
    el.roll.classList.toggle("ready", state.count >= FULL && !rolled);
    el.visible.checked = state.visible;
    el.odds.textContent = state.count && !rolled
      ? `โอกาสเกิดเหตุการณ์แทรกซ้อน ≈ ${Math.round((1 - Math.pow(5 / 6, state.count)) * 100)}% (เฉพาะ DM เห็น)`
      : "";
  }
}

/* ---------- การกระทำของ DM ---------- */
const save = (patch) => OBR.room.setMetadata({ [KEY]: { ...state, ...patch } });

el.addTime.onclick = () => save({ count: state.count + 1 });
el.addNoise.onclick = () => save({ count: state.count + 1 });
el.remove.onclick = () => save({ count: Math.max(0, state.count - 1) });
el.reset.onclick = () => save({ count: 0, roll: null });
el.visible.onchange = (e) => save({ visible: e.target.checked });
el.roll.onclick = () => {
  const values = Array.from({ length: state.count }, () => 1 + Math.floor(Math.random() * 6));
  save({ roll: { id: Date.now(), values } });
};

/* ---------- เริ่มต้น ---------- */
OBR.onReady(async () => {
  isGM = (await OBR.player.getRole()) === "GM";
  OBR.player.onChange(async () => { isGM = (await OBR.player.getRole()) === "GM"; render(); });

  const meta = await OBR.room.getMetadata();
  state = { ...DEFAULT, ...(meta[KEY] ?? {}) };
  if (state.roll) seenRoll = state.roll.id; // ไม่เล่นอนิเมชันซ้ำตอนเปิดหน้าต่างใหม่
  render();

  OBR.room.onMetadataChange((m) => {
    state = { ...DEFAULT, ...(m[KEY] ?? {}) };
    render();
  });
});
