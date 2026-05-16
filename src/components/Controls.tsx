import {
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { RectangleHorizontal, RectangleVertical } from 'lucide-react'
import type { Orientation, SizingMode } from '@/lib/paper'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  orientation: Orientation
  setOrientation: (o: Orientation) => void
  mode: SizingMode
  setMode: (m: SizingMode) => void
  overlapMm: number
  setOverlapMm: (n: number) => void
  safeMarginMm: number
  setSafeMarginMm: (n: number) => void
}

export function Controls(props: Props) {
  const {
    orientation,
    setOrientation,
    mode,
    setMode,
    overlapMm,
    setOverlapMm,
    safeMarginMm,
    setSafeMarginMm,
  } = props

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-xs">1. Orientation</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
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
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-xs">2. Poster size</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
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
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-xs">3. Margins</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 pb-3 pt-0">
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-[11px] text-muted-foreground">Overlap (tape seam)</Label>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {overlapMm} mm
              </span>
            </div>
            <Slider
              className="mt-2"
              min={0}
              max={20}
              step={1}
              value={[overlapMm]}
              onValueChange={(v) => setOverlapMm(v[0] ?? 0)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-[11px] text-muted-foreground">Printer safe margin</Label>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {safeMarginMm} mm
              </span>
            </div>
            <Slider
              className="mt-2"
              min={0}
              max={10}
              step={1}
              value={[safeMarginMm]}
              onValueChange={(v) => setSafeMarginMm(v[0] ?? 0)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Most printers can't print to the paper edge. 3 mm is safe for most inkjets.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
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
        'flex flex-col items-center justify-center gap-1 rounded-lg border bg-background py-3 text-xs transition-all touch-manipulation sm:py-2',
        'hover:-translate-y-0.5 hover:shadow-sm',
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

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)
    if (raw === '' || raw === '-') {
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
      className="h-10 touch-manipulation sm:h-9"
      min={min}
      max={max}
      step={step}
      value={draft}
      onFocus={(e) => {
        setEditing(true)
        const el = e.currentTarget
        const selectAll = () => {
          try {
            el.select()
          } catch {
            /* type=number can reject in older engines — ignore */
          }
        }
        selectAll()
        requestAnimationFrame(selectAll)
      }}
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
