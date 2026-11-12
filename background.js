import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const ID = "com.tensionpool/overlay";

let isGM = false;
let visible = true;
let opened = false;

async function sync() {
  const want = isGM || visible;
  if (want && !opened) {
    opened = true;
    await OBR.popover.open({
      id: ID,
      url: "/Tension-Pool/overlay.html",
      // เปิดค้างไว้ที่ขนาด 1x1 (ไม่บังปุ่ม) แล้วให้ overlay ขยายเองตอนมีการเพิ่มเต๋า
      width: 1,
      height: 1,
      anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
      transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
      marginThreshold: 8,
      hidePaper: true,
      disableClickAway: true,
    });
  } else if (!want && opened) {
    opened = false;
    await OBR.popover.close(ID);
  }
}

OBR.onReady(async () => {
  isGM = (await OBR.player.getRole()) === "GM";
  const meta = await OBR.room.getMetadata();
  visible = meta[KEY]?.visible ?? true;
  await sync();

  OBR.player.onChange(async () => {
    isGM = (await OBR.player.getRole()) === "GM";
    sync();
  });
  OBR.room.onMetadataChange((m) => {
    visible = m[KEY]?.visible ?? true;
    sync();
  });
});
