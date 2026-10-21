import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  {
    to: '/governance',
    label: 'Governance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    to: '/simulator',
    label: 'Simulator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        />
      </svg>
    ),
  },
  {
    to: '/timeline',
    label: 'Timeline',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M18 9l-5 5-3-3-4 4" />
      </svg>
    ),
  },
]

export function LeftSidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-950 flex flex-col border-r border-white/5">
      {/* Logo */}
      <div className="px-6 py-7 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="#0f172a" className="w-5 h-5">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" opacity="0.5" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-white leading-tight">Ripple</h1>
          <p className="text-[11px] text-slate-400 leading-tight">Decision Intelligence</p>
        </div>
      </div>

      <div className="mx-6 border-t border-white/5" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium border-l-2 transition-colors duration-150 ${
                isActive
                  ? 'bg-white/[0.07] border-teal-400 text-white'
                  : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-6 border-t border-white/5" />
      <div className="px-6 py-5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <p className="text-xs text-slate-500">Ready to simulate</p>
      </div>
    </aside>
  )
}
