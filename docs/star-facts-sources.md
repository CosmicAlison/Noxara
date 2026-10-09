# Star facts enrichment — provenance and limitations

The application source catalogue `public/bsc5.json` is unchanged. `public/star-facts.json` is a separate JSON object keyed by Harvard Revised (HR) catalogue identifier, with exactly one record per original entry.

## Source and attribution

- **Primary HR keyspace:** Noxara's existing `public/bsc5.json`, based on the Yale Bright Star Catalogue, Fifth Revised Edition (Hoffleit & Warren). Catalogue documentation: https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/V/50
- **Supplemental labels and approximate temperatures:** Bretton Wade's Yale Bright Star Catalog JSON conversion, `bsc5-short.json`: https://github.com/brettonw/YaleBrightStarCatalog (repository MIT license; consult underlying astronomical catalogue attribution). Joined **only by exact HR identifier**, not coordinates.
- **HYG v4.1:** https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/hygdata_v41.csv (CC BY-SA 4.0). Exact HR joins, parsec distances converted to light-years; missing or sentinel distances excluded. 12 duplicate HR rows resolved by preferring records with available distance and spectral type. HYG's catalogue attribution and share-alike requirements apply to distributed derivatives.
- **Yale V/50 fixed-width catalogue:** https://github.com/lsst/all_sky_phot/blob/main/python/lsst/all_sky_phot/bsc5.dat (original Hoffleit & Warren data, 9,110 records). Spectral types and HD IDs read from documented fixed-width fields; positive non-dynamical Yale parallax used only when HYG match unavailable.
- **NASA Science:** curated, per-object `notableFacts` carry a direct `sourceUrl` to the NASA article supporting each fact.

## Data semantics

- `properName`: label in the supplemental source; names are not individually revalidated against the IAU list.
- `constellation`: three-letter abbreviation **when explicitly present in the source**. A missing value does not imply the star has no constellation.
- `bayerDesignation`: Greek-letter designation without constellation suffix; combine with `constellation` when available.
- `flamsteedNumber`: numeric Flamsteed designation, requiring constellation to form the full name.
- `temperatureK`: **approximate**, computed in the supplemental conversion from B–V or spectral class; not a directly measured temperature.
- `spectralType`: Yale V/50 classification, falling back to HYG when unavailable. `distanceLy`: HYG v4.1 parallax-based distance in light-years, falling back to positive non-dynamical Yale parallax. Unknown values remain null.
- `notableFacts`: array of `{text,sourceUrl}` for individually source-verified NASA observing facts, otherwise empty. Do not present generated prose as verified history.
- `sourceIds`: source identifiers for populated supplemental fields; empty for records missing in the supplemental conversion.

## Coverage and validation

- Original HR records: **9,110**; enriched JSON keys: **9,110** (exact HR-keyed coverage)
- Yale V/50 fixed-width entries matched: **9,110**
- HYG v4.1 records matched: **9,029** (12 duplicate-HR HYG rows resolved by quality)
- Proper names: **407**; constellation abbreviations: **9,074**
- Bayer designations: **1,564**; Flamsteed numbers: **2,554**
- Approximate temperatures: **9,095**
- Spectral classifications: **9,096**
- Distances: **8,838**
- Non-stellar catalogue entries: **14**, with spectral/temperature/distance fields cleared
- Source-linked curated facts: **25**, across **22** matched catalogue records; all other `notableFacts` arrays remain empty

## Caveats

HYG distances are catalogue estimates derived from parallax and should not be presented as perfectly precise measurements. `distanceLy` is rounded to two decimals for storage, not an accuracy claim. Where the HYG distance is absent, positive non-dynamical Yale parallaxes may provide a fallback. Proper-name labels are source-provided and are not individually reverified as current IAU-approved names. The 14 non-stellar catalogue entries are kept for HR-key coverage; Noxara should avoid describing them as single stars. NASA-sourced facts are selectively curated, not automatically fabricated for all 9,110 records.

## Runtime

