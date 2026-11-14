#!/usr/bin/env python3
"""Ports the pack's data overrides of the food mods (Let's Do, Farmer's Delight and its addons, Nether Depths Upgrade,
Create Central Kitchen) from kubejs/_unported/data to kubejs/data for 1.21.1. Slice 14, scope "food".

Structures, worldgen, worldgen tags and biome modifiers of these namespaces belong to the worldgen scope and are not
touched here. Everything else (recipes, loot tables, loot modifiers, tags, advancements) is handled per file:

  - An override only replaces the mod's file with the same path. Overrides that were identical to the 1.20.1 mod's
    own file are no-ops and are not ported (UNCHANGED). Overrides whose 1.21.1 file moved are written to the new
    path (MOVED); overrides whose target or recipe type is gone are not ported (DROPPED, with the reason).
  - "Disable" overrides ({"forge:conditions": [{"type": "forge:false"}]}) become neoforge:false at the same path, but
    only where the 1.21.1 mod still has that file (else they are listed in DROPPED).
  - Recipes are rewritten to the 1.21.1 format of their type (compared with the 1.21.1 mod jars): item results become
    {"id", "count"}; Let's Do stove/roaster need "requiresLearning" and "experience"; the herbal brews kettle has
    fluid_amount/heat_amount/effect/effect_duration at top level; meadow cheese results are stacks, the cooking pot
    container is an item id; brewery results are {"id"}; Farmer's Delight cutting results are {"item": stack, "chance"};
    beachparty's tiki bar became the palm bar (beachparty:palm_bar_mixing); Create fluid ingredients become
    {"type": "fluid_stack" | "fluid_tag", ...} and Create keys are snake_case; "forge:conditional" becomes the first
    recipe with its conditions.
  - forge tags become c tags (TAGS for renamed ones); "conditions"/"forge:conditions" become "neoforge:conditions".
  - Loot tables: forge:loot_table_id -> neoforge:loot_table_id, set_nbt -> set_custom_data, looting_enchant ->
    enchanted_count_increase, match_tool/location_check predicates in the 1.21 shape.
  - Advancements: icon {"item"} -> {"id"}, item predicates with tags -> "#tag".
  - Items, tags and fluids that are not registered on 1.21.1 are replaced (ITEMS) or removed (GONE_ITEMS,
    GONE_TAGS): an ingredient loses that option, a loot table loses that entry, a tag loses that value; a recipe whose
    result or a whole ingredient is gone is not ported (printed as "skipped").

Also writes tools/port/kubejs_tests/foodPortData.js for portedDataTest.js (recipes, loot tables, advancements, item
tags and items that must load on the CI server).

Run from the repository root: python3 tools/port/port_food_data.py
"""
import copy
import json
import pathlib
import re
import shutil

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/foodPortData.js")
NAMESPACES = (
    "bakery", "beachparty", "brewery", "candlelight", "farm_and_charm", "herbalbrews", "meadow", "vinery",
    "wildernature", "furniture", "farmersdelight", "crabbersdelight", "veggiesdelight", "vintagedelight",
    "netherdepthsupgrade", "nethervinery", "displaydelight", "create_central_kitchen",
)
# Folders this script writes in each namespace (the worldgen scope owns structure/, worldgen/, tags/worldgen/ and
# neoforge/biome_modifier/).
OWN_FOLDERS = ("recipe", "loot_table", "loot_modifiers", "advancement", "tags/item", "tags/block")
WORLDGEN = re.compile(r"^[^/]+/(structure|worldgen|tags/worldgen|forge/biome_modifier)/")
DROPPED_NAMESPACES = {"nethervinery": "Nether Vinery is not in the 1.21.1 pack"}

