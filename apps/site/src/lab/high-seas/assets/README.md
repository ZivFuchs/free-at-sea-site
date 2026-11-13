Baked by `../scripts/build-field.ts` from Natural Earth (public domain, naturalearthdata.com):
`ne_110m_land`, `ne_50m_land`, `ne_10m_minor_islands` GeoJSON from github.com/nvkelso/natural-earth-vector.

- `field.png`: 720×360 equirectangular, 0 = land, else 1 + km to nearest coast / 5.
- `coast.bin`: 110m coastline rings, int16 hundredths of a degree.

The 200 nm line is distance-to-coast only: no treaty boundaries, median lines or extended shelves.
