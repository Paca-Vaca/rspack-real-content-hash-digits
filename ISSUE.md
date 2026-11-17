**Title:** [Bug]: `realContentHash` corrupts text assets when a chunk's contenthash is all digits

### System Info

@rspack/core 2.3.1, Node.js 26, macOS

### Details

rspack can generate a `[contenthash]` that consists only of digits. With the default hex digest and
`hashDigestLength: 8` that is (10/16)^8 ≈ 2.3% of hashes, so large projects hit it all the time.

`RealContentHashPlugin` then looks for that hash in every text asset and replaces every match with the
final hash. Nothing checks where the match is, so a digit run inside an unrelated number is replaced too
and the asset is corrupted:

```
source : 0.479329815 -1.25 479.32981
emitted: 0.92f831a95 -1.25 479.32981
```

Large numeric text assets (JSON with float arrays, model or mesh data, CSV) hold many digit runs, so they
are the most likely to break. The bug depends on the hash, which makes it look random: an unrelated
change somewhere else in the project can change a hash and break or fix the asset.

webpack avoids this by never emitting an all-digit provisional hash: `lib/util/nonNumericOnlyHash.js`
replaces the first character with a letter, and `JavascriptModulesPlugin`, `CssModulesPlugin`,
`AssetGenerator` and `HtmlModulesPlugin` all use it. A port of that guard would fix this. 

**Expected:** with `realContentHash`, an asset whose content does not reference any other asset is
emitted unchanged.

**Workaround:** `optimization.realContentHash: false`.

### Reproduce link

https://github.com/Paca-Vaca/rspack-real-content-hash-digits

### Reproduce Steps

1. `npm install`
2. `node repro.mjs`

The script changes `src/a.js` until the contenthash of chunk `a` is all digits. It then writes that
hash into the middle of a decimal number in `src/numbers.txt`, a text asset (`asset/resource`,
`generator.binary: false`) that only the unrelated entry `b` imports. Next it builds with
`optimization.realContentHash: true` and compares the emitted `numbers.*.txt` with the source. The
script exits with code 1 when they differ.
