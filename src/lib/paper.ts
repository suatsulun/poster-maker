export type Orientation = 'portrait' | 'landscape'

export type PaperSize = 'A1' | 'A2' | 'A3' | 'A4' | 'A5'

const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
}

export const PAPER_SIZES: PaperSize[] = ['A1', 'A2', 'A3', 'A4', 'A5']

export function paperSizeMm(paper: PaperSize, orientation: Orientation) {
  const p = PAPER_MM[paper]
  return orientation === 'portrait' ? { w: p.w, h: p.h } : { w: p.h, h: p.w }
}

export type SizingMode =
  | { kind: 'sheetsWide'; cols: number }
  | { kind: 'sheetsWH'; cols: number; rows: number }
  | { kind: 'physical'; widthCm: number }
