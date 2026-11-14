package dev.sunlitidle.gametest;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.idle.IdleCatalog;
import dev.sunlitidle.idle.IdleEngine;
import dev.sunlitidle.idle.IdleAction;
import dev.sunlitidle.idle.IdleMenu;
import dev.sunlitidle.idle.IdleSkill;
import dev.sunlitidle.idle.PlaceholderSlot;
import dev.sunlitidle.idle.SlotPlaceholder;
import dev.sunlitidle.idle.RecipeActions;
import dev.sunlitidle.idle.PlayerIdleState;
import dev.sunlitidle.idle.SkillLevels;
import dev.sunlitidle.idle.SlotStatus;
import net.minecraft.gametest.framework.GameTest;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.gametest.GameTestHolder;
import net.neoforged.neoforge.gametest.PrefixGameTestTemplate;

/** In-game checks of the idle skills, run in CI with ./gradlew runGameTestServer. */
@GameTestHolder(SunlitIdle.MOD_ID)
@PrefixGameTestTemplate(false)
public final class IdleGameTests {
    private IdleGameTests() {
    }

    /** A NeoForge fake player: a real ServerPlayer without a network connection, which the mock player lacks. */
    private static ServerPlayer player(GameTestHelper helper) {
        ServerPlayer player = FakePlayerFactory.getMinecraft(helper.getLevel());
        player.moveTo(helper.absoluteVec(new Vec3(1.5, 1.0, 1.5)));
        return player;
    }

