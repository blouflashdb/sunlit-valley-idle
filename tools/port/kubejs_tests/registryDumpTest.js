// Temporary: dumps registry ids, recipe ids, loot tables, advancements, tags and mods for the Slice 14 data port.
const $DumpBuiltIn = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $DumpKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $DumpNeo = Java.loadClass("net.neoforged.neoforge.registries.NeoForgeRegistries");

ServerEvents.loaded((event) => {
  let server = event.server;
  if (server.persistentData.contains("registryDumpTest")) {
    console.info("[PORT-TEST] PASS registrydump");
    return;
  }
  server.persistentData.putBoolean("registryDumpTest", true);
  let out = (kind, id) => console.info(`[DUMP] ${kind} ${id}`);
  let safe = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.warn(`[DUMP] failed ${name}: ${e}`);
    }
  };
  safe("mods", () => Platform.getList().forEach((m) => out("mod", m)));
  let builtin = {
    item: $DumpBuiltIn.ITEM,
    block: $DumpBuiltIn.BLOCK,
    fluid: $DumpBuiltIn.FLUID,
    entity: $DumpBuiltIn.ENTITY_TYPE,
    recipe_type: $DumpBuiltIn.RECIPE_TYPE,
    recipe_serializer: $DumpBuiltIn.RECIPE_SERIALIZER,
    loot_function: $DumpBuiltIn.LOOT_FUNCTION_TYPE,
    loot_condition: $DumpBuiltIn.LOOT_CONDITION_TYPE,
    loot_pool_entry: $DumpBuiltIn.LOOT_POOL_ENTRY_TYPE,
    trigger: $DumpBuiltIn.TRIGGER_TYPES,
    component: $DumpBuiltIn.DATA_COMPONENT_TYPE,
    poi: $DumpBuiltIn.POINT_OF_INTEREST_TYPE,
    feature: $DumpBuiltIn.FEATURE,
    structure_processor: $DumpBuiltIn.STRUCTURE_PROCESSOR,
    structure_type: $DumpBuiltIn.STRUCTURE_TYPE,
    block_entity: $DumpBuiltIn.BLOCK_ENTITY_TYPE,
    potion: $DumpBuiltIn.POTION,
    mob_effect: $DumpBuiltIn.MOB_EFFECT,
    attribute: $DumpBuiltIn.ATTRIBUTE,
    villager_profession: $DumpBuiltIn.VILLAGER_PROFESSION,
    ingredient_type: $DumpNeo.INGREDIENT_TYPES,
    condition_codec: $DumpNeo.CONDITION_SERIALIZERS,
    glm_serializer: $DumpNeo.GLOBAL_LOOT_MODIFIER_SERIALIZERS,
    biome_modifier_serializer: $DumpNeo.BIOME_MODIFIER_SERIALIZERS,
    structure_modifier_serializer: $DumpNeo.STRUCTURE_MODIFIER_SERIALIZERS,
  };
  Object.keys(builtin).forEach((kind) => safe(kind, () => builtin[kind].keySet().forEach((id) => out(kind, id))));
  safe("item_tag", () => $DumpBuiltIn.ITEM.getTagNames().forEach((t) => out("item_tag", t.location())));
  safe("block_tag", () => $DumpBuiltIn.BLOCK.getTagNames().forEach((t) => out("block_tag", t.location())));
  safe("fluid_tag", () => $DumpBuiltIn.FLUID.getTagNames().forEach((t) => out("fluid_tag", t.location())));
  safe("entity_tag", () => $DumpBuiltIn.ENTITY_TYPE.getTagNames().forEach((t) => out("entity_tag", t.location())));
  let access = server.registryAccess();
  let dynamic = {
    biome: $DumpKeys.BIOME,
    configured_feature: $DumpKeys.CONFIGURED_FEATURE,
    placed_feature: $DumpKeys.PLACED_FEATURE,
    structure: $DumpKeys.STRUCTURE,
    structure_set: $DumpKeys.STRUCTURE_SET,
    template_pool: $DumpKeys.TEMPLATE_POOL,
    processor_list: $DumpKeys.PROCESSOR_LIST,
    enchantment: $DumpKeys.ENCHANTMENT,
    dimension_type: $DumpKeys.DIMENSION_TYPE,
    damage_type: $DumpKeys.DAMAGE_TYPE,
    biome_modifier: $DumpNeo.Keys.BIOME_MODIFIERS,
  };
  Object.keys(dynamic).forEach((kind) =>
    safe(kind, () => access.registryOrThrow(dynamic[kind]).keySet().forEach((id) => out(kind, id)))
  );
  safe("biome_tag", () => access.registryOrThrow($DumpKeys.BIOME).getTagNames().forEach((t) => out("biome_tag", t.location())));
  safe("recipe", () =>
    server.getRecipeManager().getRecipes().forEach((h) => out("recipe", `${h.id()} ${$DumpBuiltIn.RECIPE_TYPE.getKey(h.value().getType())}`))
  );
  safe("loot_table", () => server.reloadableRegistries().getKeys($DumpKeys.LOOT_TABLE).forEach((id) => out("loot_table", id)));
  safe("advancement", () => server.getAdvancements().getAllAdvancements().forEach((a) => out("advancement", a.id())));
  safe("template", () => server.getStructureManager().listTemplates().forEach((id) => out("template", id)));
  console.info("[PORT-TEST] PHASE1 registrydump");
});