# --- Filled from the 1.20.1 and 1.21.1 mod jars -------------------------------------------------------------------
# Overrides that are identical to the 1.20.1 mod's own file: nothing to port.
UNCHANGED = {
    "bakery/advancement/recipes/baking_station.json",
    "bakery/advancement/recipes/bread_basket.json",
    "bakery/advancement/recipes/bread_box.json",
    "bakery/advancement/recipes/bread_crate.json",
    "bakery/advancement/recipes/bread_knife.json",
    "bakery/advancement/recipes/brick_counter.json",
    "bakery/advancement/recipes/butter.json",
    "bakery/advancement/recipes/cabinet.json",
    "bakery/advancement/recipes/cake_display.json",
    "bakery/advancement/recipes/cake_dough.json",
    "bakery/advancement/recipes/cake_stand.json",
    "bakery/advancement/recipes/chocolate_box.json",
    "bakery/advancement/recipes/cobblestone_stove.json",
    "bakery/advancement/recipes/cupcake_display.json",
    "bakery/advancement/recipes/deepslate_stove.json",
    "bakery/advancement/recipes/dough.json",
    "bakery/advancement/recipes/drawer.json",
    "bakery/advancement/recipes/end_bricks_stove.json",
    "bakery/advancement/recipes/faucet.json",
    "bakery/advancement/recipes/granite_stove.json",
    "bakery/advancement/recipes/iron_chair.json",
    "bakery/advancement/recipes/iron_table.json",
    "bakery/advancement/recipes/jar.json",
    "bakery/advancement/recipes/kitchen_sink.json",
    "bakery/advancement/recipes/mud_bricks_stove.json",
    "bakery/advancement/recipes/quartz_stove.json",
    "bakery/advancement/recipes/red_nether_bricks_stove.json",
    "bakery/advancement/recipes/rolling_pin.json",
    "bakery/advancement/recipes/sandstone_stove.json",
    "bakery/advancement/recipes/sandwich.json",
    "bakery/advancement/recipes/small_cooking_pot.json",
    "bakery/advancement/recipes/stone_bricks_stove.json",
    "bakery/advancement/recipes/strawberry_chocolate.json",
    "bakery/advancement/recipes/street_sign.json",
    "bakery/advancement/recipes/sweet_dough.json",
    "bakery/advancement/recipes/tray.json",
    "bakery/advancement/recipes/vegetable_sandwich.json",
    "bakery/advancement/recipes/wall_cabinet.json",
    "brewery/recipe/brewing/dark_brew.json",
    "farmersdelight/loot_table/chests/fd_bastion_hoglin_stable.json",
    "farmersdelight/loot_table/chests/fd_bastion_treasure.json",
    "farmersdelight/loot_table/chests/fd_ruined_portal.json",
    "farmersdelight/loot_table/chests/fd_village_butcher.json",
    "farmersdelight/loot_table/chests/fd_village_desert_house.json",
    "herbalbrews/recipe/kettle_brewing/lavender_tea.json",
    "herbalbrews/recipe/kettle_brewing/milk_coffee.json",
    "herbalbrews/recipe/kettle_brewing/oolong_tea.json",
    "veggiesdelight/loot_modifiers/add_loot_village_desert_house.json",
    "veggiesdelight/loot_modifiers/add_loot_village_plains_house.json",
    "veggiesdelight/loot_modifiers/add_loot_village_savanna_house.json",
    "veggiesdelight/loot_modifiers/add_loot_village_snowy_house.json",
    "veggiesdelight/loot_modifiers/add_loot_village_taiga_house.json",
    "veggiesdelight/loot_table/chests/vd_wagon_desert.json",
    "vinery/recipe/apple_mashing/honey_comb.json",
}
# Overrides whose recipe/loot table has another path in the 1.21.1 mod.
MOVED = {
    # Crabber's Delight 1.21 names the crab trap loot tables after the bait item's path only.
    **{
        f"crabbersdelight/loot_table/gameplay/crab_trap_loot/{ns}/{name}.json":
        f"crabbersdelight/loot_table/gameplay/crab_trap_loot/{name}.json"
        for ns, name in (
            ("crabbersdelight", "crab_trap_bait"), ("crabbersdelight", "deluxe_crab_trap_bait"),
            ("crabbersdelight", "mana_crab_trap_bait"), ("minecraft", "air"), ("minecraft", "cod"),
            ("minecraft", "pufferfish"), ("minecraft", "salmon"), ("minecraft", "tropical_fish"),
        )
    },
    "crabbersdelight/recipe/frog_leg_kebob.json": "crabbersdelight/recipe/frog_leg_kebab.json",
    "crabbersdelight/recipe/squid_kebob.json": "crabbersdelight/recipe/squid_kebab.json",
    # Crabber's Delight cooking pot recipes moved from the farmersdelight namespace to its own.
    **{
        f"farmersdelight/recipe/cooking/{name}.json": f"crabbersdelight/recipe/cooking/{name}.json"
        for name in ("bisque", "clam_bake", "clam_chowder", "crab_cakes", "seafood_gumbo", "shrimp_fried_rice")
    },
    # The salad is a cutting board assembly on 1.21 (TYPE_CHANGES).
    "farm_and_charm/recipe/crafting_bowl/tomato_mozzarella_salad.json":
        "farm_and_charm/recipe/cutting_board_assembly/tomato_mozzarella_salad.json",
    # Meadow 1.21 names the cheese form recipes after the cheese wheels.
    **{
        f"meadow/recipe/cheese_form/{name}_cheese.json": f"meadow/recipe/cheese_form/{name}_cheese_wheel.json"
        for name in ("amethyst", "buffalo", "goat", "grain", "sheep", "warped")
    },
    "meadow/recipe/cheese_form/cheese.json": "meadow/recipe/cheese_form/cheese_wheel.json",
    "veggiesdelight/recipe/cauliflower_floret.json": "veggiesdelight/recipe/cauliflower_florets.json",
    "veggiesdelight/recipe/sweet_potato_cupcake.json": "veggiesdelight/recipe/sweet_potato_cupcakes.json",
    "veggiesdelight/recipe/cooking/roasted_vegetables.json": "veggiesdelight/recipe/cooking/roasted_veggies.json",
    "veggiesdelight/recipe/garlic_clove.json": "veggiesdelight/recipe/cloves_from_garlic.json",
    # The tiki bar became the palm bar; the two cocktails replace the palm bar recipes of the same name.
    **{
        f"beachparty/recipe/tiki_bar_mixing/{name}.json": f"beachparty/recipe/palm_bar_mixing/{name}.json"
        for name in (
            "chocolate_milkshake", "coconut_milkshake", "honey_cocktail", "refreshing_drink",
            "sweetberries_cocktail", "sweetberry_milkshake",
        )
    },
    "beachparty/recipe/mini_fridge_mixing/sweetberry_icecream.json":
        "beachparty/recipe/mini_fridge_freezing/sweetberry_icecream.json",
}
# Recipes whose type changed on 1.21 (convert_recipe moves the fields).
TYPE_CHANGES = {
    "farm_and_charm/recipe/crafting_bowl/tomato_mozzarella_salad.json": "farm_and_charm:cutting_board_assembly",
}
# Files that are not ported, with the reason.
NO_FILE = "the 1.21.1 mod has no file at this path or elsewhere to disable"
DROPPED = {
    **{
        f"wildernature/loot_table/bountyboard/{name}.json":
        "Wildernature 1.21 replaced bounty board contracts with guild commissions; the contract reward tables are gone"
        for name in (
            "tier1_contract_boar", "tier1_contract_cod", "tier1_contract_deer_with_bow",
            "tier1_contract_deer_with_bow_small", "tier1_contract_hat", "tier1_contract_owl", "tier1_contract_red_wolf",
            "tier1_contract_turkey", "tier2_contract_bison", "tier2_contract_cod_with_blunderbuss",
            "tier2_contract_cod_with_blunderbuss_from_boat", "tier2_contract_deer_with_bow",
            "tier2_contract_deer_with_bow_small", "tier2_contract_elder_guardian", "tier2_contract_pelican",
            "tier2_contract_pelican_small", "tier2_contract_raccoon", "tier2_contract_red_wolf",
            "tier2_contract_red_wolf_with_bow", "tier2_contract_red_wolf_with_bow_small", "tier2_contract_squirrel",
            "tier2_contract_turkey", "tier2_contract_turkey_with_bow", "tier3_contract_bison", "tier3_contract_cod",
            "tier3_contract_deer_with_bow", "tier3_contract_rabbit", "tier3_contract_red_wolf_with_blunderbuss",
            "tier3_contract_red_wolf_with_blunderbuss_master", "tier3_contract_red_wolf_with_bow_masterclass",
            "tier3_contract_turkey", "tier3_contract_turkey_with_blunderbuss",
        )
    },
    # Vintage Delight is rebuilt in KubeJS: it has no loot modifiers, chest loot tables or advancements of its own.
    **{
        f"vintagedelight/loot_modifiers/{name}.json": "Vintage Delight (KubeJS rebuild) has no loot modifiers to override"
        for name in (
            "add_loot_bastion_hoglin_stable", "add_loot_ruined_portal", "add_loot_village_desert_house",
            "add_loot_village_plains_house", "add_loot_village_savanna_house", "add_loot_village_snowy_house",
            "add_loot_village_taiga_house", "straw_from_mature_oat",
        )
    },
    **{
        f"vintagedelight/loot_table/chests/{name}.json":
        "only Vintage Delight's own loot modifiers used this table; the KubeJS rebuild has none"
        for name in (
            "mixed_seeds", "vd_bastion_hoglin_stable", "vd_ruined_portal", "vd_village_desert_house",
            "vd_village_plains_house", "vd_village_savanna_house", "vd_village_snowy_house", "vd_village_taiga_house",
        )
    },
    "vintagedelight/advancement/main/root.json": "Vintage Delight (KubeJS rebuild) has no advancements to disable",
    **{
        f"veggiesdelight/recipe/compat/vintagedelight/cooking/{name}.json":
        "Veggie's Delight 1.21 has no Vintage Delight compat recipes to disable"
        for name in (
            "broccoli_soup", "cacciatore", "cauliflower_kuku", "cauliflower_soup", "garlic_chicken_stew",
            "ghostly_chili", "mashed_potatoes", "pasta_with_broccoli", "pickle_soup", "potato_noodles",
            "roasted_veggies", "shakshouka",
        )
    },
    "farm_and_charm/recipe/mincer/raw_copper_from_copper_ingot.json":
        "the override only defused the copper ingot -> raw copper mincer recipe, which Farm & Charm 1.21 no longer has",
    **{
        f"vinery/recipe/wine_fermentation/{name}.json": "makes a Nether Vinery wine; Nether Vinery is not in the pack"
        for name in ("blazevine_pinot", "ghastly_grenache", "lava_fizz", "nether_fizz")
    },
    "crabbersdelight/loot_table/gameplay/fishing/fishing.json":
        "Crabber's Delight 1.21 has no extra fishing loot table (fishing bait loot replaced it)",
    "bakery/recipe/create/mixing/cake_dough.json": NO_FILE,
    "bakery/recipe/create/mixing/sweet_dough.json": NO_FILE,
    **{
        f"meadow/recipe/create/compacting/{name}_block.json": NO_FILE
        for name in (
            "amethyst_cheese", "buffalo_cheese", "cheese", "goat_cheese", "grain_cheese", "sheep_cheese",
            "warped_cheese",
        )
    },
    **{
        f"beachparty/loot_table/chests/village/{name}.json": NO_FILE
        for name in ("village_cartographer", "village_plains_house", "village_savanna_house")
    },
}
# Values for fields that 1.21.1 requires and the pack's 1.20.1 file does not have, per file.
EXTRA_FIELDS = {}

