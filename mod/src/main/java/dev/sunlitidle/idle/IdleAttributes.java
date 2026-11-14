package dev.sunlitidle.idle;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.minecraft.world.entity.player.Player;
import net.minecraft.core.registries.Registries;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.entity.EntityAttributeModificationEvent;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

import java.util.HashMap;
import java.util.Map;

/**
 * Player attributes that skill tree perks raise: {@code sunlitidle:<skill>_speed} and
 * {@code sunlitidle:<skill>_yield}, as fractions (0.1 = +10%).
 */
public final class IdleAttributes {
    /** Fixed list so the attributes exist before the catalog is read. Must match skills.json. */
    public static final String[] SKILLS = {"woodcutting", "mining", "digging", "foraging", "farming", "fishing", "hunting",
            "husbandry", "archaeology", "adventuring", "smelting", "cooking", "slime_ranching"};
    private static final DeferredRegister<Attribute> ATTRIBUTES = DeferredRegister.create(Registries.ATTRIBUTE, SunlitIdle.MOD_ID);
    private static final Map<String, DeferredHolder<Attribute, Attribute>> SPEED = new HashMap<>();
    private static final Map<String, DeferredHolder<Attribute, Attribute>> YIELD = new HashMap<>();

    static {
        for (String skill : SKILLS) {
            SPEED.put(skill, register(skill + "_speed"));
            YIELD.put(skill, register(skill + "_yield"));
        }
    }

    private IdleAttributes() {
    }

    private static DeferredHolder<Attribute, Attribute> register(String name) {
        return ATTRIBUTES.register(name, () -> new RangedAttribute("attribute.name." + SunlitIdle.MOD_ID + "." + name,
                0.0, 0.0, 100.0).setSyncable(true));
    }

    public static void register(IEventBus bus) {
        ATTRIBUTES.register(bus);
        bus.addListener(IdleAttributes::onAttributes);
    }

    private static void onAttributes(EntityAttributeModificationEvent event) {
        for (DeferredHolder<Attribute, Attribute> a : SPEED.values()) {
            event.add(EntityType.PLAYER, a);
        }
        for (DeferredHolder<Attribute, Attribute> a : YIELD.values()) {
            event.add(EntityType.PLAYER, a);
        }
    }

    public static double speed(Player player, String skill) {
        return value(player, SPEED.get(skill));
    }

    public static double yield(Player player, String skill) {
        return value(player, YIELD.get(skill));
    }

    private static double value(Player player, DeferredHolder<Attribute, Attribute> attribute) {
        if (attribute == null || !attribute.isBound()) {
            return 0.0;
        }
        var instance = player.getAttribute(attribute);
        return instance == null ? 0.0 : instance.getValue();
    }
}
