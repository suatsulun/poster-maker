export type Orientation = 'portrait' | 'landscape'

const A4_MM = { w: 210, h: 297 }

export function paperSizeMm(orientation: Orientation) {
  return orientation === 'portrait'
    ? { w: A4_MM.w, h: A4_MM.h }
    : { w: A4_MM.h, h: A4_MM.w }
}

export type SizingMode =
  | { kind: 'sheetsWide'; cols: number }
  | { kind: 'sheetsWH'; cols: number; rows: number }
  | { kind: 'physical'; widthCm: number }