Gemma loads `star-facts.json` on the first star narration or question and reuses the parsed catalogue for the session. Yale and fallback bright-star objects carry an HR identifier; introductions and follow-up questions use only that exact record. Distances and derived temperatures are explicitly labelled estimates. Missing enrichment falls back to HR and apparent magnitude, without passing the old unsourced story as verified context. Failed downloads can be retried on the next request. Solar-system objects retain their existing ephemeris context. The JSON remains a separate public asset; persistent offline availability depends on browser HTTP caching.


### Narrative loading and responsiveness

Gemma, Kokoro and enrichment parsing run in a dedicated module worker. Discovery and question flows show a loading screen until a generated narrative and (unless muted) its audio are prepared. If voice generation fails, the generated text is still shown with an audio error. Narrative failures offer retry without showing a canned story as the generated result.

Only one inference operation runs at a time. Cancelling terminates the worker, so the next request reinitializes models using browser-cached resources where available. Generation has a 90-second deadline and speech synthesis a 60-second deadline; either timeout terminates the worker. The latest audio blob is reused for replay. Autoplay rejection asks the user to tap replay. Replies are capped at 96 new tokens and requested in two short sentences.

This prevents synchronous model work from blocking UI rendering, but does not reduce the FP32 CPU model's memory requirements or guarantee acceptable speed on every phone. WebGPU/CPU precision selection is unchanged. Setup now also warms and checks the Kokoro voice before entering the sky view.

HR 5968 has no proper-name label in the source but has the Bayer designation Rho Coronae Borealis (rho CrB). The display prefers proper name, Bayer designation, Flamsteed designation, then HR. Its NASA-linked exoplanet discovery history was added to the catalogue; no proper name or measurement was invented. The existing text panel distinguishes sourced history from the generated narrative, and a deterministic catalogue summary remains readable when generation fails.


## Full catalogue name and fact audit

Every one of the 9,110 records now has a non-empty `name`, `nameType`, `nameSourceUrls` and `funFact`. A `name` is a display label, **not a claim that every star has a proper name**. Selection is proper name, expanded Bayer designation, expanded Flamsteed designation, historical label for retained non-stellar entries, HD designation, then HR. The original nullable `properName` is preserved.

Online sources fetched for this pass:
- Yale V/50 catalogue: https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz
- Yale V/50 object-specific remarks: https://cdsarc.cds.unistra.fr/ftp/V/50/notes.gz
- Field definitions: https://cdsarc.cds.unistra.fr/ftp/V/50/ReadMe
- Constellation nominative/genitive names: https://github.com/brettonw/YaleBrightStarCatalog/blob/master/constellationNames.txt (MIT conversion project; the obvious source typo “Pices” is corrected to “Pisces”, and the Serpens footnote marker is removed).

`funFact.kind` distinguishes 22 existing source-linked summaries, 4,454 historical catalogue notes, and 4,634 catalogue-based explanations. The last group is explicitly `generated: true`: deterministic prose based on published measurements, not independently documented history. Historical excerpts preserve uncertainty and negation, and are labelled as notes from the 1991 catalogue rather than current discoveries. Some use technical catalogue abbreviations; they are not silently reinterpreted. Only one selected note is included per record to control download size.

The derived explanations use proper-motion components (including the catalogue's cos(dec) convention), signed heliocentric radial velocity, estimated light travel time, or apparent magnitude. Light-travel estimates inherit distance uncertainty; proper motion is not full space velocity. No age, mythology, discovery story, physical companion relationship, or proper name is invented to fill gaps.

Reproduction: decompress the two CDS gzip files into `catalog.txt` and `notes.txt`, save the linked constellation table as `constellations.txt`, then run `python scripts/enrich-star-names.py /path/to/source-directory`. The script uses the existing enrichment's source-provided names, distances and individually curated facts. Source SHA-256 hashes and exact coverage are in `docs/star-facts-coverage.json`. Every join is by exact HR identifier; `public/bsc5.json` remains unchanged.

The existing narrative panel is scrollable and displays the source-linked fact after the narrative. There is no additional facts panel. The title uses the display name and retains the HR identifier underneath. Catalogue text is available if local inference times out; this does not assert that the device's inference performance is fixed.
