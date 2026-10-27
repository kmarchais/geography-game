# Asset sources

The base globe's assets are checked in. Ordinary builds and the whole-planet view do not contact external data providers. Close zoom requests sharper NASA imagery when online.

| Asset | Source | Terms |
| --- | --- | --- |
| Country outlines | [United Nations combined-country layer, hosted by UNEP-WCMC](https://data-gis.unep-wcmc.org/server/rest/services/Hosted/UN_Boundaries/MapServer/6), at 1:1 million scale. Shared arcs are simplified once, preserving microstate detail. Associated territories group by the source `isoclr` code. Tuvalu retains its detailed Natural Earth 5.1.2 coastline to include the tested Funafuti islet, with unchanged UN country assignment. | Based on United Nations boundary data. See [UN map permissions](https://www.un.org/geospatial/mandates/public). Atlas is a derived map, not an official UN product; boundaries and names do not imply UN endorsement or acceptance. |
| Country names, regions, and quiz membership | [world-countries 5.1.0](https://www.npmjs.com/package/world-countries), from mledoze/countries | Open Database License. Included in `public/data/globe/LICENSE-world-countries.txt`. The derived country snapshot is available under those terms. |
| Blue Marble Earth image | NASA imagery distributed with [three-globe 2.44.0](https://www.npmjs.com/package/three-globe) examples | Distributor's MIT license is included in `public/data/globe/LICENSE-three-globe.txt`. |
| Zoom imagery | [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), BlueMarble_ShadedRelief_Bathymetry, geographic 500m tile matrix | NASA imagery. Requested directly from NASA, without an API key. Maximum source resolution is approximately 500 metres. |
| DM Sans and Manrope | [Google Fonts](https://fonts.google.com/) | SIL Open Font License. License text is beside the local font files in `public/fonts`. |
| Atlas icon | `public/atlas.svg`, rendered by `scripts/generate-icons.mjs` for web, Android, and splash images | Original project vector, created for Atlas. |

`bun run data:globe` regenerates only the country snapshot from the UN layer and the checked-in quiz catalog. The upstream endpoint is not versioned; the downloaded bytes are hashed in `sources.json`. To reproduce a retained download, pass its GeoJSON path as the command argument. The generator groups associated territories, requires all 195 quiz IDs, simplifies shared arcs, verifies interior hint positions, and writes source hashes. It applies the checked-in Tuvalu coastline refinement, then leaves Earth imagery unchanged. Review the generated diff before committing a data update. Normal builds do not regenerate these files.

The snapshot is also checked in as gzip for hosts without automatic compression. After changing `earth.jpg`, regenerate its 1024 by 512 preview with `powershell -NoProfile -File scripts/prepare-earth-preview.ps1` on Windows, or resize the source to those dimensions with an image tool on another platform. The preview lets the planet appear before the full image arrives.

Zoom tiles use at most four concurrent requests and retain at most 32 textures. Requests expire after twelve seconds, and temporary failures are retried after five seconds or when connectivity returns. Tile failures leave the local Earth visible. UN-derived boundaries remain generalized at close zoom; they are not survey data.

French country names in `public/data/globe/names.fr.json` come from the same pinned world-countries 5.1.0 catalog and use its included Open Database License. `bun run data:names` regenerates only the name map and checks coverage of all 195 quiz countries. It does not change geometry or country IDs.
