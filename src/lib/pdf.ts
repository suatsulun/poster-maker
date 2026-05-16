import { jsPDF } from 'jspdf'
import { tileHasContent, tilePrintNumber, type Layout } from './tiling'

// Render density bounds in canvas px per mm of poster.
//   10 px/mm ≈ 254 DPI — sharper than any home printer, fine ceiling.
//    4 px/mm ≈ 100 DPI — floor so small source images don't render too soft.
// Actual density is picked per-job based on what the source image can supply:
// rendering far beyond the image's native pixels only burns memory and CPU
// (a 50 MP per-tile canvas is mostly nearest-neighbor stretched).
const MAX_PX_PER_MM = 10
const MIN_PX_PER_MM = 4
const JPEG_QUALITY = 0.92
// mm → PDF points (jspdf uses pt for text). 1 mm ≈ 2.8346 pt.
const MM_TO_PT = 72 / 25.4

function pickPxPerMm(image: HTMLImageElement, imageWmm: number, imageHmm: number) {
  const native = Math.min(image.naturalWidth / imageWmm, image.naturalHeight / imageHmm)
  // 1.5× native gives a little headroom for the sharpen pass without runaway upscale.
  const target = native * 1.5
  return Math.max(MIN_PX_PER_MM, Math.min(MAX_PX_PER_MM, target))
}

export async function generatePosterPDF(image: HTMLImageElement, layout: Layout): Promise<Blob> {
  const {
    cols,
    rows,
    paperWmm,
    paperHmm,
    overlapMm,
    safeMarginMm,
    strideXmm,
    strideYmm,
    imageWmm,
    imageHmm,
    imageLeftMm,
    imageTopMm,
  } = layout

  const pdf = new jsPDF({
    unit: 'mm',
    format: [paperWmm, paperHmm],
    orientation: paperWmm > paperHmm ? 'landscape' : 'portrait',
  })

  // ---------- Page 1: calibration test ----------
  drawCalibrationPage(pdf, paperWmm, paperHmm)

  // ---------- Page 2: assembly guide ----------
  pdf.addPage([paperWmm, paperHmm])
  drawCoverPage(pdf, image, layout)

  // ---------- Tile pages ----------
  const pxPerMm = pickPxPerMm(image, imageWmm, imageHmm)
  const tilePxW = Math.round(paperWmm * pxPerMm)
  const tilePxH = Math.round(paperHmm * pxPerMm)
  const canvas = document.createElement('canvas')
  canvas.width = tilePxW
  canvas.height = tilePxH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Image pixels per mm of poster (constant — image is mapped to imageWmm × imageHmm).
  const imgPxPerMmX = image.naturalWidth / imageWmm
  const imgPxPerMmY = image.naturalHeight / imageHmm
  // Effective upscale factor (>1 means we're stretching pixels — sharpening helps).
  const upscaleX = pxPerMm / imgPxPerMmX
  const upscaleY = pxPerMm / imgPxPerMmY
  const upscale = Math.max(upscaleX, upscaleY)

  // Content area on the tile canvas: inset by overlap (printable seam) + safe margin.
  const innerInsetMm = overlapMm + safeMarginMm
  const innerInsetPx = innerInsetMm * pxPerMm

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Skip tiles that contain no image content at all.
      if (!tileHasContent(layout, c, r)) continue

      // Tile content rectangle in poster (grid) mm.
      const tileX0 = c * strideXmm
      const tileY0 = r * strideYmm
      const tileX1 = tileX0 + strideXmm
      const tileY1 = tileY0 + strideYmm

      // Image rectangle in poster (grid) mm.
      const imgX0 = imageLeftMm
      const imgY0 = imageTopMm
      const imgX1 = imgX0 + imageWmm
      const imgY1 = imgY0 + imageHmm

      // Intersection — area of the image visible in this tile.
      const xa = Math.max(tileX0, imgX0)
      const ya = Math.max(tileY0, imgY0)
      const xb = Math.min(tileX1, imgX1)
      const yb = Math.min(tileY1, imgY1)

      // Reset tile to white.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tilePxW, tilePxH)

      if (xb > xa && yb > ya) {
        const sx = (xa - imgX0) * imgPxPerMmX
        const sy = (ya - imgY0) * imgPxPerMmY
        const sw = (xb - xa) * imgPxPerMmX
        const sh = (yb - ya) * imgPxPerMmY
        // Destination on the tile canvas: content area starts at the inner inset.
        const dx = innerInsetPx + (xa - tileX0) * pxPerMm
        const dy = innerInsetPx + (ya - tileY0) * pxPerMm
        const dw = (xb - xa) * pxPerMm
        const dh = (yb - ya) * pxPerMm
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)

        // Sharpen only at moderate upscale — at extreme upscale it just amplifies
        // blockiness, and the unsharp pass is the most expensive part per tile.
        if (upscale > 1.3 && upscale < 3) {
          const amount = Math.min(0.55, 0.18 * (upscale - 1))
          applyUnsharpMask(ctx, dx, dy, dw, dh, amount)
        }
      }

      drawCropMarks(ctx, pxPerMm, paperWmm, paperHmm, overlapMm, safeMarginMm)
      const printN = tilePrintNumber(layout, c, r)
      if (printN !== null) {
        drawTileNumber(ctx, pxPerMm, printN, paperWmm, paperHmm, overlapMm, safeMarginMm)
      }

      pdf.addPage([paperWmm, paperHmm])
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      pdf.addImage(dataUrl, 'JPEG', 0, 0, paperWmm, paperHmm)
      // Yield to the event loop so the toast/UI can update between heavy tiles.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  return pdf.output('blob')
}

