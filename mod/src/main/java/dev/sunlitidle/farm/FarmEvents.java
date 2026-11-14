package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.ThrownPotion;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.alchemy.PotionContents;
import net.minecraft.world.item.alchemy.Potions;
import net.minecraft.core.component.DataComponents;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.BlockHitResult;
import net.neoforged.neoforge.common.ItemAbilities;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.ProjectileImpactEvent;
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent;
import net.neoforged.neoforge.event.level.BlockEvent;

/**
 * Farmland rules of the old Dew Drop config: no trampling, buckets, water bottles and splash water
 * potions water farmland, and a shovel turns plain farmland back into dirt.
 */
public final class FarmEvents {
    private FarmEvents() {
    }

    public static void init() {
        NeoForge.EVENT_BUS.addListener(FarmEvents::onTrample);
        NeoForge.EVENT_BUS.addListener(FarmEvents::onRightClickBlock);
        NeoForge.EVENT_BUS.addListener(FarmEvents::onProjectileImpact);
        NeoForge.EVENT_BUS.addListener(FarmEvents::onToolModify);
    }

    private static void onTrample(BlockEvent.FarmlandTrampleEvent event) {
        event.setCanceled(true);
    }

    private static void onRightClickBlock(PlayerInteractEvent.RightClickBlock event) {
        Player player = event.getEntity();
        ItemStack stack = event.getItemStack();
        boolean bucket = stack.is(Items.WATER_BUCKET);
        boolean bottle = stack.is(Items.POTION)
                && stack.getOrDefault(DataComponents.POTION_CONTENTS, PotionContents.EMPTY).is(Potions.WATER);
        if (!bucket && !bottle) {
            return;
        }
        BlockPos soil = Watering.soilAt(event.getLevel(), event.getPos());
        if (soil == null) {
            return;
        }
        event.setCanceled(true);
        event.setCancellationResult(InteractionResult.sidedSuccess(event.getLevel().isClientSide));
        if (event.getLevel().isClientSide) {
            return;
        }
        Watering.water(event.getLevel(), soil);
        if (!player.getAbilities().instabuild) {
            player.setItemInHand(event.getHand(), new ItemStack(bucket ? Items.BUCKET : Items.GLASS_BOTTLE));
        }
    }

    private static void onProjectileImpact(ProjectileImpactEvent event) {
        if (!(event.getProjectile() instanceof ThrownPotion potion)
                || !(potion.level() instanceof ServerLevel level)
                || !(event.getRayTraceResult() instanceof BlockHitResult hit)) {
            return;
        }
        if (!potion.getItem().getOrDefault(DataComponents.POTION_CONTENTS, PotionContents.EMPTY).is(Potions.WATER)) {
            return;
        }
        for (BlockPos pos : BlockPos.withinManhattan(hit.getBlockPos(), 1, 0, 1)) {
            Watering.water(level, pos.immutable());
        }
    }

    private static void onToolModify(BlockEvent.BlockToolModificationEvent event) {
        if (event.getItemAbility() == ItemAbilities.SHOVEL_FLATTEN && event.getState().is(Blocks.FARMLAND)
                && event.getLevel().getBlockState(event.getPos().above()).isAir()) {
            event.setFinalState(Blocks.DIRT.defaultBlockState());
        }
    }
}
