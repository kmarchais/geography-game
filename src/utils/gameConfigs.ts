import L from "leaflet";
import type { GameConfig } from "../types/game";
import type { GeoJsonObject } from "geojson";

// World Countries Configuration
export const worldCountriesConfig: GameConfig = {
  name: "World Countries",
  dataUrl: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson",
  mapCenter: [20, 0],
  zoom: 2,
  maxBounds: [
    [-90, -540],
    [90, 540],
  ],
  propertyName: "name",
  targetLabel: "Country",
  
  // For world map, create wrapped duplicates for better user experience
  processData: (data: GeoJsonObject) => {
    const featureCollection = data as any;
    if (!featureCollection.features) return data;
    
    // Create shifted versions of the world for continuous scrolling
    const leftWorldData = createShiftedGeoJSON(featureCollection, -360);
    const rightWorldData = createShiftedGeoJSON(featureCollection, 360);
    
    return {
      type: "FeatureCollection",
      features: [
        ...leftWorldData.features,
        ...featureCollection.features,
        ...rightWorldData.features,
      ],
    };
  }
};

// US States Configuration
export const usStatesConfig: GameConfig = {
  name: "US States",
  dataUrl: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces_shp.geojson",
  mapCenter: [37.0902, -95.7129],
  zoom: 4,
  maxBounds: [
    [15, -125],
    [50, -60],
  ],
  propertyName: "name",
  targetLabel: "State",
  maxRounds: 52,
  filterFunction: (feature) => {
    // Filter to only include US states
    const properties = feature.properties as { admin: string };
    return properties.admin === "United States of America";
  }
};

// French Departments Configuration
export const frenchDepartmentsConfig: GameConfig = {
  name: "French Departments",
  dataUrl: "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-avec-outre-mer.geojson",
  mapCenter: [46.603354, 1.888334],
  zoom: 5,
  propertyName: "name",
  targetLabel: "Department",
  
  // Map the "nom" property to "name" for consistency
  nameMapping: (properties) => {
    return properties.nom;
  },
  
  // Add custom controls for overseas territories
  customControls: (map: L.Map) => {
    const overseasControl = new L.Control({ position: 'bottomright' });
    overseasControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'overseas-navigation');
      div.innerHTML = `
        <div class="overseas-title">Territories</div>
        <div class="overseas-buttons">
          <button class="overseas-btn" data-region="mainland">Mainland</button>
          <button class="overseas-btn" data-region="caribbean">Caribbean</button>
          <button class="overseas-btn" data-region="guiana">Guiana</button>
          <button class="overseas-btn" data-region="reunion">Réunion</button>
          <button class="overseas-btn" data-region="mayotte">Mayotte</button>
        </div>
      `;
      
      // Add click handlers for the navigation buttons
      div.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('overseas-btn')) {
          const region = target.getAttribute('data-region');
          switch(region) {
            case 'mainland':
              map.setView([46.603354, 1.888334], 5);
              break;
            case 'caribbean':
              map.setView([16.0, -61.5], 8); // Guadeloupe/Martinique
              break;
            case 'guiana':
              map.setView([4.0, -53.0], 7); // French Guiana
              break;
            case 'reunion':
              map.setView([-21.1, 55.5], 9); // Réunion
              break;
            case 'mayotte':
              map.setView([-12.8, 45.2], 10); // Mayotte
              break;
          }
        }
      });
      
      return div;
    };
    overseasControl.addTo(map);
  },
  
  // Style the overseas navigation
  postInitialization: (map: L.Map, layer: L.GeoJSON) => {
    // Add styling for the overseas buttons
    const style = document.createElement('style');
    style.textContent = `
      .overseas-navigation {
        background-color: var(--header-bg);
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 1px 5px rgba(0,0,0,0.2);
        max-width: 200px;
        opacity: 0.9;
        transition: opacity 0.3s;
      }
      
      .overseas-navigation:hover {
        opacity: 1;
      }
      
      .overseas-title {
        color: var(--text-color);
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 8px;
        text-align: center;
      }
      
      .overseas-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      
      .overseas-btn {
        flex: 1 0 calc(50% - 4px);
        background-color: #4a90e2;
        color: white;
        border: none;
        padding: 5px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        text-align: center;
      }
      
      .overseas-btn:hover {
        background-color: #357abd;
      }
    `;
    document.head.appendChild(style);
  }
};

// African Countries Configuration
export const africanCountriesConfig: GameConfig = {
  name: "African Countries",
  dataUrl: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson",
  mapCenter: [5, 20],
  zoom: 3,
  maxBounds: [
    [-40, -30],
    [40, 60],
  ],
  propertyName: "name",
  targetLabel: "Country",
  maxRounds: 54,
  filterFunction: (feature) => {
    const properties = feature.properties as { continent: string };
    return properties.continent === "Africa";
  },
  fallbackList: [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", 
    "Burundi", "Cabo Verde", "Cameroon", "Central African Republic", 
    "Chad", "Comoros", "Congo", "Congo, DRC", "Djibouti", "Egypt", 
    "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", 
    "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", 
    "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", 
    "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", 
    "Namibia", "Niger", "Nigeria", "Rwanda", "São Tomé and Príncipe", 
    "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", 
    "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", 
    "Zambia", "Zimbabwe", "Western Sahara"
  ]
};

/**
 * Helper function to create a shifted version of GeoJSON data for world wrapping
 */
function createShiftedGeoJSON(originalData: any, longitudeShift: number): any {
  const shiftedData = JSON.parse(JSON.stringify(originalData));
  
  shiftedData.features.forEach((feature: any) => {
    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates.forEach((ring: number[][]) => {
        ring.forEach((coord: number[]) => {
          coord[0] += longitudeShift;
        });
      });
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          ring.forEach((coord: number[]) => {
            coord[0] += longitudeShift;
          });
        });
      });
    }
  });
  
  return shiftedData;
}