# Yale Bright Star Catalogue (BSC5)

Noxara uses a bundled, offline conversion of the Yale Bright Star Catalogue (9,110 records).

## Install the data file

Place `bsc5.json` in this `public/` directory. It is a compact JSON array of rows:

```json
[[1,0.086083,45.229167,6.7],[2,0.084389,-0.503056,6.29]]
```

Each row contains `[HR number, J2000 right ascension in HOURS, J2000 declination in DEGREES, apparent V magnitude]`.

The app loads the file locally at `/bsc5.json`, validates all 9,110 rows and falls back to a small built-in star list if unavailable.

**Do not substitute a different coordinate format without updating the loader.**

Source: Yale Bright Star Catalogue, Fifth Revised Edition (BSC5). Coordinate transformations currently use approximate J2000 positions without proper motion/precession corrections.

## Notes

- A nearby-star match is a *candidate*, not proof of which star the phone points at.
- A dense star catalog increases false positives when compass readings are inaccurate.
- Moon and planets are calculated separately by astronomy-engine.
- Narration for uncurated stars uses verified catalogue fields, not fabricated mythology.
