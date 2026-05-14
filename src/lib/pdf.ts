import { jsPDF } from 'jspdf'
import type { Layout } from './tiling'

// Print resolution: 8 px/mm gives sharp output without bloating the PDF.
const PX_PER_MM = 8

export async function generatePosterPDF(image: HTMLImageElement, layout: Layout): Promise<Blob> {
  const {
    cols,
    rows,
    posterWmm,
    posterHmm,
    paperWmm,
    paperHmm,
    overlapMm,
    strideXmm,
    strideYmm,
  } = layout

  const pdf = new jsPDF({
    unit: 'mm',
    format: [paperWmm, paperHmm],
    orientation: paperWmm > paperHmm ? 'landscape' : 'portrait',
  })

  // Map poster mm <-> image pixels. Image is stretched/squashed onto the poster.
  const imgPxPerMmX = image.naturalWidth / posterWmm
  const imgPxPerMmY = image.naturalHeight / posterHmm

  // Reusable off-screen canvas sized to one A4 sheet at the chosen print density.
  const tilePxW = Math.round(paperWmm * PX_PER_MM)
  const tilePxH = Math.round(paperHmm * PX_PER_MM)
  const canvas = document.createElement('canvas')
  canvas.width = tilePxW
  canvas.height = tilePxH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Source region (in image pixels) for this tile.
      const sx = c * strideXmm * imgPxPerMmX
      const sy = r * strideYmm * imgPxPerMmY
      const sw = strideXmm * imgPxPerMmX
      const sh = strideYmm * imgPxPerMmY

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tilePxW, tilePxH)
      // Clamp the source rect to the image bounds; regions past the edge stay white.
      const clampedSx = Math.max(0, sx)
      const clampedSy = Math.max(0, sy)
      const clampedSw = Math.min(sw, image.naturalWidth - clampedSx)
      const clampedSh = Math.min(sh, image.naturalHeight - clampedSy)
      if (clampedSw > 0 && clampedSh > 0) {
        const destW = strideXmm * PX_PER_MM
        const destH = strideYmm * PX_PER_MM
        const dx = overlapMm * PX_PER_MM + ((clampedSx - sx) / sw) * destW
        const dy = overlapMm * PX_PER_MM + ((clampedSy - sy) / sh) * destH
        const dw = (clampedSw / sw) * destW
        const dh = (clampedSh / sh) * destH
        ctx.drawImage(image, clampedSx, clampedSy, clampedSw, clampedSh, dx, dy, dw, dh)
      }

      if (r > 0 || c > 0) pdf.addPage([paperWmm, paperHmm])
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(dataUrl, 'JPEG', 0, 0, paperWmm, paperHmm)
    }
  }

  return pdf.output('blob')
}
