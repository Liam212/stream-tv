import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { Grid2x2, Play, type LucideIcon, SettingsIcon, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'

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

const navItems: Array<{
  to: '/' | '/guide' | '/multiview' | '/settings'
  label: string
  icon: LucideIcon
  experimental?: boolean
}> = [
  {
    to: '/',
    label: 'TV Guide',
    icon: Tv,
  },
  {
    to: '/multiview',
    label: 'Multi View',
    icon: Grid2x2,
    experimental: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
  },
]

type NavItemProps = {
  to: '/' | '/guide' | '/multiview' | '/settings'
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
  const experimentalFeaturesEnabled = useAppStore(
    state => state.experimentalFeaturesEnabled,
  )

  return (
    <nav className={cn(navBarStyles())}>
      {navItems
        .filter(item => !item.experimental || experimentalFeaturesEnabled)
        .map(item => (
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
