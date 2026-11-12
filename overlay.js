import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
// id ของ popover นี้ background.js สร้างใหม่ทุกครั้งแล้วส่งมาทาง ?id=...
// ต้องปิดด้วย id เดียวกันนี้ ไม่งั้น close จะไม่โดน popover ตัวเอง
const ID = new URLSearchParams(location.search).get("id") || "com.tensionpool/overlay";
const SOUND = "add.mp3";   // ไฟล์เสียง วางไว้โฟลเดอร์เดียวกับ overlay.html
const LEAD = 450;          // ms ที่รอหลังเสียงเริ่ม ก่อนเต๋าจะโผล่
const HOLD = 1800;         // ms ที่เต๋ากับตัวเลขค้างอยู่ก่อนหาย
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const plaque = $("plaque"), nEl = $("n"), dieHost = $("dieHost"), pill = $("pill");

let timers = [];
let blocked = false;

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

function ping() {
  const a = new Audio(SOUND);
  a.volume = 0.85;
  a.play()
    .then(() => { blocked = false; pill.hidden = true; })
    .catch((err) => {
      console.warn("[Tension Pool] เล่นเสียงไม่ได้", err);
      blocked = true; pill.hidden = false;
    });
}

const close = () => OBR.popover.close(ID).catch((err) => console.warn("[Tension Pool] ปิด overlay ไม่ได้", err));

pill.onclick = () => {
  blocked = false; pill.hidden = true; ping();
  setTimeout(close, LEAD + HOLD + 400);
};

function announce(count) {
  timers.forEach(clearTimeout);
  timers = [];
  plaque.classList.remove("in");
  nEl.textContent = count;

  ping(); // เสียงมาก่อน
  timers.push(setTimeout(() => {
    dieHost.replaceChildren(makeDie());
    plaque.classList.add("in");
  }, LEAD));
  timers.push(setTimeout(() => plaque.classList.remove("in"), LEAD + HOLD));
  // ปิด popover หลังแอนิเมชันจบ เพื่อไม่ให้บังปุ่ม (ถ้าเสียงถูกบล็อก รอให้กดปุ่มก่อน)
  timers.push(setTimeout(() => { if (!blocked) close(); }, LEAD + HOLD + 400));
  timers.push(setTimeout(close, 20000));
}

OBR.onReady(async () => {
  const meta = await OBR.room.getMetadata();
  announce(meta[KEY]?.count ?? 0);
});
