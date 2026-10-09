# Star facts enrichment — provenance and limitations

The application source catalogue `public/bsc5.json` is unchanged. `public/star-facts.json` is a separate JSON object keyed by Harvard Revised (HR) catalogue identifier, with exactly one record per original entry.

## Source and attribution

- **Primary HR keyspace:** Noxara's existing `public/bsc5.json`, based on the Yale Bright Star Catalogue, Fifth Revised Edition (Hoffleit & Warren). Catalogue documentation: https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/V/50
- **Supplemental labels and approximate temperatures:** Bretton Wade's Yale Bright Star Catalog JSON conversion, `bsc5-short.json`: https://github.com/brettonw/YaleBrightStarCatalog (repository MIT license; consult underlying astronomical catalogue attribution). Joined **only by exact HR identifier**, not coordinates.
- **HYG v4.1 reference:** https://github.com/astronexus/HYG-Database/tree/main/hyg/CURRENT . HYG is CC BY-SA 4.0. **HYG measurements are not imported in this version** because the 32 MB CSV could not be read through the available GitHub connector. No HYG-derived claims or licensing assumptions are made.

## Data semantics

- `properName`: label in the supplemental source; names are not individually revalidated against the IAU list.
- `constellation`: three-letter abbreviation **when explicitly present in the source**. A missing value does not imply the star has no constellation.
- `bayerDesignation`: Greek-letter designation without constellation suffix; combine with `constellation` when available.
- `flamsteedNumber`: numeric Flamsteed designation, requiring constellation to form the full name.
- `temperatureK`: **approximate**, computed in the supplemental conversion from B–V or spectral class; not a directly measured temperature.
- `spectralType`, `distanceLy`: null until reliable per-HR measurements are imported. Do not invent these values.
- `notableFacts`: empty array until individually sourced notable facts are available. Do not present generated prose as verified history.
- `sourceIds`: source identifiers for populated supplemental fields; empty for records missing in the supplemental conversion.

## Coverage and validation

- Original HR entries: **9,110**
- Records in `star-facts.json`: **9,110**, one per original HR entry
- Exact HR matches in supplemental source: **9,096**
- Unmatched records (retained with null fields): **14**
- Proper-name labels: **339**
- Constellation abbreviations: **3,143**
- Bayer designations: **1,564**
- Flamsteed numbers: **2,554**
- Approximate temperature values: **9,095**
- Spectral types: **0** (not yet imported)
- Distances: **0** (not yet imported)
- Curated notable facts: **0** (not yet imported)

These figures describe a **partial first-pass enrichment**, not the complete requested HYG cross-match. The original catalogue's 9,110-record coverage is preserved, but not all metadata categories have been filled. Missing data is intentionally null.

## Next enrichment pass

Import HYG v4.1 using the `hr` column and reject dubious distances (HYG documents `dist >= 100000` parsecs as missing or dubious). Prefer authoritative Yale V/50 `SpType` for spectral classification; document source priority, conflicts and provenance. Convert parsecs to light-years using 3.26156 ly/pc. Include verified notes only with per-object references. Respect HYG's CC BY-SA 4.0 requirements when distributing HYG-derived material.
