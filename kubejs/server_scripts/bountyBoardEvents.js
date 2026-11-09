console.info("[SOCIETY] bountyBoardEvents.js loaded");

// A bounty board's seasonal decrees follow the season when someone opens it (startup_scripts/bountyBoards.js).
BlockEvents.rightClicked("bountiful:bountyboard", (e) => {
  global.updateSeasonalDecrees(e.block, e.level);
});
