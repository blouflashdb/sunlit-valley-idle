# Porting KubeJS scripts to 1.21.1 (KubeJS 7)

Notes for the slices of epic #5. The pack runs KubeJS `2101.7.x` with Rhino `2101.2.x` on NeoForge 21.1.
Slice 3 (#8) set up the pattern with the Crystalarium; copy it for the other machines.

## Workflow

1. Move the script (or the part of it you port) from `kubejs/_unported/` to the same path under
   `kubejs/`. When only part of a file is ported, keep the same file name on both sides: the ported part
   lives in `kubejs/...`, the rest stays in `kubejs/_unported/...` with a note at the top. Example:
   `server_scripts/recipes/addMiscRecipes.js`.
2. Fix the API changes below.
3. Add a test to `tools/port/kubejs_tests/` if the feature has state (see "Testing").
4. Push. CI builds the mod, boots a dedicated server twice with the whole pack and fails on any line
   `[ERROR]` in `logs/kubejs/startup.log` or `logs/kubejs/server.log`, or on a failed KubeJS test.
   The logs are in the `server-logs` artifact (`logs/kubejs/*-boot1.log`, `*-boot2.log`).

The KubeJS and Rhino sources are the reference: `github.com/KubeJS-Mods/KubeJS` branch `2101` and
`github.com/KubeJS-Mods/Rhino` branch `main`. Both clone fine from the dev container; maven.latvian.dev
and the CurseForge CDN do not, so anything that needs a mod jar runs in GitHub Actions.

## Datapack folders

1.21 uses singular folder names. All of `kubejs/_unported/data` is already renamed, so ported data files
can be moved as they are:

| 1.20.1 | 1.21.1 |
| --- | --- |
| `recipes` | `recipe` |
| `loot_tables` | `loot_table` |
| `advancements` | `advancement` |
| `structures` | `structure` |
| `tags/items`, `tags/blocks`, `tags/entity_types` | `tags/item`, `tags/block`, `tags/entity_type` |

Not renamed yet and still to check per file: `forge:` tags are `c:` tags on NeoForge 1.21
(`forge:ingots/iron` -> `c:ingots/iron`), and recipe JSON changed (`"result": {"item": ...}` ->
`"result": {"id": ...}`, ingredients and counts).

## Block entity data (NBT -> data)

On 1.20.1 the scripts did `let nbt = block.getEntityData(); nbt.data.stage; nbt.merge({data: {...}});
global.setBlockEntityData(block, nbt)`. Do not port that pattern:

- A `CompoundTag` in KubeJS 7 JavaScript is a map of `Tag` objects. `nbt.data.stage` is an `IntTag` and
  `nbt.data.recipe` a `StringTag`, so `=== ""`, `=== 5` and `recipes.get(nbt.data.recipe)` are silently
  false or undefined. `==` happens to work for some cases, which makes bugs hard to see.
- `getEntityData()` is a full save of the block entity and `setEntityData()` a full load; it is slow and
  loses changes made in between.

Use the helpers from `startup_scripts/globalBlockEntityHandlers.js`. They work on the live
`KubeBlockEntity.data` tag, return plain JavaScript values and mark the block entity changed:

```js
global.getMachineString(block, "recipe"); // "" when missing
global.getMachineInt(block, "stage"); // 0 when missing
global.hasMachineValue(block, "quality");
global.setMachineData(block, { stage: 0, recipe: "minecraft:diamond" });
global.getMachineInputs(block); // originalInputs, now an array of item strings stored as JSON
global.isBlockPropertyTrue(block, "mature"); // instead of block.properties.get("mature") === "true"
```

`blockInfo.initialData({ stage: 0, recipe: "" })` still works.

## Ticking

`blockInfo.serverTick(rate, offset, fn)` is gone. Enable ticking on the block entity and handle the
`BlockEvents.blockEntityTick` event (a common event, so the handler can sit in the same startup script):

```js
.blockEntity((blockInfo) => {
  blockInfo.initialData({ stage: 0, recipe: "" });
  blockInfo.serverTicking();
  blockInfo.tickFrequency(artMachineTickRate);
});

global.registerMachineTick("society:crystalarium", (event) => {
  global.handleBETick(event, global.crystalariumCrystals, 5); // event has .level and .block
});
```

## Models and blockstates

KubeJS 7 has no `modelJson` or `blockstateJson` setters.

- Block or item model with a parent: `.parentModel("society:block/kubejs/crystalarium/crystalarium")`
  on the block builder and on the item builder inside `.item(...)`.
- A full custom model (the old inline `modelJson({...})`): save it as a static file under
  `kubejs/assets/<namespace>/models/...`. Files in `kubejs/assets` override what KubeJS generates.
- Multipart machine blockstates: add the machine name to `multipartMachines` in
  `client_scripts/machineBlockstates.js`; it writes `global.getCardinalMultipartJson(name)` through
  `ClientEvents.generateAssets("after_mods", ...)`, which overrides KubeJS' own blockstate.

**Textures:** all `society:*` models and textures came from the Society Tweaks jar (license ARR), which
has no 1.21.1 build. Until the texture slice (#22) adds placeholder models, society blocks and items render as
missing textures. That does not affect the server or the CI tests.

## Items

- Food: `food.hunger(n)` -> `food.nutrition(n)` (an int), `food.fastToEat(true)` -> `food.fastToEat()`,
  `food.meat()` is gone (use the `minecraft:meat` item tag if a mod needs it). `saturation()` is still
  the modifier.
- `Item.of(id, "{quality_food:{quality:2}}")` style NBT strings are gone; 1.21 items use data components.
  Quality Food stores the quality in a component. `global.getItemQuality(item)` and
  `global.withItemQuality(item, quality)` are stubs (base quality) until the slice that ports the cheese
  press, mayonnaise machine, fish smoker or seed maker fills them in.
- Strings still have `.namespace` and `.path` (`"society:opal".path === "opal"`).

## Events and objects

- Compare enums as strings: `String(hand) === "MAIN_HAND"`, not `hand == "MAIN_HAND"`.
- Compare items by id: `String(item.id) === "society:black_opal"`, not `item == "society:black_opal"`.
- `player.isFake()`, `level.spawnParticles(...)`, `block.popItemFromFace(...)`, `block.set(id, props)`,
  `server.runCommandSilent(...)` are unchanged.
- `Java.loadClass` of a class from a dropped mod throws while the script loads and takes the whole file
  down. Check `tools/port/mods-1.21.1.json` before porting such a call (for example
  `cool.bot.dewdropfarmland` from Dew Drop Farmland, which is being rebuilt in sunlitidle).

## Testing

`tools/port/kubejs_tests/<name>Test.js` scripts are copied into `kubejs/server_scripts/_ci/` by
`tools/port/server_boot_test.py` (`--kubejs-tests`), which then boots the server twice. A test runs on
`ServerEvents.loaded`, does its first phase on boot 1 and prints `[PORT-TEST] PHASE1 <name>`, checks the
saved state on boot 2 and prints `[PORT-TEST] PASS <name>`, or `[PORT-TEST] FAIL <name>: why` at any
point. `crystalariumTest.js` is the template: it places a machine high above spawn, calls the same
global handlers a player click or a morning tick would, and checks the result after the restart.

## Effort

The Crystalarium slice ported about 5,000 lines of shared scripts (mostly data tables and item registration) plus one 160-line machine. The
mechanical part (moving files, food API, string comparisons) was quick; the time went into finding the
API changes. With the helpers and this guide, a typical artisan machine should be an hour or two
including a test. The 1.20.1 code has about 40 files that read or write block entity data and 275
block entity uses, so the 3-6 week estimate for KubeJS in #5 still holds; the textures are the bigger
open risk and are tracked separately.