# --- Ids -----------------------------------------------------------------------------------------------------------
# forge tags whose c tag has another name; every other forge:x becomes c:x.
TAGS = {
    "forge:chests": "c:chests",
    "forge:eggs": "c:eggs",
    "forge:ender_pearls": "c:ender_pearls",
    "forge:glass": "c:glass_blocks",
    "forge:netherrack": "c:netherracks",
    "forge:rope": "c:ropes",
    "forge:slimeballs": "c:slime_balls",
    "forge:stone": "c:stones",
    "letsdo_addon_compat:tools/knives": "c:tools/knife",
    "forge:shears": "c:tools/shear",
    "forge:cooked_eggs": "c:foods/cooked_egg",
    "forge:cooked_fishes/cod": "c:foods/cooked_cod",
    "forge:salad_ingredients": "c:foods/leafy_green",
    # Let's Do tags that are gone on 1.21: the c tag they used to include.
    "candlelight:butter": "c:butter",
    "farm_and_charm:strawberries": "c:crops/strawberry",
    "meadow:egg": "c:eggs",
    "meadow:water_bottles": "c:water_bottles",
    "meadow:wheat": "c:crops/wheat",
}
MEADOW_CHEESES = ("", "amethyst_", "buffalo_", "goat_", "grain_", "sheep_", "warped_")
# Items (and fluids) renamed on 1.21.1.
ITEMS = {
    **{f"meadow:{x}cheese_block": f"meadow:{x}cheese_wheel" for x in MEADOW_CHEESES},
    **{f"meadow:piece_of_{x}cheese": f"meadow:{x}cheese_slice" for x in MEADOW_CHEESES},
    "meadow:roasted_ham": "meadow:roasted_buffalo_ham",
    "meadow:climbing_rope_topmount": "meadow:climbing_rope",
    "crabbersdelight:frog_leg_kebob": "crabbersdelight:frog_leg_kebab",
    "crabbersdelight:squid_kebob": "crabbersdelight:squid_kebab",
    "farm_and_charm:strawberry_seed": "farm_and_charm:strawberry_seeds",
    # Let's Do moved the dough and yeast from Bakery to Farm & Charm.
    "bakery:dough": "farm_and_charm:dough",
    "bakery:yeast": "farm_and_charm:yeast",
    "species:wraptor_egg": "minecraft:sniffer_egg",  # Species is gone; another rare ancient egg
}
# Items, tags and fluids that are not registered on 1.21.1.
NETHER_FISH = ("blazefish", "glowdine", "lava_pufferfish", "magmacubefish", "obsidianfish", "searing_cod", "soulsucker")
GONE_ITEMS = {
    "automobility:crowbar", "constructionwand:stone_wand", "constructionwand:iron_wand",
    "constructionwand:diamond_wand", "constructionwand:infinity_wand",
    "farmlife:tribull_cheese_wheel", "farmlife:tribull_cheese_wedge",
    "beachparty:chocolate_icecream", "beachparty:chocolate_milkshake", "beachparty:coconut_icecream",
    "beachparty:coconut_milkshake", "beachparty:sweetberry_icecream", "beachparty:sweetberry_milkshake",
    "beachparty:refreshing_drink", "beachparty:floaty", "beachparty:hammock", "beachparty:cabinet",
    "candlelight:khinkali", "meadow:fire_log",
    "veggiesdelight:cauliflower_burger", "veggiesdelight:cooked_cauliflower_patty",
    *(f"netherdepthsupgrade:{fish}_slice" for fish in NETHER_FISH),
    *(f"netherdepthsupgrade:baked_{fish}_stew" for fish in NETHER_FISH),
}
GONE_TAGS = set()

