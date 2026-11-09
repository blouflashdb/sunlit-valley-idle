// priority: 10
// Helpers of the custom JEI categories (#18; KubeJS Additions' JEIAddedEvents). The data is in
// startup_scripts/recipeViewer/recipeViewerData.js. Society Tweaks' GUI textures are not in the 1.21.1 pack, so the
// categories draw JEI's own slots and arrows on a blank background.
const $JeiFluidRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $JeiFluidResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

/** An item stack for "id" or "6x id", or null when the item is not registered. */
const jeiStack = (text) => {
  if (!text) return null;
  let counted = global.parseCountedId(text);
  if (!global.itemExists(counted.id)) return null;
  return Item.of(counted.id, counted.count);
};

/** The fluid with this id, or null. */
const jeiFluid = (id) => {
  let location = $JeiFluidResourceLocation.parse(String(id));
  return $JeiFluidRegistries.FLUID.containsKey(location) ? $JeiFluidRegistries.FLUID.get(location) : null;
};

/** Adds a slot with a stack and JEI's slot background. Does nothing for a missing item. */
const jeiSlot = (builder, guiHelper, role, x, y, text, tooltip) => {
  let stack = typeof text === "string" ? jeiStack(text) : text;
  if (!stack) return null;
  let slot = builder.addSlot(role, x, y).addItemStack(stack).setBackground(guiHelper.getSlotDrawable(), -1, -1);
  if (tooltip) {
    slot.addTooltipCallback((slotView, lines) => {
      tooltip().forEach((line) => lines.add(line));
    });
  }
  return slot;
};

/** Draws a line of text into a category, as the 1.20.1 categories did. */
const jeiText = (guiGraphics, text, x, y) => {
  guiGraphics.drawWordWrap(Client.font, text, x, y, 177, 0x404040);
};
