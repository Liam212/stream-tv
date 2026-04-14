import type { PropsWithChildren } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const routeLayoutStyles = cva('flex min-h-0 w-full flex-1 overflow-auto p-4', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
    },
  },
  defaultVariants: {
    direction: 'column',
  },
})

type RouteLayoutProps = PropsWithChildren<
  VariantProps<typeof routeLayoutStyles> & {
    className?: string
  }
>

export default function RouteLayout({
  children,
  direction,
  className,
}: RouteLayoutProps) {
  return (
    <section className={cn(routeLayoutStyles({ direction }), className)}>
      {children}
    </section>
  )
}