# Recipe types renamed on 1.21.1, with keys the new type needs.
RECIPE_TYPES = {
    "beachparty:tiki_bar_mixing": "beachparty:palm_bar_mixing",
    "beachparty:mini_fridge_mixing": "beachparty:mini_fridge_freezing",
}
CREATE_KEYS = {
    "acceptMirrored": "accept_mirrored",
    "heatRequirement": "heat_requirement",
    "keepHeldItem": "keep_held_item",
    "processingTime": "processing_time",
    "transitionalItem": "transitional_item",
}


class Gone(Exception):
    """The file cannot work on 1.21.1 (a result or a whole ingredient is not registered)."""


def tag_id(name):
    name = TAGS.get(name, name)
    return "c:" + name[len("forge:"):] if name.startswith("forge:") else name


def item_id(name):
    return ITEMS.get(name, name)


def condition(c):
    c = dict(c)
    c["type"] = c["type"].replace("forge:", "neoforge:")
    if c["type"] == "neoforge:and":
        values = [condition(v) for v in c["values"]]
        return values[0] if len(values) == 1 else {"type": "neoforge:and", "values": values}
    if "values" in c:
        c["values"] = [condition(v) for v in c["values"]]
    if "value" in c:
        c["value"] = condition(c["value"])
    return c


