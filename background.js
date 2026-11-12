import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const BASE_ID = "com.tensionpool/overlay";

let isGM = false;
let prev = null;
let currentId = null; // id ของ popover ที่เปิดค้างอยู่ตอนนี้
let seq = 0;

// เปิด popover เฉพาะตอนมีการเพิ่มเต๋า แล้วให้ overlay ปิดตัวเองเมื่อแอนิเมชันจบ
// (ไม่เปิดค้างไว้ จึงไม่มี hitbox บังปุ่มมุมขวาบน)
//
// สำคัญ: ใช้ id ใหม่ "ทุกครั้ง" ที่เปิด เพื่อให้ Owlbear สร้าง iframe ใหม่เสมอ
// ถ้าใช้ id เดิมแล้ว close->open ติดกัน ตัว host อาจมองว่าเป็น popover เดิม
// ไม่โหลด overlay.html ใหม่ ทำให้ overlay.js ไม่ถูกรันซ้ำ (ไม่มีเสียง ไม่มีเต๋า)
function show() {
  // ปิดอันเก่า "โดยไม่รอ" — ถ้า popover นั้นปิดตัวเองไปแล้ว คำสั่ง close อาจไม่ตอบกลับ
  // และ sendAsync จะค้างจน timeout 5 วิ ซึ่งจะทำให้เต๋าลูกถัดไปช้าไปด้วย
  if (currentId) {
    OBR.popover.close(currentId).catch(() => {});
    currentId = null;
  }

  const id = `${BASE_ID}-${Date.now()}-${++seq}`;
  currentId = id;

    OBR.popover.open({
    id,
    url: `/Tension-Pool/overlay.html?v=4&id=${encodeURIComponent(id)}`,
    width: 150,
    height: 104,
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    marginThreshold: 8,
    hidePaper: true,
    disableClickAway: true,
  }).catch((err) => {
    console.error("[Tension Pool] เปิด overlay ไม่สำเร็จ", err);
    if (currentId === id) currentId = null;
  });
}

function onState(s) {
  const count = s?.count ?? 0;
  const visible = s?.visible ?? true;
  if (prev !== null && count > prev && !s?.roll && (isGM || visible)) show();
  prev = count;
}

OBR.onReady(async () => {
  isGM = (await OBR.player.getRole()) === "GM";
  const meta = await OBR.room.getMetadata();
  prev = meta[KEY]?.count ?? 0;

  OBR.player.onChange(async () => {
    isGM = (await OBR.player.getRole()) === "GM";
  });
  OBR.room.onMetadataChange((m) => onState(m[KEY]));
});
