import { useState, lazy, Suspense } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Charges from './pages/Charges.jsx'
import Transactions from './pages/Transactions.jsx'
import Reglages from './pages/Reglages.jsx'

// Recharts alourdit sensiblement le bundle : chargé à la demande seulement.
const Previsionnel = lazy(() => import('./pages/Previsionnel.jsx'))

const PAGES = {
  previsionnel: Previsionnel,
  charges: Charges,
  transactions: Transactions,
  reglages: Reglages,
}

export default function App() {
  const [page, setPage] = useState('previsionnel')
  const Page = PAGES[page]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-lg pb-20">
        <Suspense fallback={<div className="p-4 text-sm text-slate-500">Chargement…</div>}>
          <Page />
        </Suspense>
      </div>
      <BottomNav page={page} onNavigate={setPage} />
    </div>
  )
}
