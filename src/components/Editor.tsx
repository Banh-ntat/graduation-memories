import { useEffect, useRef, useState } from 'react'
import { TEMPLATES, type Gender, type Slot } from '../config/templateConfig'
import { compose, clampPhoto, slotBox, MIN_ZOOM, MAX_ZOOM, MIN_SCALE, MAX_SCALE, type Photo } from '../utils/compose'

const MAX_BYTES = 10 * 1024 * 1024
const debug = new URLSearchParams(location.search).has('debug')
const MIN_CX = 0, MAX_CX = 1
const MIN_CY = 0, MAX_CY = 1
const MIN_W = 0.05, MAX_W = 0.5
const MIN_H = 0.05, MAX_H = 0.5

// Tạo Photo mặc định (3 trục ảnh)
function createDefaultPhoto(bmp: ImageBitmap): Photo {
  return { bmp, zoom: 1, ox: 0, oy: 0, widthScale: 1, heightScale: 1 }
}

// Khung mặc định từ template
function createDefaultSlotAdjust(s: Slot) {
  return { cx: s.cx, cy: s.cy, w: s.w, h: s.h }
}

// Load ảnh mặc định từ public/
async function loadDefaultImage(src: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(import.meta.env.BASE_URL + src)
    if (!res.ok) return null
    const blob = await res.blob()
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
}

// Component slider có input số %
function SliderWithInput({
  label,
  value,
  min,
  max,
  step,
  format,
  parse,
  onChange,
  unit = '%'
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => number
  parse: (v: number) => number  // convert percentage input -> raw value
  onChange: (v: number) => void
  unit?: string
}) {
  const [inputValue, setInputValue] = useState(() => format(value).toString())
  const displayValue = format(value)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value
    setInputValue(format(v).toString())
    onChange(v)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setInputValue(raw)
    if (raw === '' || raw === '.') return
    const pctVal = +raw
    const clampedPct = Math.min(format(max), Math.max(format(min), pctVal))
    onChange(parse(clampedPct))
  }

  const handleInputBlur = () => {
    if (inputValue === '' || inputValue === '.') {
      setInputValue(displayValue.toString())
    } else {
      const pctVal = +inputValue
      const clampedPct = Math.min(format(max), Math.max(format(min), pctVal))
      const rawVal = parse(clampedPct)
      setInputValue(format(rawVal).toString())
      onChange(rawVal)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <input
          type="number"
          min={format(min)}
          max={format(max)}
          step={format(step)}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-20 text-right text-sm bg-white/50 border border-pink/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-xs opacity-60 w-8 text-right">{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-2 bg-pink/20 rounded appearance-none accent-accent cursor-pointer"
      />
    </div>
  )
}

