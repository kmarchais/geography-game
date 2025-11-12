/**
 * Manual marker function for French overseas territories
 * Used by French Departments game
 */

import L from 'leaflet'
import { watch, type Ref } from 'vue'
import { getStyleForAttempts } from '../geojsonUtils'

interface Territory {
  name: string
  lat: number
  lng: number
  code: string
}

export const additionalTerritories: Territory[] = [
  { name: 'Saint Pierre et Miquelon', lat: 46.83, lng: -56.33, code: '975' },
  { name: 'Wallis et Futuna', lat: -13.77, lng: -177.15, code: '986' },
  { name: 'Polynésie Française', lat: -17.68, lng: -149.45, code: '987' },
  { name: 'Nouvelle-Calédonie', lat: -21.25, lng: 165.5, code: '988' },
  { name: 'Terres Australes et Antarctiques Françaises', lat: -49.35, lng: 70.22, code: '984' },
  { name: 'Saint-Martin', lat: 18.08, lng: -63.05, code: '978' },
  { name: 'Saint-Barthélemy', lat: 17.9, lng: -62.83, code: '977' },
  { name: 'Île de Clipperton', lat: 10.28, lng: -109.22, code: '989' }
]

const createMarkerIcon = (territory: Territory, attempts?: number) => {
  let borderColor = '#d35400'
  let bgColor = 'var(--header-bg)'
  let textColor = 'var(--text-color)'

  if (attempts) {
    const style = getStyleForAttempts(attempts)
    if (style && typeof style.fillColor === 'string') {
      borderColor = style.fillColor
      if (attempts > 0 && attempts < 4) {
        bgColor = style.fillColor
        const hex = style.fillColor.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        textColor = brightness > 128 ? '#000000' : '#ffffff'
      } else if (attempts === 4) {
        bgColor = style.fillColor
        textColor = '#ffffff'
      }
    }
  }

  return L.divIcon({
    className: 'territory-marker',
    html: `<div class="territory-icon" title="${territory.name}" style="border-color:${borderColor}; background-color:${bgColor}; color:${textColor};">${territory.code || territory.name.substring(0, 3)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

/**
 * Add manual markers for French overseas territories
 * Creates markers at original position and world-wrapped copies at ±360°
 */
export function addFrenchTerritoryMarkers(
  map: L.Map,
  available: Ref<string[]>,
  found: Ref<Map<string, number>>,
  clickHandler: (name: string, latlng: L.LatLng) => void
): void {
  const markers: Record<string, L.Marker> = {}
  const markerLayer = L.layerGroup().addTo(map)

  // Add all territories to the available list
  additionalTerritories.forEach(territory => {
    if (!available.value.includes(territory.name)) {
      available.value.push(territory.name)
    }

    // Create the original marker
    const marker = L.marker([territory.lat, territory.lng], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer)

    markers[territory.name] = marker

    marker.on('click', (e) => {
      clickHandler(territory.name, e.latlng)
    })

    // Create east copy (longitude + 360)
    const eastMarker = L.marker([territory.lat, territory.lng + 360], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer)

    markers[`${territory.name}_east`] = eastMarker

    eastMarker.on('click', (e) => {
      clickHandler(territory.name, e.latlng)
    })

    // Create west copy (longitude - 360)
    const westMarker = L.marker([territory.lat, territory.lng - 360], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer)

    markers[`${territory.name}_west`] = westMarker

    westMarker.on('click', (e) => {
      clickHandler(territory.name, e.latlng)
    })
  })

  // Update all markers when a territory is found
  watch(found, (newFound) => {
    additionalTerritories.forEach(territory => {
      const attempts = newFound.get(territory.name)

      // Update original marker
      const marker = markers[territory.name]
      if (marker) {
        marker.setIcon(createMarkerIcon(territory, attempts))
      }

      // Update east copy
      const eastMarker = markers[`${territory.name}_east`]
      if (eastMarker) {
        eastMarker.setIcon(createMarkerIcon(territory, attempts))
      }

      // Update west copy
      const westMarker = markers[`${territory.name}_west`]
      if (westMarker) {
        westMarker.setIcon(createMarkerIcon(territory, attempts))
      }
    })
  }, { deep: true })
}
