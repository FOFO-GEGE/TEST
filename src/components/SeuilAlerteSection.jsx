import { useState } from 'react'
import { getSeuilAlerte, setSeuilAlerte } from '../lib/parametres.js'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'

export default function SeuilAlerteSection() {
  const [seuil, setSeuil] = useState(() => getSeuilAlerte())

  const changer = (e) => {
    const valeur = Number(e.target.value)
    setSeuil(valeur)
    setSeuilAlerte(valeur)
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Alerte de solde</h2>
      <div className="rounded-xl bg-slate-900 p-4">
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Seuil sous lequel le solde projeté déclenche une alerte
        </label>
        <input type="number" step="1" className={inputCls} value={seuil} onChange={changer} />
      </div>
    </section>
  )
}