def pop_conditions(data):
    conditions = data.pop("forge:conditions", None) or data.pop("conditions", None)
    return [condition(c) for c in conditions] if conditions else None


def is_disable(data):
    conditions = data.get("forge:conditions") or data.get("conditions") or []
    return isinstance(data, dict) and any(c.get("type") == "forge:false" for c in conditions if isinstance(c, dict))


# --- Recipes -------------------------------------------------------------------------------------------------------
def ingredient(value):
    """A vanilla ingredient: {"item"}, {"tag"} or a list of them. Raises Gone when nothing is left."""
    if isinstance(value, list):
        out = []
        for v in value:
            try:
                out.append(ingredient(v))
            except Gone:
                pass
        if not out:
            raise Gone(json.dumps(value))
        return out[0] if len(out) == 1 else out
    if not isinstance(value, dict):
        return value
    if "fluid" in value or "fluidTag" in value:
        return create_fluid(value)
    value = dict(value)
    if "item" in value:
        value["item"] = item_id(value["item"])
        if value["item"] in GONE_ITEMS:
            raise Gone(value["item"])
    if "tag" in value:
        value["tag"] = tag_id(value["tag"])
        if value["tag"] in GONE_TAGS:
            raise Gone("#" + value["tag"])
    return value


def create_fluid(value):
    if "fluidTag" in value:
        out = {"type": "fluid_tag", "fluid_tag": tag_id(value["fluidTag"]), "amount": value["amount"]}
        if out["fluid_tag"] in GONE_TAGS:
            raise Gone("#" + out["fluid_tag"])
        return out
    fluid = item_id(value["fluid"])
    if fluid in GONE_ITEMS:
        raise Gone(fluid)
    return {"type": "fluid_stack", "fluid": fluid, "amount": value["amount"]}


