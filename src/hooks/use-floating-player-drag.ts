import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type UseFloatingPlayerDragOptions = {
  enabled: boolean
  disabled?: boolean
}

type DragStartState = {
  pointerX: number
  pointerY: number
  offsetX: number
  offsetY: number
}

export function useFloatingPlayerDrag({
  enabled,
  disabled = false,
}: UseFloatingPlayerDragOptions) {
  const dragPointerIdRef = useRef<number | null>(null)
  const dragStartRef = useRef<DragStartState>({
    pointerX: 0,
    pointerY: 0,
    offsetX: 0,
    offsetY: 0,
  })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const style = useMemo<CSSProperties | undefined>(
    () =>
      enabled
        ? {
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          }
        : undefined,
    [enabled, offset.x, offset.y],
  )

  const stopDragging = () => {
    dragPointerIdRef.current = null
    setIsDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || disabled || event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, input, textarea, select, a')) {
      return
    }

    dragPointerIdRef.current = event.pointerId
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }

    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || disabled || dragPointerIdRef.current !== event.pointerId) {
      return
    }

    setOffset({
      x:
        dragStartRef.current.offsetX +
        (event.clientX - dragStartRef.current.pointerX),
      y:
        dragStartRef.current.offsetY +
        (event.clientY - dragStartRef.current.pointerY),
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    stopDragging()
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    stopDragging()
  }

  useEffect(() => {
    if (!enabled || !disabled) {
      return
    }

    setOffset({ x: 0, y: 0 })
    stopDragging()
  }, [disabled, enabled])

  useEffect(() => {
    if (enabled) {
      return
    }

    setOffset({ x: 0, y: 0 })
    stopDragging()
  }, [enabled])

  return {
    isDragging,
    style,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  }
}
