const base = import.meta.env.BASE_URL

export default function Home({ onStart }: { onStart: () => void }) {
  return (
    <section className="animate-pop relative mx-auto flex max-w-md flex-col items-center gap-6 px-5 pb-10 pt-4 text-center">
      <div className="rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-accent shadow-sm">Graduation Memories</div>

      <div className="relative w-full rounded-[2rem] bg-gradient-to-b from-pink/50 to-sun/40 px-4 pb-0 pt-6 shadow-md">
        <h1 className="text-[1.65rem] font-extrabold leading-tight">Cùng nhau lưu giữ khoảnh khắc tốt nghiệp!</h1>
        <div className="mt-4 flex items-end justify-center gap-2">
          <img src={base + 'images/nu.png'} alt="Chibi nữ" className="animate-float w-[44%] drop-shadow-md" />
          <img src={base + 'images/nam.png'} alt="Chibi nam" className="animate-float w-[40%] drop-shadow-md" style={{ animationDelay: '.6s' }} />
        </div>
      </div>

      <p className="text-base leading-relaxed">
        Tải ảnh chân dung của bạn, ghép vào nhân vật Chibi và mang về tấm ảnh tốt nghiệp thật đáng yêu.
      </p>

      <button onClick={onStart}
        className="w-full rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-95 hover:brightness-105">
        Bắt đầu tạo ảnh
      </button>
    </section>
  )
}
