import { NavLink, Outlet } from 'react-router-dom'
import { useLiveSimulation } from '@/store/useLiveSimulation'

const NAV_ITEMS = [
  { to: '/', label: 'Simulator' },
  { to: '/graph', label: 'Graph detail' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/summary', label: 'Summary' },
  { to: '/guardrails', label: 'Guardrails' },
]

export function AppShell() {
  const live = useLiveSimulation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-hairline bg-paper-raised">
        <div className="mx-auto max-w-[1560px] px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold text-decision">Ripple</span>
            <span className="text-xs text-ink-faint">Decision Intelligence</span>
          </div>
          <nav aria-label="App sections" className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-decision-tint text-decision font-medium'
                      : 'text-ink-soft hover:text-ink hover:bg-paper-sunken',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs text-ink-faint font-tabular shrink-0">
            {live ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-financial animate-pulse" aria-hidden />
                Live · {live.effectiveDiscountPct.toFixed(1)}% avg discount
              </>
            ) : (
              'Loading…'
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1560px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
