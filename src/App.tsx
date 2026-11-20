import { useState } from 'react'
import type { Gender } from './config/templateConfig'
import Editor from './components/Editor'
import Petals from './components/Petals'
import Home from './pages/Home'
import SelectGender from './pages/SelectGender'

type Step = 'home' | 'gender' | 'edit' | 'result'
const btn = 'rounded-full bg-accent px-8 py-3 font-bold text-white shadow'

export default function App() {
  const [step, setStep] = useState<Step>('home')
  const [gender, setGender] = useState<Gender>('female')
  const [url, setUrl] = useState<string>()

  const reset = () => { if (url) URL.revokeObjectURL(url); setUrl(undefined); setStep('gender') }

  async function share() {
    if (!url) return
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], 'graduation-memory.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {})
  }

  return (
    <main className="relative min-h-dvh bg-gradient-to-b from-cream via-cream to-pink/30">
      <Petals />
      {step !== 'home' && <header className="relative p-4 text-center text-lg font-bold text-accent">Graduation Memories</header>}
      {step === 'home' && <Home onStart={() => setStep('gender')} />}
      {step === 'gender' && <SelectGender value={gender} onChange={setGender} onNext={() => setStep('edit')} onBack={() => setStep('home')} />}
      {step === 'edit' && <Editor gender={gender} onBack={() => setStep('gender')} onDone={u => { setUrl(u); setStep('result') }} />}
      {step === 'result' && url && (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-4">
          <img src={url} alt="Ảnh kỷ niệm" className="w-full rounded-2xl shadow" />
          <a className={btn} href={url} download="graduation-memory.png">Tải ảnh PNG</a>
          <button className="rounded-full bg-sun px-6 py-2 font-semibold" onClick={share}>Chia sẻ / Lưu vào ảnh (iPhone)</button>
          <p className="text-xs opacity-70">iPhone: nếu nút tải không hoạt động, nhấn giữ ảnh rồi chọn “Lưu vào Ảnh”.</p>
          <div className="flex gap-2">
            <button className="rounded-full bg-white px-5 py-2" onClick={() => setStep('edit')}>← Căn chỉnh lại</button>
            <button className="rounded-full bg-white px-5 py-2" onClick={reset}>Làm ảnh mới</button>
          </div>
        </section>
      )}
    </main>
  )
}
