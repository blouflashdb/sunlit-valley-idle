package dev.sunlitidle.ci;

import dev.sunlitidle.farm.DailyFarm;
import dev.sunlitidle.idle.IdleAction;
import dev.sunlitidle.idle.IdleCatalog;
import dev.sunlitidle.idle.IdleEngine;
import dev.sunlitidle.idle.IdleInput;
import dev.sunlitidle.idle.IdleSavedData;
import dev.sunlitidle.idle.IdleSkill;
import dev.sunlitidle.idle.PlayerIdleState;
import dev.sunlitidle.idle.RecipeActions;
import dev.sunlitidle.idle.Seasons;
import dev.sunlitidle.idle.SkillLevels;
import dev.sunlitidle.idle.SlotStatus;
import dev.sunlitidle.idle.ToolKind;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Gameplay checks in the full pack (all mods and KubeJS scripts loaded), run by {@link CiHarness}. The GameTests
 * in dev.sunlitidle.gametest check the same mechanics without the pack; these check them with the pack's loot
 * tables, items, seasons and skill levels (Pufferfish's Skills).
 */
final class PackChecks {
    private static final String[] SEASONS = {"spring", "summer", "autumn", "winter"};
    private static final int MAX_CROPS = 256;
    private static final int ROW = 16;
    /** Crops that grew in each recorded season, by season name. */
    private static final Map<String, Set<String>> GREW = new LinkedHashMap<>();
    private static final Map<String, Set<String>> IDLE_FARMING = new LinkedHashMap<>();
    private static final Set<String> CROPS = new TreeSet<>();

    private PackChecks() {
    }

    private static ServerPlayer player(MinecraftServer server) {
        ServerPlayer player = CiPlayer.get(server);
        if (player == null) {
            throw new IllegalStateException("the CI player is not online; run /sunlitidle_ci join first");
        }
        return player;
    }

    private static void check(boolean ok, String name, String message) {
        CiHarness.log(ok ? "PASS" : "FAIL", name, message);
    }

    // ---------------------------------------------------------------- idle skills

    /** Idle skills, offline catch-up and the Adventuring companion with the pack. */
    static void idle(MinecraftServer server) {
        ServerPlayer player = player(server);
        offlineProgress(server, player);
        for (IdleSkill skill : IdleCatalog.skills()) {
            if (skill.id().equals("adventuring")) {
                continue;
            }
            try {
                skill(player, skill);
            } catch (RuntimeException e) {
                check(false, "idle_" + skill.id(), e.toString());
            }
        }
        adventuring(player);
    }

    private static void offlineProgress(MinecraftServer server, ServerPlayer player) {
        PlayerIdleState state = IdleSavedData.get(server).state(player.getUUID());
        ResourceLocation log = ResourceLocation.withDefaultNamespace("oak_log");
        long logs = state.countOf(log);
        // 2 hours of Woodcutting at level 0 without an axe is several hundred logs; a minute online gives about 10.
        check(logs >= 100 && state.offlineSeconds() <= 0, "offline_progress",
                logs + " oak logs after 2 h offline, " + (long) state.offlineSeconds() + " s left to catch up");
    }

    private static void skill(ServerPlayer player, IdleSkill skill) {
        String name = "idle_" + skill.id();
        IdleAction action = firstAction(skill);
        if (action == null) {
            check(false, name, "no level 0 action available in the pack");
            return;
        }
        PlayerIdleState state = new PlayerIdleState();
        ItemStack tool = toolFor(skill.tool());
        if (!tool.isEmpty()) {
            state.tools().setStackInSlot(skill.index(), tool);
        }
        if (action.isRecipe()) {
            ItemStack[] inputs = action.recipe().input().getItems();
            if (inputs.length == 0) {
                check(false, name, action.key() + " has an empty ingredient");
                return;
            }
            state.store(inputs[0].copyWithCount(64));
        }
        for (IdleInput input : action.inputs()) {
            BuiltInRegistries.ITEM.getOptional(input.item())
                    .ifPresent(item -> state.store(new ItemStack(item, Math.min(64, input.count() * 32))));
        }
        state.setSlotAction(0, action.key());
        long items = 0;
        for (int i = 0; i < 10; i++) {
            items += IdleEngine.advance(player, state, 60.0);
        }
        SlotStatus status = state.slotStatus(0);
        if (skill.seasonal() && status == SlotStatus.OUT_OF_SEASON) {
            CiHarness.log("INFO", name, action.key() + " is out of season now; the year check covers it");
            return;
        }
        check(items > 0, name, action.key() + " made " + items + " items in 10 min, status " + status);
    }

    private static IdleAction firstAction(IdleSkill skill) {
        List<IdleAction> actions = skill.usesRecipes() ? RecipeActions.actions(skill) : IdleCatalog.availableActions(skill);
        for (IdleAction action : actions) {
            if (action.level() == 0) {
                return action;
            }
        }
        return null;
    }

    private static ItemStack toolFor(ToolKind kind) {
        return switch (kind) {
            case AXE -> new ItemStack(Items.NETHERITE_AXE);
            case PICKAXE -> new ItemStack(Items.NETHERITE_PICKAXE);
            case SHOVEL -> new ItemStack(Items.NETHERITE_SHOVEL);
            case HOE -> new ItemStack(Items.NETHERITE_HOE);
            case ROD -> new ItemStack(Items.FISHING_ROD);
            case SHEARS -> new ItemStack(Items.SHEARS);
            case WEAPON -> new ItemStack(Items.NETHERITE_SWORD);
            case BRUSH -> new ItemStack(Items.BRUSH);
            case NONE -> ItemStack.EMPTY;
        };
    }

    /** Levels Adventuring to the T5 requirement, then lets the companion fight each tier with netherite gear. */
    private static void adventuring(ServerPlayer player) {
        IdleSkill skill = IdleCatalog.skill("adventuring");
        if (skill == null) {
            check(false, "adventuring", "no Adventuring skill");
            return;
        }
        int needed = 0;
        for (IdleAction action : skill.actions()) {
            needed = Math.max(needed, action.level());
        }
        PlayerIdleState levels = new PlayerIdleState();
        for (int i = 0; i < 400 && SkillLevels.level(player, levels, skill) < needed; i++) {
            SkillLevels.addXp(player, levels, skill, 1000);
        }
        int level = SkillLevels.level(player, levels, skill);
        check(level >= needed, "adventuring_level", "level " + level + ", T5 needs " + needed);
        for (IdleAction action : skill.actions()) {
            String name = "adventuring_" + action.id();
            PlayerIdleState state = new PlayerIdleState();
            // The fallback XP only counts without Pufferfish's Skills; the pack reads the level from the player.
            state.addFallbackXp(skill.id(), 1_000_000);
            state.tools().setStackInSlot(skill.index(), new ItemStack(Items.NETHERITE_SWORD));
            state.armor().setStackInSlot(0, new ItemStack(Items.NETHERITE_HELMET));
            state.armor().setStackInSlot(1, new ItemStack(Items.NETHERITE_CHESTPLATE));
            state.armor().setStackInSlot(2, new ItemStack(Items.NETHERITE_LEGGINGS));
            state.armor().setStackInSlot(3, new ItemStack(Items.NETHERITE_BOOTS));
            for (int slot = 0; slot < PlayerIdleState.FOOD_SLOTS; slot++) {
                state.food().setStackInSlot(slot, new ItemStack(Items.COOKED_BEEF, 64));
            }
            state.setSlotAction(0, action.key());
            long items = 0;
            boolean rested = false;
            for (int i = 0; i < 10; i++) {
                items += IdleEngine.advance(player, state, 60.0);
                rested |= state.slotStatus(0) == SlotStatus.RESTING;
            }
            SlotStatus status = state.slotStatus(0);
            boolean fighting = status == SlotStatus.RUNNING || status == SlotStatus.RESTING;
            check(items > 0 && fighting, name, items + " loot items in 10 min, status " + status
                    + (rested ? ", lost a fight" : ""));
        }
    }

    // ---------------------------------------------------------------- seasons

    /**
     * Plants every crop of the pack on wet farmland and runs one farm day, in the current season; also notes which
     * idle Farming actions are in season. {@link #year} compares the seasons afterwards.
     */
    static void recordSeason(MinecraftServer server) {
        ServerLevel level = server.overworld();
        String season = Seasons.current(level);
        if (season == null) {
            check(false, "season", "Serene Seasons reports no season");
            return;
        }
        // Crops tagged for a season first, so the limit never drops one of them.
        List<Block> crops = BuiltInRegistries.BLOCK.stream()
                .filter(block -> block instanceof CropBlock)
                .sorted(Comparator.comparing((Block block) -> !isSeasonal(block))
                        .thenComparing(block -> BuiltInRegistries.BLOCK.getKey(block).toString()))
                .limit(MAX_CROPS)
                .toList();
        BlockPos origin = level.getSharedSpawnPos().offset(-64, 0, -64).atY(310);
        List<BlockPos> soils = new ArrayList<>();
        Map<BlockPos, BlockState> planted = new LinkedHashMap<>();
        for (int i = 0; i < crops.size(); i++) {
            BlockPos soil = origin.offset((i % ROW) * 2, 0, (i / ROW) * 2);
            level.setBlock(soil, Blocks.FARMLAND.defaultBlockState().setValue(FarmBlock.MOISTURE, 7), 3);
            BlockState crop = crops.get(i).defaultBlockState();
            level.setBlock(soil.above(), crop, 3);
            soils.add(soil);
            planted.put(soil.above(), crop);
        }
        DailyFarm.runDay(level, soils, List.of());
        Set<String> grew = new TreeSet<>();
        planted.forEach((pos, before) -> {
            String id = BuiltInRegistries.BLOCK.getKey(before.getBlock()).toString();
            CROPS.add(id);
            BlockState after = level.getBlockState(pos);
            if (after.is(before.getBlock()) && !after.equals(before)) {
                grew.add(id);
            }
            level.setBlock(pos, Blocks.AIR.defaultBlockState(), 3);
            level.setBlock(pos.below(), Blocks.AIR.defaultBlockState(), 3);
        });
        GREW.computeIfAbsent(season, s -> new TreeSet<>()).addAll(grew);

        Set<String> inSeason = new TreeSet<>();
        IdleSkill farming = IdleCatalog.skill("farming");
        ServerPlayer player = CiPlayer.get(server);
        if (farming != null && player != null) {
            for (IdleAction action : IdleCatalog.availableActions(farming)) {
                if (IdleEngine.inSeason(player, action)) {
                    inSeason.add(action.id());
                }
            }
        }
        IDLE_FARMING.computeIfAbsent(season, s -> new TreeSet<>()).addAll(inSeason);
        CiHarness.log("INFO", "season_" + season, grew.size() + " of " + planted.size() + " crops grew a stage: " + grew
                + "; idle Farming in season: " + inSeason);
    }

    /** After the simulated year: every season was seen, and the seasons change which crops grow. */
    static void year(MinecraftServer server) {
        List<String> missing = new ArrayList<>();
        for (String season : SEASONS) {
            if (!GREW.containsKey(season)) {
                missing.add(season);
            }
        }
        check(missing.isEmpty(), "year_all_seasons", "seasons seen " + GREW.keySet() + ", missing " + missing);
        for (String season : SEASONS) {
            if (!season.equals("winter") && GREW.containsKey(season)) {
                check(!GREW.get(season).isEmpty(), "crops_grow_in_" + season, GREW.get(season).size() + " crops grew");
            }
        }
        // Serene Seasons crop tags: a crop listed for some season must grow in at least one season.
        Map<String, List<String>> neverGrew = new TreeMap<>();
        for (String id : CROPS) {
            Block block = BuiltInRegistries.BLOCK.get(ResourceLocation.parse(id));
            List<String> tagged = new ArrayList<>();
            for (String season : SEASONS) {
                if (block.defaultBlockState().is(seasonTag(season))) {
                    tagged.add(season);
                }
            }
            boolean grewOnce = GREW.values().stream().anyMatch(set -> set.contains(id));
            if (!tagged.isEmpty() && !grewOnce) {
                neverGrew.put(id, tagged);
            }
        }
        check(neverGrew.isEmpty(), "seasonal_crops_grow", neverGrew.isEmpty()
                ? CROPS.size() + " crops checked" : "never grew in their seasons: " + neverGrew);
        if (GREW.containsKey("winter") && GREW.containsKey("summer")) {
            check(GREW.get("winter").size() < GREW.get("summer").size(), "winter_is_harsher",
                    "winter " + GREW.get("winter").size() + " crops, summer " + GREW.get("summer").size());
        }
        Set<String> idleFarmingSeen = new TreeSet<>();
        IDLE_FARMING.values().forEach(idleFarmingSeen::addAll);
        IdleSkill farming = IdleCatalog.skill("farming");
        int idleTotal = farming == null ? 0 : IdleCatalog.availableActions(farming).size();
        check(idleTotal > 0 && !idleFarmingSeen.isEmpty(), "idle_farming_seasons",
                idleFarmingSeen.size() + " of " + idleTotal + " idle Farming actions were in season at some point");
        String now = Seasons.current(server.overworld());
        check("spring".equals(now), "year_wraps_to_spring", "season after one year: " + now);
    }

    private static boolean isSeasonal(Block block) {
        for (String season : SEASONS) {
            if (block.defaultBlockState().is(seasonTag(season))) {
                return true;
            }
        }
        return false;
    }

    private static TagKey<Block> seasonTag(String season) {
        return TagKey.create(Registries.BLOCK, ResourceLocation.fromNamespaceAndPath("sereneseasons", season + "_crops"));
    }
}
