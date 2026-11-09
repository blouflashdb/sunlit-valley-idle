// priority: 10
console.info("[SOCIETY] tooltipShim.js loaded");

// The item tooltips (#18). On 1.20.1 they were client scripts (ItemEvents.tooltip with tooltip.add and
// tooltip.addAdvanced). KubeJS 7 has ItemEvents.modifyTooltips, which also runs in server scripts and is sent to the
// clients, so the tooltips that do not depend on the stack live here and boot with the server in CI. This shim keeps
// the 1.20.1 calls:
//   tooltip.add(items, text)             adds lines (text is a line or a list of lines);
//   tooltip.addAdvanced(items, callback) for the callbacks that only check tooltip.shift: the callback runs once
//                                        with shift held and once without, and its lines get the matching requirement.
// Tooltips that read the stack (plushies, fish ponds, prices) are client scripts (client_scripts/tooltips).
// Items that are not registered are skipped and kept in global.tooltipSkippedIds for the CI test.
global.tooltipSkippedIds = [];

/** A tooltip line from a component, a string or a list of parts joined into one line. */
const tooltipLine = (parts) => {
  if (!Array.isArray(parts)) return typeof parts === "string" ? Text.of(parts) : parts;
  let line = Text.of("");
  parts.forEach((part) => line.append(typeof part === "string" ? Text.of(part) : part));
  return line;
};

const tooltipItemIds = (items) => {
  let ids = [];
  (Array.isArray(items) ? items : [items]).forEach((item) => {
    let id = String(item);
    if (id.startsWith("#") || global.itemExists(id)) ids.push(id);
    else global.tooltipSkippedIds.push(id);
  });
  return ids;
};

const createTooltipShim = (event) => {
  const shim = {
    shift: false,
    add: (items, text) => {
      let ids = tooltipItemIds(items);
      if (ids.length > 0) event.add(ids, (Array.isArray(text) ? text : [text]).map(tooltipLine));
    },
    addAdvanced: (items, callback) => {
      let ids = tooltipItemIds(items);
      if (ids.length === 0) return;
      [true, false].forEach((shift) => {
        let lines = [];
        shim.shift = shift;
        callback(null, false, { add: (index, text) => lines.push(tooltipLine(text === undefined ? index : text)) });
        if (lines.length > 0) event.add(ids, { shift: shift }, lines);
      });
      shim.shift = false;
    },
  };
  return shim;
};
