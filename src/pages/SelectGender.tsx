import type { Gender } from '../config/templateConfig'
const base = import.meta.env.BASE_URL
// Ảnh thay thế được: public/images/nam.png và public/images/nu.png
const OPTIONS: { id: Gender; label: string; img: string }[] = [
  { id: 'male', label: 'Nam', img: 'images/nam.png' },
  { id: 'female', label: 'Nữ', img: 'images/nu.png' },
]

export default function SelectGender({ value, onChange, onNext, onBack }:
  { value: Gender; onChange: (g: Gender) => void; onNext: () => void; onBack: () => void }) {
  return (
    <section className="animate-pop mx-auto flex max-w-md flex-col items-center gap-5 px-5 pb-10 pt-2">
      <h2 className="text-2xl font-extrabold">Bạn là…</h2>
      <div className="grid w-full grid-cols-2 gap-4" role="radiogroup">
        {OPTIONS.map(o => {
          const on = value === o.id
          return (
            <button key={o.id} role="radio" aria-checked={on} onClick={() => onChange(o.id)}
              className={`relative flex flex-col items-center overflow-hidden rounded-3xl border-4 bg-white p-2 shadow transition active:scale-95 ${on ? 'border-accent shadow-lg' : 'border-transparent'}`}>
              {on && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-accent text-white">✓</span>}
              <div className="grid aspect-[3/4] w-full place-items-center rounded-2xl bg-gradient-to-b from-pink/30 to-sun/30">
                <img src={base + o.img} alt={o.label} className="max-h-full max-w-full object-contain" />
              </div>
              <div className={`py-2 text-lg font-bold ${on ? 'text-accent' : ''}`}>{o.label}</div>
            </button>
          )
        })}
      </div>
      <div className="flex w-full gap-2">
        <button className="rounded-full bg-white px-5 py-3 font-semibold shadow-sm" onClick={onBack}>← Quay lại</button>
        <button className="flex-1 rounded-full bg-accent py-3 font-bold text-white shadow-lg" onClick={onNext}>Tiếp tục</button>
      </div>
    </section>
  )
}
