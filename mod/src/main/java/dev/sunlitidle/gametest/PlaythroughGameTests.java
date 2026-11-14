package dev.sunlitidle.gametest;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.idle.IdleAction;
import dev.sunlitidle.idle.IdleCatalog;
import dev.sunlitidle.idle.IdleEngine;
import dev.sunlitidle.idle.IdleService;
import dev.sunlitidle.idle.IdleSkill;
import dev.sunlitidle.idle.PlayerIdleState;
import dev.sunlitidle.idle.SlotStatus;
import net.minecraft.gametest.framework.GameTest;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.gametest.GameTestHolder;
import net.neoforged.neoforge.gametest.PrefixGameTestTemplate;

/**
 * Checks for the playthrough checklist of #19 (docs/port/playthrough-checklist.md): the companion clears every
 * dungeon tier with good gear and food, and idle skills catch up on offline time.
 */
@GameTestHolder(SunlitIdle.MOD_ID)
@PrefixGameTestTemplate(false)
public final class PlaythroughGameTests {
    private PlaythroughGameTests() {
    }

    private static ServerPlayer player(GameTestHelper helper) {
        ServerPlayer player = FakePlayerFactory.getMinecraft(helper.getLevel());
        player.moveTo(helper.absoluteVec(new Vec3(1.5, 1.0, 1.5)));
        return player;
    }

    private static PlayerIdleState geared(IdleSkill adventuring, long xp) {
        PlayerIdleState state = new PlayerIdleState();
        // Fallback XP sets the level in the dev run (no Pufferfish's Skills); 1,000,000 is the max level.
        state.addFallbackXp(adventuring.id(), xp);
        state.tools().setStackInSlot(adventuring.index(), new ItemStack(Items.NETHERITE_SWORD));
        state.armor().setStackInSlot(0, new ItemStack(Items.NETHERITE_HELMET));
        state.armor().setStackInSlot(1, new ItemStack(Items.NETHERITE_CHESTPLATE));
        state.armor().setStackInSlot(2, new ItemStack(Items.NETHERITE_LEGGINGS));
        state.armor().setStackInSlot(3, new ItemStack(Items.NETHERITE_BOOTS));
        for (int slot = 0; slot < PlayerIdleState.FOOD_SLOTS; slot++) {
            state.food().setStackInSlot(slot, new ItemStack(Items.COOKED_BEEF, 64));
        }
        return state;
    }

    @GameTest(template = "empty")
    public static void companionClearsAllTiers(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        IdleSkill adventuring = IdleCatalog.skill("adventuring");
        helper.assertTrue(adventuring.actions().size() == 5, "expected 5 dungeon tiers");
        for (IdleAction tier : adventuring.actions()) {
            PlayerIdleState state = geared(adventuring, 1_000_000);
            state.setSlotAction(0, tier.key());
            long loot = 0;
            for (int i = 0; i < 10; i++) {
                loot += IdleEngine.advance(player, state, 60.0);
                helper.assertTrue(state.slotStatus(0) == SlotStatus.RUNNING,
                        tier.id() + ": companion " + state.slotStatus(0) + " after " + (i + 1) + " min");
            }
            helper.assertTrue(loot > 0, tier.id() + ": no loot in 10 min");
            helper.assertTrue(state.food().getStackInSlot(0).getCount() < 64, tier.id() + ": companion did not eat");
        }
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void lockedTierWaitsForTheLevel(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        IdleSkill adventuring = IdleCatalog.skill("adventuring");
        PlayerIdleState state = geared(adventuring, 0);
        state.setSlotAction(0, "adventuring/t5");
        IdleEngine.advance(player, state, 60.0);
        helper.assertTrue(state.slotStatus(0) == SlotStatus.LOCKED, "T5 ran at level 0: " + state.slotStatus(0));
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void offlineTimeIsCaughtUp(GameTestHelper helper) {
        ServerPlayer player = player(helper);
        PlayerIdleState state = new PlayerIdleState();
        state.setSlotAction(0, "woodcutting/oak");
        state.addOfflineSeconds(2 * 3600);
        // A few seconds online catch up 2 hours (catchUpSecondsPerSecond defaults to 900).
        for (int i = 0; i < 10; i++) {
            IdleService.step(player, state, 1.0);
        }
        long logs = state.countOf(ResourceLocation.withDefaultNamespace("oak_log"));
        helper.assertTrue(state.offlineSeconds() <= 0, "offline time left: " + state.offlineSeconds());
        helper.assertTrue(logs >= 100, "only " + logs + " oak logs after 2 h offline");
        helper.succeed();
    }
}
