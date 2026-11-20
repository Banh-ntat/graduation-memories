const PETALS = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 83) % 100, delay: (i * 1.7) % 9, dur: 9 + ((i * 3) % 7), size: 14 + ((i * 5) % 12),
}))

/** Cánh hoa anh đào rơi, chỉ trang trí (không bắt sự kiện chuột). */
export default function Petals() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span key={i} className="petal absolute top-0 select-none"
          style={{ left: `${p.left}%`, fontSize: p.size, animation: `fall ${p.dur}s linear ${p.delay}s infinite` }}>🌸</span>
      ))}
    </div>
  )
}
