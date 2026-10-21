import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/simulator', label: 'Simulator', icon: '⚙️' },
  { to: '/graph', label: 'Graph', icon: '📊' },
  { to: '/timeline', label: 'Timeline', icon: '📈' },
  { to: '/summary', label: 'Summary', icon: '📋' },
]

export function RightSideNav() {
  return (
    <aside className="fixed right-0 top-0 bottom-0 w-20 bg-gradient-to-b from-primary-deep via-primary-purple to-primary-blue shadow-lg flex flex-col items-center py-6 gap-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/simulator'}
          className={({ isActive }) =>
            `w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
              isActive
                ? 'bg-paper text-primary-deep shadow-lg scale-110'
                : 'bg-paper/20 text-paper hover:bg-paper/30'
            }`
          }
          title={item.label}
        >
          {item.icon}
        </NavLink>
      ))}
    </aside>
  )
}
