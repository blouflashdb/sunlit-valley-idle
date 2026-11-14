console.info("[SOCIETY] lassoFilter.js loaded");

// The diamond lasso cannot catch entities tagged society:cannot_lasso (tags/husbandryTags.js).
ItemEvents.entityInteracted("moblassos:diamond_lasso", (e) => {
  if (global.checkEntityTag(e.target, "society:cannot_lasso")) e.cancel();
});
