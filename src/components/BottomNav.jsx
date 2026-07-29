import { Repeat, TrendingUp, Settings } from 'lucide-react'

const ONGLETS = [
  { id: 'previsionnel', label: 'Prévision', Icon: TrendingUp },
  { id: 'charges', label: 'Charges', Icon: Repeat },
  { id: 'reglages', label: 'Réglages', Icon: Settings },
]

export default function BottomNav({ page, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-4 flex items-center gap-1 rounded-full border border-line bg-cream/90 p-1.5 shadow-[0_4px_24px_rgba(33,29,23,0.08)] backdrop-blur">
        {ONGLETS.map(({ id, label, Icon }) => {
          const actif = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                actif ? 'bg-ink text-cream' : 'text-ink-muted'
              }`}
            >
              <Icon size={16} strokeWidth={2.25} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