// ---------- Calibration page ----------

function drawCalibrationPage(pdf: jsPDF, paperWmm: number, paperHmm: number) {
  const margin = 20

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(20)
  pdf.text('Print this page first', paperWmm / 2, margin + 4, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(80)
  pdf.text(
    "Measure the square below. If it isn't exactly 100 × 100 mm, your printer is scaling.",
    paperWmm / 2,
    margin + 12,
    { align: 'center', maxWidth: paperWmm - 2 * margin },
  )
  pdf.text(
    'Turn off "Fit to page" / "Scale to fit" in the print dialog before printing the rest.',
    paperWmm / 2,
    margin + 18,
    { align: 'center', maxWidth: paperWmm - 2 * margin },
  )

  // 100 mm reference square, centered.
  const sq = 100
  const sx = (paperWmm - sq) / 2
  const sy = paperHmm / 2 - sq / 2 + 5

  pdf.setDrawColor(40)
  pdf.setLineWidth(0.5)
  pdf.rect(sx, sy, sq, sq)

  // 10 mm tick marks along each edge.
  pdf.setDrawColor(160)
  pdf.setLineWidth(0.2)
  for (let i = 10; i < sq; i += 10) {
    const tick = i % 50 === 0 ? 5 : 3
    pdf.line(sx + i, sy, sx + i, sy + tick)
    pdf.line(sx + i, sy + sq, sx + i, sy + sq - tick)
    pdf.line(sx, sy + i, sx + tick, sy + i)
    pdf.line(sx + sq, sy + i, sx + sq - tick, sy + i)
  }

  // Dimension labels.
  pdf.setTextColor(40)
  pdf.setFontSize(10)
  pdf.text('100 mm', sx + sq / 2, sy - 3, { align: 'center' })
  pdf.text('100 mm', sx - 5, sy + sq / 2, { align: 'center', angle: 90 })

  // Footer note.
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(110)
  pdf.text(
    'Page 2 is the assembly guide. Tiles start on page 3.',
    paperWmm / 2,
    paperHmm - margin,
    { align: 'center' },
  )
}

// ---------- Cover / assembly guide page ----------

function drawCoverPage(pdf: jsPDF, image: HTMLImageElement, layout: Layout) {
  const {
    cols,
    rows,
    paperWmm,
    paperHmm,
    strideXmm,
    strideYmm,
    gridWmm,
    gridHmm,
    imageWmm,
    imageHmm,
    imageLeftMm,
    imageTopMm,
  } = layout

  const margin = 15
  // Title block
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(20)
  pdf.text('Assembly Guide', paperWmm / 2, margin + 6, { align: 'center' })

  // Count tiles that will actually be printed (skip blank).
  let printedTiles = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tileHasContent(layout, c, r)) printedTiles++
    }
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(80)
  const info1 = `${cols} × ${rows} grid · ${printedTiles} printed sheet${printedTiles === 1 ? '' : 's'}`
  const info2 = `Poster image: ${(imageWmm / 10).toFixed(1)} × ${(imageHmm / 10).toFixed(1)} cm`
  pdf.text(info1, paperWmm / 2, margin + 13, { align: 'center' })
  pdf.text(info2, paperWmm / 2, margin + 19, { align: 'center' })

  // Available area for the diagram.
  const headerH = margin + 25
  const footerH = 22
  const availW = paperWmm - 2 * margin
  const availH = paperHmm - headerH - footerH
  const scale = Math.min(availW / gridWmm, availH / gridHmm)
  const drawW = gridWmm * scale
  const drawH = gridHmm * scale
  const ox = (paperWmm - drawW) / 2
  const oy = headerH + (availH - drawH) / 2

  // Thumbnail of the image to embed inside the diagram (small canvas, vector grid on top).
  const thumbDataUrl = renderThumbnail(image, 900)
  const imgDrawX = ox + imageLeftMm * scale
  const imgDrawY = oy + imageTopMm * scale
  const imgDrawW = imageWmm * scale
  const imgDrawH = imageHmm * scale

  // Page-bg rectangle for the grid.
  pdf.setFillColor(248, 248, 248)
  pdf.setDrawColor(180)
  pdf.setLineWidth(0.3)
  pdf.rect(ox, oy, drawW, drawH, 'FD')

  if (thumbDataUrl) {
    pdf.addImage(thumbDataUrl, 'JPEG', imgDrawX, imgDrawY, imgDrawW, imgDrawH)
  }

  // Mark blank cells with a diagonal cross so the assembler knows there's no sheet for them.
  pdf.setDrawColor(200)
  pdf.setLineWidth(0.2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tileHasContent(layout, c, r)) continue
      const x0 = ox + c * strideXmm * scale
      const y0 = oy + r * strideYmm * scale
      const x1 = x0 + strideXmm * scale
      const y1 = y0 + strideYmm * scale
      pdf.setFillColor(240, 240, 240)
      pdf.rect(x0, y0, x1 - x0, y1 - y0, 'F')
      pdf.line(x0, y0, x1, y1)
      pdf.line(x1, y0, x0, y1)
    }
  }

  // Grid lines (dashed for inner, solid border).
  pdf.setDrawColor(220, 60, 60)
  pdf.setLineWidth(0.25)
  pdf.setLineDashPattern([1.2, 1.2], 0)
  for (let c = 1; c < cols; c++) {
    const x = ox + c * strideXmm * scale
    pdf.line(x, oy, x, oy + drawH)
  }
  for (let r = 1; r < rows; r++) {
    const y = oy + r * strideYmm * scale
    pdf.line(ox, y, ox + drawW, y)
  }
  pdf.setLineDashPattern([], 0)
  pdf.setDrawColor(40)
  pdf.setLineWidth(0.4)
  pdf.rect(ox, oy, drawW, drawH)

  // Tile numbers — centered in each non-blank cell.
  pdf.setFont('helvetica', 'bold')
  const cellWpdf = strideXmm * scale
  const cellHpdf = strideYmm * scale
  const fontPt = Math.max(7, Math.min(22, Math.min(cellWpdf, cellHpdf) * 0.45 * MM_TO_PT))
  pdf.setFontSize(fontPt)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = tilePrintNumber(layout, c, r)
      if (n === null) continue
      pdf.setTextColor(40)
      const cx = ox + (c + 0.5) * strideXmm * scale
      const cy = oy + (r + 0.5) * strideYmm * scale + fontPt / (2 * MM_TO_PT) - 0.4
      pdf.text(String(n), cx, cy, { align: 'center' })
    }
  }

  // Footer instructions.
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(90)
  const tip1 =
    'Numbers run left-to-right, top-to-bottom. Each printed sheet shows its number in the bottom-right overlap.'
  const tip2 =
    'Corner ticks on each sheet mark the trim/seam line. Overlap matching ticks before taping.'
  pdf.text(tip1, paperWmm / 2, paperHmm - footerH + 6, {
    align: 'center',
    maxWidth: paperWmm - 2 * margin,
  })
  pdf.text(tip2, paperWmm / 2, paperHmm - footerH + 12, {
    align: 'center',
    maxWidth: paperWmm - 2 * margin,
  })
}

