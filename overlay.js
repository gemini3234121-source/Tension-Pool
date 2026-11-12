import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const ID = "com.tensionpool/overlay";
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
    .catch(() => { blocked = true; pill.hidden = false; });
}

const W = 150, H = 104;
const expand = () => Promise.all([OBR.popover.setWidth(ID, W), OBR.popover.setHeight(ID, H)]).catch(() => {});
const shrink = () => Promise.all([OBR.popover.setWidth(ID, 1), OBR.popover.setHeight(ID, 1)]).catch(() => {});

pill.onclick = () => {
  blocked = false; pill.hidden = true; ping();
  timers.push(setTimeout(shrink, LEAD + HOLD + 400));
};

function announce(count) {
  timers.forEach(clearTimeout);
  timers = [];
  plaque.classList.remove("in");
  nEl.textContent = count;

  expand();
  ping(); // เสียงมาก่อน
  timers.push(setTimeout(() => {
    dieHost.replaceChildren(makeDie());
    plaque.classList.add("in");
  }, LEAD));
  timers.push(setTimeout(() => plaque.classList.remove("in"), LEAD + HOLD));
  // หดกลับเป็น 1x1 เมื่อจบ จะได้ไม่บังปุ่ม (ถ้าเสียงถูกบล็อก รอให้กดปุ่มก่อน)
  timers.push(setTimeout(() => { if (!blocked) shrink(); }, LEAD + HOLD + 400));
  timers.push(setTimeout(shrink, 20000));
}

let prev = null;
function onState(next) {
  const st = { count: 0, roll: null, ...next };
  // แสดงเฉพาะตอนเพิ่มเต๋า (ไม่แสดงตอนโหลดครั้งแรก ลบ รีเซ็ต หรือทอย)
  if (prev !== null && st.count > prev && !st.roll) announce(st.count);
  prev = st.count;
}

OBR.onReady(async () => {
  const meta = await OBR.room.getMetadata();
  onState(meta[KEY] ?? {});
  OBR.room.onMetadataChange((m) => onState(m[KEY] ?? {}));
});
