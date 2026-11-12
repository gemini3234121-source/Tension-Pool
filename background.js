import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3/+esm";

const KEY = "com.tensionpool/state";
const ID = "com.tensionpool/overlay";

let isGM = false;
let visible = true;
let prev = null;

async function show() {
  try { await OBR.popover.close(ID); } catch {}
  await OBR.popover.open({
    id: ID,
    url: "/Tension-Pool/overlay.html",
    width: 150,
    height: 104,
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    marginThreshold: 8,
    hidePaper: true,
    disableClickAway: true,
  });
}

function onState(s) {
  const count = s?.count ?? 0;
  visible = s?.visible ?? true;
  if (prev !== null && count > prev && !s?.roll && (isGM || visible)) show();
  prev = count;
}

OBR.onReady(async () => {
  isGM = (await OBR.player.getRole()) === "GM";
  const meta = await OBR.room.getMetadata();
  onState(meta[KEY]);
  prev = meta[KEY]?.count ?? 0;

  OBR.player.onChange(async () => {
    isGM = (await OBR.player.getRole()) === "GM";
  });
  OBR.room.onMetadataChange((m) => onState(m[KEY]));
});
