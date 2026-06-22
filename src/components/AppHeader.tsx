import Link from 'next/link'
import pkg from '../../package.json'

interface AppHeaderProps {
    title: string
    subtitle?: string
    back?: { href: string; label: string }
    actions?: Array<{ href: string; label: string; tone?: 'primary' | 'neutral' }>
    user?: { name: string; role: string }
}

export default function AppHeader({ title, subtitle, back, actions = [], user }: AppHeaderProps) {
    return (
          <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg shadow-xl p-6 mb-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          {back && (
                        <Link href={back.href} className="inline-block bg-blue-500/40 hover:bg-blue-500/60 text-white rounded-md px-3 py-1.5 text-xs font-medium mb-3 transition-colors">
                          {back.label}
                        </Link>Link>
                                  )}
                                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>h1>
                          {subtitle && <p className="text-blue-100 text-sm mt-1.5">{subtitle}</p>p>}
                          {actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          {actions.map((a) => (
                                          <Link key={a.href} href={a.href} className={a.tone === 'primary' ? 'bg-white text-indigo-700 hover:bg-blue-50 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors shadow-sm' : 'bg-blue-500/40 hover:bg-blue-500/60 text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors'}>
                                            {a.label}
                                          </Link>Link>
                                        ))}
                        </div>div>
                                  )}
                        </div>div>
                        <div className="flex flex-col items-end gap-2">
                                  <span className="inline-block bg-white text-indigo-700 font-bold text-xs px-3 py-1 rounded-full shadow-md tracking-wide">
                                              v{pkg.version}
                                  </span>span>
                          {user && (
                        <div className="text-right text-xs text-blue-100">
                                      <div className="font-semibold text-white">{user.name}</div>div>
                                      <Link href="/login" className="underline hover:text-white opacity-80 hover:opacity-100 mt-0.5 inline-block">
                                                      Switch user
                                      </Link>Link>
                        </div>div>
                                  )}
                        </div>div>
                </div>div>
          </header>header>
        )
}</header>
