import { Repeat, List, TrendingUp, Settings } from 'lucide-react'

const ONGLETS = [
  { id: 'previsionnel', label: 'Prévision', Icon: TrendingUp },
  { id: 'charges', label: 'Charges', Icon: Repeat },
  { id: 'transactions', label: 'Mouvements', Icon: List },
  { id: 'reglages', label: 'Réglages', Icon: Settings },
]

export default function BottomNav({ page, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg justify-around">
        {ONGLETS.map(({ id, label, Icon }) => {
          const actif = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                actif ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={actif ? 2.5 : 2} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
