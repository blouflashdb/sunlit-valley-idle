// priority: 1000
const $CuriosApi = Java.loadClass("top.theillusivec4.curios.api.CuriosApi")

// getDay and compareDay are ported: kubejs/startup_scripts/globalGeneralUtils.js

global.getFacingPlusOffset = (facing, pos, offset) => {
  switch (facing) {
    case "north":
      return pos.offset(0, 0, -offset);
    case "south":
      return pos.offset(0, 0, offset);
    case "west":
      return pos.offset(-offset, 0, 0);
    case "east":
      return pos.offset(offset, 0, 0);
  }
};

global.formatPriceTruncated = (number) => {
  let stringNumber = number.toString();
  if (stringNumber.length < 4) return number;
  if (stringNumber.length > 9) {
    let output = stringNumber.slice(0, stringNumber.length - 9);
    if (stringNumber.length === 10 && stringNumber.charAt(1) != "0") {
      output += '.' + stringNumber.charAt(1);
    }
    return output + "B";
  }
  if (stringNumber.length > 6) {
    let output = stringNumber.slice(0, stringNumber.length - 6);
    if (stringNumber.length === 7 && stringNumber.charAt(1) != "0") {
      output += '.' + stringNumber.charAt(1);
    }
    return output + "M";
  }

  return global.formatPrice(number);
};