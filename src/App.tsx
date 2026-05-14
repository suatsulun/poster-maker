import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Printer, Sparkles } from 'lucide-react'
import { Controls } from '@/components/Controls'
import { Preview } from '@/components/Preview'
import { Toaster } from '@/components/ui/sonner'
import type { Orientation, SizingMode } from '@/lib/paper'
import { computeLayout } from '@/lib/tiling'
import { generatePosterPDF } from '@/lib/pdf'



function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [mode, setMode] = useState<SizingMode>({ kind: 'sheetsWide', cols: 3 })
  const [overlapMm, setOverlapMm] = useState(5)
  const [generating, setGenerating] = useState(false)

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

  const layout = useMemo(() => {
    if (!image) return null
    const aspect = image.naturalWidth / image.naturalHeight
    return computeLayout(aspect, orientation, mode, overlapMm)
  }, [image, orientation, mode, overlapMm])

  async function handleGenerate() {
    if (!image || !layout) return
    setGenerating(true)
    const toastId = toast.loading('Generating PDF…', {
      description: `${layout.cols} × ${layout.rows} A4 sheets`,
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

  return (
    <div className="grid h-screen grid-cols-[360px_1fr] bg-background">
      <aside className="flex flex-col overflow-y-auto border-r bg-card/40 backdrop-blur-sm">
        <div className="sticky top-0 z-10 border-b bg-card/80 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Poster Maker</h1>
              <p className="text-[11px] text-muted-foreground">
                Big posters from A4 sheets
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-5">
          <Controls
            onImageChosen={handleImage}
            imageFileName={imageFileName}
            orientation={orientation}
            setOrientation={setOrientation}
            mode={mode}
            setMode={setMode}
            overlapMm={overlapMm}
            setOverlapMm={setOverlapMm}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Preview</h2>
            <p className="text-xs text-muted-foreground">
              Red dashed lines show where each A4 page divides.
            </p>
          </div>
          {layout && (
            <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              {layout.cols * layout.rows} sheets
            </div>
          )}
        </div>
        <Preview image={image} layout={layout} />
      </main>

      <Toaster />
    </div>
  )
}

export default App