function renderThumbnail(image: HTMLImageElement, maxSide: number): string | null {
  const w = image.naturalWidth
  const h = image.naturalHeight
  if (!w || !h) return null
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  const cx = c.getContext('2d')!
  cx.imageSmoothingQuality = 'high'
  cx.drawImage(image, 0, 0, tw, th)
  return c.toDataURL('image/jpeg', 0.85)
}

// ---------- Crop / trim marks at the 4 content corners ----------

function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  pxPerMm: number,
  paperWmm: number,
  paperHmm: number,
  overlapMm: number,
  safeMarginMm: number,
) {
  if (overlapMm < 1.5) return // too tight to be useful

  // Content rectangle on the tile (mm).
  const cx0 = safeMarginMm + overlapMm
  const cy0 = safeMarginMm + overlapMm
  const cx1 = paperWmm - safeMarginMm - overlapMm
  const cy1 = paperHmm - safeMarginMm - overlapMm

  // Mark length: short, capped so it stays well inside the printable overlap.
  const markMm = Math.min(3, overlapMm * 0.55)
  const m = markMm * pxPerMm

  ctx.save()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 0.6
  ctx.lineCap = 'butt'

  const corners: Array<[number, number, number, number]> = [
    // [cornerX, cornerY, dirX, dirY] — direction the L points outward.
    [cx0, cy0, -1, -1],
    [cx1, cy0, +1, -1],
    [cx0, cy1, -1, +1],
    [cx1, cy1, +1, +1],
  ]
  for (const [x, y, dx, dy] of corners) {
    const px = x * pxPerMm
    const py = y * pxPerMm
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + dx * m, py)
    ctx.moveTo(px, py)
    ctx.lineTo(px, py + dy * m)
    ctx.stroke()
  }
  ctx.restore()
}