def stack(value, count_key=True):
    """An item result: "id", {"item"} or {"id"} -> {"id", "count"}. Raises Gone when the item is not registered."""
    if isinstance(value, str):
        value = {"item": value}
    if "fluid" in value:
        fluid = item_id(value["fluid"])
        if fluid in GONE_ITEMS:
            raise Gone(fluid)
        return {"id": fluid, "amount": value["amount"]}
    out = {"id": item_id(value.get("item") or value.get("id"))}
    if out["id"] in GONE_ITEMS:
        raise Gone(out["id"])
    if count_key or value.get("count", 1) != 1:
        out["count"] = value.get("count", 1)
    if "nbt" in value:
        nbt = value["nbt"]
        out["components"] = {"minecraft:custom_data": json.loads(nbt) if isinstance(nbt, str) else nbt}
    return out


def ingredients(values):
    return [ingredient(v) for v in values]


def convert_recipe(data, rel):
    if data.get("type") == "forge:conditional":
        first = data["recipes"][0]
        recipe = convert_recipe(first["recipe"], rel)
        return {"neoforge:conditions": [condition(c) for c in first["conditions"]], **recipe}
    data = copy.deepcopy(data)
    conditions = pop_conditions(data)
    kind = RECIPE_TYPES.get(data["type"], data["type"])
    data["type"] = kind
    if not kind.startswith("minecraft:"):
        data.pop("category", None)
    # Results.
    if kind in ("farm_and_charm:stove", "veggiesdelight:stove") or ("item" in data and "result" not in data):
        if "item" in data:
            data["result"] = {"item": data.pop("item"), "count": data.pop("count", 1)}
    if kind == "farmersdelight:cutting":
        data["result"] = [cutting_result(r) for r in data["result"]]
        data["tool"] = ingredient(data["tool"])
    elif kind == "herbalbrews:kettle_brewing":
        result = data["result"]
        data["fluid_amount"] = data.pop("fluid", [{"amount": 0}])[0]["amount"] if "fluid" in data else data.get("fluid_amount", 0)
        data["heat_amount"] = data.pop("heat_needed", [{"amount": 0}])[0]["amount"] if "heat_needed" in data else data.get("heat_amount", 0)
        if "effect" in result:
            data["effect"] = result["effect"]
            data["effect_duration"] = result.get("effectduration", 1800)
        data["result"] = stack({"item": result.get("item") or result.get("id")}, count_key=False)
    elif kind in ("create:mixing", "create:compacting"):
        data["results"] = [stack(r) for r in data["results"]]
    elif kind == "brewery:brewing":
        data["result"] = stack(data["result"], count_key=False)
    elif kind in ("vinery:apple_fermenting", "vinery:apple_mashing"):
        data["output"] = stack(data["output"])
    elif "result" in data:
        data["result"] = stack(data["result"])
    # Ingredients.
    for key in ("ingredients",):
        if key in data:
            data[key] = ingredients(data[key])
    for key in ("ingredient", "input", "bucket"):
        if key in data:
            data[key] = ingredient(data[key])
    if "key" in data:
        data["key"] = {k: ingredient(v) for k, v in data["key"].items()}
    # Type specific fields.
    if kind == "farmersdelight:cooking" and "container" in data:
        data["container"] = stack(data["container"])
    if kind == "meadow:cooking" and "container" in data:
        container = data["container"]
        data["container"] = item_id(container["item"] if isinstance(container, dict) else container)
        if data["container"] in GONE_ITEMS:
            raise Gone(data["container"])
    if kind == "farm_and_charm:roaster" and "container" in data:
        data["container"] = stack(data["container"])
    if kind in ("farm_and_charm:stove", "farm_and_charm:roaster"):
        data.setdefault("requiresLearning", False)
        data.setdefault("experience", 0.0)
    if kind == "beachparty:mini_fridge_freezing":
        data.setdefault("crafting_time", 1200)
    if TYPE_CHANGES.get(rel) == "farm_and_charm:cutting_board_assembly":
        # The bowl was the last crafting bowl ingredient; on the cutting board it is the finisher.
        data["type"] = TYPE_CHANGES[rel]
        data["finisher"] = data["ingredients"].pop()
        data.pop("experience", None)
    if kind.startswith("create:"):
        data = {CREATE_KEYS.get(k, k): v for k, v in data.items()}
    data.update(EXTRA_FIELDS.get(rel, {}))
    if conditions:
        data = {"neoforge:conditions": conditions, **data}
    return data


