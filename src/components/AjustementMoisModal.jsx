import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant } from '../lib/format.js'
import Modal from './Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

/**
 * Ajuste une charge pour un seul mois : le modèle de la charge n'est pas
 * touché, seul un enregistrement d'exception est créé/mis à jour pour ce
 * mois. Les autres mois continuent d'utiliser le montant du modèle.
 */
export default function AjustementMoisModal({ charge, mois, ajustement, onClose }) {
  const [montant, setMontant] = useState(
    ajustement?.montant != null ? String(ajustement.montant) : String(charge.montant)
  )

  const libelleMois = format(parseISO(`${mois}-01`), 'MMMM yyyy', { locale: fr })

  const enregistrer = async (e) => {
    e.preventDefault()
    const valeur = Math.abs(Number(montant))
    if (!Number.isFinite(valeur)) return
    const donnees = { chargeId: charge.id, mois, montant: valeur, annulee: false }
    if (ajustement) await db.ajustements.update(ajustement.id, donnees)
    else await db.ajustements.add(donnees)
    onClose()
  }

  const annulerEcheance = async () => {
    if (!confirm(`Supprimer l'échéance « ${charge.libelle} » pour ${libelleMois} uniquement ?`)) return
    const donnees = { chargeId: charge.id, mois, montant: null, annulee: true }
    if (ajustement) await db.ajustements.update(ajustement.id, donnees)
    else await db.ajustements.add(donnees)
    onClose()
  }

  const retablirModele = async () => {
    if (ajustement) await db.ajustements.delete(ajustement.id)
    onClose()
  }

  return (
    <Modal titre={`${charge.libelle} — ${libelleMois}`} onClose={onClose}>
      <form onSubmit={enregistrer} className="space-y-3">
        <p className="rounded-lg bg-slate-800 p-3 text-xs text-slate-400">
          Ce changement ne s'applique qu'à <strong className="text-slate-200">{libelleMois}</strong>. Les autres mois
          gardent le montant habituel de {formatMontant(charge.montant)}.
        </p>

        <div>
          <label className={labelCls}>Montant pour ce mois</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            autoFocus
          />
        </div>

        <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
          Enregistrer pour ce mois
        </button>

        <button
          type="button"
          onClick={annulerEcheance}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900 py-2 text-sm font-medium text-red-400"
        >
          <Trash2 size={16} /> Pas d'échéance ce mois-ci
        </button>

        {ajustement && (
          <button
            type="button"
            onClick={retablirModele}
            className="w-full rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300"
          >
            Rétablir le montant habituel
          </button>
        )}
      </form>
    </Modal>
  )
}
