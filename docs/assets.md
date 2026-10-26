# Asset sources

The base globe's assets are checked in. Ordinary builds and the whole-planet view do not contact external data providers. Close zoom requests sharper NASA imagery when online.

| Asset | Source | Terms |
| --- | --- | --- |
| Country outlines | [Natural Earth 5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2), 10m countries with shared boundaries simplified once and small-territory boundaries retained | [Public domain](https://www.naturalearthdata.com/about/terms-of-use/) |
| Country names, regions, and quiz membership | [world-countries 5.1.0](https://www.npmjs.com/package/world-countries), from mledoze/countries | Open Database License. Included in `public/data/globe/LICENSE-world-countries.txt`. The derived country snapshot is available under those terms. |
| Blue Marble Earth image | NASA imagery distributed with [three-globe 2.44.0](https://www.npmjs.com/package/three-globe) examples | Distributor's MIT license is included in `public/data/globe/LICENSE-three-globe.txt`. |
| Zoom imagery | [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), BlueMarble_ShadedRelief_Bathymetry, geographic 500m tile matrix | NASA imagery. Requested directly from NASA, without an API key. Maximum source resolution is approximately 500 metres. |
| DM Sans and Manrope | [Google Fonts](https://fonts.google.com/) | SIL Open Font License. License text is beside the local font files in `public/fonts`. |
| Atlas icon | `public/atlas.svg`, rendered by `scripts/generate-icons.mjs` for web, Android, and splash images | Original project vector, created for Atlas. |

`bun run data:globe` regenerates the country snapshot and image. It downloads the pinned sources, checks country count, upgrades small-country geometry, verifies hint positions, and writes source hashes. Review the generated diff before committing a data update. Normal builds do not regenerate these files.

The snapshot is also checked in as gzip for hosts without automatic compression. After changing `earth.jpg`, regenerate its 1024 by 512 preview with `powershell -NoProfile -File scripts/prepare-earth-preview.ps1` on Windows, or resize the source to those dimensions with an image tool on another platform. The preview lets the planet appear before the full image arrives.

Zoom tiles use at most four concurrent requests and retain at most 32 textures. Requests expire after twelve seconds, and temporary failures are retried after five seconds or when connectivity returns. Tile failures leave the local Earth visible. Natural Earth boundaries remain a generalized map at close zoom; they are not survey data.
