'use client'

import { useState, useEffect } from 'react'

interface Provider {
  id: string
  name: string
  url?: string
  color?: string
}

function faviconUrl(url: string | undefined): string | null {
  if (!url || url.trim() === '') return null
  try {
    const domain = url.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32'
  } catch {
    return null
  }
}

function ProviderIcon({ provider, size = 20 }: { provider: Provider; size?: number }) {
  const favicon = faviconUrl(provider.url)
  if (favicon) {
    return (
      <img
        src={favicon}
        alt={provider.name}
        width={size}
        height={size}
        className="rounded-sm object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size - 4 }}>🏢</span>
}

export default function ProvidersEditor() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load providers')
        setLoading(false)
      })
  }, [])

  function updateProvider(idx: number, patch: Partial<Provider>) {
    const next = [...providers]
    next[idx] = { ...next[idx], ...patch }
    setProviders(next)
    setSaved(false)
  }

  function removeProvider(idx: number) {
    setProviders(providers.filter((_, i) => i !== idx))
    setSaved(false)
  }

  function addProvider() {
    setProviders([...providers, {
      id: 'provider-' + Date.now(),
      name: 'New Provider',
      url: '',
      color: '#6366f1',
    }])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {providers.map((provider, idx) => (
          <div key={provider.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
            <div className="w-8 h-8 flex items-center justify-center bg-white rounded border border-slate-200 shrink-0">
              <ProviderIcon provider={provider} size={20} />
            </div>
            <input
              value={provider.name}
              onChange={e => updateProvider(idx, {
                name: e.target.value,
                id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              })}
              className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-sm bg-white"
              placeholder="Provider name"
            />
            <input
              value={provider.url ?? ''}
              onChange={e => updateProvider(idx, { url: e.target.value })}
              className="w-40 px-2 py-1.5 rounded border border-slate-200 text-xs bg-white text-slate-500"
              placeholder="website.com"
              title="Website domain for auto icon"
            />
            <input
              type="color"
              value={provider.color ?? '#6366f1'}
              onChange={e => updateProvider(idx, { color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-slate-200"
              title="Badge color"
            />
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: provider.color ?? '#6366f1' }}
            >
              <ProviderIcon provider={provider} size={14} />
              {provider.name}
            </span>
            <button
              type="button"
              onClick={() => removeProvider(idx)}
              className="text-red-400 hover:text-red-600 text-xs font-bold px-1"
              title="Remove provider"
            >✕</button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addProvider}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >+ Add provider</button>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold"
        >
          {saving ? 'Saving…' : 'Save providers'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
      </div>
    </div>
  )
}