    @GameTest(template = "empty")
    public static void catalogLoadsAllSkills(GameTestHelper helper) {
        helper.assertTrue(IdleCatalog.skills().size() == 13, "expected 13 skills, got " + IdleCatalog.skills().size());
        for (IdleSkill skill : IdleCatalog.skills()) {
            // Smelting and Cooking are built from the server's recipes and checked in their own test.
            if (skill.usesRecipes()) {
                continue;
            }
            helper.assertTrue(!IdleCatalog.availableActions(skill).isEmpty(), "no vanilla actions for " + skill.id());
            helper.assertTrue(IdleCatalog.availableActions(skill).get(0).level() == 0,
                    skill.id() + " has no level 0 action");
        }
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void woodcuttingWorksWithoutAnAxe(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "woodcutting/oak");
        IdleEngine.advance(player, state, 60.0);
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("oak_log")) >= 5, "too few oak logs");
        helper.assertTrue(state.slotStatus(0) == SlotStatus.RUNNING, "slot not running: " + state.slotStatus(0));
        IdleSkill woodcutting = IdleCatalog.skill("woodcutting");
        helper.assertTrue(SkillLevels.progress(player, state, woodcutting).xp() > 0, "no woodcutting XP");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void miningNeedsAPickaxeAndWearsItDown(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "mining/coal");
        IdleEngine.advance(player, state, 30.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_TOOL, "mining ran without a pickaxe");
        int mining = IdleCatalog.skill("mining").index();
        state.tools().setStackInSlot(mining, new ItemStack(Items.WOODEN_PICKAXE));
        IdleEngine.advance(player, state, 40.0);
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("coal")) > 0, "no coal");
        ItemStack pick = state.tools().getStackInSlot(mining);
        helper.assertTrue(pick.isEmpty() || pick.getDamageValue() > 0, "pickaxe did not wear down");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void farmingUsesSeedsFromStorage(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "farming/wheat");
        IdleEngine.advance(player, state, 30.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_INPUT, "farmed without seeds");
        state.store(new ItemStack(Items.WHEAT_SEEDS, 4));
        IdleEngine.advance(player, state, 60.0);
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("wheat")) > 0, "no wheat");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void fishingRollsTheFishingLootTable(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.tools().setStackInSlot(IdleCatalog.skill("fishing").index(), new ItemStack(Items.FISHING_ROD));
        state.setSlotAction(0, "fishing/casting");
        IdleEngine.advance(player, state, 120.0);
        helper.assertTrue(!state.storage().isEmpty(), "caught nothing");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void stateSurvivesSaving(GameTestHelper helper) {
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(1, "foraging/meadow");
        state.store(new ItemStack(Items.OAK_LOG, 70));
        state.tools().setStackInSlot(0, new ItemStack(Items.IRON_AXE));
        CompoundTag tag = state.save(helper.getLevel().registryAccess());
        PlayerIdleState loaded = PlayerIdleState.load(tag, helper.getLevel().registryAccess());
        helper.assertTrue("foraging/meadow".equals(loaded.slotAction(1)), "slot action lost");
        helper.assertTrue(loaded.countOf(ResourceLocation.withDefaultNamespace("oak_log")) == 70, "storage lost");
        helper.assertTrue(loaded.tools().getStackInSlot(0).is(Items.IRON_AXE), "tool lost");
        ItemStack taken = loaded.withdraw(0, 64);
        helper.assertTrue(taken.getCount() == 64 && loaded.countOf(ResourceLocation.withDefaultNamespace("oak_log")) == 6,
                "withdraw wrong");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void diggingGivesSand(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "digging/sand");
        IdleEngine.advance(player, state, 60.0);
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("sand")) >= 5, "too little sand");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void slimeRanchingTurnsFoodIntoPlorts(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "slime_ranching/slimy");
        IdleEngine.advance(player, state, 30.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_INPUT, "slimes ate nothing: " + state.slotStatus(0));
        state.store(new ItemStack(Items.SWEET_BERRIES, 3));
        IdleEngine.advance(player, state, 60.0);
        ResourceLocation plort = ResourceLocation.fromNamespaceAndPath("splendid_slimes", "plort_slimy");
        helper.assertTrue(state.countOf(plort) >= 3, "too few slimy plorts: " + state.countOf(plort));
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("sweet_berries")) == 0, "berries left");
        IdleSkill slimes = IdleCatalog.skill("slime_ranching");
        helper.assertTrue(SkillLevels.progress(player, state, slimes).xp() > 0, "no slime ranching XP");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void huntingRollsMobLoot(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "hunting/zombies");
        IdleEngine.advance(player, state, 120.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.RUNNING, "hunting not running: " + state.slotStatus(0));
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("rotten_flesh")) > 0, "no rotten flesh");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void smeltingUsesFurnaceRecipes(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        IdleSkill smelting = IdleCatalog.skill("smelting");
        IdleSkill cooking = IdleCatalog.skill("cooking");
        helper.assertTrue(!RecipeActions.actions(smelting).isEmpty(), "no smelting actions");
        helper.assertTrue(!RecipeActions.actions(cooking).isEmpty(), "no cooking actions");
        helper.assertTrue(RecipeActions.actions(smelting).get(0).level() == 0, "smelting has no level 0 action");
        IdleAction iron = RecipeActions.actions(smelting).stream()
                .filter(a -> a.recipe().input().test(new ItemStack(Items.RAW_IRON))
                        && a.recipe().output().is(Items.IRON_INGOT))
                .findFirst().orElse(null);
        helper.assertTrue(iron != null, "no raw iron to iron ingot action");
        helper.assertTrue(IdleCatalog.action(iron.key()) == iron, "recipe action not found by key");
        PlayerIdleState state = new PlayerIdleState();
        state.addFallbackXp("smelting", 100_000);
        state.setSlotAction(0, iron.key());
        IdleEngine.advance(player, state, 30.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_INPUT, "smelted without ore: " + state.slotStatus(0));
        state.store(new ItemStack(Items.RAW_IRON, 3));
        IdleEngine.advance(player, state, 120.0);
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("raw_iron")) == 0, "ore left over");
        helper.assertTrue(state.countOf(ResourceLocation.withDefaultNamespace("iron_ingot")) >= 3, "too few ingots");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void adventuringCompanionFightsAndEats(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "adventuring/t1");
        IdleEngine.advance(player, state, 10.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_TOOL, "fought without a weapon: " + state.slotStatus(0));
        state.tools().setStackInSlot(IdleCatalog.skill("adventuring").index(), new ItemStack(Items.WOODEN_SWORD));
        IdleEngine.advance(player, state, 10.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.NO_FOOD, "fought without food: " + state.slotStatus(0));
        state.food().setStackInSlot(0, new ItemStack(Items.BREAD, 16));
        IdleEngine.advance(player, state, 120.0);
        helper.assertTrue(!state.storage().isEmpty(), "no dungeon loot");
        helper.assertTrue(state.food().getStackInSlot(0).getCount() < 16, "companion did not eat");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void misplacedToolsMoveOnLoad(GameTestHelper helper) {
        PlayerIdleState state = new PlayerIdleState();
        int fishing = IdleCatalog.skill("fishing").index();
        // A pickaxe in the fishing slot, as after a skill was inserted before it.
        state.tools().setStackInSlot(fishing, new ItemStack(Items.IRON_PICKAXE));
        PlayerIdleState loaded = PlayerIdleState.load(state.save(helper.getLevel().registryAccess()),
                helper.getLevel().registryAccess());
        helper.assertTrue(loaded.tools().getStackInSlot(fishing).isEmpty(), "pickaxe stayed in the fishing slot");
        helper.assertTrue(loaded.tools().getStackInSlot(IdleCatalog.skill("mining").index()).is(Items.IRON_PICKAXE),
                "pickaxe not moved to mining");
        helper.succeed();
    }

    /** Each empty slot's placeholder icon and tooltip match what the slot accepts. */
    @GameTest(template = "empty")
    public static void slotPlaceholdersMatchAcceptedItems(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        IdleMenu menu = new IdleMenu(0, player.getInventory(), new PlayerIdleState());
        java.util.Map<SlotPlaceholder, ItemStack> examples = new java.util.EnumMap<>(SlotPlaceholder.class);
        examples.put(SlotPlaceholder.AXE, new ItemStack(Items.IRON_AXE));
        examples.put(SlotPlaceholder.PICKAXE, new ItemStack(Items.IRON_PICKAXE));
        examples.put(SlotPlaceholder.SHOVEL, new ItemStack(Items.IRON_SHOVEL));
        examples.put(SlotPlaceholder.HOE, new ItemStack(Items.IRON_HOE));
        examples.put(SlotPlaceholder.ROD, new ItemStack(Items.FISHING_ROD));
        examples.put(SlotPlaceholder.SHEARS, new ItemStack(Items.SHEARS));
        examples.put(SlotPlaceholder.WEAPON, new ItemStack(Items.IRON_SWORD));
        examples.put(SlotPlaceholder.BRUSH, new ItemStack(Items.BRUSH));
        examples.put(SlotPlaceholder.HELMET, new ItemStack(Items.IRON_HELMET));
        examples.put(SlotPlaceholder.CHESTPLATE, new ItemStack(Items.IRON_CHESTPLATE));
        examples.put(SlotPlaceholder.LEGGINGS, new ItemStack(Items.IRON_LEGGINGS));
        examples.put(SlotPlaceholder.BOOTS, new ItemStack(Items.IRON_BOOTS));
        examples.put(SlotPlaceholder.FOOD, new ItemStack(Items.BREAD));
        java.util.Set<SlotPlaceholder> seen = java.util.EnumSet.noneOf(SlotPlaceholder.class);
        for (net.minecraft.world.inventory.Slot slot : menu.slots) {
            if (!(slot instanceof PlaceholderSlot placeholderSlot)) {
                continue;
            }
            SlotPlaceholder placeholder = placeholderSlot.placeholder();
            if (slot.index < IdleCatalog.skills().size()) {
                IdleSkill skill = IdleCatalog.skill(slot.index);
                helper.assertTrue(placeholder == SlotPlaceholder.forTool(skill.tool()),
                        "wrong placeholder for the tool slot of " + skill.id() + ": " + placeholder);
            }
            if (placeholder == null) {
                continue;
            }
            seen.add(placeholder);
            helper.assertTrue(placeholderSlot.getNoItemIcon() != null, "no icon for " + placeholder);
            helper.assertTrue(slot.mayPlace(examples.get(placeholder)),
                    placeholder + " slot rejects " + examples.get(placeholder));
            helper.assertTrue(!slot.mayPlace(new ItemStack(Items.DIRT)), placeholder + " slot accepts dirt");
            for (java.util.Map.Entry<SlotPlaceholder, ItemStack> other : examples.entrySet()) {
                // Axes are weapons too, so only check the companion slots against each other's examples.
                if (!placeholder.isTool() && !other.getKey().isTool() && other.getKey() != placeholder) {
                    helper.assertTrue(!slot.mayPlace(other.getValue()), placeholder + " slot accepts " + other.getValue());
                }
            }
        }
        helper.assertTrue(seen.size() == SlotPlaceholder.values().length,
                "placeholders without a slot: " + java.util.EnumSet.complementOf(java.util.EnumSet.copyOf(seen)));
        helper.succeed();
    }
}
