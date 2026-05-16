import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Printer, Sparkles, Download, Loader2, Settings, X } from 'lucide-react'
import { Controls } from '@/components/Controls'
import { Preview } from '@/components/Preview'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { PAPER_SIZES, type Orientation, type PaperSize, type SizingMode } from '@/lib/paper'
import { computeLayout, tileHasContent } from '@/lib/tiling'
import { generatePosterPDF } from '@/lib/pdf'
import { cn } from '@/lib/utils'

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [mode, setMode] = useState<SizingMode>({ kind: 'sheetsWide', cols: 3 })
  const [overlapMm, setOverlapMm] = useState(5)
  const [safeMarginMm, setSafeMarginMm] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  function handleImage(file: File) {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImage(img)
      setImageFileName(file.name)
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      toast.success('Image loaded', {
        description: `${file.name} · ${img.naturalWidth}×${img.naturalHeight}px`,
      })
    }
    img.onerror = () => {
      toast.error("Couldn't load that image", {
        description: 'Try a different file (jpg, png, webp).',
      })
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  // Listen for Ctrl/Cmd+V on the whole window. If the clipboard contains an
  // image file, treat it like a normal upload. Doesn't fire when focus is in
  // a text input (browsers route paste to the input first).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleImage(file)
            e.preventDefault()
            break
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  // Close the mobile settings overlay with the Escape key.
  useEffect(() => {
    if (!showSettings) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSettings])

  const layout = useMemo(() => {
    if (!image) return null
    const aspect = image.naturalWidth / image.naturalHeight
    return computeLayout(aspect, paperSize, orientation, mode, overlapMm, safeMarginMm)
  }, [image, paperSize, orientation, mode, overlapMm, safeMarginMm])

  const printedSheets = useMemo(() => {
    if (!layout) return 0
    let n = 0
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        if (tileHasContent(layout, c, r)) n++
      }
    }
    return n
  }, [layout])

  async function handleGenerate() {
    if (!image || !layout) return
    setGenerating(true)
    const toastId = toast.loading('Generating PDF…', {
      description: `${layout.cols} × ${layout.rows} ${paperSize} sheets`,
    })
    try {
      const blob = await generatePosterPDF(image, layout)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `poster-${layout.cols}x${layout.rows}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF ready', {
        id: toastId,
        description: `poster-${layout.cols}x${layout.rows}.pdf downloaded`,
      })
    } catch (err) {
      toast.error('Generation failed', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setGenerating(false)
    }
  }

  const controlsProps = {
    orientation,
    setOrientation,
    mode,
    setMode,
    overlapMm,
    setOverlapMm,
    safeMarginMm,
    setSafeMarginMm,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Single-line header on every screen: title left, paper-size buttons right. */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-card/80 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Printer className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">Poster Maker</h1>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Big posters from A4 sheets
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
            Paper size
          </p>
          <div className="flex gap-1 sm:gap-1.5">
            {PAPER_SIZES.map((p) => (
              <button
                key={p}
                onClick={() => setPaperSize(p)}
                className={cn(
                  'rounded-md border bg-background px-2 py-1 text-[11px] font-medium transition-all touch-manipulation',
                  'hover:-translate-y-0.5 hover:shadow-sm sm:px-2.5 sm:text-xs',
                  paperSize === p
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Body: on mobile the sidebar is hidden — settings open in a full-screen
          overlay (state-driven below). On desktop the sidebar is always shown. */}
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[300px_1fr]">
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-r bg-card/40 backdrop-blur-sm md:flex">
          <div className="px-3 py-3">
            <Controls {...controlsProps} />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-2 sm:p-3">
          {/* Info row: hidden on mobile so the preview gets the full body height.
              The sheet count is still visible as a badge inside Preview itself. */}
          <div className="mb-2 hidden items-center justify-between gap-3 text-xs sm:flex">
            <p className="text-muted-foreground">
              Drop an image, click the canvas, or paste from clipboard (Ctrl+V). Red dashed lines
              show where each {paperSize} page divides.
            </p>
            {layout && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 font-medium shadow-sm">
                <Sparkles className="h-3 w-3 text-primary" />
                {printedSheets} sheet{printedSheets === 1 ? '' : 's'}
              </div>
            )}
          </div>

          <Preview
            image={image}
            layout={layout}
            imageFileName={imageFileName}
            onImageChosen={handleImage}
          />

          {/* Bottom action row.
              Mobile: Settings (left) and Download (right) both expand to fill the
              row with a small gap in the middle.
              Desktop: only Download (right-aligned, fixed-width). */}
          <div className="mt-2 flex shrink-0 items-center gap-2 md:justify-end">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowSettings(true)}
              className="flex-1 touch-manipulation md:hidden"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!image || generating}
              className="flex-1 touch-manipulation md:flex-none md:min-w-44"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </main>
      </div>

      {/* Mobile settings overlay — full-screen panel that replaces the view
          instead of pushing the preview down. Desktop never renders this. */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex shrink-0 items-center justify-between border-b bg-card/90 px-3 py-2 backdrop-blur-md">
            <h2 className="text-sm font-semibold">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <Controls {...controlsProps} />
          </div>
          <div className="shrink-0 border-t bg-card/90 px-3 py-2 backdrop-blur-md">
            <Button
              size="lg"
              onClick={() => setShowSettings(false)}
              className="w-full touch-manipulation"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  )
}

export default App
