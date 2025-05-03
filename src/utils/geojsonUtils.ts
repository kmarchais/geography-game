import type { Feature, FeatureCollection, Geometry } from "geojson";
import type L from "leaflet";

export interface GeoJSONProperties {
  name: string;
  code?: string;
  continent?: string;
  [key: string]: unknown;
}

export type GeoJSONFeature = Feature<Geometry, GeoJSONProperties>;

export function isFeatureCollection(
  json: unknown
): json is FeatureCollection<Geometry, GeoJSONProperties> {
  if (json == null || typeof json !== 'object') {
    return false;
  }

  const obj = json as Record<string, unknown>;

  return (
    obj.type === "FeatureCollection" &&
    Array.isArray(obj.features)
  );
}

export const defaultStyle: L.PathOptions = {
  fillColor: "var(--map-default-fill)",
  weight: 2,
  opacity: 0.8,
  color: "var(--map-border-color)",
  fillOpacity: 0.4,
};

export const selectedStyle: L.PathOptions = {
  ...defaultStyle,
  fillColor: "#f39c12", // Amber
  weight: 3,
  opacity: 1,
  color: "#d35400", // Darker border for contrast
  fillOpacity: 0.65,
};

export const failedStyle: L.PathOptions = {
  ...defaultStyle,
  fillColor: "#e74c3c", // Red
  weight: 2,
  opacity: 1,
  color: "#c0392b", // Darker red border
  fillOpacity: 0.7,
};

export const correctStyle1: L.PathOptions = {
  ...defaultStyle,
  fillColor: "#2ecc71", // Green
  weight: 2.5,
  opacity: 1,
  color: "#27ae60", // Darker green border
  fillOpacity: 0.7,
};

export const correctStyle2: L.PathOptions = {
  ...defaultStyle,
  fillColor: "#f1c40f", // Yellow
  weight: 2.5,
  opacity: 1,
  color: "#d4ac0d", // Darker yellow border
  fillOpacity: 0.7,
};

export const correctStyle3: L.PathOptions = {
  ...defaultStyle,
  fillColor: "#e67e22", // Orange
  weight: 2.5,
  opacity: 1,
  color: "#d35400", // Darker orange border
  fillOpacity: 0.7,
};

export function getStyleForAttempts(attempts: number | undefined) {
  switch (attempts) {
    case 1:
      return correctStyle1;
    case 2:
      return correctStyle2;
    case 3:
      return correctStyle3;
    case 4:
      return failedStyle;
    default:
      return defaultStyle;
  }
}

/**
 * Computes the scale factor based on the element's minimum dimension.
 */
export function computeScaleFactor(bbox: SVGRect): number {
  const minDim = Math.min(bbox.width, bbox.height);
  if (minDim === 0) return 1.2;
  if (minDim < 50) {
    return Math.min(50 / minDim, 10);
  } else if (minDim < 150) {
    return 1.5;
  } else {
    return 1.2;
  }
}

/**
 * Animates a given layer by scaling it up and down.
 */
export function animateLayer(layer: L.Layer) {
  const pathLayer = layer as L.Path;
  const element = pathLayer.getElement();
  if (element) {
    pathLayer.bringToFront();

    const svgEl = element as unknown as SVGGraphicsElement & {
      style: CSSStyleDeclaration;
    };
    try {
      const bbox = svgEl.getBBox();

      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const scaleFactor = computeScaleFactor(bbox);

      svgEl.style.setProperty("--target-scale", scaleFactor.toString());
      svgEl.style.transformOrigin = `${centerX}px ${centerY}px`;

      element.classList.add("entity-reveal-animation");
      element.addEventListener(
        "animationend",
        () => {
          element.classList.remove("entity-reveal-animation");
        },
        { once: true }
      );
    } catch (error) {
      console.error("Could not get BBox for animation:", error, element);
    }
  }
}
