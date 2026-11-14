package dev.sunlitidle.slime;

import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Plorts and Slime Hearts of the 24 slime breeds that replace Splendid Slimes on 1.21.1 (#13). Splendid Slimes
 * kept the breed in NBT on one item; here every breed has its own item, {@code splendid_slimes:plort_<breed>}
 * and {@code splendid_slimes:slime_heart_<breed>}, so quests, recipes and prices can name them directly.
 * Slime Ranching (an idle skill) makes plorts; the Plort Press and Plort Ripper are KubeJS machines.
 */
public final class SlimeRegistry {
    public static final String NAMESPACE = "splendid_slimes";

    private static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(NAMESPACE);

    public static final Map<SlimeBreed, DeferredItem<Item>> PLORTS = new EnumMap<>(SlimeBreed.class);
    public static final Map<SlimeBreed, DeferredItem<Item>> HEARTS = new EnumMap<>(SlimeBreed.class);

    static {
        for (SlimeBreed breed : SlimeBreed.values()) {
            PLORTS.put(breed, ITEMS.registerSimpleItem("plort_" + breed.id()));
            HEARTS.put(breed, ITEMS.registerSimpleItem("slime_heart_" + breed.id()));
        }
    }

    private SlimeRegistry() {
    }

    /** Every plort and heart, for the client's tint colors. */
    public static List<DeferredItem<Item>> allItems() {
        List<DeferredItem<Item>> all = new ArrayList<>(PLORTS.values());
        all.addAll(HEARTS.values());
        return all;
    }

    public static void register(IEventBus bus) {
        ITEMS.register(bus);
        bus.addListener(SlimeRegistry::onCreativeTabs);
    }

    private static void onCreativeTabs(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
            PLORTS.values().forEach(event::accept);
            HEARTS.values().forEach(event::accept);
        }
    }
}
