import type { Feature, FeatureCollection, Geometry } from "geojson";
import type L from "leaflet";

// Define interfaces for GeoJSON features with expected properties
export interface GeoJSONProperties {
  name: string; // Ensure 'name' is the standard property used internally
  code?: string; // Optional code property
  continent?: string; // For continent filtering
  // Add other potential properties if needed across different GeoJSON sources
  [key: string]: unknown; // Use unknown instead of any for better type safety
}

export type GeoJSONFeature = Feature<Geometry, GeoJSONProperties>;

// Fixed type guard for FeatureCollection
export function isFeatureCollection(
  json: unknown
): json is FeatureCollection<Geometry, GeoJSONProperties> {
  if (json == null || typeof json !== 'object') {
    return false;
  }

  // Type assertion to access properties safely
  const obj = json as Record<string, unknown>;

  return (
    obj.type === "FeatureCollection" &&
    Array.isArray(obj.features)
  );
}

// Define styles (consider making colors CSS variables if not already)
export const defaultStyle = {
  fillColor: "var(--map-default-fill)",
  weight: 1,
  opacity: 1,
  color: "var(--map-border-color)",
  fillOpacity: 0.5,
};

export const selectedStyle = {
  ...defaultStyle,
  fillColor: "#f39c12", // Orange for temporarily selected wrong answer
  fillOpacity: 0.7,
};

export const failedStyle = {
  ...defaultStyle,
  fillColor: "#e74c3c", // Red for failed/skipped
  fillOpacity: 0.8,
};

export const correctStyle1 = {
  ...defaultStyle,
  fillColor: "#2ecc71", // Green for correct on 1st try
  fillOpacity: 0.8,
};

export const correctStyle2 = {
  ...defaultStyle,
  fillColor: "#f1c40f", // Yellow for correct on 2nd try
  fillOpacity: 0.8,
};

export const correctStyle3 = {
  ...defaultStyle,
  fillColor: "#e67e22", // Darker Orange for correct on 3rd try
  fillOpacity: 0.8,
};

export function getStyleForAttempts(attempts: number | undefined) {
  switch (attempts) {
    case 1:
      return correctStyle1;
    case 2:
      return correctStyle2;
    case 3:
      return correctStyle3;
    case 4: // Represents skipped or failed after 3 attempts
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
  if (minDim === 0) return 1.2; // Avoid division by zero
  if (minDim < 50) {
    // Scale more aggressively for very small features, capped at 10x
    return Math.min(50 / minDim, 10);
  } else if (minDim < 150) {
    // Moderate enlargement for medium features
    return 1.5;
  } else {
    // Slight enlargement for large features
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
    pathLayer.bringToFront(); // Ensure it's visible

    const svgEl = element as unknown as SVGGraphicsElement & {
      style: CSSStyleDeclaration;
    };
    try {
      const bbox = svgEl.getBBox();
      // Calculate the center of the bounding box for transform origin
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const scaleFactor = computeScaleFactor(bbox);

      // Set CSS variables for the animation
      svgEl.style.setProperty("--target-scale", scaleFactor.toString());
      svgEl.style.transformOrigin = `${centerX}px ${centerY}px`;

      // Add animation class and remove it when done
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
