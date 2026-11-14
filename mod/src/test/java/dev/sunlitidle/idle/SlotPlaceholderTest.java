package dev.sunlitidle.idle;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Every empty-slot placeholder has its sprite and its tooltip lang keys in all lang files of the mod. */
class SlotPlaceholderTest {
    private static final Path ASSETS = Path.of("src/main/resources/assets/sunlitidle");
    private static final List<String> LANGS = List.of("en_us", "de_de");

    @Test
    void everyPlaceholderHasASprite() throws IOException {
        for (SlotPlaceholder placeholder : SlotPlaceholder.values()) {
            Path png = ASSETS.resolve("textures/" + placeholder.spritePath() + ".png");
            assertTrue(Files.isRegularFile(png), "missing sprite " + png);
            BufferedImage image = ImageIO.read(png.toFile());
            assertNotNull(image, "unreadable sprite " + png);
            assertEquals(16, image.getWidth(), png + " width");
            assertEquals(16, image.getHeight(), png + " height");
            assertTrue(image.getColorModel().hasAlpha(), png + " needs transparency");
        }
    }

    @Test
    void everyPlaceholderHasLangKeys() throws IOException {
        for (String lang : LANGS) {
            String json = Files.readString(ASSETS.resolve("lang/" + lang + ".json"), StandardCharsets.UTF_8);
            for (SlotPlaceholder placeholder : SlotPlaceholder.values()) {
                assertKey(json, lang, placeholder.translationKey());
                if (!placeholder.isTool()) {
                    assertKey(json, lang, placeholder.descriptionKey());
                }
            }
            assertKey(json, lang, "sunlitidle.slot_hint.required");
            assertKey(json, lang, "sunlitidle.slot_hint.optional");
        }
    }

    @Test
    void armorSlotsGoFromHeadToFeet() {
        assertEquals(SlotPlaceholder.HELMET, SlotPlaceholder.forArmor(1));
        assertEquals(SlotPlaceholder.CHESTPLATE, SlotPlaceholder.forArmor(2));
        assertEquals(SlotPlaceholder.LEGGINGS, SlotPlaceholder.forArmor(3));
        assertEquals(SlotPlaceholder.BOOTS, SlotPlaceholder.forArmor(4));
    }

    private static void assertKey(String json, String lang, String key) {
        assertTrue(json.contains("\"" + key + "\":"), lang + ".json misses " + key);
    }
}
