import { X } from 'lucide-react'

export default function Modal({ titre, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-slate-900 p-4 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{titre}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
