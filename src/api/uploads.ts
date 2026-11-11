import { api } from './client'

export interface UploadOut { url: string; filename: string; content_type: string; size: number }

function dataUrlToBlob(d: string): Blob {
  const [head, b64] = d.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** Uploads a captured photo (data URL from native/camera.ts) and returns the stored URL. */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const form = new FormData()
  form.append('file', dataUrlToBlob(dataUrl), `photo-${Date.now()}.jpg`)
  const r = await api<UploadOut>('POST', '/uploads', { form })
  return r.url
}
