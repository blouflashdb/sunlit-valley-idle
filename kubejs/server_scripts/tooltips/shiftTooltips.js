console.info("[SOCIETY] shiftTooltips.js loaded");

// Tooltips that change while shift is held (ported from the 1.20.1 client script tooltips/addAdvancedTooltips.js,
// #18; see tooltipShim.js). The ones that read the stack are client scripts (client_scripts/tooltips).
ItemEvents.modifyTooltips((e) => {
    const tooltip = createTooltipShim(e);
    tooltip.addAdvanced("farmersdelight:tomato_seeds", (item, advanced, text) => {
        if (tooltip.shift) {
            text.add(1, [
                Text.white("")
                    .append(Text.translatable("desc.sereneseasons.fertile_seasons"))
                    .append(":"),
                Text.of(" "),
                Text.translatable("desc.sereneseasons.spring").green().append(","),
                Text.of(" "),
                Text.translatable("desc.sereneseasons.summer").yellow().append(","),
                Text.of(" "),
                Text.translatable("desc.sereneseasons.autumn").gold(),
            ]);
        } else {
            text.add(1, [
                Text.translatable(
                    "tooltip.society.hold_key",
                    Text.translatable("key.keyboard.shift").gray()
                ).darkGray(),
            ]);
        }
    });
    tooltip.addAdvanced(
        "farm_and_charm:strawberry_seed",
        (item, advanced, text) => {
            if (tooltip.shift) {
                text.add(1, [
                    Text.white("")
                        .append(Text.translatable("desc.sereneseasons.fertile_seasons"))
                        .append(":"),
                    Text.of(" "),
                    Text.translatable("desc.sereneseasons.spring").green(),
                ]);
            } else {
                text.add(1, [
                    Text.translatable(
                        "tooltip.society.hold_key",
                        Text.translatable("key.keyboard.shift").gray()
                    ).darkGray(),
                ]);
            }
        }
    );

    const magnifyingBlocks = [
        Text.translatable("block.society.auto_grabber"),
        Text.translatable("block.society.artisan_hopper"),
        Text.translatable("block.farmingforblockheads.chicken_nest"),
        Text.translatable("block.society.feeding_trough"),
        Text.translatable("block.society.snow_melter"),
        Text.translatable("block.society.fish_pond_basket"),
        Text.translatable("block.society.fish_pond_hatchery"),
        Text.translatable("block.society.golden_clock"),
        Text.translatable("block.society.mana_clock"),
        Text.translatable("block.society.mana_milker"),
        Text.translatable("item.society.magnifying_glass.description.view_block.sprinklers"),
        Text.translatable("block.society.growth_obelisk"),
        Text.translatable("block.society.ribbit_hut"),
        Text.translatable("block.society.fish_pond_manager"),
    ];
    tooltip.addAdvanced("society:magnifying_glass", (item, advanced, text) => {
        if (tooltip.shift) {
            magnifyingBlocks.forEach((block, index) => {
                text.add(index + 1, Text.gold(block));
            });
        } else {
            text.add(
                1,
                Text.translatable("item.society.magnifying_glass.description").green()
            );
            text.add(2, [
                Text.translatable(
                    "item.society.magnifying_glass.description.view_block",
                    Text.translatable("key.keyboard.shift").gray()
                ).darkGray(),
            ]);
        }
    });
});
