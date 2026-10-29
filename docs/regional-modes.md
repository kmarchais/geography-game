# Regional game modes

The home screen still opens the 195-country world challenge. Menu / Game modes selects Americas, Europe, Africa, Asia or Oceania / Pacific. The same globe, scoring, three attempts, skips and reveal behavior apply. Regional results use their actual deck size. Each mode has its own public ranking with one best run per player and its own personal history. Regional runs use the shared online start, ordered answers, result verification, optional Google claim and guest publication flow. Offline runs remain local. The last ten device recordings are retained separately from scores. World country statistics remain separate from regional runs.

## First territory list

There are 257 distinct selectable features. Americas has 59 targets, Europe 66, Africa 60, Asia 52 and Oceania / Pacific 29. The current list appears under Help and in the mode menu after selecting a region. This is a first list of countries, dependencies and selected detached islands, rather than every island worldwide.

Russia, Turkey, Armenia, Azerbaijan, Georgia and Cyprus appear in both Europe and Asia. Greenland appears in Europe and the Americas. The Canary Islands and Madeira appear in Europe and Africa. The Azores appear in Europe. Regional games keep the whole globe selectable, so a country outside the chosen region is still a wrong guess.

Separate island prompts include Alaska, Hawaii, Galápagos, Easter Island, Juan Fernández, the Canaries, Madeira, the Azores, Corsica, Sardinia, Sicily, the Balearics, Crete and Jan Mayen. The UN separated-territory list adds Caribbean dependencies, French Guiana, Saint Pierre and Miquelon, the Falklands, Greenland, the Faroes, Åland, the Channel Islands, Isle of Man, Gibraltar, Svalbard, Réunion, Mayotte, Saint Helena, Pacific dependencies and Asian territories. Antarctica and southern uninhabited territories except South Georgia are excluded from this first version. Sovereignty is not inferred from quiz membership.

## Data and flags

The world geography is unchanged. scripts/prepare-regional-data.mjs explicitly prepares the separate regional snapshot. It reads an archived UN separated-country response and the world-countries 5.1.0 catalog, splits existing whole land polygons using territory bounds, and supplements territories missing from the combined snapshot with UN geometry. Island splits and source SHA-256 are in public/data/globe/regions-sources.json. Normal builds never regenerate these files. Rendering and picking share the resulting polygons.

Flags are bundled SVGs from flag-icons 7.5.0, MIT licensed, with the license alongside the assets. The ISO mapping comes from world-countries 5.1.0. Custom island prompts currently use their parent country's flag. New regional names use explicit English and French names, or the ISO region name in French. Flags are decorative beside the spoken country name. The offline manifest includes flags and both plain and compressed regional geography. Native packaging removes both duplicate .json.gz assets.

## Verification

Regional regression checks every prompt flag, every feature's interior selection against the full map, requested membership, overlaps, deck size and shared scoring. Browser verification exercises Europe selection and a loaded prompt flag, a complete 29-question Pacific run, isolated local recordings, return to the world game, and the mobile menu. Evidence is in ignored .local/check-regional-ui.js and .local/regional-*.png. No production runs were created. Native code is shared, but a phone update and physical verification are outside this change.

To prepare a new snapshot deliberately, download the GeoJSON response from the layer 5 query with iso3cd, romnam, isoclr and stscod, and the world-countries 5.1.0 catalog. Run `node scripts/prepare-regional-data.mjs <separated-geojson-file> <world-countries-json-file>`. The source query follows the same parameters as the existing layer 6 preparation script.

Validation passed: 666 unit tests, with 26 legacy skips; 34 API tests, with one optional Worker runtime skip; 15 scoped world-game browser cases across desktop, phone and tablet; type checking and scoped lint. The web build succeeds with the existing large-chunk warning. No native package was built or installed.

## Territory review

Open [the standalone territory review](regional-territory-review.html) to check every region and its actual game flag artwork. Checkboxes, notes, language selection and search work offline. Review choices are saved in browser storage and can be exported as JSON. They do not edit the game automatically. Regenerate with `node scripts/build-regional-review.mjs`; it uses the current regional snapshot and renders the game SVG flags to embedded 64 by 48 pixel thumbnails. Bermuda is already in the Americas with its own BM flag.

Explore is below Play in every mode, and is absent from the mode menu. It uses the selected mode map. Mouse, touch, island markers and keyboard selection show a name and its bundled flag. Back to start returns to the same mode. There is no timed run, scoring, score storage or gameplay API write. Selecting a region and entering Play or Explore centers the globe on that region.

## Ranking API and compatibility

The shared API accepts `mode=americas`, `europe`, `africa`, `asia` or `oceania` with rules 4 on run creation, the public leaderboard and personal history. Missing mode retains the world challenge. Existing stored runs without a mode remain world runs. Mode and server deck are retained in run state, so no schema change or data rewrite is required. Claims and publication use the same ownership checks across modes. Score totals use the selected deck. World statistics are not updated by regional runs or claims. A compact server catalog records IDs, sizes, regional membership and the full regional dataset hash, avoiding a second geometry snapshot in the Free Worker bundle.

Deploy the updated API before the regional ranking client. Preserve current database and Google/CORS bindings; no database migration is needed. Earlier device-only regional recordings cannot be retroactively added to public rankings, because their answers were never validated by the server.

Current change validation: 666 unit passes with 26 legacy skips; mode-specific Node API checks include all five regional decks, public deduplication, account claims and personal history; two isolated Cloudflare runtime cases passed. Browser checks exercised regional completion/publication, personal history, Explore and camera coordinates on desktop, phone and tablet. Existing world history, full 195-answer publication, idle rendering and start layout also passed. Types, scoped lint, web build and Worker dry-run passed. The Worker bundle remains under the Free size limit. Deployed as runtime source e86ed19; release evidence is recorded in free-hosting.md. Initial test runs caught an Explore pointer-event issue and a mobile dialog focus race in the test fixture; both were corrected before the successful checks.
