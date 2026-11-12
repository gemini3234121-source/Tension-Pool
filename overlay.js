import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const params = new URLSearchParams(location.search);
// id ของ popover นี้ background.js สร้างใหม่ทุกครั้งแล้วส่งมาทาง ?id=...
// ต้องปิดด้วย id เดียวกันนี้ ไม่งั้น close จะไม่โดน popover ตัวเอง
const ID = params.get("id") || "com.tensionpool/overlay";
const ROLL = params.get("mode") === "roll";   // true = DM เพิ่งกดทอย Pool
const SOUND = ROLL ? "roll.mp3" : "add.mp3";  // ไฟล์เสียง วางไว้โฟลเดอร์เดียวกับ overlay.html
const LEAD = ROLL ? 0 : 450;      // ms ที่รอหลังเสียงเริ่ม ก่อนเต๋าจะโผล่
const HOLD = ROLL ? 2200 : 1800;  // ms ที่เต๋ากับตัวเลขค้างอยู่ก่อนหาย (ตอนทอยต้องรอให้เสียงเล่นจบก่อนปิด)
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const plaque = $("plaque"), nEl = $("n"), dieHost = $("dieHost");

let timers = [];

function makeDie() {
  const die = document.createElement("div");
  die.className = "die" + (reduce ? "" : " drop");
  const cube = document.createElement("div");
  cube.className = "cube";
  for (let f = 1; f <= 6; f++) {
    const face = document.createElement("div");
    face.className = "face f" + f;
    cube.append(face);
  }
  die.append(cube);
  return die;
}

// พยายามเล่นเสียง ถ้าเบราว์เซอร์บล็อกก็ข้ามไปเงียบ ๆ (ไม่มีปุ่ม ไม่ค้างหน้าจอ)
function ping() {
  try {
    const a = new Audio(SOUND);
    a.volume = 0.85;
    a.play()?.catch((err) => console.warn("[Tension Pool] เล่นเสียงไม่ได้", err));
  } catch (err) {
    console.warn("[Tension Pool] เล่นเสียงไม่ได้", err);
  }
}

// ถ้าเครื่องนี้เป็นเครื่องที่ DM กดเพิ่มเอง app.js เล่นเสียงไปแล้ว ไม่ต้องเล่นซ้ำ
function playedRecently() {
  try { return Date.now() - Number(localStorage.getItem("tp:soundAt") || 0) < 6000; }
  catch { return false; }
}

const close = () => OBR.popover.close(ID).catch((err) => console.warn("[Tension Pool] ปิด overlay ไม่ได้", err));

function announce(count) {
  timers.forEach(clearTimeout);
  timers = [];
  plaque.classList.remove("in");
  nEl.textContent = count;

  if (!playedRecently()) ping();
  timers.push(setTimeout(() => {
    dieHost.replaceChildren(makeDie());
    plaque.classList.add("in");
  }, LEAD));
  timers.push(setTimeout(() => plaque.classList.remove("in"), LEAD + HOLD));
  // ปิด popover หลังแอนิเมชันจบ เพื่อไม่ให้บังปุ่ม
  timers.push(setTimeout(close, LEAD + HOLD + 400));
}

OBR.onReady(async () => {
  const meta = await OBR.room.getMetadata();
  const st = meta[KEY];
  announce(ROLL ? (st?.roll?.values?.length ?? st?.count ?? 0) : (st?.count ?? 0));
});
