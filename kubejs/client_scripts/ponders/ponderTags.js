// Ponder tag and scenes (PonderJS 2.4) of the cooking and brewing machines, ported unchanged from 1.20.1.
// tools/port/port_ponders.py lists the blocks and items they use; ponderBlocksTest.js checks them in CI.
Ponder.tags((e) => {
  const cookingBrewing = [
    "vinery:grapevine_pot",
    "brewery:wooden_brewingstation",
    "brewery:copper_brewingstation",
    "brewery:netherite_brewingstation",
    "bakery:baker_station",
  ];
  e.createTag(
    "society:cooking_brewing",
    "brewery:wooden_brewingstation",
    "Cooking and Brewing",
    "Tutorials for complex cooking & brewing machines",
    cookingBrewing
  );
});
