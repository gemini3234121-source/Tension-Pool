import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const ID = "com.tensionpool/overlay";
const FULL = 6;
const SOUND = "add.mp3"; // วางไฟล์เสียงไว้โฟลเดอร์เดียวกับ overlay.html
const DEFAULT = { count: 0, visible: true, roll: null };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };
const ORI = { 1:[0,0], 2:[0,-90], 3:[-90,0], 4:[90,0], 5:[0,90], 6:[0,180] };

const $ = (id) => document.getElementById(id);
const wood = $("wood"), nEl = $("n"), slotsEl = $("slots"), snd = $("snd");

let state = { ...DEFAULT };
let prevCount = null;
let shown = null;
let rollKey = "";
let seenRoll = null;
let height = 0;

/* ---------- เสียง ---------- */
let soundOn = true;
try { soundOn = localStorage.getItem("tp-sound") !== "off"; } catch {}
let blocked = false;

function paintSound() {
  snd.classList.toggle("off", !soundOn);
  snd.classList.toggle("need", soundOn && blocked);
}

function ping() {
  if (!soundOn) return;
  const a = new Audio(SOUND);
  a.volume = 0.85;
  a.play().then(() => { if (blocked) { blocked = false; paintSound(); } })
    .catch(() => { blocked = true; paintSound(); });
}

snd.onclick = () => {
  if (blocked) {
    // เบราว์เซอร์บล็อกเสียงอัตโนมัติ: แตะครั้งแรกเพื่อปลดล็อก
    blocked = false; soundOn = true; ping();
  } else {
    soundOn = !soundOn;
    if (soundOn) ping();
  }
  try { localStorage.setItem("tp-sound", soundOn ? "on" : "off"); } catch {}
  paintSound();
};

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

function ensureSlots(total) {
  while (slotsEl.children.length < total) {
    const s = document.createElement("div");
    s.className = "slot";
    slotsEl.append(s);
  }
  while (slotsEl.children.length > total) slotsEl.lastChild.remove();

  // ขยายความสูง popover เมื่อมีเต๋าเกิน 6 ลูก (แถวละ 3)
  const rows = Math.ceil(total / 3);
  const h = 52 + 48 * rows;
  if (h !== height) {
    height = h;
    OBR.popover.setHeight(ID, h).catch(() => {});
  }
}

function buildRolled(values, fresh) {
  [...slotsEl.children].forEach((s) => s.replaceChildren());
  values.forEach((v, i) => {
    const d = makeDie(v);
    const cube = d.querySelector(".cube");
    const [x, y] = ORI[v];
    const mark = () => d.classList.add(v === 1 ? "hit" : "safe");
    slotsEl.children[i].append(d);
    if (fresh && !reduce) {
      const dur = 1300 + i * 220;
      cube.style.transform = `rotateX(${Math.random() * 90}deg) rotateY(${Math.random() * 90}deg)`;
      cube.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.2,1)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cube.style.transform = `rotateX(${x + spin()}deg) rotateY(${y + spin()}deg)`;
      }));
      setTimeout(mark, dur);
    } else {
      cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      mark();
    }
  });
}

/* ---------- แสดงผล ---------- */
function render() {
  const rolled = !!state.roll;
  const total = Math.max(FULL, state.count);
  ensureSlots(total);

  nEl.textContent = state.count;
  wood.classList.toggle("full", state.count >= FULL);

  if (shown === null) shown = state.count; // ครั้งแรกไม่เล่นอนิเมชันตกลงมา

  const key = rolled ? "r" + state.roll.id : "p";
  if (key !== rollKey) {
    rollKey = key;
    if (rolled) {
      const fresh = state.roll.id !== seenRoll && Math.abs(Date.now() - state.roll.id) < 15000;
      seenRoll = state.roll.id;
      buildRolled(state.roll.values, fresh);
    } else {
      [...slotsEl.children].forEach((s) => s.replaceChildren());
      shown = 0;
    }
  }

  if (!rolled) {
    [...slotsEl.children].forEach((slot, i) => {
      const want = i < state.count;
      const has = slot.firstElementChild;
      if (want && !has) {
        const d = makeDie(null);
        if (i >= shown && !reduce) d.classList.add("drop");
        slot.append(d);
      } else if (!want && has) {
        has.remove();
      }
    });
    shown = state.count;
  }

  // เสียงเฉพาะตอนเพิ่มเต๋า (ไม่ดังตอนโหลดครั้งแรก ลบ หรือรีเซ็ต)
  if (prevCount !== null && state.count > prevCount && !rolled) ping();
  prevCount = state.count;
}

OBR.onReady(async () => {
  paintSound();
  const meta = await OBR.room.getMetadata();
  state = { ...DEFAULT, ...(meta[KEY] ?? {}) };
  if (state.roll) seenRoll = state.roll.id;
  render();

  OBR.room.onMetadataChange((m) => {
    state = { ...DEFAULT, ...(m[KEY] ?? {}) };
    render();
  });
});