// ---------- Tile number in the bottom-right overlap, inside the printable area ----------

function drawTileNumber(
  ctx: CanvasRenderingContext2D,
  pxPerMm: number,
  n: number,
  paperWmm: number,
  paperHmm: number,
  overlapMm: number,
  safeMarginMm: number,
) {
  // Too little overlap to safely fit a number — skip rather than spill outside it.
  if (overlapMm < 2) return

  // Bottom-right overlap region (printable):
  //   x ∈ [paperW - safeMargin - overlap, paperW - safeMargin]
  //   y ∈ [paperH - safeMargin - overlap, paperH - safeMargin]
  const cornerWmm = overlapMm
  const cornerHmm = overlapMm

  const padMm = Math.min(0.8, overlapMm * 0.2)
  const text = String(n)
  // Leave room for up to 3 digits horizontally.
  const maxByH = cornerHmm - 2 * padMm
  const maxByW = (cornerWmm - 2 * padMm) / Math.max(1, text.length * 0.6)
  const fontMm = Math.max(1.6, Math.min(maxByH, maxByW, 5))
  const fontPx = fontMm * pxPerMm

  ctx.save()
  ctx.fillStyle = '#888'
  ctx.font = `${fontPx}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  // Anchor: bottom-right of the printable area (paper edge minus safe margin minus padding).
  const xPx = (paperWmm - safeMarginMm - padMm) * pxPerMm
  const yPx = (paperHmm - safeMarginMm - padMm) * pxPerMm
  ctx.fillText(text, xPx, yPx)
  ctx.restore()
}

// ---------- Unsharp mask (simple 3×3 Laplacian) ----------

function applyUnsharpMask(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  amount: number,
) {
  const x = Math.max(0, Math.floor(dx))
  const y = Math.max(0, Math.floor(dy))
  const w = Math.min(ctx.canvas.width - x, Math.ceil(dx + dw) - x)
  const h = Math.min(ctx.canvas.height - y, Math.ceil(dy + dh) - y)
  if (w <= 2 || h <= 2) return

  const img = ctx.getImageData(x, y, w, h)
  const src = img.data
  const out = new Uint8ClampedArray(src.length)
  const rowBytes = w * 4
  const center = 1 + 4 * amount

  // Copy edge rows/columns unchanged.
  out.set(src)

  for (let py = 1; py < h - 1; py++) {
    const rowOff = py * rowBytes
    for (let px = 1; px < w - 1; px++) {
      const i = rowOff + px * 4
      const up = i - rowBytes
      const dn = i + rowBytes
      const lt = i - 4
      const rt = i + 4
      for (let ch = 0; ch < 3; ch++) {
        const v =
          src[i + ch] * center -
          amount * (src[up + ch] + src[dn + ch] + src[lt + ch] + src[rt + ch])
        out[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v
      }
      out[i + 3] = src[i + 3]
    }
  }
  img.data.set(out)
  ctx.putImageData(img, x, y)
}
