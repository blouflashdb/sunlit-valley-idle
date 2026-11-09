console.info("[SOCIETY] magnifyingGlass.js loaded");

// Right-clicking a machine with the magnifying glass shows the area it works on with particles.
const $GlassRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $GlassRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $GlassBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

const GLASS_DELAY = 10;
const GLASS_REPETITIONS = 10;
const glassParticle = $GlassRegistries.PARTICLE_TYPE.containsKey($GlassRL.parse("supplementaries:stasis"))
  ? "supplementaries:stasis"
  : "minecraft:end_rod";

const magnifyingGlassBlocks = [
  { id: "society:auto_grabber", radius: { x: 5, y: 5, z: 5 } },
  { id: "society:artisan_hopper", radius: { x: 3, y: 3, z: 3 } },
  { id: "society:mini_artisan_hopper", radius: { x: 1, y: 1, z: 1 } },
  { id: "society:auto_petter", radius: { x: 2, y: 2, z: 2 } },
  { id: "society:fish_pond_basket", radius: { x: 1, y: 1, z: 1 } },
  { id: "society:fish_pond_hatchery", radius: { x: 1, y: 3, z: 1 } },
  { id: "society:feeding_trough", radius: { x: 6, y: 6, z: 6 } },
  { id: "dew_drop_farmland_growth:iron_sprinkler", radius: { x: 1, y: 0, z: 1 } },
  { id: "dew_drop_farmland_growth:gold_sprinkler", radius: { x: 2, y: 0, z: 2 } },
  { id: "society:mana_sprinkler", radius: { x: 2, y: 0, z: 2 } },
  { id: "dew_drop_farmland_growth:diamond_sprinkler", radius: { x: 3, y: 0, z: 3 } },
  { id: "dew_drop_farmland_growth:netherite_sprinkler", radius: { x: 4, y: 0, z: 4 } },
  { id: "society:mana_milker", radius: { x: 10, y: 10, z: 10 } },
  { id: "society:golden_clock", radius: { x: 2, y: 2, z: 2 } },
  { id: "society:mana_clock", radius: { x: 1, y: 1, z: 1 } },
  { id: "society:snow_melter", radius: { x: 10, y: 0, z: 10 } },
  { id: "farmingforblockheads:chicken_nest", radius: { x: 8, y: 8, z: 8 } },
  { id: "society:growth_obelisk", radius: { x: 3, y: 0, z: 3 } },
  { id: "society:ribbit_hut", radius: { x: 7, y: 1, z: 7 } },
  { id: "society:mushroom_log", radius: { x: 8, y: 8, z: 8 } },
  { id: "society:fish_pond_manager", radius: { x: 10, y: 10, z: 10 } },
  { id: "society:drum_cornucopia", radius: { x: 10, y: 6, z: 10 }, yOffset: 4 },
].filter((entry) => $GlassRegistries.BLOCK.containsKey($GlassRL.parse(entry.id)));

// The corners of the area a machine works on.
const magnifyingGlassArea = (block) => {
  let id = String(block.id);
  let entry = magnifyingGlassBlocks.find((candidate) => candidate.id === id);
  if (!entry) return null;
  let center = block.getPos();
  if (id === "society:ribbit_hut") center = global.getOpposite(block.getProperties().get("facing"), center);
  let y = center.y + (entry.yOffset || 0);
  return {
    from: new $GlassBlockPos(center.x - entry.radius.x, y - entry.radius.y, center.z - entry.radius.z),
    to: new $GlassBlockPos(center.x + entry.radius.x, y + entry.radius.y, center.z + entry.radius.z),
  };
};

BlockEvents.rightClicked(
  magnifyingGlassBlocks.map((entry) => entry.id),
  (e) => {
    let { item, hand, player, server, level, block } = e;
    if (String(hand) !== "MAIN_HAND" || String(item.id) !== "society:magnifying_glass") return;
    let area = magnifyingGlassArea(block);
    if (!area) return;
    global.addItemCooldown(player, item, (GLASS_DELAY * GLASS_REPETITIONS) / 2);
    player.swing();
    server.runCommandSilent(`playsound tanukidecor:block.lantern_clock.chime block @a ${player.x} ${player.y} ${player.z}`);
    for (let index = 0; index < GLASS_REPETITIONS; index++) {
      server.scheduleInTicks(GLASS_DELAY * index, () => {
        $GlassBlockPos.betweenClosed(area.from, area.to).forEach((pos) => {
          level.spawnParticles(glassParticle, true, pos.x + 0.5, pos.y + 0.5, pos.z + 0.5, 0, 0, 0, 0, 0.0001);
        });
      });
    }
    e.cancel();
  }
);
