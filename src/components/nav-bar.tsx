import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { Grid2x2, Play, type LucideIcon, SettingsIcon, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'

const navBarStyles = cva(
  'flex h-full w-16 flex-col bg-gray-900 px-2 py-4 text-gray-100 gap-2',
)

const navItemStyles = cva(
  'flex size-12 items-center justify-center rounded-md border border-transparent bg-gray-800 text-gray-100 transition-colors',
  {
    variants: {
      active: {
        true: 'border-amber-300/40 bg-amber-400 text-gray-950',
        false: 'hover:bg-gray-700',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)

const navItems = [
  {
    to: '/',
    label: 'Direct Play',
    icon: Play,
  },
  {
    to: '/guide',
    label: 'TV Guide',
    icon: Tv,
  },
  {
    to: '/multiview',
    label: 'Multi View',
    icon: Grid2x2,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
  },
] as const

type NavItemProps = {
  to: (typeof navItems)[number]['to']
  label: string
  icon: LucideIcon
}

function NavItem({ to, label, icon: Icon }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(navItemStyles())}
      activeProps={{ className: cn(navItemStyles({ active: true })) }}
      aria-label={label}
      title={label}>
      <Icon className="nav-icon" />
    </Link>
  )
}

export function NavBar() {
  return (
    <nav className={cn(navBarStyles())}>
      {navItems.map(item => (
        <NavItem
          key={item.to}
          to={item.to}
          label={item.label}
          icon={item.icon}
        />
      ))}
    </nav>
  )
}
