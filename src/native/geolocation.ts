/**
 * GPS wrapper.
 * TODAY: navigator.geolocation.
 * CAPACITOR: npm i @capacitor/geolocation, then:
 *   import { Geolocation } from '@capacitor/geolocation'
 *   const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
 *   return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
 * Add location usage strings in Info.plist (iOS) and ACCESS_FINE_LOCATION in AndroidManifest.xml.
 */
export interface Fix { lat: number; lng: number; accuracy: number }

export function getPosition(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('GPS is not available on this device.'))
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => reject(new Error(
        e.code === e.PERMISSION_DENIED ? 'Location permission denied. Allow location access in settings and try again.'
          : e.code === e.TIMEOUT ? 'Location request timed out. Move to an open area and retry.'
          : 'Location unavailable. Check that GPS is on.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  })
}
