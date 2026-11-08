package dev.sunlitidle.farm;

import net.minecraft.world.level.block.FarmBlock;

/** Farmland with a fertilizer worked in. Behaves like farmland; {@link DailyFarm} reads the fertilizer. */
public class FertilizedFarmBlock extends FarmBlock {
    private final Fertilizer fertilizer;

    public FertilizedFarmBlock(Fertilizer fertilizer, Properties properties) {
        super(properties);
        this.fertilizer = fertilizer;
    }

    public Fertilizer fertilizer() {
        return fertilizer;
    }
}

