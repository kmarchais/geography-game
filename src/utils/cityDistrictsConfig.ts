import type { GameConfig } from "../types/game.d";
import type { FeatureCollection, Feature, Geometry, GeoJsonObject, GeoJsonProperties } from "geojson";

export const parisArondissementsConfig: GameConfig = {
  name: "Paris Arrondissements",
  dataUrl: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson",
  mapCenter: [48.8566, 2.3522], // Paris center
  zoom: 11,
  maxBounds: [
    [48.8155, 2.2241], // Southwest
    [48.9021, 2.4699], // Northeast
  ],
  propertyName: "c_ar",
  targetLabel: "Arrondissement",
  nameMapping: (properties: GeoJsonProperties) => {
    if (!properties) return "Unknown";

    const arName = properties.l_aroff as string;
    const arNum = properties.c_ar as string | number;

    if (!arName || !arNum) return "Unknown";

    const num = typeof arNum === 'string' ? parseInt(arNum) : arNum;
    if (isNaN(num)) return arName;

    return `${arName} (${num})`;
  },
};

export const parisQuartiersConfig: GameConfig = {
  name: "Paris (Quartiers administratifs)",
  dataUrl: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/quartier_paris/exports/geojson",
  mapCenter: [48.8566, 2.3522], // Paris center
  zoom: 12,
  maxBounds: [
    [48.8155, 2.2241], // Southwest
    [48.9021, 2.4699], // Northeast
  ],
  propertyName: "l_qu",
  targetLabel: "Quartier",
  nameMapping: (properties: GeoJsonProperties) => {
    if (!properties) return "Unknown";

    const quartierName = properties.l_qu as string;
    const arrondissement = properties.c_ar as string | number;

    if (!quartierName) return "Unknown";
    if (!arrondissement) return quartierName;

    const arNum = typeof arrondissement === 'string' ? parseInt(arrondissement) : arrondissement;
    if (isNaN(arNum)) return quartierName;

    const suffix = arNum === 1 ? "st" : arNum === 2 ? "nd" : arNum === 3 ? "rd" : "th";
    return `${quartierName} (${arNum}${suffix})`;
  },
};

export const parisDistrictsConfig: GameConfig = {
  name: "Paris (Quartiers d'usage)",
  dataUrl: "./data/paris_districts.geojson",
  mapCenter: [48.8566, 2.3522], // Paris center
  zoom: 12,
  maxBounds: [
    [48.8155, 2.2241], // Southwest
    [48.9021, 2.4699], // Northeast
  ],
  propertyName: "name",
  targetLabel: "District",
};

export const londonBoroughsConfig: GameConfig = {
  name: "London Boroughs",
  dataUrl: "https://gis2.london.gov.uk/server/rest/services/apps/webmap_context_layer/MapServer/3/query?outFields=*&where=1%3D1&f=geojson",
  mapCenter: [51.5074, -0.1278], // London center
  zoom: 10,
  maxBounds: [
    [51.2868, -0.5103], // Southwest
    [51.6918, 0.3340],  // Northeast
  ],
  propertyName: "name",
  targetLabel: "Borough",
  nameMapping: (properties: GeoJsonProperties) => {
    if (!properties) return "Unknown";
    const name = properties.name as string;
    if (!name) return "Unknown";

    // Remove "London Borough of" prefix if present
    if (name.startsWith("London Borough of ")) {
      return name.replace("London Borough of ", "");
    }

    // Handle special cases
    if (name === "City of London") return "City of London";
    if (name === "City of Westminster") return "Westminster";

    return name;
  },
};

export const barcelonaDistrictsConfig: GameConfig = {
  name: "Barcelona Districts",
  dataUrl: "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/districtes/districtes.geojson",
  mapCenter: [41.3851, 2.1734], // Barcelona center
  zoom: 11,
  maxBounds: [
    [41.3200, 2.0534], // Southwest
    [41.4695, 2.2280], // Northeast
  ],
  propertyName: "NOM",
  targetLabel: "District",
};

export const barcelonaBarriosConfig: GameConfig = {
  name: "Barcelona Barrios",
  dataUrl: "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/barris/barris.geojson",
  mapCenter: [41.3851, 2.1734], // Barcelona center
  zoom: 12,
  maxBounds: [
    [41.3200, 2.0534], // Southwest
    [41.4695, 2.2280], // Northeast
  ],
  propertyName: "NOM",
  targetLabel: "Barrio",
  nameMapping: (properties: GeoJsonProperties) => {
    if (!properties) return "Unknown";

    const barrioName = properties.NOM as string;
    const districtCode = properties.DISTRICTE as string;

    if (!barrioName) return "Unknown";
    if (!districtCode) return barrioName;

    // Map district codes to district names
    const districtNames: Record<string, string> = {
      "01": "Ciutat Vella",
      "02": "Eixample",
      "03": "Sants-Montjuïc",
      "04": "Les Corts",
      "05": "Sarrià-Sant Gervasi",
      "06": "Gràcia",
      "07": "Horta-Guinardó",
      "08": "Nou Barris",
      "09": "Sant Andreu",
      "10": "Sant Martí"
    };

    const districtName = districtNames[districtCode] || `District ${districtCode}`;
    return `${barrioName} (${districtName})`;
  },
};

export const bordeauxQuartiersConfig: GameConfig = {
  name: "Bordeaux Area Quartiers",
  dataUrl: "https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/se_quart_s/exports/geojson",
  mapCenter: [44.8500, -0.5900], // Center for entire metropolitan area
  zoom: 9,
  maxBounds: [
    [44.7200, -0.7500], // Southwest - expanded bounds for all 8 cities
    [44.9800, -0.4000], // Northeast - expanded bounds for all 8 cities
  ],
  propertyName: "nom",
  targetLabel: "Quartier",
  nameMapping: (properties: GeoJsonProperties) => {
    if (!properties) return "Unknown";

    const quartierName = properties.nom as string;
    const inseeCode = properties.insee as string;

    if (!quartierName) return "Unknown";

    // Map INSEE codes to city names
    const inseeToCity: Record<string, string> = {
      "33063": "Bordeaux",
      "33318": "Pessac",
      "33522": "Talence",
      "33281": "Mérignac",
      "33039": "Bègles",
      "33519": "Le Taillan-Médoc",
      "33273": "Martignas-sur-Jalles",
      "33119": "Cenon"
    };

    const cityName = inseeToCity[inseeCode] || "Unknown";

    // Return quartier name with city in parentheses
    return `${quartierName} (${cityName})`;
  },
};

// Fallback configuration using alternative data source if primary fails
export const bordeauxQuartiersAltConfig: GameConfig = {
  name: "Bordeaux Quartiers",
  dataUrl: "https://www.data.gouv.fr/fr/datasets/r/d6f2e0a9-0755-4c5f-9bd8-e69a5c57c32e", // GeoJSON export
  mapCenter: [44.8378, -0.5792],
  zoom: 12,
  maxBounds: [
    [44.8057, -0.6200],
    [44.8699, -0.5384],
  ],
  propertyName: "nom_quartier",
  targetLabel: "Quartier",
  filterFunction: (feature: Feature) => {
    const commune = feature.properties?.nom_commune;
    return commune === "Bordeaux" || commune === "BORDEAUX";
  },
};
