package dev.sunlitidle.farm;

import dev.sunlitidle.SunlitIdle;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import it.unimi.dsi.fastutil.longs.LongSet;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.chunk.LevelChunkSection;
import net.minecraft.world.level.saveddata.SavedData;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.level.ChunkEvent;
import net.neoforged.neoforge.event.level.LevelEvent;
import net.neoforged.neoforge.event.level.block.CropGrowEvent;
import net.neoforged.neoforge.event.tick.LevelTickEvent;

import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;

/**
 * The Stardew-like farm day. Every morning (day time {@link #MORNING}) each loaded farm tile is processed once:
 * a crop on watered soil grows one stage if Serene Seasons finds it in season (speed fertilizers add stages on its first day), then the soil dries
 * unless a hydrating fertilizer keeps it wet or rain falls on it, then sprinklers water their area.
 * Crops in {@code dew_drop_farmland_growth:cancel_random_tick} on such soil do not grow on random ticks.
 * While it rains, exposed farmland is watered every {@link #RAIN_INTERVAL} ticks.
 */
public final class DailyFarm {
    static final long MORNING = 5;
    private static final int RAIN_INTERVAL = 100;
    private static final int MAX_EXTRA_TICKS = 16;

    private static final Map<ServerLevel, LongSet> LOADED = new IdentityHashMap<>();
    /** True while this class grows crops itself, so the random tick block below lets the growth through. */
    private static boolean growing;

    private DailyFarm() {
    }

    public static void init() {
        NeoForge.EVENT_BUS.addListener(DailyFarm::onLevelTick);
        NeoForge.EVENT_BUS.addListener(DailyFarm::onChunkLoad);
        NeoForge.EVENT_BUS.addListener(DailyFarm::onChunkUnload);
        NeoForge.EVENT_BUS.addListener(DailyFarm::onLevelUnload);
        NeoForge.EVENT_BUS.addListener(DailyFarm::onCropGrow);
    }

    private static void onChunkLoad(ChunkEvent.Load event) {
        if (event.getLevel() instanceof ServerLevel level && event.getChunk() instanceof LevelChunk) {
            LOADED.computeIfAbsent(level, l -> new LongOpenHashSet()).add(event.getChunk().getPos().toLong());
        }
    }

    private static void onChunkUnload(ChunkEvent.Unload event) {
        if (event.getLevel() instanceof ServerLevel level) {
            LongSet chunks = LOADED.get(level);
            if (chunks != null) {
                chunks.remove(event.getChunk().getPos().toLong());
            }
        }
    }

    private static void onLevelUnload(LevelEvent.Unload event) {
        if (event.getLevel() instanceof ServerLevel level) {
            LOADED.remove(level);
        }
    }

    private static void onCropGrow(CropGrowEvent.Pre event) {
        if (growing || !(event.getLevel() instanceof ServerLevel level)) {
            return;
        }
        if (event.getState().is(FarmTags.DAILY_CROPS) && Watering.isWaterable(level.getBlockState(event.getPos().below()))) {
            event.setResult(CropGrowEvent.Pre.Result.DO_NOT_GROW);
        }
    }

    private static void onLevelTick(LevelTickEvent.Post event) {
        if (!(event.getLevel() instanceof ServerLevel level)) {
            return;
        }
        long time = level.getDayTime();
        long day = Math.floorDiv(time, 24000L);
        long timeOfDay = Math.floorMod(time, 24000L);
        DayData data = DayData.get(level);
        if (data.lastDay == Long.MIN_VALUE) {
            data.lastDay = timeOfDay >= MORNING ? day : day - 1;
            data.setDirty();
        }
        if (day != data.lastDay && timeOfDay >= MORNING) {
            data.lastDay = day;
            data.setDirty();
            Scan scan = scan(level);
            runDay(level, scan.soil, scan.sprinklers);
        } else if (level.isRaining() && level.getGameTime() % RAIN_INTERVAL == 0) {
            for (BlockPos soil : scan(level).soil) {
                if (level.isRainingAt(soil.above())) {
                    Watering.setMoist(level, soil);
                }
            }
        }
    }

