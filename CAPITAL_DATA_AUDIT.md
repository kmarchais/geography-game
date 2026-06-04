# Capital Cities Data Audit

**Date:** 2026-06-04
**File audited/fixed:** `src/utils/capitalCitiesData.ts`
**Primary source snapshot:** REST Countries API v3.1 (`name`, `capital`, `capitalInfo`, `unMember`, `cca2`)
**Coordinate cross-check:** GeoNames `cities500.zip` PPLC entries

## Status after fix

The capital game data has been replaced with a deterministic static snapshot of **193 UN member states**.

Resolved from the original audit:

- Tanzania now uses **Dodoma** instead of Dar es Salaam.
- Nigeria now has a single entry: **Abuja**.
- Burundi now uses **Gitega** instead of Bujumbura.
- Ukraine now uses **Kyiv** instead of Kiev.
- Bolivia now uses **Sucre** under the current one-capital policy.
- Kiribati now uses **South Tarawa**.
- Moldova now uses **Chișinău**.
- The duplicated Europe block inside the Asia section was removed.
- Previously missing UN members from the audit were added.
- French Guiana and other non-UN territories are no longer included in the world capitals game.

## Data policy now encoded in code/tests

- The game includes **UN member states only**.
- REST Countries currently marks Guinea-Bissau as `unMember=false`; it is included explicitly because it is a UN member state.
- When a source lists multiple capitals, the current game model uses the first/primary capital and one coordinate pair.
  - Example: South Africa uses **Pretoria**.
- Coordinates are from REST Countries `capitalInfo.latlng`, with a GeoNames correction for Grenada because the REST Countries snapshot points St. George's to Bermuda.

## Validation added

`src/utils/capitalCitiesData.spec.ts` now checks that:

- The dataset has exactly **193** entries.
- Countries are unique.
- Known stale values are corrected.
- Previously missing countries are present.
- Coordinates are finite and inside valid latitude/longitude bounds.

## Known nuance to revisit later

The current `Capital` type allows only one display answer per country. Some countries have constitutional, executive, legislative, judicial, royal, or seat-of-government distinctions. If the game should teach those distinctions, the data model should be extended with aliases/notes instead of forcing one string.
