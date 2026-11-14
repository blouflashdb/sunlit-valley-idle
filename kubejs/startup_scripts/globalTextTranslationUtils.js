global.translatableWithFallback = (key, fallback) => {
    if(!fallback) return Text.translatable(key);
    else return Text.of(NBT.stringTag(`{"translate":"${key}", "fallback":"${fallback}"}`));
}

global.getTranslatedEntityName = (entity_id, fallback) => {
    return global.translatableWithFallback(`entity.${entity_id.namespace}.${entity_id.path}`, fallback)
}

global.getTranslatedItemName = (item_id, fallback) => {
    const prefix = Item.of(item_id).block ? "block" : "item";
    return global.translatableWithFallback(`${prefix}.${item_id.namespace}.${item_id.path}`, fallback)
}

global.getTranslatedTextWithColorCode = (colorCode, key) => {
    switch(colorCode) {
        case "0":
            return Text.translatable(key).black();
        case "1":
            return Text.translatable(key).darkBlue();
        case "2":
            return Text.translatable(key).darkGreen();
        case "3":
            return Text.translatable(key).darkAqua();
        case "4":
            return Text.translatable(key).darkRed();
        case "5":
            return Text.translatable(key).darkPurple();
        case "6":
            return Text.translatable(key).gold();
        case "7":
            return Text.translatable(key).gray();
        case "8":
            return Text.translatable(key).darkGray();
        case "9":
            return Text.translatable(key).blue();
        case "a":
            return Text.translatable(key).green();
        case "b":
            return Text.translatable(key).aqua();
        case "c":
            return Text.translatable(key).red();
        case "d":
            return Text.translatable(key).lightPurple();
        case "e":
            return Text.translatable(key).yellow();
        case "f":
            return Text.translatable(key).white();
        default:
            return Text.translatable(key);
    }
}

// Notes (hospital receipts, letters) are written books on 1.21.1: Candlelight's note paper stored its text in item
// NBT. author and title are strings, text a text component (or a string).
const $NoteDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $NoteWrittenBookContent = Java.loadClass("net.minecraft.world.item.component.WrittenBookContent");
const $NoteFilterable = Java.loadClass("net.minecraft.server.network.Filterable");

global.getNotePaperItem = (author, text, title) => {
  const page = typeof text === "string" ? Text.of(text) : text;
  let stack = Item.of("minecraft:written_book");
  stack.set(
    $NoteDataComponents.WRITTEN_BOOK_CONTENT,
    new $NoteWrittenBookContent($NoteFilterable.passThrough(String(title).substring(0, 32)), String(author), 0, [$NoteFilterable.passThrough(page)], true)
  );
  return stack;
};

global.getEmbersTextAPICommand = (target, design, duration, text) => {
    return `emberstextapi sendcustom ${target} ${design} ${duration} ${text}`
}