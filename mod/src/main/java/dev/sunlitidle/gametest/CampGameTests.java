package dev.sunlitidle.gametest;

import dev.sunlitidle.ModRegistry;
import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTest;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.gametest.GameTestHolder;
import net.minecraftforge.gametest.PrefixGameTestTemplate;

/** In-game checks, run in CI with ./gradlew runGameTestServer. */
@GameTestHolder(SunlitIdle.MOD_ID)
@PrefixGameTestTemplate(false)
public final class CampGameTests {
    private static final BlockPos CAMP = new BlockPos(1, 1, 1);

    private CampGameTests() {
    }

    private static AdventurerCampBlockEntity placeCamp(GameTestHelper helper) {
        helper.setBlock(CAMP, ModRegistry.ADVENTURERS_CAMP.get());
        return (AdventurerCampBlockEntity) helper.getBlockEntity(CAMP);
    }

    @GameTest(template = "empty", timeoutTicks = 400)
    public static void companionFightsAndProducesLoot(GameTestHelper helper) {
        AdventurerCampBlockEntity camp = placeCamp(helper);
        camp.gear().setStackInSlot(0, new ItemStack(Items.WOODEN_SWORD));
        camp.gear().setStackInSlot(2, new ItemStack(Items.LEATHER_CHESTPLATE));
        camp.food().setStackInSlot(0, new ItemStack(Items.BREAD, 10));
        helper.succeedWhen(() -> {
            boolean hasLoot = false;
            for (int i = 0; i < camp.loot().getSlots(); i++) {
                hasLoot |= !camp.loot().getStackInSlot(i).isEmpty();
            }
            helper.assertTrue(hasLoot, "no loot yet");
            helper.assertTrue(camp.food().getStackInSlot(0).getCount() < 10, "no food eaten");
            helper.assertTrue(camp.gear().getStackInSlot(0).getDamageValue() > 0, "weapon not worn");
        });
    }

    @GameTest(template = "empty", timeoutTicks = 100)
    public static void idleWithoutWeapon(GameTestHelper helper) {
        AdventurerCampBlockEntity camp = placeCamp(helper);
        camp.food().setStackInSlot(0, new ItemStack(Items.BREAD, 10));
        helper.runAfterDelay(80, () -> {
            helper.assertTrue(camp.food().getStackInSlot(0).getCount() == 10, "food eaten without a weapon");
            helper.succeed();
        });
    }

    @GameTest(template = "empty", timeoutTicks = 100)
    public static void rejectsWrongGear(GameTestHelper helper) {
        helper.assertFalse(AdventurerCampBlockEntity.fitsGearSlot(0, new ItemStack(Items.BREAD)), "bread as weapon");
        helper.assertFalse(AdventurerCampBlockEntity.fitsGearSlot(1, new ItemStack(Items.IRON_BOOTS)), "boots on head");
        helper.assertTrue(AdventurerCampBlockEntity.fitsGearSlot(4, new ItemStack(Items.IRON_BOOTS)), "boots on feet");
        helper.assertTrue(AdventurerCampBlockEntity.fitsGearSlot(0, new ItemStack(Items.IRON_AXE)), "axe as weapon");
        helper.succeed();
    }

    @GameTest(template = "empty", timeoutTicks = 100)
    public static void spareGearIsEquipped(GameTestHelper helper) {
        AdventurerCampBlockEntity camp = placeCamp(helper);
        camp.spare().setStackInSlot(3, new ItemStack(Items.STONE_SWORD));
        helper.succeedWhen(() -> helper.assertTrue(
                camp.gear().getStackInSlot(0).is(Items.STONE_SWORD), "spare sword not equipped"));
    }
}
