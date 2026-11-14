package dev.sunlitidle.compat.jade;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.farm.CropGrowth;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.resources.ResourceLocation;
import snownee.jade.api.BlockAccessor;
import snownee.jade.api.IBlockComponentProvider;
import snownee.jade.api.ITooltip;
import snownee.jade.api.config.IPluginConfig;

/**
 * Shows how many farm days a daily crop has grown and whether it can grow where it stands. Jade's own crop
 * progress (percent of random ticks) is turned off in {@code config/jade/plugins.json}.
 */
enum CropGrowthProvider implements IBlockComponentProvider {
    INSTANCE;

    private static final ResourceLocation UID = SunlitIdle.id("crop_growth");

    @Override
    public void appendTooltip(ITooltip tooltip, BlockAccessor accessor, IPluginConfig config) {
        CropGrowth growth = CropGrowth.of(accessor.getLevel(), accessor.getPosition(), accessor.getBlockState());
        if (growth == null) {
            return;
        }
        if (growth.mature()) {
            tooltip.add(Component.translatable("jade.sunlitidle.crop_growth.mature").withStyle(ChatFormatting.DARK_GREEN));
        } else {
            MutableComponent day = Component.literal(Integer.toString(growth.day()));
            MutableComponent days = Component.literal(Integer.toString(growth.days()));
            if (growth.boosted()) {
                day.withStyle(ChatFormatting.DARK_GREEN);
                days.withStyle(ChatFormatting.DARK_GREEN);
            }
            tooltip.add(Component.translatable("jade.sunlitidle.crop_growth", day, days));
        }
        if (!growth.fertile()) {
            tooltip.add(Component.translatable("jade.sunlitidle.crop_growth.stop").withStyle(ChatFormatting.RED));
        }
    }

    @Override
    public ResourceLocation getUid() {
        return UID;
    }
}