def cutting_result(value):
    out = {"item": stack(value)}
    if "chance" in value:
        out["chance"] = value["chance"]
    return out


# --- Loot tables and loot modifiers --------------------------------------------------------------------------------
def loot(value):
    """Rewrites a loot table, loot modifier or one of their parts. Entries with gone items are removed."""
    if isinstance(value, list):
        out = []
        for v in value:
            try:
                out.append(loot(v))
            except Gone:
                pass
        return out
    if not isinstance(value, dict):
        return value
    value = dict(value)
    if value.get("type") == "minecraft:item" and "name" in value:
        value["name"] = item_id(value["name"])
        if value["name"] in GONE_ITEMS:
            raise Gone(value["name"])
    if value.get("type") == "minecraft:tag" and "name" in value:
        value["name"] = tag_id(value["name"])
        if value["name"] in GONE_TAGS:
            raise Gone(value["name"])
    if value.get("type") == "minecraft:loot_table" and "name" in value:
        value["value"] = value.pop("name")
    function = value.get("function")
    if function == "minecraft:set_nbt":
        value["function"] = "minecraft:set_custom_data"
    elif function == "minecraft:looting_enchant":
        value["function"] = "minecraft:enchanted_count_increase"
        value["enchantment"] = "minecraft:looting"
    elif function == "minecraft:set_contents":
        value.setdefault("component", "minecraft:container")
    elif function == "minecraft:enchant_randomly" and "enchantments" in value:
        value["options"] = value.pop("enchantments")
    cond = value.get("condition")
    if cond == "forge:loot_table_id":
        value["condition"] = "neoforge:loot_table_id"
    elif cond == "minecraft:random_chance_with_looting":
        value["condition"] = "minecraft:random_chance_with_enchanted_bonus"
    elif cond == "minecraft:match_tool" and "predicate" in value:
        value["predicate"] = item_predicate(value["predicate"])
    elif cond == "minecraft:location_check" and "predicate" in value:
        predicate = dict(value["predicate"])
        if "biome" in predicate:
            predicate["biomes"] = predicate.pop("biome")
        if "structure" in predicate:
            predicate["structures"] = predicate.pop("structure")
        value["predicate"] = predicate
    if "item" in value and isinstance(value["item"], str) and "type" in value and "add_item" in value["type"]:
        value["item"] = item_id(value["item"])
        if value["item"] in GONE_ITEMS:
            raise Gone(value["item"])
    for key, v in list(value.items()):
        if key == "predicate" or not isinstance(v, (dict, list)):
            continue
        value[key] = loot(v)
    return value


def item_predicate(predicate):
    predicate = dict(predicate)
    if "tag" in predicate:
        predicate["items"] = "#" + tag_id(predicate.pop("tag"))
    elif "items" in predicate and isinstance(predicate["items"], list):
        items = [item_id(i) for i in predicate["items"] if item_id(i) not in GONE_ITEMS]
        if not items:
            raise Gone(json.dumps(predicate["items"]))
        predicate["items"] = items[0] if len(items) == 1 else items
    if "enchantments" in predicate:
        predicate.setdefault("predicates", {})["minecraft:enchantments"] = [
            {"enchantments": e["enchantment"], "levels": e.get("levels", {"min": 1})} for e in predicate.pop("enchantments")
        ]
    if "nbt" in predicate:
        predicate.setdefault("predicates", {})["minecraft:custom_data"] = predicate.pop("nbt")
    return predicate


def convert_loot(data):
    data = copy.deepcopy(data)
    conditions = pop_conditions(data) if "forge:conditions" in data else None
    out = loot(data)
    if conditions:
        out = {"neoforge:conditions": conditions, **out}
    return out


# --- Advancements and tags -----------------------------------------------------------------------------------------
def convert_advancement(data):
    data = copy.deepcopy(data)
    display = data.get("display")
    if display and "icon" in display:
        icon = display["icon"]
        display["icon"] = stack(icon)
        display["icon"].pop("count", None)
    for criterion in data.get("criteria", {}).values():
        conditions = criterion.get("conditions", {})
        if "items" in conditions:
            conditions["items"] = [item_predicate(p) for p in conditions["items"]]
        if "item" in conditions:
            conditions["item"] = item_predicate(conditions["item"])
    return data


