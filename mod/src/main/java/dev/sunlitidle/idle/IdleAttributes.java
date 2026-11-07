package dev.sunlitidle.idle;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.entity.EntityAttributeModificationEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

import java.util.HashMap;
import java.util.Map;

/**
 * Player attributes that skill tree perks raise: {@code sunlitidle:<skill>_speed} and
 * {@code sunlitidle:<skill>_yield}, as fractions (0.1 = +10%).
 */
public final class IdleAttributes {
    /** Fixed list so the attributes exist before the catalog is read. Must match skills.json. */
    public static final String[] SKILLS = {"woodcutting", "mining", "foraging", "farming", "fishing", "husbandry", "adventuring"};
    private static final DeferredRegister<Attribute> ATTRIBUTES = DeferredRegister.create(ForgeRegistries.ATTRIBUTES, SunlitIdle.MOD_ID);
    private static final Map<String, RegistryObject<Attribute>> SPEED = new HashMap<>();
    private static final Map<String, RegistryObject<Attribute>> YIELD = new HashMap<>();

    static {
        for (String skill : SKILLS) {
            SPEED.put(skill, register(skill + "_speed"));
            YIELD.put(skill, register(skill + "_yield"));
        }
    }

    private IdleAttributes() {
    }

    private static RegistryObject<Attribute> register(String name) {
        return ATTRIBUTES.register(name, () -> new RangedAttribute("attribute.name." + SunlitIdle.MOD_ID + "." + name,
                0.0, 0.0, 100.0).setSyncable(true));
    }

    public static void register(IEventBus bus) {
        ATTRIBUTES.register(bus);
        bus.addListener(IdleAttributes::onAttributes);
    }

    private static void onAttributes(EntityAttributeModificationEvent event) {
        for (RegistryObject<Attribute> a : SPEED.values()) {
            event.add(EntityType.PLAYER, a.get());
        }
        for (RegistryObject<Attribute> a : YIELD.values()) {
            event.add(EntityType.PLAYER, a.get());
        }
    }

    public static double speed(Player player, String skill) {
        return value(player, SPEED.get(skill));
    }

    public static double yield(Player player, String skill) {
        return value(player, YIELD.get(skill));
    }

    private static double value(Player player, RegistryObject<Attribute> attribute) {
        if (attribute == null || !attribute.isPresent()) {
            return 0.0;
        }
        var instance = player.getAttribute(attribute.get());
        return instance == null ? 0.0 : instance.getValue();
    }
}
