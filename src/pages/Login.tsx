import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, HardHat, Building2 } from 'lucide-react'
import { Button, Field, Logo, inputCls, SampleTag } from '../components/ui'
import { auth, DEMO_OTP } from '../data/store'
import type { Role } from '../data/types'
import { toast } from '../lib/toast'

const ROLES: { id: Role; label: string; icon: typeof Landmark; sub: string }[] = [
  { id: 'staff', label: 'Municipal Staff', icon: Building2, sub: 'Assets, inspections, check-in' },
  { id: 'vendor', label: 'Vendor', icon: HardHat, sub: 'Works & maintenance' },
  { id: 'officer', label: 'Government Officer', icon: Landmark, sub: 'Dashboards & oversight' },
]

export default function Login() {
  const nav = useNavigate()
  const [role, setRole] = useState<Role>('staff')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [err, setErr] = useState('')

  const demo = auth.demoUsers(role)

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) return setErr('Enter a valid 10-digit mobile number.')
    setErr(''); auth.requestOtp(mobile); setStep(2); toast(`OTP sent (demo OTP is ${DEMO_OTP})`)
  }
  const verify = () => {
    if (!/^\d{4}$/.test(otp)) return setErr('Enter the 4-digit OTP.')
    const r = auth.verify(mobile, otp, role)
    if (!r.ok) return setErr(r.error || 'Failed')
    nav('/home', { replace: true })
  }

  return (
    <div className="h-full overflow-y-auto pt-safe pb-safe">
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="inline-block"><Logo size={52} /></div>
        <h1 className="text-3xl font-bold text-brand-700 mt-2">Sutrana</h1>
        <p className="text-sm text-gray-500">One Platform. Every Operation.</p>
      </div>
      <div className="px-6 pb-8 space-y-5">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">I am a</p>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => { setRole(r.id); setErr('') }} aria-pressed={role === r.id}
                    className={`w-full min-h-[56px] flex items-center gap-3 px-4 rounded-2xl border text-left ${role === r.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                    <r.icon className={role === r.id ? 'text-brand-600' : 'text-gray-400'} />
                    <span className="flex-1"><span className="block font-semibold">{r.label}</span><span className="block text-xs text-gray-500">{r.sub}</span></span>
                    <span className={`w-5 h-5 rounded-full border-2 ${role === r.id ? 'border-brand-600 bg-brand-600 ring-2 ring-white ring-inset' : 'border-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Field label="Mobile number" error={err}>
              <input className={inputCls} inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setErr('') }} />
            </Field>
            <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
              <span>Demo numbers:</span>
              {demo.map(u => <button key={u.id} onClick={() => { setMobile(u.mobile); setErr('') }} className="min-h-[36px] px-3 rounded-full bg-gray-100 text-gray-700 font-medium">{u.mobile}</button>)}
            </div>
            <Button full onClick={sendOtp}>Send OTP</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">OTP sent to <b>+91 {mobile}</b>. Demo OTP: <b>{DEMO_OTP}</b></p>
            <Field label="Enter OTP" error={err}>
              <input className={`${inputCls} tracking-[0.5em] text-center text-xl`} inputMode="numeric" maxLength={4} autoFocus value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setErr('') }} />
            </Field>
            <Button full onClick={verify}>Verify & Login</Button>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => { setStep(1); setOtp(''); setErr('') }}>Change number</Button>
              <Button variant="ghost" onClick={() => toast(`OTP resent (demo OTP is ${DEMO_OTP})`)}>Resend OTP</Button>
            </div>
          </>
        )}
        <div className="text-center"><SampleTag /></div>
      </div>
    </div>
  )
}
