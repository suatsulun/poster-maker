import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ImageIcon, Upload, ClipboardPaste, MousePointerClick } from 'lucide-react'
import { tilePrintNumber, type Layout } from '@/lib/tiling'
import { cn } from '@/lib/utils'

type Props = {
  image: HTMLImageElement | null
  layout: Layout | null
  imageFileName: string | null
  onImageChosen: (file: File) => void
}

export function Preview({ image, layout, imageFileName, onImageChosen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  // Bumped on container resize so the canvas-draw effect re-runs.
  const [resizeTick, setResizeTick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !image || !layout) return
    // resizeTick is read so this effect re-runs when the container resizes.
    void resizeTick

    const ctx = canvas.getContext('2d')!
    const containerW = container.clientWidth
    const containerH = container.clientHeight

    // Tight breathing room inside the card on phones, more generous on desktop.
    const pad = containerW < 640 ? 16 : 48
    const scale = Math.min((containerW - pad) / layout.gridWmm, (containerH - pad) / layout.gridHmm)
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

    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(offsetX, offsetY, drawW, drawH)
    ctx.restore()

    const imgX = offsetX + layout.imageLeftMm * scale
    const imgY = offsetY + layout.imageTopMm * scale
    const imgW = layout.imageWmm * scale
    const imgH = layout.imageHmm * scale
    ctx.drawImage(image, imgX, imgY, imgW, imgH)

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
  }, [image, layout, resizeTick])

  // Re-draw when the container resizes (window resize, sidebar collapse, etc.).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => setResizeTick((n) => n + 1))
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImageChosen(file)
    // Reset so picking the same file twice still fires onChange.
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onImageChosen(file)
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!image) openPicker()
      }}
      className={cn(
        'relative flex-1 overflow-hidden rounded-xl border bg-card shadow-inner transition-colors',
        !image && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        dragOver && 'border-primary bg-primary/10',
      )}
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, oklch(0.85 0.06 95) 1px, transparent 0)',
        backgroundSize: '18px 18px',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {(!image || !layout) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
            <ImageIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div>
            <p className="text-base font-medium">Add a picture to start</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Upload className="h-3.5 w-3.5" /> drop a file
              </span>
              <span className="inline-flex items-center gap-1">
                <MousePointerClick className="h-3.5 w-3.5" />
                <span className="sm:hidden">tap here</span>
                <span className="hidden sm:inline">click here</span>
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <ClipboardPaste className="h-3.5 w-3.5" /> Ctrl+V
              </span>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} />

      {image && imageFileName && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            openPicker()
          }}
          className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1 text-xs font-medium shadow-md backdrop-blur-sm hover:bg-card"
          title="Click to replace image"
        >
          <Upload className="h-3 w-3 text-primary" />
          <span className="max-w-[16rem] truncate">{imageFileName}</span>
        </button>
      )}

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
