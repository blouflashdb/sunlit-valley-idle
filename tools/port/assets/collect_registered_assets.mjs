// Runs the ported KubeJS startup scripts under Node with stand-ins for the KubeJS API and prints, as JSON,
// every item and block they register with the texture or parent model its generated model will use.
// tools/port/assets/check_placeholders.py uses the output to find society:* assets that have no placeholder.
//
// Usage: node tools/port/assets/collect_registered_assets.mjs [kubejs dir]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const kubejsDir = path.resolve(process.argv[2] || "kubejs");
const startupDir = path.join(kubejsDir, "startup_scripts");

// Anything the scripts touch that is not modelled below: callable, chainable, iterable, empty.
const anything = new Proxy(function () {}, {
  get: (target, key) => {
    if (key === Symbol.toPrimitive) return () => "";
    if (key === Symbol.iterator) return function* () {};
    if (key === "forEach" || key === "map") return () => [];
    return anything;
  },
  apply: () => anything,
  construct: () => anything,
});

const items = [];
// KubeJS fires the registry events after every startup script has loaded.
const registryHandlers = [];
const blocks = [];

const makeBuilder = (kind, id, type) => {
  const record = { id, type: type || "basic", texture: null, textures: {}, parentModel: null, tint: false };
  (kind === "item" ? items : blocks).push(record);
  const builder = new Proxy(
    {},
    {
      get: (target, key) => {
        if (key === "texture")
          return (a, b) => {
            // item: texture(path) or texture(layer, path); block: texture(side, path)
            if (b === undefined) record.texture = String(a);
            else record.textures[String(a)] = String(b);
            return builder;
          };
        if (key === "textureAll")
          return (a) => {
            record.texture = String(a);
            return builder;
          };
        if (key === "parentModel" || key === "model")
          return (a) => {
            record.parentModel = String(a);
            return builder;
          };
        if (key === "color")
          return () => {
            record.tint = true;
            return builder;
          };
        if (key === "item")
          return (fn) => {
            if (typeof fn === "function") fn(makeBuilder("item", id, "block_item"));
            return builder;
          };
        if (key === "noItem")
          return () => {
            record.noItem = true;
            return builder;
          };
        return () => builder;
      },
    }
  );
  return builder;
};

const registryEvent = (kind) => ({
  create: (id, type) => makeBuilder(kind, String(id), type),
});

const dyes = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray",
  "cyan", "purple", "blue", "brown", "green", "red", "black"];

const context = {
  console: { info: () => {}, log: () => {}, warn: () => {}, error: (...a) => process.stderr.write(a.join(" ") + "\n") },
  global: {},
  StartupEvents: new Proxy(
    {},
    {
      get: (t, key) =>
        key === "registry"
          ? (kind, fn) => {
              kind = String(kind).replace(/^minecraft:/, "");
              if (kind === "item" || kind === "block") registryHandlers.push([kind, fn]);
            }
          : () => {},
    }
  ),
  Item: { of: (s) => ({ id: String(s).replace(/^\d+x\s+/, ""), count: 1 }) },
  Color: { DYE: dyes, ...Object.fromEntries(dyes.map((d) => [d.toUpperCase(), anything])) },
  Java: { loadClass: () => anything },
};
context.global.global = context.global;
// Other KubeJS globals the startup scripts use; extend the list when a script fails with a ReferenceError.
for (const name of ["Text", "NBT", "Platform", "Utils", "JsonIO", "Ingredient", "Component", "Client", "Blocks",
  "Items", "BlockProperties", "SoundType", "Direction", "MapColor", "NativeEvents"]) {
  if (!(name in context)) context[name] = anything;
}
const sandbox = vm.createContext(context);

// KubeJS strings have .namespace and .path.
vm.runInContext(
  `Object.defineProperty(String.prototype, "namespace", { get() { return this.includes(":") ? this.split(":")[0] : "minecraft"; } });
   Object.defineProperty(String.prototype, "path", { get() { return this.includes(":") ? this.split(":")[1] : String(this); } });`,
  sandbox
);

// KubeJS order: higher priority first, then by path.
const scripts = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.name.endsWith(".js")) {
      const source = fs.readFileSync(full, "utf8");
      const match = source.match(/^\s*\/\/\s*priority\s*:\s*(-?\d+)/m);
      scripts.push({ file: path.relative(startupDir, full), source, priority: match ? Number(match[1]) : 0 });
    }
  }
};
walk(startupDir);
scripts.sort((a, b) => b.priority - a.priority || a.file.localeCompare(b.file));

let failed = false;
for (const script of scripts) {
  try {
    vm.runInContext(script.source, sandbox, { filename: script.file });
  } catch (error) {
    failed = true;
    process.stderr.write(`${script.file}: ${error && error.stack ? error.stack : error}\n`);
  }
}

for (const [kind, fn] of registryHandlers) {
  try {
    fn(registryEvent(kind));
  } catch (error) {
    failed = true;
    process.stderr.write(`${kind} registry: ${error && error.stack ? error.stack : error}\n`);
  }
}

process.stdout.write(JSON.stringify({ items, blocks }, null, 2) + "\n");
process.exitCode = failed ? 1 : 0; // exit() could cut off the piped output
