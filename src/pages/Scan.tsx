import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Search } from 'lucide-react'
import { Button, Field, Page, inputCls, Card } from '../components/ui'
import { get, ApiError } from '../api/client'
import { parseAssetId, startScan } from '../native/scanner'

export default function ScanPage() {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [camErr, setCamErr] = useState('')
  const [manual, setManual] = useState('')
  const [err, setErr] = useState('')
  const stopRef = useRef<null | (() => Promise<void>)>(null)
  const doneRef = useRef(false)

  const open = async (raw: string) => {
    const id = parseAssetId(raw)
    if (!id) return setErr('Not a valid asset ID. Format: AST-0001')
    const norm = 'AST-' + id.slice(4).padStart(4, '0')
    setBusy(true); setErr('')
    try { await get(`/assets/${norm}`); nav(`/assets/${norm}`) }
    catch (e) { setErr(e instanceof ApiError && e.status === 404 ? `Asset ${norm} was not found.` : e instanceof ApiError && e.status === 403 ? `Asset ${norm} is not in your ghat.` : (e as Error).message) }
    finally { setBusy(false) }
  }

  const stop = async () => { await stopRef.current?.(); stopRef.current = null; setScanning(false) }
  const start = async () => {
    setCamErr(''); setScanning(true); doneRef.current = false
    await new Promise(r => setTimeout(r, 50)) // let the container render
    try {
      stopRef.current = await startScan('qr-reader', text => {
        if (doneRef.current) return
        const id = parseAssetId(text)
        if (id) { doneRef.current = true; stop().then(() => open(id)) } else setErr('Scanned code is not an asset QR.')
      })
    } catch (e) { setCamErr((e as Error).message); setScanning(false) }
  }
  useEffect(() => () => { stopRef.current?.() }, [])

  return (
    <Page title="Scan asset QR">
      <Card className="!p-3">
        <div id="qr-reader" className={scanning ? 'w-full overflow-hidden rounded-xl' : 'hidden'} />
        {!scanning && (
          <div className="text-center py-8">
            <Camera className="mx-auto text-brand-600 mb-3" size={44} />
            <p className="text-sm text-gray-600 mb-4">Point the camera at the QR plate on the asset.</p>
            <Button onClick={start}>Start camera scan</Button>
          </div>
        )}
        {scanning && <Button variant="secondary" full className="mt-3" onClick={stop}>Stop camera</Button>}
        {camErr && <p role="alert" className="text-sm text-red-600 mt-3">{camErr}</p>}
      </Card>
      <Card>
        <h2 className="font-semibold mb-2">Enter asset ID manually</h2>
        <Field label="Asset ID" error={err} hint="Example: AST-0001">
          <input className={inputCls} value={manual} placeholder="AST-0001" autoCapitalize="characters" onChange={e => { setManual(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && open(manual)} />
        </Field>
        <Button full className="mt-3" disabled={busy} onClick={() => open(manual)}><Search size={18} />Find asset</Button>
      </Card>
    </Page>
  )
}
