package dev.sunlitidle.idle;

import com.mojang.datafixers.util.Pair;
import dev.sunlitidle.SunlitIdle;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.inventory.InventoryMenu;
import net.neoforged.neoforge.items.IItemHandler;
import net.neoforged.neoforge.items.SlotItemHandler;
import org.jetbrains.annotations.Nullable;

/** An idle window slot that shows a faded silhouette of what belongs there while it is empty. */
public class PlaceholderSlot extends SlotItemHandler {
    @Nullable
    private final SlotPlaceholder placeholder;

    public PlaceholderSlot(IItemHandler handler, int index, int x, int y, @Nullable SlotPlaceholder placeholder) {
        super(handler, index, x, y);
        this.placeholder = placeholder;
    }

    @Nullable
    public SlotPlaceholder placeholder() {
        return placeholder;
    }

    @Nullable
    @Override
    public Pair<ResourceLocation, ResourceLocation> getNoItemIcon() {
        if (placeholder == null) {
            return null;
        }
        return Pair.of(InventoryMenu.BLOCK_ATLAS,
                ResourceLocation.fromNamespaceAndPath(SunlitIdle.MOD_ID, placeholder.spritePath()));
    }
}