    /** One farm morning for the given soil and sprinkler positions. Public for game tests and KubeJS. */
    public static void runDay(ServerLevel level, List<BlockPos> soil, List<BlockPos> sprinklers) {
        RandomSource random = level.getRandom();
        for (BlockPos pos : soil) {
            BlockState state = level.getBlockState(pos);
            if (!Watering.isWaterable(state)) {
                continue;
            }
            if (Watering.isMoist(state)) {
                growCrop(level, pos.above(), state, random, 1);
            }
            if (!staysMoist(level, pos)) {
                Watering.setDry(level, pos);
            }
        }
        for (BlockPos pos : sprinklers) {
            int radius = sprinklerRadius(level.getBlockState(pos));
            if (radius <= 0) {
                continue;
            }
            for (BlockPos target : BlockPos.betweenClosed(pos.offset(-radius, -1, -radius), pos.offset(radius, 0, radius))) {
                BlockState state = level.getBlockState(target);
                if (Watering.isWaterable(state) && !(state.getBlock() instanceof GardenPotBlock)) {
                    Watering.setMoist(level, target.immutable());
                }
            }
        }
    }

    /**
     * Grows the plant at {@code pos} by {@code days} daily stages if it is a daily crop and the season allows it.
     * Speed fertilizers in {@code soil} add stages when the crop grows from age 0. Returns whether it grew.
     */
    public static boolean growCrop(ServerLevel level, BlockPos pos, BlockState soil, RandomSource random, int days) {
        BlockState state = level.getBlockState(pos);
        if (!state.is(FarmTags.DAILY_CROPS)) {
            return false;
        }
        growing = true;
        try {
            boolean allowed = CommonHooks.canCropGrow(level, pos, state, true) && SeasonFertility.isFertile(level, pos, state);
            if (!allowed && soil.getBlock() instanceof GardenPotBlock && !level.canSeeSky(pos.above())) {
                allowed = true;
            }
            if (!allowed) {
                return false;
            }
            IntegerProperty age = ageProperty(state);
            if (age == null) {
                return tickUntilChanged(level, pos, state, random);
            }
            int current = state.getValue(age);
            int max = maxOf(age);
            if (state.getBlock() instanceof CropBlock crop) {
                current = crop.getAge(state);
                max = crop.getMaxAge();
            }
            if (current >= max) {
                // Stems, budding bushes and the like do their own thing at full age (place a fruit, turn into a vine).
                return tickUntilChanged(level, pos, state, random);
            }
            int next = Math.min(max, current + growthStages(current, max, soil, days));
            BlockState grown = state.getBlock() instanceof CropBlock crop ? crop.getStateForAge(next) : state.setValue(age, next);
            level.setBlock(pos, grown, 2);
            CommonHooks.fireCropGrowPost(level, pos, state);
            return true;
        } finally {
            growing = false;
        }
    }

    /** Stages a crop at {@code age} grows on {@code soil} in {@code days} days, without the max-age cap. */
    public static int growthStages(int age, int maxAge, BlockState soil, int days) {
        int stages = days;
        if (age == 0 && soil.getBlock() instanceof FertilizedFarmBlock farmland) {
            stages += farmland.fertilizer().speedDays();
        }
        return Math.min(stages, Math.max(0, maxAge - age));
    }

    private static boolean tickUntilChanged(ServerLevel level, BlockPos pos, BlockState state, RandomSource random) {
        for (int i = 0; i < MAX_EXTRA_TICKS; i++) {
            state.randomTick(level, pos, random);
            if (level.getBlockState(pos) != state) {
                return true;
            }
        }
        return false;
    }