export default function Editor({ gender, onDone, onBack }: { gender: Gender; onDone: (url: string) => void; onBack: () => void }) {
  const cfg = TEMPLATES[gender]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tpl, setTpl] = useState<HTMLImageElement>()
  const [photos, setPhotos] = useState<Record<string, Photo | undefined>>({})
  const [active, setActive] = useState('partner')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingDefaults, setLoadingDefaults] = useState(false)

  // Slot adjust state: lưu cx,cy,w,h cho từng slot (persist khi chuyển slot)
  const [slotAdjusts, setSlotAdjusts] = useState<Record<string, { cx: number; cy: number; w: number; h: number }>>({})

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const photosRef = useRef(photos); photosRef.current = photos
  const slotAdjustsRef = useRef(slotAdjusts); slotAdjustsRef.current = slotAdjusts

  // Load template
  useEffect(() => { const i = new Image(); i.onload = () => setTpl(i); i.src = import.meta.env.BASE_URL + cfg.src }, [cfg.src])

  // Load ảnh mặc định cho ng_tot_nghiep và bang_tot_nghiep
  useEffect(() => {
    if (!tpl) return
    const slotsWithDefaults = cfg.slots.filter(s => s.defaultImage && !photos[s.id])
    if (slotsWithDefaults.length === 0) return

    setLoadingDefaults(true)
    Promise.all(slotsWithDefaults.map(async s => {
      const bmp = await loadDefaultImage(s.defaultImage!)
      return { id: s.id, bmp }
    })).then(results => {
      setPhotos(prev => {
        const next = { ...prev }
        results.forEach(r => { if (r.bmp) next[r.id] = createDefaultPhoto(r.bmp) })
        return next
      })
      setLoadingDefaults(false)
    })
  }, [tpl, cfg.slots, photos])

  // Khi chuyển active slot, khởi tạo slotAdjust nếu chưa có
  useEffect(() => {
    setSlotAdjusts(prev => {
      if (prev[active]) return prev
      const s = cfg.slots.find(x => x.id === active)!
      return { ...prev, [active]: createDefaultSlotAdjust(s) }
    })
  }, [active, cfg.slots])

  // Tạo slot đã adjust cho active slot
  const adjustedSlot: Slot = (() => {
    const base = cfg.slots.find(s => s.id === active)!
    const adj = slotAdjusts[active]
    if (!adj) return base
    return { ...base, cx: adj.cx, cy: adj.cy, w: adj.w, h: adj.h }
  })()

  // Render canvas - dùng adjustedSlot cho active, base slots cho các slot khác
  useEffect(() => {
    if (!tpl || !canvasRef.current) return
    const slotsForRender = cfg.slots.map(s => {
      if (s.id === active) return adjustedSlot
      const adj = slotAdjusts[s.id]
      return adj ? { ...s, cx: adj.cx, cy: adj.cy, w: adj.w, h: adj.h } : s
    })
    const cfgForRender = { ...cfg, slots: slotsForRender }
    compose(canvasRef.current, tpl, cfgForRender, photos, 1, debug || photos[active] ? active : undefined)
  }, [tpl, photos, active, cfg, slotAdjusts, adjustedSlot])

  // Cleanup
  useEffect(() => () => { Object.values(photosRef.current).forEach(p => p?.bmp.close()) }, [])

  const photo = photos[active]
  const slotAdj = slotAdjusts[active]

  const updatePhoto = (fn: (p: Photo, w: number, h: number) => Photo) => setPhotos(prev => {
    const p = prev[active]; if (!p || !tpl) return prev
    const b = slotBox(adjustedSlot, tpl.naturalWidth, tpl.naturalHeight)
    return { ...prev, [active]: clampPhoto(fn(p, b.w, b.h), b.w, b.h) }
  })

  const updateSlot = (fn: (a: { cx: number; cy: number; w: number; h: number }) => { cx: number; cy: number; w: number; h: number }) => {
    setSlotAdjusts(prev => ({ ...prev, [active]: fn(prev[active] || createDefaultSlotAdjust(cfg.slots.find(s => s.id === active)!)) }))
  }

  async function onFile(f?: File) {
    if (!f) return
    setError('')
    if (!/^image\/(jpeg|png)$/.test(f.type)) return setError('Chỉ hỗ trợ ảnh JPG/JPEG/PNG (ảnh HEIC hãy chụp/xuất sang JPG).')
    if (f.size > MAX_BYTES) return setError('Ảnh vượt quá 10 MB, hãy chọn ảnh nhỏ hơn.')
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
      setPhotos(prev => { prev[active]?.bmp.close(); return { ...prev, [active]: createDefaultPhoto(bmp) } })
      // Reset slot adjust về mặc định khi đổi ảnh mới
      const baseSlot = cfg.slots.find(s => s.id === active)!
      setSlotAdjusts(prev => ({ ...prev, [active]: createDefaultSlotAdjust(baseSlot) }))
    } catch { setError('Không đọc được ảnh này, thử ảnh khác.') }
  }

  // --- kéo + pinch trên canvas ---
  const cssToTpl = () => (tpl && canvasRef.current ? tpl.naturalWidth / canvasRef.current.getBoundingClientRect().width : 1)
  const dist = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
  function down(e: React.PointerEvent) { (e.target as Element).setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }) }
  function move(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId); if (!prev) return
    if (pointers.current.size === 2) {
      const d0 = dist(); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const r = dist() / d0; if (isFinite(r)) updatePhoto(p => ({ ...p, zoom: p.zoom * r }))
    } else {
      const k = cssToTpl(); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      updatePhoto((p, w, h) => ({ ...p, ox: p.ox + ((e.clientX - prev.x) * k) / w, oy: p.oy + ((e.clientY - prev.y) * k) / h }))
    }
  }
  const up = (e: React.PointerEvent) => pointers.current.delete(e.pointerId)

  function finish() {
    if (!tpl || !photos.partner) return setError('Hãy tải ảnh chân dung của bạn trước (mục "Mặt bạn").')
    setBusy(true)
    setTimeout(() => {
      const c = document.createElement('canvas')
      const slotsForExport = cfg.slots.map(s => {
        const adj = slotAdjusts[s.id]
        return adj ? { ...s, cx: adj.cx, cy: adj.cy, w: adj.w, h: adj.h } : s
      })
      const cfgForExport = { ...cfg, slots: slotsForExport }
      compose(c, tpl, cfgForExport, photos, 2)
      c.toBlob(b => { setBusy(false); if (b) onDone(URL.createObjectURL(b)); else setError('Xuất ảnh thất bại (thiếu bộ nhớ?).') }, 'image/png')
    }, 30)
  }

  // Reset ảnh (zoom + widthScale + heightScale + pan)
  const resetPhoto = () => updatePhoto(p => ({ ...p, zoom: 1, ox: 0, oy: 0, widthScale: 1, heightScale: 1 }))
  // Reset khung (cx, cy, w, h)
  const resetSlot = () => {
    const baseSlot = cfg.slots.find(s => s.id === active)!
    updateSlot(() => createDefaultSlotAdjust(baseSlot))
  }
  // Reset tất cả
  const resetAll = () => { resetPhoto(); resetSlot() }

  // Format functions
  const pct = (v: number) => Math.round(v * 100)
  const zoomPct = (v: number) => Math.round(v * 100)

  // Render 7 slider: 4 khung + 3 ảnh
  const renderControls = () => {
    if (!photo || !slotAdj) return null
    return (
      <div className="space-y-4 bg-white/90 rounded-2xl p-4 shadow-sm border border-pink/20">
        {/* ===== 4 SLIDER KHUNG ===== */}
        <div>
          <h4 className="font-semibold text-accent mb-3">Khung ảnh (vị trí & kích thước trên template)</h4>
          <div className="grid grid-cols-2 gap-3">
            {/* CX - Vị trí ngang */}
            <SliderWithInput
              label="Vị trí ngang"
              value={slotAdj.cx}
              min={MIN_CX}
              max={MAX_CX}
              step={0.001}
              format={pct}
              parse={v => v / 100}
              onChange={v => updateSlot(a => ({ ...a, cx: v }))}
            />
            {/* CY - Vị trí dọc */}
            <SliderWithInput
              label="Vị trí dọc"
              value={slotAdj.cy}
              min={MIN_CY}
              max={MAX_CY}
              step={0.001}
              format={pct}
              parse={v => v / 100}
              onChange={v => updateSlot(a => ({ ...a, cy: v }))}
            />
            {/* W - Rộng khung */}
            <SliderWithInput
              label="Rộng khung"
              value={slotAdj.w}
              min={MIN_W}
              max={MAX_W}
              step={0.001}
              format={pct}
              parse={v => v / 100}
              onChange={v => updateSlot(a => ({ ...a, w: v }))}
            />
            {/* H - Dài khung */}
            <SliderWithInput
              label="Dài khung"
              value={slotAdj.h}
              min={MIN_H}
              max={MAX_H}
              step={0.001}
              format={pct}
              parse={v => v / 100}
              onChange={v => updateSlot(a => ({ ...a, h: v }))}
            />
          </div>
        </div>

        {/* ===== 3 SLIDER ẢNH ===== */}
        <div className="pt-3 border-t border-pink/20">
          <h4 className="font-semibold text-accent mb-3">Ảnh bên trong khung</h4>
          <div className="space-y-3">
            {/* Zoom */}
            <SliderWithInput
              label="Phóng to (zoom)"
              value={photo.zoom}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              format={zoomPct}
              parse={v => v / 100}
              onChange={v => updatePhoto(p => ({ ...p, zoom: v }))}
            />
            {/* WidthScale - Rộng ảnh */}
            <SliderWithInput
              label="Rộng ảnh"
              value={photo.widthScale}
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              format={pct}
              parse={v => v / 100}
              onChange={v => updatePhoto(p => ({ ...p, widthScale: v }))}
            />
            {/* HeightScale - Dài ảnh */}
            <SliderWithInput
              label="Dài ảnh"
              value={photo.heightScale}
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              format={pct}
              parse={v => v / 100}
              onChange={v => updatePhoto(p => ({ ...p, heightScale: v }))}
            />
          </div>

          {/* Reset buttons */}
          <div className="flex gap-2 pt-3 border-t border-pink/20">
            <button className="flex-1 rounded-full bg-white px-3 py-2 border border-pink/30 text-sm font-medium text-accent hover:bg-pink/10"
              onClick={resetSlot}>Đặt lại khung</button>
            <button className="flex-1 rounded-full bg-white px-3 py-2 border border-pink/30 text-sm font-medium text-accent hover:bg-pink/10"
              onClick={resetPhoto}>Đặt lại ảnh</button>
            <button className="flex-1 rounded-full bg-white px-3 py-2 border border-gray/30 text-sm font-medium text-gray-700 hover:bg-gray/10"
              onClick={resetAll}>Đặt lại tất cả</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl h-dvh lg:h-auto flex flex-col lg:min-h-[calc(100vh-4rem)]">
      {/* ===== TOP: Canvas + Slot tabs + Upload (sticky on mobile only) ===== */}
      <div className="sticky lg:static top-0 z-10 bg-gradient-to-b from-cream via-cream to-transparent pb-3 pt-3 lg:pb-0 lg:bg-transparent flex flex-col gap-3">
        <canvas ref={canvasRef} className="w-full rounded-2xl shadow bg-white" onPointerDown={down} onPointerMove={move}
          onPointerUp={up} onPointerCancel={up} onWheel={e => updatePhoto(p => ({ ...p, zoom: p.zoom * (e.deltaY < 0 ? 1.06 : 0.94) }))} />
        <div className="flex gap-2">
          {cfg.slots.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`flex-1 rounded-full px-2 py-2 text-sm font-semibold ${active === s.id ? 'bg-accent text-white' : 'bg-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="rounded-2xl bg-pink py-3 text-center font-semibold cursor-pointer">
          {photo ? 'Đổi ảnh' : 'Tải ảnh'} cho "{adjustedSlot.label}"
          <input type="file" accept="image/jpeg,image/png" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {loadingDefaults && <p className="text-xs text-center opacity-60">Đang tải ảnh mặc định…</p>}
      </div>

      {/* ===== MIDDLE: Controls (scrollable on mobile only) ===== */}
      <div className="flex-1 overflow-y-auto lg:overflow-visible lg:max-h-none space-y-4 pb-4 lg:pb-0">
        {renderControls()}
      </div>

      {/* ===== BOTTOM: Help + Error + Actions (sticky on mobile only) ===== */}
      <div className="sticky lg:static bottom-0 z-10 bg-gradient-to-t from-cream via-cream to-transparent pt-3 lg:pt-0 lg:bg-transparent space-y-3 lg:mt-auto">
        <p className="text-xs opacity-70 text-center">Kéo ảnh trên khung để căn mặt, chụm 2 ngón/cuộn chuột để zoom. Kéo thanh trượt hoặc gõ số % để chỉnh chính xác.</p>
        {error && <p className="rounded-xl bg-red-100 p-2 text-sm text-red-700 text-center">{error}</p>}
        <div className="flex gap-2">
          <button className="rounded-full bg-white px-5 py-3 font-semibold" onClick={onBack}>← Quay lại</button>
          <button disabled={busy} className="flex-1 rounded-full bg-accent py-3 font-bold text-white disabled:opacity-60" onClick={finish}>
            {busy ? 'Đang tạo ảnh…' : 'Tạo ảnh'}
          </button>
        </div>
      </div>
    </div>
  )
}