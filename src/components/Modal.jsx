import { X } from 'lucide-react'

export default function Modal({ titre, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-cream p-5 shadow-[0_-8px_40px_rgba(33,29,23,0.15)] sm:rounded-[28px] sm:shadow-[0_20px_60px_rgba(33,29,23,0.2)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl italic text-ink">{titre}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-subtle">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
