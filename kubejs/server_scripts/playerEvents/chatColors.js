console.info("[SOCIETY] chatColors.js loaded");

// With global.enableChatColors a dye worn in a Curios slot colors the player's chat name. Messages may use
// &<code> and &#rrggbb color codes.
const chatColorDyes = [
  { dye: "minecraft:white_dye", code: "f" },
  { dye: "minecraft:light_gray_dye", code: "7" },
  { dye: "minecraft:gray_dye", code: "8" },
  { dye: "minecraft:black_dye", code: "0" },
  { dye: "minecraft:purple_dye", code: "1" },
  { dye: "minecraft:lime_dye", code: "a" },
  { dye: "minecraft:green_dye", code: "2" },
  { dye: "minecraft:brown_dye", code: "4" },
  { dye: "minecraft:red_dye", code: "c" },
  { dye: "minecraft:orange_dye", code: "6" },
  { dye: "minecraft:magenta_dye", code: "5" },
  { dye: "minecraft:yellow_dye", code: "e" },
  { dye: "minecraft:cyan_dye", code: "3" },
  { dye: "minecraft:light_blue_dye", code: "b" },
  { dye: "minecraft:blue_dye", code: "9" },
  { dye: "minecraft:pink_dye", code: "d" },
];

// Legacy codes do not support hex colors, so &#rrggbb becomes the nearest of the 16 chat colors.
const chatColorCodes = [
  ["0", 0x000000], ["1", 0x0000aa], ["2", 0x00aa00], ["3", 0x00aaaa], ["4", 0xaa0000], ["5", 0xaa00aa],
  ["6", 0xffaa00], ["7", 0xaaaaaa], ["8", 0x555555], ["9", 0x5555ff], ["a", 0x55ff55], ["b", 0x55ffff],
  ["c", 0xff5555], ["d", 0xff55ff], ["e", 0xffff55], ["f", 0xffffff],
];
const chatNearestCode = (rgb) => {
  let best = "f";
  let bestDistance = Infinity;
  chatColorCodes.forEach((entry) => {
    let code = entry[0];
    let value = entry[1];
    let dr = ((rgb >> 16) & 255) - ((value >> 16) & 255);
    let dg = ((rgb >> 8) & 255) - ((value >> 8) & 255);
    let db = (rgb & 255) - (value & 255);
    let distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = code;
    }
  });
  return best;
};

const chatAddColor = (text) =>
  text
    .replace(/&#[a-fA-F0-9]{6}/g, (hex) => `&${chatNearestCode(parseInt(hex.substring(2), 16))}`)
    .replace(/&([0-9a-fk-orA-FK-OR])/g, "§$1");

PlayerEvents.chat((e) => {
  if (!global.enableChatColors) return;
  const { player, server } = e;
  let color = "&f";
  chatColorDyes.forEach((entry) => {
    if (societyIsCurioEquipped(player, entry.dye)) color = `&${entry.code}`;
  });
  server.tell(Text.of(chatAddColor(` ${color}${player.username} &7»&r ${e.message}`)));
  e.cancel();
});
