import { useEffect, useRef } from 'react'
import { ImageIcon } from 'lucide-react'
import { tilePrintNumber, type Layout } from '@/lib/tiling'

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

    const scale = Math.min((containerW - 48) / layout.gridWmm, (containerH - 48) / layout.gridHmm)
    const drawW = layout.gridWmm * scale
    const drawH = layout.gridHmm * scale
    const offsetX = (containerW - drawW) / 2
    const offsetY = (containerH - drawH) / 2

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerW * dpr
    canvas.height = containerH * dpr
    canvas.style.width = containerW + 'px'
    canvas.style.height = containerH + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, containerW, containerH)

    // Paper / grid background.
    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(offsetX, offsetY, drawW, drawH)
    ctx.restore()

    // Image rendered at its actual sub-rect (aspect preserved).
    const imgX = offsetX + layout.imageLeftMm * scale
    const imgY = offsetY + layout.imageTopMm * scale
    const imgW = layout.imageWmm * scale
    const imgH = layout.imageHmm * scale
    ctx.drawImage(image, imgX, imgY, imgW, imgH)

    // Tile divider lines.
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

    // Tile numbers — small markers in the bottom-right of each cell.
    const cellW = layout.strideXmm * scale
    const cellH = layout.strideYmm * scale
    const fontPx = Math.max(9, Math.min(14, Math.min(cellW, cellH) * 0.18))
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'
    ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const n = tilePrintNumber(layout, c, r)
        if (n === null) continue
        ctx.fillText(String(n), offsetX + (c + 1) * cellW - 4, offsetY + (r + 1) * cellH - 3)
      }
    }
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
            {(layout.imageWmm / 10).toFixed(1)} × {(layout.imageHmm / 10).toFixed(1)} cm
          </span>
        </div>
      )}
    </div>
  )
}
