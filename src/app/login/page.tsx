'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import pkg from '../../../package.json'

const ERRORS: Record<string, string> = {
  not_registered: 'This LinkedIn account is not on the Gershon Consulting team list. Ask Olivier to add you in Admin → Users (he will send you an invite link).',
  linkedin_cancelled: 'LinkedIn sign-in was cancelled.',
  state: 'The sign-in took too long or was opened in another tab. Please try again.',
  token: 'LinkedIn refused the sign-in. Please try again.',
  userinfo: 'LinkedIn did not return your profile. Please try again.',
  not_configured: 'LinkedIn sign-in is not configured on the server yet.',
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#fff" />
      <path fill="#0a66c2" d="M6.94 8.5H4.3V19h2.64zM5.62 4.5a1.53 1.53 0 1 0 0 3.06 1.53 1.53 0 0 0 0-3.06zM19.7 13.1c0-2.83-1.5-4.15-3.52-4.15a3.04 3.04 0 0 0-2.75 1.51V8.5h-2.53V19h2.64v-5.2c0-1.37.26-2.7 1.96-2.7 1.67 0 1.7 1.57 1.7 2.79V19h2.5z" />
    </svg>
  )
}

function LoginInner() {
  const sp = useSearchParams()
  const err = sp.get('error')
  const detail = sp.get('detail')
  const next = sp.get('next') || '/dashboard'
  const signedOut = sp.get('signed_out')
  const invite = (sp.get('invite') || '').replace(/[^a-zA-Z0-9-]/g, '')
  const [showClient, setShowClient] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  async function clientLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setClientError(null)
    try {
      const res = await fetch('/api/auth/client-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok && data.ok) window.location.href = '/client'
      else setClientError(data.error ?? 'Invalid email or password.')
    } catch { setClientError('Network error.') } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#fafafa]">
      {/* brand panel */}
      {/* unified design (v1.4.0): light brand panel like linalysis.ai, red accents */}
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-b from-brand-50 to-[#fafafa] border-r border-[#e5e7eb] text-[#1d1d1f] p-12">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 64 64" width="36" height="36"><rect width="64" height="64" rx="14" fill="#CC3333" /><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-2xl font-extrabold tracking-tight text-brand-600">Task <span className="font-semibold text-[#6e6e73] text-lg">by Gershon.AI</span></span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">Know exactly what<br />you have to do <span className="text-brand-600">today.</span></h2>
          <p className="mt-4 text-[#6e6e73] max-w-md">Every client, every project, every task of the Gershon Consulting team — with what is late and what is next at the top.</p>
        </div>
        <p className="text-xs text-[#6e6e73]">gershon.ai</p>
      </div>

      {/* sign-in */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 py-12 min-w-0">
        <div className="w-full max-w-sm bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-6 sm:p-7">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <svg viewBox="0 0 64 64" width="32" height="32"><rect width="64" height="64" rx="14" fill="#CC3333" /><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-xl font-extrabold text-brand-600">Task <span className="text-[#6e6e73] font-semibold text-base">by Gershon.AI</span></span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-[#6e6e73] mt-1 mb-7">Gershon Consulting team — use your LinkedIn account.</p>

          {invite && !err && (
            <div className="mb-5 text-sm rounded-lg border border-[#c7dcf2] bg-[#eef5fc] px-4 py-3 text-[#0a4a8c]">
              <strong>You have been invited.</strong> Sign in with LinkedIn once through this page to activate your access.
            </div>
          )}
          {signedOut && !err && (
            <div className="mb-5 text-sm rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-[#6e6e73]">You are signed out.</div>
          )}
          {err && (
            <div className="mb-5 text-sm rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800">
              {ERRORS[err] ?? 'Sign-in failed. Please try again.'}
              {err === 'not_registered' && detail && <div className="mt-1 text-xs opacity-80">LinkedIn account: {detail}</div>}
            </div>
          )}

          <a
            href={'/api/auth/linkedin/login?next=' + encodeURIComponent(next) + (invite ? '&invite=' + invite : '')}
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-[#0a66c2] hover:bg-[#004182] text-white font-semibold text-[15px] py-3 shadow-sm transition-colors"
          >
            <LinkedInLogo /> Sign in with LinkedIn
          </a>
          <p className="text-xs text-[#6e6e73] mt-3 leading-relaxed">
            Only people added by an admin can enter. New here? Use the invite link you received.
          </p>

          <div className="mt-10 pt-6 border-t border-[#e5e7eb]">
            {!showClient ? (
              <button onClick={() => setShowClient(true)} className="text-xs font-semibold text-[#6e6e73] hover:text-brand-600">
                Client of Gershon Consulting? Sign in with your client access →
              </button>
            ) : (
              <form onSubmit={clientLogin} className="space-y-3">
                <div className="text-sm font-semibold">Client access</div>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#e5e7eb] bg-white text-sm focus:outline-none focus:border-brand-600" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#e5e7eb] bg-white text-sm focus:outline-none focus:border-brand-600" />
                <button type="submit" disabled={busy}
                  className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold">
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
                {clientError && <p className="text-sm text-brand-700">{clientError}</p>}
              </form>
            )}
          </div>
          <p className="mt-10 text-[11px] text-[#6e6e73]">Task by Gershon.AI · v{pkg.version}</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}