    private static boolean staysMoist(ServerLevel level, BlockPos pos) {
        BlockState state = level.getBlockState(pos);
        if (level.isRainingAt(pos.above())) {
            return true;
        }
        if (state.getBlock() instanceof GardenPotBlock) {
            return state.getValue(GardenPotBlock.DELUXE);
        }
        if (!(state.getBlock() instanceof FertilizedFarmBlock farmland)) {
            return false;
        }
        return switch (farmland.fertilizer().hydration()) {
            case ALWAYS -> true;
            case NONE -> false;
            case HALF_GROWN -> {
                BlockState crop = level.getBlockState(pos.above());
                IntegerProperty age = ageProperty(crop);
                if (age == null) {
                    yield true;
                }
                int max = crop.getBlock() instanceof CropBlock c ? c.getMaxAge() : maxOf(age);
                int current = crop.getBlock() instanceof CropBlock c ? c.getAge(crop) : crop.getValue(age);
                yield current < max / 2;
            }
        };
    }

    static int sprinklerRadius(BlockState state) {
        for (int tier = FarmTags.sprinklerTiers(); tier >= 1; tier--) {
            if (state.is(FarmTags.sprinkler(tier))) {
                return tier;
            }
        }
        return 0;
    }

    static IntegerProperty ageProperty(BlockState state) {
        for (Property<?> property : state.getProperties()) {
            if (property instanceof IntegerProperty integer && "age".equals(property.getName())) {
                return integer;
            }
        }
        return null;
    }

    static int maxOf(IntegerProperty property) {
        int max = 0;
        for (int value : property.getPossibleValues()) {
            max = Math.max(max, value);
        }
        return max;
    }

    record Scan(List<BlockPos> soil, List<BlockPos> sprinklers) {
    }

    /** All farm soil and sprinklers in the block-ticking chunks of a level. */
    static Scan scan(ServerLevel level) {
        List<BlockPos> soil = new ArrayList<>();
        List<BlockPos> sprinklers = new ArrayList<>();
        LongSet chunks = LOADED.get(level);
        if (chunks == null) {
            return new Scan(soil, sprinklers);
        }
        for (long key : chunks.toLongArray()) {
            if (!level.shouldTickBlocksAt(key)) {
                continue;
            }
            LevelChunk chunk = level.getChunkSource().getChunkNow(ChunkPos.getX(key), ChunkPos.getZ(key));
            if (chunk == null) {
                continue;
            }
            LevelChunkSection[] sections = chunk.getSections();
            for (int i = 0; i < sections.length; i++) {
                LevelChunkSection section = sections[i];
                if (section.hasOnlyAir() || !section.maybeHas(DailyFarm::isFarmBlock)) {
                    continue;
                }
                int baseY = level.getSectionYFromSectionIndex(i) << 4;
                for (int y = 0; y < 16; y++) {
                    for (int z = 0; z < 16; z++) {
                        for (int x = 0; x < 16; x++) {
                            BlockState state = section.getBlockState(x, y, z);
                            if (!isFarmBlock(state)) {
                                continue;
                            }
                            BlockPos pos = new BlockPos(chunk.getPos().getMinBlockX() + x, baseY + y,
                                    chunk.getPos().getMinBlockZ() + z);
                            if (Watering.isWaterable(state)) {
                                soil.add(pos);
                            } else {
                                sprinklers.add(pos);
                            }
                        }
                    }
                }
            }
        }
        return new Scan(soil, sprinklers);
    }

    private static boolean isFarmBlock(BlockState state) {
        return Watering.isWaterable(state) || sprinklerRadius(state) > 0;
    }

    /** The last farm day processed in a level. */
    static final class DayData extends SavedData {
        private static final String NAME = SunlitIdle.MOD_ID + "_farm_day";
        long lastDay = Long.MIN_VALUE;

        static DayData get(ServerLevel level) {
            return level.getDataStorage().computeIfAbsent(new SavedData.Factory<>(DayData::new, DayData::load, null), NAME);
        }

        private static DayData load(CompoundTag tag, HolderLookup.Provider registries) {
            DayData data = new DayData();
            if (tag.contains("LastDay")) {
                data.lastDay = tag.getLong("LastDay");
            }
            return data;
        }

        @Override
        public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
            tag.putLong("LastDay", lastDay);
            return tag;
        }
    }
}
