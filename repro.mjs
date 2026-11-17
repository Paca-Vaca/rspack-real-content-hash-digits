// 1. Finds a seed for which rspack gives the `a` chunk an all-digit [contenthash].
// 2. Writes that hash into the middle of decimal numbers in numbers.txt, a text asset of the unrelated entry `b`.
// 3. Builds with optimization.realContentHash and compares the emitted numbers.txt with its source.
import { rspack } from "@rspack/core";
import fs from "node:fs";
import path from "node:path";

const root = import.meta.dirname;
const src = path.join(root, "src");
const dist = path.join(root, "dist");

function build(realContentHash) {
    const compiler = rspack({
        mode: "production",
        context: root,
        entry: { a: "./src/a.js", b: "./src/b.js" },
        output: {
            path: dist,
            filename: "[name].[contenthash].js",
            assetModuleFilename: "[name].[contenthash][ext]",
            hashDigestLength: 8,
            clean: true,
        },
        module: {
            rules: [{
                test: /\.txt$/,
                type: "asset/resource",
                // text asset, so that RealContentHashPlugin updates hashes referenced inside it
                generator: { binary: false },
            }],
        },
        optimization: { minimize: false, realContentHash: realContentHash },
    });
    return new Promise((resolve, reject) => compiler.run((err, stats) => {
        compiler.close(() => {});
        if (err) return reject(err);
        if (stats.hasErrors()) return reject(new Error(stats.toString("errors-only")));
        resolve(stats.toJson({ assets: true }));
    }));
}

const assetName = (stats, prefix) => stats.assets.map(a => a.name).find(n => n.startsWith(prefix));
const chunkHash = stats => /^a\.(\w+)\.js$/.exec(assetName(stats, "a."))[1];

fs.writeFileSync(path.join(src, "numbers.txt"), "0.1 0.2\n");
let hash;
for (let seed = 0; ; seed++) {
    fs.writeFileSync(path.join(src, "a.js"), `console.log(${seed});\n`);
    hash = chunkHash(await build(false));
    if (/^\d+$/.test(hash)) {
        console.log(`seed ${seed}: contenthash of chunk "a" is all digits: ${hash}`);
        break;
    }
}

const data = `0.${hash}5 -1.25 ${hash.slice(0, 3)}.${hash.slice(3)}\n`;
fs.writeFileSync(path.join(src, "numbers.txt"), data);
if (chunkHash(await build(false)) !== hash) throw new Error("contenthash of chunk \"a\" depends on numbers.txt");

const stats = await build(true);
const emittedName = assetName(stats, "numbers.");
const emitted = fs.readFileSync(path.join(dist, emittedName), "utf8");
console.log(`source : ${data.trim()}`);
console.log(`emitted: ${emitted.trim()}  (${emittedName})`);
if (emitted !== data) {
    console.log("FAIL: RealContentHashPlugin replaced digits inside numbers.txt");
    process.exit(1);
}
console.log("OK");
