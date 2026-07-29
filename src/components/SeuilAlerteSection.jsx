import { useState } from 'react'
import { getSeuilAlerte, setSeuilAlerte } from '../lib/parametres.js'
import { inputCls, labelCls } from './ui.js'

export default function SeuilAlerteSection() {
  const [seuil, setSeuil] = useState(() => getSeuilAlerte())

  const changer = (e) => {
    const valeur = Number(e.target.value)
    setSeuil(valeur)
    setSeuilAlerte(valeur)
  }

  return (
    <section>
      <div className="label mb-2">Alerte de solde</div>
      <div className="rounded-2xl bg-card p-4">
        <label className={labelCls}>Seuil sous lequel le solde projeté déclenche une alerte</label>
        <input type="number" step="1" className={inputCls} value={seuil} onChange={changer} />
      </div>
    </section>
  )
}
