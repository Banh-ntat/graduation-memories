import type { Slot, TemplateConfig } from '../config/templateConfig'

/**
 * Photo với 3 trục điều chỉnh ảnh:
 * - zoom: phóng to/thu nhỏ tổng thể
 * - ox, oy: pan ngang/dọc (kéo chuột/touch)
 * - widthScale: rộng (1=mặc định, <1=thu hẹp, >1=giãn rộng)
 * - heightScale: dài (1=mặc định, <1=thu ngắn, >1=giãn dài)
 */
export interface Photo {
  bmp: ImageBitmap
  zoom: number
  ox: number
  oy: number
  widthScale: number  // rộng
  heightScale: number // dài
}

const PAD = 1.1 // phủ rộng hơn khung nét đứt/chữ placeholder trong template

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4
export const MIN_SCALE = 0.3
export const MAX_SCALE = 3

export function slotBox(s: Slot, W: number, H: number) {
  const p = s.shape === 'ellipse' ? PAD : 1
  return { cx: s.cx * W, cy: s.cy * H, w: s.w * W * p, h: s.h * H * p }
}

/** Kích thước ảnh sau khi cover-fit + zoom + width/height scale, và biên pan tối đa. */
function geom(p: Photo, w: number, h: number) {
  const baseK = Math.max(w / p.bmp.width, h / p.bmp.height) * p.zoom
  const dw = p.bmp.width * baseK * p.widthScale
  const dh = p.bmp.height * baseK * p.heightScale
  return { dw, dh, mx: (dw - w) / 2, my: (dh - h) / 2 }
}

export function clampPhoto(p: Photo, w: number, h: number): Photo {
  const g = geom(p, w, h)
  return {
    ...p,
    zoom: clamp(p.zoom, MIN_ZOOM, MAX_ZOOM),
    widthScale: clamp(p.widthScale, MIN_SCALE, MAX_SCALE),
    heightScale: clamp(p.heightScale, MIN_SCALE, MAX_SCALE),
    ox: g.mx ? clamp(p.ox, -g.mx / w, g.mx / w) : 0,
    oy: g.my ? clamp(p.oy, -g.my / h, g.my / h) : 0
  }
}

function drawPhoto(ctx: CanvasRenderingContext2D, p: Photo, s: Slot, b: ReturnType<typeof slotBox>) {
  const w = Math.ceil(b.w), h = Math.ceil(b.h)
  const layer = document.createElement('canvas'); layer.width = w; layer.height = h
  const c = layer.getContext('2d')!
  c.imageSmoothingQuality = 'high'
  const q = clampPhoto(p, w, h), g = geom(q, w, h)
  const drawX = w / 2 - g.dw / 2 + q.ox * w
  const drawY = h / 2 - g.dh / 2 + q.oy * h
  c.drawImage(q.bmp, drawX, drawY, g.dw, g.dh)
  if (s.shape === 'ellipse') {
    c.globalCompositeOperation = 'destination-in'
    c.translate(w / 2, h / 2); c.scale(1, h / w)
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, w / 2)
    gr.addColorStop(0, '#000'); gr.addColorStop(0.93, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = gr; c.fillRect(-w / 2, -w / 2, w, w)
  }
  ctx.drawImage(layer, b.cx - w / 2, b.cy - h / 2)
}

/** Dùng chung cho preview (scale=1) và xuất file (scale=2) => thấy gì xuất nấy. */
export function compose(canvas: HTMLCanvasElement, tpl: HTMLImageElement, cfg: TemplateConfig,
  photos: Record<string, Photo | undefined>, scale: number, highlight?: string) {
  const W = tpl.naturalWidth * scale, H = tpl.naturalHeight * scale
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tpl, 0, 0, W, H)
  for (const s of cfg.slots) {
    const p = photos[s.id]; if (p) drawPhoto(ctx, p, s, slotBox(s, W, H))
  }
  if (highlight) {
    const s = cfg.slots.find(x => x.id === highlight)!, b = slotBox(s, W, H)
    ctx.save(); ctx.strokeStyle = '#EFA0B5'; ctx.lineWidth = 3 * scale; ctx.setLineDash([8, 6])
    ctx.beginPath()
    if (s.shape === 'ellipse') ctx.ellipse(b.cx, b.cy, b.w / 2, b.h / 2, 0, 0, Math.PI * 2)
    else ctx.rect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h)
    ctx.stroke(); ctx.restore()
  }
}