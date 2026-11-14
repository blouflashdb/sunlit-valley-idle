package dev.sunlitidle.idle;

import net.minecraft.core.RegistryAccess;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.AbstractCookingRecipe;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.neoforged.neoforge.server.ServerLifecycleHooks;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Builds Smelting and Cooking actions from the pack's furnace, blast furnace, smoker and campfire recipes, so
 * every modded recipe works without listing it. Rebuilt when the recipes change.
 */
public final class RecipeActions {
    /** Base time is this share of the recipe's furnace time. */
    private static final double TIME_FACTOR = 0.4;
    /** Set on the client, where there may be no integrated server. */
    public static Supplier<RecipeManager> clientRecipes = () -> null;
    public static Supplier<RegistryAccess> clientRegistries = () -> null;

    private static RecipeManager builtFrom;
    private static int builtSize = -1;
    private static final Map<String, List<IdleAction>> BY_SKILL = new HashMap<>();
    private static final Map<String, IdleAction> BY_KEY = new HashMap<>();

    private RecipeActions() {
    }

    public static synchronized List<IdleAction> actions(IdleSkill skill) {
        refresh();
        return BY_SKILL.getOrDefault(skill.id(), List.of());
    }

    public static synchronized IdleAction byKey(String key) {
        refresh();
        return BY_KEY.get(key);
    }

    private static void refresh() {
        RecipeManager recipes;
        RegistryAccess registries;
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server != null) {
            recipes = server.getRecipeManager();
            registries = server.registryAccess();
        } else {
            recipes = clientRecipes.get();
            registries = clientRegistries.get();
        }
        if (recipes == null || registries == null) {
            return;
        }
        int size = recipes.getRecipes().size();
        if (recipes == builtFrom && size == builtSize) {
            return;
        }
        builtFrom = recipes;
        builtSize = size;
        BY_SKILL.clear();
        BY_KEY.clear();
        for (IdleSkill skill : IdleCatalog.skills()) {
            if (!skill.usesRecipes()) {
                continue;
            }
            // One action per input and output pair: the fastest recipe wins.
            Map<String, IdleAction> unique = new LinkedHashMap<>();
            for (ResourceLocation typeId : skill.recipeTypes()) {
                RecipeType<?> type = BuiltInRegistries.RECIPE_TYPE.getOptional(typeId).orElse(null);
                if (type == null) {
                    continue;
                }
                for (RecipeHolder<?> holder : recipes.getRecipes()) {
                    Recipe<?> recipe = holder.value();
                    if (recipe.getType() != type || !(recipe instanceof AbstractCookingRecipe cooking)) {
                        continue;
                    }
                    IdleAction action = toAction(skill, holder.id(), cooking, registries);
                    if (action == null) {
                        continue;
                    }
                    String pair = firstInput(cooking.getIngredients().get(0)) + ">" + BuiltInRegistries.ITEM.getKey(action.recipe().output().getItem());
                    IdleAction old = unique.get(pair);
                    if (old == null || action.seconds() < old.seconds()) {
                        unique.put(pair, action);
                    }
                }
            }
            List<IdleAction> list = new ArrayList<>(unique.values());
            list.sort(Comparator.comparingInt(IdleAction::level).thenComparing(a -> a.recipe().output().getHoverName().getString()));
            for (IdleAction a : list) {
                BY_KEY.put(a.key(), a);
            }
            BY_SKILL.put(skill.id(), List.copyOf(list));
        }
    }

    private static String firstInput(Ingredient ingredient) {
        ItemStack[] items = ingredient.getItems();
        return items.length == 0 ? "?" : String.valueOf(BuiltInRegistries.ITEM.getKey(items[0].getItem()));
    }

    private static IdleAction toAction(IdleSkill skill, ResourceLocation id, AbstractCookingRecipe recipe,
                                       RegistryAccess registries) {
        if (recipe.getIngredients().isEmpty() || recipe.getIngredients().get(0).isEmpty()) {
            return null;
        }
        ItemStack output = recipe.getResultItem(registries);
        if (output.isEmpty()) {
            return null;
        }
        ResourceLocation outputId = BuiltInRegistries.ITEM.getKey(output.getItem());
        if (outputId == null) {
            return null;
        }
        float experience = recipe.getExperience();
        int level = Math.min(12, (int) Math.floor(experience * 8));
        FoodProperties food = output.getFoodProperties(null);
        if (food != null && skill.id().equals("cooking")) {
            level = Math.min(12, food.nutrition() / 2);
        }
        double seconds = Math.max(IdleMath.MIN_SECONDS, recipe.getCookingTime() / 20.0 * TIME_FACTOR);
        int xp = Math.max(1, Math.round(experience * 10));
        String key = skill.id() + "/" + id.getNamespace() + "/" + id.getPath();
        return new IdleAction(key, skill.id(), id.toString(), level, 0, seconds, xp, outputId, List.of(), List.of(), 0,
                new RecipeRef(id, recipe.getIngredients().get(0), output.copy()));
    }
}
