# rspack: `realContentHash` rewrites digits inside text assets when a chunk hash is all digits

rspack can emit an all-digit `[contenthash]` (with the default hex digest and `hashDigestLength: 8`, about
(10/16)^8 ≈ 2.3% of hashes). `RealContentHashPlugin` then searches every text asset for that hash and replaces
each occurrence, including when it is just a run of digits inside an unrelated number, so the asset
content is corrupted.

webpack does not have this problem: provisional hashes always get at least one letter
(`lib/util/nonNumericOnlyHash.js`, used by `JavascriptModulesPlugin`, `CssModulesPlugin` and
`AssetGenerator`).

## Run

```sh
npm install
node repro.mjs
```

`repro.mjs` changes `src/a.js` until the contenthash of chunk `a` is all digits, writes that hash into the
middle of a decimal number in `src/numbers.txt` (a text asset imported only by the unrelated entry `b`), builds
with `optimization.realContentHash: true` and compares the emitted `numbers.*.txt` with the source.

## Expected

The emitted `numbers.*.txt` is identical to `src/numbers.txt`.

## Actual (@rspack/core 2.3.1)

```
seed 4: contenthash of chunk "a" is all digits: 47932981
source : 0.479329815 -1.25 479.32981
emitted: 0.92f831a95 -1.25 479.32981  (numbers.9e782967.txt)
FAIL: RealContentHashPlugin replaced digits inside numbers.txt
```
