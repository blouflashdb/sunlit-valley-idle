// Multipart blockstates of the artisan machines. KubeJS 7 removed the `blockstateJson` setter, so the
// blockstate files are generated here; the after_mods pack overrides the blockstate KubeJS builds itself.
console.info("[SOCIETY] machineBlockstates.js loaded");

const multipartMachines = ["crystalarium", "preserves_jar", "wine_keg", "aging_cask", "ancient_cask", "bait_maker", "cheese_press", "dehydrator", "fish_smoker", "loom", "mayonnaise_machine", "oil_maker", "recycling_machine", "seed_maker", "tapper", "mushroom_log", "espresso_machine", "charging_rod", "deluxe_worm_farm"];
// Machines whose done state shows no exclamation mark (getCardinalMultipartJson's disableExclamation).
const noExclamationMachines = ["fish_smoker"];

ClientEvents.generateAssets("after_mods", (event) => {
  // Feeding Trough: Farm & Charm's trough models by fill level.
  const troughFacings = { north: 0, east: 90, south: 180, west: 270 };
  const troughVariants = {};
  Object.keys(troughFacings).forEach((facing) => {
    for (let fill = 0; fill <= 4; fill++) {
      troughVariants[`facing=${facing},fill=${fill}`] = { model: `farm_and_charm:block/feeding_trough_size_${fill}`, y: troughFacings[facing] };
    }
  });
  event.json("society:blockstates/feeding_trough", { variants: troughVariants });

  // Fish Pond (#12): pond by facing and upgrade, with the harvest, quest and invalid marks on top.
  const pondFacings = { north: 0, east: 90, south: 180, west: -90 };
  const pondParts = [{ apply: { model: "society:block/kubejs/fish_pond/fish_pond_particle" } }];
  [false, true].forEach((upgraded) => {
    Object.keys(pondFacings).forEach((facing) => {
      pondParts.push({
        when: { facing: facing, upgraded: upgraded },
        apply: { model: `society:block/kubejs/fish_pond/fish_pond${upgraded ? "_upgraded" : ""}`, y: pondFacings[facing] },
      });
    });
  });
  pondParts.push({ when: { mature: true }, apply: { model: "society:block/kubejs/machine_done" } });
  pondParts.push({ when: { quest: true, mature: false }, apply: { model: "society:block/kubejs/fish_pond/pond_quest" } });
  pondParts.push({ when: { valid: false }, apply: { model: "society:block/kubejs/fish_pond/pond_error" } });
  event.json("society:blockstates/fish_pond", { multipart: pondParts });

  // Fish Pond Basket and Hatchery: a gold top when upgraded with a bucket.
  ["fish_pond_basket", "fish_pond_hatchery"].forEach((name) => {
    event.json(`society:blockstates/${name}`, {
      multipart: [
        { when: { upgraded: false }, apply: { model: `society:block/kubejs/${name}/${name}` } },
        { when: { upgraded: true }, apply: { model: `society:block/kubejs/${name}/${name}_upgraded` } },
      ],
    });
  });

  // Sparkstone Recycler (#14): lit while its mana pool can pay for a recycle.
  event.json("society:blockstates/sparkstone_recycler", {
    variants: {
      "powered=false": { model: "society:block/kubejs/sparkstone_recycler/sparkstone_recycler" },
      "powered=true": { model: "society:block/kubejs/sparkstone_recycler/sparkstone_recycler_on" },
    },
  });

  multipartMachines.forEach((name) => {
    event.json(`society:blockstates/${name}`, {
      multipart: global.getCardinalMultipartJson(name, noExclamationMachines.includes(name)),
    });
  });
});
