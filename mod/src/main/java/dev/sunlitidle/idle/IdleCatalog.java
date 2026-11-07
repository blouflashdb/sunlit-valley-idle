package dev.sunlitidle.idle;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.sunlitidle.SunlitIdle;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.registries.ForgeRegistries;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The skills and actions, read from {@code data/sunlitidle/idle/skills.json} inside the mod jar. Client and
 * server read the same file, so nothing has to be synced. Actions that point at blocks or items from mods
 * that are not installed are hidden.
 */
public final class IdleCatalog {
    private static final String RESOURCE = "/data/sunlitidle/idle/skills.json";
    private static List<IdleSkill> skills;
    private static Map<String, IdleAction> actions;
    private static Map<String, List<IdleAction>> available;

    private IdleCatalog() {
    }

    public static synchronized List<IdleSkill> skills() {
        if (skills == null) {
            load();
        }
        return skills;
    }

    public static IdleSkill skill(int index) {
        List<IdleSkill> all = skills();
        return index >= 0 && index < all.size() ? all.get(index) : null;
    }

    public static IdleSkill skill(String id) {
        for (IdleSkill s : skills()) {
            if (s.id().equals(id)) {
                return s;
            }
        }
        return null;
    }

    public static IdleAction action(String key) {
        skills();
        return key == null ? null : actions.get(key);
    }

    /** Actions of a skill whose blocks and items exist in this game. */
    public static synchronized List<IdleAction> availableActions(IdleSkill skill) {
        if (available == null) {
            Map<String, List<IdleAction>> map = new HashMap<>();
            for (IdleSkill s : skills()) {
                List<IdleAction> list = new ArrayList<>();
                for (IdleAction a : s.actions()) {
                    if (isAvailable(a)) {
                        list.add(a);
                    }
                }
                map.put(s.id(), Collections.unmodifiableList(list));
            }
            available = map;
        }
        return available.getOrDefault(skill.id(), List.of());
    }

    public static boolean isAvailable(IdleAction action) {
        if (!ForgeRegistries.ITEMS.containsKey(action.icon())) {
            return false;
        }
        for (IdleInput input : action.inputs()) {
            if (!ForgeRegistries.ITEMS.containsKey(input.item())) {
                return false;
            }
        }
        // The first drop is the main output; the others are extras that may come from optional mods.
        return !action.drops().isEmpty() && dropExists(action.drops().get(0));
    }

    public static boolean dropExists(IdleDrop drop) {
        return switch (drop.kind()) {
            case BLOCK -> ForgeRegistries.BLOCKS.containsKey(drop.id());
            case ITEM -> ForgeRegistries.ITEMS.containsKey(drop.id());
            case LOOT_TABLE -> true;
        };
    }

    private static void load() {
        List<IdleSkill> loadedSkills = new ArrayList<>();
        Map<String, IdleAction> loadedActions = new HashMap<>();
        try (InputStream in = IdleCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("missing " + RESOURCE);
            }
            JsonObject root = JsonParser.parseReader(new InputStreamReader(in, StandardCharsets.UTF_8)).getAsJsonObject();
            for (JsonElement skillElement : root.getAsJsonArray("skills")) {
                JsonObject s = skillElement.getAsJsonObject();
                String skillId = s.get("id").getAsString();
                List<IdleAction> skillActions = new ArrayList<>();
                for (JsonElement actionElement : s.getAsJsonArray("actions")) {
                    IdleAction action = parseAction(skillId, actionElement.getAsJsonObject());
                    skillActions.add(action);
                    loadedActions.put(action.key(), action);
                }
                loadedSkills.add(new IdleSkill(loadedSkills.size(), skillId,
                        new ResourceLocation(s.get("category").getAsString()),
                        new ResourceLocation(s.get("icon").getAsString()),
                        ToolKind.byName(s.get("tool").getAsString()),
                        s.has("tool_required") && s.get("tool_required").getAsBoolean(),
                        Collections.unmodifiableList(skillActions)));
            }
        } catch (Exception e) {
            SunlitIdle.LOGGER.error("Could not load idle skills", e);
        }
        skills = Collections.unmodifiableList(loadedSkills);
        actions = loadedActions;
    }

    private static IdleAction parseAction(String skillId, JsonObject a) {
        String id = a.get("id").getAsString();
        List<IdleInput> inputs = new ArrayList<>();
        if (a.has("inputs")) {
            for (JsonElement e : a.getAsJsonArray("inputs")) {
                JsonObject o = e.getAsJsonObject();
                inputs.add(new IdleInput(new ResourceLocation(o.get("item").getAsString()),
                        o.has("count") ? o.get("count").getAsInt() : 1));
            }
        }
        List<IdleDrop> drops = new ArrayList<>();
        for (JsonElement e : a.getAsJsonArray("drops")) {
            drops.add(parseDrop(e.getAsJsonObject()));
        }
        return new IdleAction(skillId + "/" + id, skillId, id, getInt(a, "level", 0), getInt(a, "tool_tier", 0),
                a.get("seconds").getAsDouble(), getInt(a, "xp", 1), new ResourceLocation(a.get("icon").getAsString()),
                List.copyOf(inputs), List.copyOf(drops));
    }

    private static IdleDrop parseDrop(JsonObject o) {
        double chance = o.has("chance") ? o.get("chance").getAsDouble() : 1.0;
        int luck = getInt(o, "luck", 0);
        if (o.has("block")) {
            return new IdleDrop(IdleDrop.Kind.BLOCK, new ResourceLocation(o.get("block").getAsString()), chance, 1, 1, luck);
        }
        if (o.has("loot_table")) {
            return new IdleDrop(IdleDrop.Kind.LOOT_TABLE, new ResourceLocation(o.get("loot_table").getAsString()),
                    chance, 1, 1, luck);
        }
        int min = 1;
        int max = 1;
        if (o.has("count")) {
            JsonElement c = o.get("count");
            if (c.isJsonArray()) {
                JsonArray arr = c.getAsJsonArray();
                min = arr.get(0).getAsInt();
                max = arr.get(1).getAsInt();
            } else {
                min = max = c.getAsInt();
            }
        }
        return new IdleDrop(IdleDrop.Kind.ITEM, new ResourceLocation(o.get("item").getAsString()), chance, min, max, luck);
    }

    private static int getInt(JsonObject o, String key, int fallback) {
        return o.has(key) ? o.get(key).getAsInt() : fallback;
    }
}
