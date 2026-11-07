package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;

/** The furnace-style recipe behind a Smelting or Cooking action. */
public record RecipeRef(ResourceLocation id, Ingredient input, ItemStack output) {
}
