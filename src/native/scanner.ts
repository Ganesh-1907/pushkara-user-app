/**
 * QR scanner wrapper.
 * TODAY: html5-qrcode (web camera). Desktop browsers often have no camera, so the UI also offers manual entry.
 * CAPACITOR: npm i @capacitor-mlkit/barcode-scanning, then replace startScan() with:
 *   import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
 *   await BarcodeScanner.requestPermissions()
 *   const { barcodes } = await BarcodeScanner.scan()   // full-screen native scanner
 *   onResult(barcodes[0].rawValue)
 * and return a no-op stop function. Keep parseAssetId() as is.
 */
import { Html5Qrcode } from 'html5-qrcode'

/** Pull "AST-0001" out of a raw QR payload (plain id, or a URL containing it). */
export function parseAssetId(raw: string): string | null {
  const m = raw.toUpperCase().match(/AST-\d{1,6}/)
  return m ? m[0] : null
}

export async function startScan(elementId: string, onResult: (text: string) => void): Promise<() => Promise<void>> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available in this browser. Enter the asset ID manually.')
  const scanner = new Html5Qrcode(elementId)
  try {
    await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, text => onResult(text), () => { /* per-frame decode misses are normal */ })
  } catch (e) {
    const msg = String(e)
    throw new Error(/NotAllowed|Permission/i.test(msg) ? 'Camera permission denied. Allow camera access, or enter the asset ID manually.'
      : /NotFound|Requested device/i.test(msg) ? 'No camera found on this device. Enter the asset ID manually.'
      : 'Could not start the camera. Enter the asset ID manually.')
  }
  return async () => { try { if (scanner.isScanning) await scanner.stop(); scanner.clear() } catch { /* already stopped */ } }
}
