import { useState, useCallback } from 'react'
import { getPosition, type Fix } from '../native/geolocation'

export function useGps() {
  const [fix, setFix] = useState<Fix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const locate = useCallback(async () => {
    setLoading(true); setError(null)
    try { const f = await getPosition(); setFix(f); return f }
    catch (e) { setError((e as Error).message); return null }
    finally { setLoading(false) }
  }, [])
  return { fix, setFix, error, loading, locate }
}
