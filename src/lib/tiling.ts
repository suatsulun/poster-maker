import { paperSizeMm, type Orientation, type SizingMode } from './paper'

export type Layout = {
  cols: number
  rows: number
  posterWmm: number
  posterHmm: number
  paperWmm: number
  paperHmm: number
  overlapMm: number
  // stride = paper - overlap. Tile (c,r) covers poster mm:
  //   x: [c*strideX, c*strideX + paperW]
  //   y: [r*strideY, r*strideY + paperH]
  strideXmm: number
  strideYmm: number
}

export function computeLayout(
  imageAspect: number, // width / height
  orientation: Orientation,
  mode: SizingMode,
  overlapMm: number,
): Layout {
  const paper = paperSizeMm(orientation)
  const usableW = paper.w - 2 * overlapMm
  const usableH = paper.h - 2 * overlapMm
  
  const strideX = Math.max(1, usableW)
  const strideY = Math.max(1, usableH)

  let cols: number
  let rows: number
  let posterW: number
  let posterH: number

  if (mode.kind === 'sheetsWide') {
    cols = Math.max(1, Math.floor(mode.cols))
    posterW = cols * strideX
    posterH = posterW / imageAspect
    rows = Math.max(1, Math.ceil(posterH / strideY))
  } else if (mode.kind === 'sheetsWH') {
    cols = Math.max(1, Math.floor(mode.cols))
    rows = Math.max(1, Math.floor(mode.rows))
    posterW = cols * strideX
    posterH = rows * strideY
  } else {
    const targetWmm = Math.max(paper.w, mode.widthCm * 10)
    cols = Math.max(1, Math.ceil(targetWmm / strideX))
    posterW = cols * strideX
    posterH = posterW / imageAspect
    rows = Math.max(1, Math.ceil(posterH / strideY))
  }

  return {
    cols,
    rows,
    posterWmm: posterW,
    posterHmm: posterH,
    paperWmm: paper.w,
    paperHmm: paper.h,
    overlapMm,
    strideXmm: strideX,
    strideYmm: strideY,
  }
}
