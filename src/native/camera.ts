/**
 * Photo capture wrapper.
 * TODAY: <input type="file" accept="image/*" capture="environment"> + canvas downscale (small data URL).
 * CAPACITOR: npm i @capacitor/camera, then replace the body of takePhoto() with:
 *   import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
 *   const p = await Camera.getPhoto({ quality: 60, width: 800, resultType: CameraResultType.DataUrl, source: CameraSource.Camera })
 *   return p.dataUrl ?? null
 * (Camera.getPhoto throws when the user cancels or denies permission: catch and return null / throw a friendly message.)
 */
const MAX = 720

function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the photo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image.'))
      img.onload = () => {
        const k = Math.min(1, MAX / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.6))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Opens the camera (mobile) or file picker (desktop). Resolves null if the user cancels. */
export function takePhoto(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment')
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      downscale(f).then(resolve, reject)
    }
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
