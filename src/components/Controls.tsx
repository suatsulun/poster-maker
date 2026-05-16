import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { ImageIcon, Download, Loader2, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { PAPER_SIZES, type Orientation, type PaperSize, type SizingMode } from '@/lib/paper'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  onImageChosen: (file: File) => void
  imageFileName: string | null
  paperSize: PaperSize
  setPaperSize: (p: PaperSize) => void
  orientation: Orientation
  setOrientation: (o: Orientation) => void
  mode: SizingMode
  setMode: (m: SizingMode) => void
  overlapMm: number
  setOverlapMm: (n: number) => void
  safeMarginMm: number
  setSafeMarginMm: (n: number) => void
  onGenerate: () => void
  generating: boolean
}

export function Controls(props: Props) {
  const {
    onImageChosen,
    imageFileName,
    paperSize,
    setPaperSize,
    orientation,
    setOrientation,
    mode,
    setMode,
    overlapMm,
    setOverlapMm,
    safeMarginMm,
    setSafeMarginMm,
    onGenerate,
    generating,
  } = props

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImageChosen(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onImageChosen(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 p-5 text-center transition-all',
              'hover:border-primary/60 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md',
            )}
          >
            <ImageIcon className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
            <p className="text-xs text-muted-foreground">
              {imageFileName ? (
                <span className="font-medium text-foreground">{imageFileName}</span>
              ) : (
                <>Drop an image here or click to browse</>
              )}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Paper size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {PAPER_SIZES.map((p) => (
              <PaperSizeButton
                key={p}
                active={paperSize === p}
                onClick={() => setPaperSize(p)}
                label={p}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {paperSizeLabel(paperSize)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Orientation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <OrientationButton
              active={orientation === 'portrait'}
              onClick={() => setOrientation('portrait')}
              label="Portrait"
              icon={<RectangleVertical className="h-4 w-4" />}
            />
            <OrientationButton
              active={orientation === 'landscape'}
              onClick={() => setOrientation('landscape')}
              label="Landscape"
              icon={<RectangleHorizontal className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Poster size</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode.kind}
            onValueChange={(v) => {
              if (v === 'sheetsWide') setMode({ kind: 'sheetsWide', cols: getCols(mode) })
              else if (v === 'sheetsWH')
                setMode({ kind: 'sheetsWH', cols: getCols(mode), rows: getRows(mode) })
              else setMode({ kind: 'physical', widthCm: getWidthCm(mode) })
            }}
          >
            <TabsList>
              <TabsTrigger value="sheetsWide">Sheets wide</TabsTrigger>
              <TabsTrigger value="sheetsWH">W × H</TabsTrigger>
              <TabsTrigger value="physical">Physical</TabsTrigger>
            </TabsList>

            <TabsContent value="sheetsWide">
              <Field label="Sheets across">
                <DraftNumberInput
                  min={1}
                  max={50}
                  step={1}
                  value={mode.kind === 'sheetsWide' ? mode.cols : 3}
                  onChange={(n) => setMode({ kind: 'sheetsWide', cols: n })}
                />
              </Field>
            </TabsContent>

            <TabsContent value="sheetsWH">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Columns">
                  <DraftNumberInput
                    min={1}
                    max={50}
                    step={1}
                    value={mode.kind === 'sheetsWH' ? mode.cols : 3}
                    onChange={(n) =>
                      mode.kind === 'sheetsWH' && setMode({ ...mode, cols: n })
                    }
                  />
                </Field>
                <Field label="Rows">
                  <DraftNumberInput
                    min={1}
                    max={50}
                    step={1}
                    value={mode.kind === 'sheetsWH' ? mode.rows : 4}
                    onChange={(n) =>
                      mode.kind === 'sheetsWH' && setMode({ ...mode, rows: n })
                    }
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="physical">
              <Field label="Target width (cm)">
                <DraftNumberInput
                  min={1}
                  max={2000}
                  step={1}
                  value={mode.kind === 'physical' ? mode.widthCm : 60}
                  onChange={(n) => setMode({ kind: 'physical', widthCm: n })}
                />
              </Field>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Margins</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-muted-foreground">Overlap (tape seam)</Label>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {overlapMm} mm
              </span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={20}
              step={1}
              value={[overlapMm]}
              onValueChange={(v) => setOverlapMm(v[0] ?? 0)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-muted-foreground">Printer safe margin</Label>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {safeMarginMm} mm
              </span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={10}
              step={1}
              value={[safeMarginMm]}
              onValueChange={(v) => setSafeMarginMm(v[0] ?? 0)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Most printers can't print to the paper edge. 3 mm is safe for most inkjets.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        onClick={onGenerate}
        disabled={!imageFileName || generating}
        className="w-full"
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
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function PaperSizeButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border bg-background py-2 text-xs font-medium transition-all',
        'hover:-translate-y-0.5 hover:shadow-sm',
        active
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border text-muted-foreground hover:border-primary/40',
      )}
    >
      {label}
    </button>
  )
}

function paperSizeLabel(p: PaperSize): string {
  const dims: Record<PaperSize, string> = {
    A1: '594 × 841 mm',
    A2: '420 × 594 mm',
    A3: '297 × 420 mm',
    A4: '210 × 297 mm',
    A5: '148 × 210 mm',
  }
  return dims[p]
}

function OrientationButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-background py-3 text-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md',
        active
          ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
          : 'border-border text-muted-foreground hover:border-primary/40',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

// Number input that keeps a local "draft" of the typed text so the field can be
// emptied or contain an out-of-range number while the user is mid-edit. The
// committed value passed to onChange is always clamped to [min, max] (so the
// preview stays consistent), but what the user sees only snaps to that clamped
// value on Enter or blur — not while they type.
function DraftNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step?: number
}) {
  const [draft, setDraft] = useState(() => String(value))
  const [editing, setEditing] = useState(false)

  // While not editing, mirror external value changes (mode switches, etc.).
  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)
    if (raw === '' || raw === '-') {
      // Empty → drive preview to the minimum, but leave the field empty.
      onChange(min)
      return
    }
    const n = parseFloat(raw)
    if (Number.isFinite(n)) onChange(clamp(n, min, max))
  }

  function commit() {
    setEditing(false)
    setDraft(String(value))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}

function getCols(m: SizingMode) {
  return m.kind === 'sheetsWide' || m.kind === 'sheetsWH' ? m.cols : 3
}
function getRows(m: SizingMode) {
  return m.kind === 'sheetsWH' ? m.rows : 4
}
function getWidthCm(m: SizingMode) {
  return m.kind === 'physical' ? m.widthCm : 60
}
