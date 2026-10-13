import Link from 'next/link'
import pkg from '../../package.json'

interface AppHeaderProps {
  title: string
  subtitle?: string
  back?: { href: string; label: string }
  actions?: Array<{ href: string; label: string; tone?: 'primary' | 'neutral' }>
  user?: { name: string; role: string }
}

/** Page header in the Gershon.AI / Linalysis style: white card, red left rule, red primary buttons. */
export default function AppHeader({ title, subtitle, back, actions = [] }: AppHeaderProps) {
  return (
    <header className="bg-gradient-to-br from-brand-50 to-white border border-[#e5e7eb] border-l-4 border-l-brand-600 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="inline-block text-xs font-semibold text-[#6e6e73] hover:text-brand-600 mb-2 transition-colors">
              ← {back.label.replace(/^←\s*/, '')}
            </Link>
          )}
          <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[#6e6e73] text-sm mt-0.5">{subtitle}</p>}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {actions.map((a) => (
                <Link key={a.href} href={a.href} className={a.tone === 'primary'
                  ? 'inline-flex items-center rounded-lg px-3.5 py-2 text-[13px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors'
                  : 'inline-flex items-center rounded-lg px-3.5 py-2 text-[13px] font-semibold bg-white border border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600 transition-colors'}>
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <span className="inline-block bg-white border border-brand-100 text-brand-600 font-bold text-xs px-3 py-1 rounded-full tracking-wide">
          v{pkg.version}
        </span>
      </div>
    </header>
  )
}
