import { useEffect, useRef } from 'react'
import { ImageIcon } from 'lucide-react'
import type { Layout } from '@/lib/tiling'

type Props = {
  image: HTMLImageElement | null
  layout: Layout | null
}

export function Preview({ image, layout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !image || !layout) return

    const ctx = canvas.getContext('2d')!
    const containerW = container.clientWidth
    const containerH = container.clientHeight

    const scale = Math.min(
      (containerW - 48) / layout.posterWmm,
      (containerH - 48) / layout.posterHmm,
    )
    const drawW = layout.posterWmm * scale
    const drawH = layout.posterHmm * scale
    const offsetX = (containerW - drawW) / 2
    const offsetY = (containerH - drawH) / 2

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerW * dpr
    canvas.height = containerH * dpr
    canvas.style.width = containerW + 'px'
    canvas.style.height = containerH + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, containerW, containerH)

    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(offsetX, offsetY, drawW, drawH)
    ctx.restore()

    ctx.drawImage(image, offsetX, offsetY, drawW, drawH)

    ctx.strokeStyle = 'rgba(37, 99, 235, 0.9)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([8, 5])
    for (let c = 1; c < layout.cols; c++) {
      const x = offsetX + c * layout.strideXmm * scale
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + drawH)
      ctx.stroke()
    }
    for (let r = 1; r < layout.rows; r++) {
      const y = offsetY + r * layout.strideYmm * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + drawW, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, drawW, drawH)
  }, [image, layout])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden rounded-xl border bg-card shadow-inner"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, oklch(0.85 0.06 95) 1px, transparent 0)',
        backgroundSize: '18px 18px',
      }}
    >
      {(!image || !layout) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImageIcon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium">No image yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload an image on the left to see your poster preview.
            </p>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} />
      {layout && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm">
          <span className="font-semibold text-primary tabular-nums">
            {layout.cols} × {layout.rows}
          </span>
          <span className="text-muted-foreground">sheets ·</span>
          <span className="tabular-nums">
            {(layout.posterWmm / 10).toFixed(1)} × {(layout.posterHmm / 10).toFixed(1)} cm
          </span>
        </div>
      )}
    </div>
  )
}
