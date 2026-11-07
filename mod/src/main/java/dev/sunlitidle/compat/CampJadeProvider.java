package dev.sunlitidle.compat;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import dev.sunlitidle.camp.CampMenu;
import dev.sunlitidle.camp.CampStatus;
import dev.sunlitidle.camp.DungeonTier;
import net.minecraft.ChatFormatting;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.inventory.ContainerData;
import snownee.jade.api.BlockAccessor;
import snownee.jade.api.IBlockComponentProvider;
import snownee.jade.api.IServerDataProvider;
import snownee.jade.api.ITooltip;
import snownee.jade.api.config.IPluginConfig;

/** Shows tier, level, status and remaining food when looking at an Adventurer's Camp. */
public enum CampJadeProvider implements IBlockComponentProvider, IServerDataProvider<BlockAccessor> {
    INSTANCE;

    private static final ResourceLocation UID = new ResourceLocation(SunlitIdle.MOD_ID, "adventurers_camp");

    @Override
    public void appendServerData(CompoundTag tag, BlockAccessor accessor) {
        if (accessor.getBlockEntity() instanceof AdventurerCampBlockEntity camp) {
            ContainerData data = camp.data();
            tag.putInt("Tier", data.get(CampMenu.DATA_TIER));
            tag.putInt("Level", data.get(CampMenu.DATA_LEVEL));
            tag.putInt("Xp", data.get(CampMenu.DATA_XP));
            tag.putInt("XpNext", data.get(CampMenu.DATA_XP_NEXT));
            tag.putInt("Status", data.get(CampMenu.DATA_STATUS));
            tag.putInt("Retreat", data.get(CampMenu.DATA_RETREAT));
            tag.putDouble("FoodBuffer", data.get(CampMenu.DATA_FOOD) / 10.0);
            tag.putDouble("FoodStored", camp.storedNutrition());
        }
    }

    @Override
    public void appendTooltip(ITooltip tooltip, BlockAccessor accessor, IPluginConfig config) {
        CompoundTag tag = accessor.getServerData();
        if (!tag.contains("Tier")) {
            return;
        }
        tooltip.add(Component.translatable(DungeonTier.byNumber(tag.getInt("Tier")).translationKey()));
        tooltip.add(Component.translatable("sunlitidle.gui.level", tag.getInt("Level"), tag.getInt("Xp"), tag.getInt("XpNext")));
        double food = tag.getDouble("FoodBuffer") + tag.getDouble("FoodStored");
        tooltip.add(Component.translatable("sunlitidle.jade.food", String.format("%.0f", food)));
        CampStatus status = CampStatus.byId(tag.getInt("Status"));
        Component statusText = status == CampStatus.RETREATING
                ? Component.translatable(status.translationKey(), (tag.getInt("Retreat") + 19) / 20)
                : Component.translatable(status.translationKey());
        tooltip.add(statusText.copy().withStyle(status == CampStatus.FIGHTING ? ChatFormatting.GREEN : ChatFormatting.RED));
    }

    @Override
    public ResourceLocation getUid() {
        return UID;
    }
}
