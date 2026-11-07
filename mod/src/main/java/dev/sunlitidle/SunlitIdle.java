package dev.sunlitidle;

import com.mojang.logging.LogUtils;
import net.minecraftforge.fml.common.Mod;
import org.slf4j.Logger;

@Mod(SunlitIdle.MOD_ID)
public final class SunlitIdle {
    public static final String MOD_ID = "sunlitidle";
    public static final Logger LOGGER = LogUtils.getLogger();

    public SunlitIdle() {
        LOGGER.info("Sunlit Valley Idle loaded");
    }
}