def convert_tag(data):
    out = []
    for value in data["values"]:
        required = True
        if isinstance(value, dict):
            required = value.get("required", True)
            value = value["id"]
        if value.startswith("#"):
            value = "#" + tag_id(value[1:])
            gone = value[1:] in GONE_TAGS
        else:
            value = item_id(value)
            gone = value in GONE_ITEMS or value == "minecraft:air"
        if gone:
            continue
        out.append(value if required else {"id": value, "required": False})
    data = dict(data)
    data["values"] = out
    return data


# --- Main ----------------------------------------------------------------------------------------------------------
def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def file_id(rel, folder):
    """kubejs path "ns/<folder>/a/b.json" -> "ns:a/b"."""
    namespace, rest = rel.split("/", 1)
    return f"{namespace}:{rest[len(folder) + 1:-len('.json')]}"


def items_in(value, out):
    if isinstance(value, dict):
        for key in ("item", "id", "name"):
            v = value.get(key)
            if isinstance(v, str) and ":" in v and not v.startswith("#") and "amount" not in value:
                if key != "name" or value.get("type") == "minecraft:item":
                    out.add(v)
        for k, v in value.items():
            if k not in ("neoforge:conditions", "predicate", "criteria", "parent", "type"):
                items_in(v, out)
    elif isinstance(value, list):
        for v in value:
            items_in(v, out)
    return out


def main():
    data_out = {"recipes": set(), "lootTables": set(), "advancements": set(), "itemTags": set(), "items": set()}
    counts, dropped, skipped = {}, [], []
    for namespace in NAMESPACES:
        for folder in OWN_FOLDERS:
            shutil.rmtree(DST / namespace / folder, ignore_errors=True)
        for src in sorted((SRC / namespace).rglob("*.json")):
            rel = str(src.relative_to(SRC))
            if WORLDGEN.match(rel):
                continue
            count = counts.setdefault(namespace, [0, 0])
            reason = DROPPED_NAMESPACES.get(namespace) or DROPPED.get(rel)
            if rel in UNCHANGED:
                reason = "identical to the 1.20.1 mod file"
            if reason:
                dropped.append(f"{rel}: {reason}")
                count[1] += 1
                continue
            data = json.loads(src.read_text())
            out_rel = MOVED.get(rel, rel)
            kind = out_rel.split("/")[1]
            try:
                if is_disable(data):
                    out = {"neoforge:conditions": [{"type": "neoforge:false"}]}
                elif kind == "recipe":
                    out = convert_recipe(data, rel)
                elif kind in ("loot_table", "loot_modifiers"):
                    out = convert_loot(data)
                elif kind == "advancement":
                    out = convert_advancement(data)
                elif kind == "tags":
                    out = convert_tag(data)
                else:
                    raise ValueError(rel)
            except Gone as missing:
                skipped.append(f"{rel}: {missing} is not registered on 1.21.1")
                count[1] += 1
                continue
            write(DST / out_rel, out)
            count[0] += 1
            if "neoforge:false" in json.dumps(out.get("neoforge:conditions", [])):
                continue
            if kind == "recipe":
                data_out["recipes"].add(file_id(out_rel, "recipe"))
                items_in(out, data_out["items"])
            elif kind == "loot_table":
                data_out["lootTables"].add(file_id(out_rel, "loot_table"))
                items_in(out, data_out["items"])
            elif kind == "loot_modifiers":
                items_in(out, data_out["items"])
            elif kind == "advancement":
                data_out["advancements"].add(file_id(out_rel, "advancement"))
            elif kind == "tags" and out_rel.split("/")[2] == "item":
                values = [v for v in out["values"] if isinstance(v, str)]
                if values:
                    data_out["itemTags"].add(file_id(out_rel, "tags/item"))
                data_out["items"].update(v for v in values if not v.startswith("#"))
    lines = ",\n".join(f"  {k}: {json.dumps(sorted(v))}" for k, v in data_out.items())
    TEST_DATA.write_text(f"// Generated by tools/port/port_food_data.py.\nconst foodPortData = {{\n{lines},\n}};\n")
    for line in dropped:
        print(f"  dropped: {line}")
    for line in skipped:
        print(f"  skipped: {line}")
    for namespace, (ported, lost) in counts.items():
        print(f"{namespace}: {ported} ported, {lost} not ported")


if __name__ == "__main__":
    main()
