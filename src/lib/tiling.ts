import { paperSizeMm, type Orientation, type SizingMode } from './paper'

export type Layout = {
  cols: number
  rows: number
  paperWmm: number
  paperHmm: number
  overlapMm: number
  // Unprintable strip at each paper edge — content is inset by this much
  // so nothing important falls into the printer's no-print zone.
  safeMarginMm: number
  // Per-tile content stride = paper - 2*overlap - 2*safeMargin. Tile (c,r) covers:
  //   x: [c*strideX, c*strideX + strideX]
  //   y: [r*strideY, r*strideY + strideY]
  strideXmm: number
  strideYmm: number
  // Total content grid.
  gridWmm: number
  gridHmm: number
  // Image rectangle inside the grid (always preserves source aspect ratio).
  // Anchored top-left so blank edge sheets cluster on right/bottom and can be skipped.
  imageWmm: number
  imageHmm: number
  imageLeftMm: number
  imageTopMm: number
}

export function computeLayout(
  imageAspect: number, // width / height
  orientation: Orientation,
  mode: SizingMode,
  overlapMm: number,
  safeMarginMm: number,
): Layout {
  const paper = paperSizeMm(orientation)
  // Each side loses overlap (printable seam) + safeMargin (unprintable border).
  const insetPerSide = overlapMm + safeMarginMm
  const strideX = Math.max(1, paper.w - 2 * insetPerSide)
  const strideY = Math.max(1, paper.h - 2 * insetPerSide)

  let cols: number
  let rows: number
  let imageWmm: number
  let imageHmm: number

  if (mode.kind === 'sheetsWide') {
    cols = Math.max(1, Math.floor(mode.cols))
    imageWmm = cols * strideX
    imageHmm = imageWmm / imageAspect
    rows = Math.max(1, Math.ceil(imageHmm / strideY))
  } else if (mode.kind === 'sheetsWH') {
    cols = Math.max(1, Math.floor(mode.cols))
    rows = Math.max(1, Math.floor(mode.rows))
    const gridW = cols * strideX
    const gridH = rows * strideY
    // Fit aspect inside the grid — never stretch.
    if (gridW / imageAspect <= gridH) {
      imageWmm = gridW
      imageHmm = imageWmm / imageAspect
    } else {
      imageHmm = gridH
      imageWmm = imageHmm * imageAspect
    }
  } else {
    const targetWmm = Math.max(strideX, mode.widthCm * 10)
    cols = Math.max(1, Math.ceil(targetWmm / strideX))
    imageWmm = cols * strideX
    imageHmm = imageWmm / imageAspect
    rows = Math.max(1, Math.ceil(imageHmm / strideY))
  }

  const gridWmm = cols * strideX
  const gridHmm = rows * strideY

  return {
    cols,
    rows,
    paperWmm: paper.w,
    paperHmm: paper.h,
    overlapMm,
    safeMarginMm,
    strideXmm: strideX,
    strideYmm: strideY,
    gridWmm,
    gridHmm,
    imageWmm,
    imageHmm,
    imageLeftMm: 0,
    imageTopMm: 0,
  }
}

// Which grid cells (c,r) actually contain image content. Cells outside this list
// are entirely blank — safe to skip when printing.
export function tileHasContent(layout: Layout, c: number, r: number): boolean {
  const tileX0 = c * layout.strideXmm
  const tileY0 = r * layout.strideYmm
  const tileX1 = tileX0 + layout.strideXmm
  const tileY1 = tileY0 + layout.strideYmm
  const imgX1 = layout.imageLeftMm + layout.imageWmm
  const imgY1 = layout.imageTopMm + layout.imageHmm
  return (
    Math.max(tileX0, layout.imageLeftMm) < Math.min(tileX1, imgX1) &&
    Math.max(tileY0, layout.imageTopMm) < Math.min(tileY1, imgY1)
  )
}
