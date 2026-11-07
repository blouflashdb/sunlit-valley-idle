package dev.sunlitidle.gametest;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.idle.IdleCatalog;
import dev.sunlitidle.idle.IdleEngine;
import dev.sunlitidle.idle.IdleSkill;
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
import net.minecraftforge.common.util.FakePlayerFactory;
import net.minecraftforge.gametest.GameTestHolder;
import net.minecraftforge.gametest.PrefixGameTestTemplate;

/** In-game checks of the idle skills, run in CI with ./gradlew runGameTestServer. */
@GameTestHolder(SunlitIdle.MOD_ID)
@PrefixGameTestTemplate(false)
public final class IdleGameTests {
    private IdleGameTests() {
    }

    /** A Forge fake player: a real ServerPlayer without a network connection, which the mock player lacks. */
    private static ServerPlayer player(GameTestHelper helper) {
        ServerPlayer player = FakePlayerFactory.getMinecraft(helper.getLevel());
        player.moveTo(helper.absoluteVec(new Vec3(1.5, 1.0, 1.5)));
        return player;
    }

    @GameTest(template = "empty")
    public static void catalogLoadsAllSkills(GameTestHelper helper) {
        helper.assertTrue(IdleCatalog.skills().size() == 6, "expected 6 skills, got " + IdleCatalog.skills().size());
        for (IdleSkill skill : IdleCatalog.skills()) {
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
        helper.assertTrue(state.countOf(new ResourceLocation("minecraft", "oak_log")) >= 5, "too few oak logs");
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
        helper.assertTrue(state.countOf(new ResourceLocation("minecraft", "coal")) > 0, "no coal");
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
        helper.assertTrue(state.countOf(new ResourceLocation("minecraft", "wheat")) > 0, "no wheat");
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
        CompoundTag tag = state.save();
        PlayerIdleState loaded = PlayerIdleState.load(tag);
        helper.assertTrue("foraging/meadow".equals(loaded.slotAction(1)), "slot action lost");
        helper.assertTrue(loaded.countOf(new ResourceLocation("minecraft", "oak_log")) == 70, "storage lost");
        helper.assertTrue(loaded.tools().getStackInSlot(0).is(Items.IRON_AXE), "tool lost");
        ItemStack taken = loaded.withdraw(0, 64);
        helper.assertTrue(taken.getCount() == 64 && loaded.countOf(new ResourceLocation("minecraft", "oak_log")) == 6,
                "withdraw wrong");
        helper.succeed();
    }
}
