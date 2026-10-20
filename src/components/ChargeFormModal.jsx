import { useState } from 'react'
import { db } from '../db.js'
import { todayISO } from '../lib/format.js'
import Modal from './Modal.jsx'
import { inputCls, labelCls, btnPrimaryCls } from './ui.js'

export const FREQUENCES = [
  { id: 'mensuel', label: 'Mensuel', diviseur: 1 },
  { id: 'bimestriel', label: 'Bimestriel', diviseur: 2 },
  { id: 'trimestriel', label: 'Trimestriel', diviseur: 3 },
  { id: 'semestriel', label: 'Semestriel', diviseur: 6 },
  { id: 'annuel', label: 'Annuel', diviseur: 12 },
]

const VIDE = {
  libelle: '',
  montant: '',
  type: 'depense',
  compteId: '',
  categorieId: '',
  frequence: 'mensuel',
  jourPrelevement: 5,
  moisReference: '',
  dateDebut: todayISO(),
  dateFin: '',
  active: true,
}

// Modifier une charge change son modèle pour toutes ses échéances futures :
// il n'existe pas de notion d'exception ponctuelle sur un seul mois (voir
// la règle de conception dans le brief — les occurrences ne sont jamais
// persistées, une charge n'a qu'un seul jeu de paramètres à la fois).
export default function ChargeFormModal({ charge, comptes, categories, onClose }) {
  const [edition, setEdition] = useState(() =>
    charge
      ? { ...charge, moisReference: charge.moisReference ?? '', dateFin: charge.dateFin ?? '' }
      : { ...VIDE, compteId: comptes[0]?.id ?? '', categorieId: categories[0]?.id ?? '' }
  )

  const enregistrer = async (e) => {
    e.preventDefault()
    const frequenceNonMensuelle = edition.frequence !== 'mensuel'
    const donnees = {
      libelle: edition.libelle.trim(),
      montant: Math.abs(Number(edition.montant)) || 0,
      type: edition.type,
      compteId: Number(edition.compteId),
      categorieId: Number(edition.categorieId),
      frequence: edition.frequence,
      jourPrelevement: Math.min(31, Math.max(1, Number(edition.jourPrelevement) || 1)),
      moisReference: frequenceNonMensuelle ? Number(edition.moisReference) || 1 : null,
      dateDebut: edition.dateDebut,
      dateFin: edition.dateFin || null,
      active: edition.active,
    }
    if (!donnees.libelle || !donnees.compteId || !donnees.categorieId) return
    if (edition.id) await db.chargesRecurrentes.update(edition.id, donnees)
    else await db.chargesRecurrentes.add(donnees)
    onClose()
  }

  return (
    <Modal titre={edition.id ? 'Modifier la charge' : 'Nouvelle charge'} onClose={onClose}>
      <form onSubmit={enregistrer} className="space-y-3">
        <div>
          <label className={labelCls}>Libellé</label>
          <input
            className={inputCls}
            value={edition.libelle}
            onChange={(e) => setEdition({ ...edition, libelle: e.target.value })}
            placeholder="Loyer"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Montant</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={edition.montant}
              onChange={(e) => setEdition({ ...edition, montant: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              className={inputCls}
              value={edition.type}
              onChange={(e) => setEdition({ ...edition, type: e.target.value })}
            >
              <option value="depense">Dépense</option>
              <option value="revenu">Revenu</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Compte</label>
          <select
            className={inputCls}
            value={edition.compteId}
            onChange={(e) => setEdition({ ...edition, compteId: e.target.value })}
          >
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Catégorie</label>
          <select
            className={inputCls}
            value={edition.categorieId}
            onChange={(e) => setEdition({ ...edition, categorieId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fréquence</label>
            <select
              className={inputCls}
              value={edition.frequence}
              onChange={(e) => setEdition({ ...edition, frequence: e.target.value })}
            >
              {FREQUENCES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Jour de prélèvement</label>
            <input
              type="number"
              min="1"
              max="31"
              className={inputCls}
              value={edition.jourPrelevement}
              onChange={(e) => setEdition({ ...edition, jourPrelevement: e.target.value })}
            />
          </div>
        </div>
        {edition.frequence !== 'mensuel' && (
          <div>
            <label className={labelCls}>Mois de la 1re échéance</label>
            <select
              className={inputCls}
              value={edition.moisReference}
              onChange={(e) => setEdition({ ...edition, moisReference: e.target.value })}
            >
              <option value="">—</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date de début</label>
            <input
              type="date"
              className={inputCls}
              value={edition.dateDebut}
              onChange={(e) => setEdition({ ...edition, dateDebut: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Date de fin (optionnel)</label>
            <input
              type="date"
              className={inputCls}
              value={edition.dateFin}
              onChange={(e) => setEdition({ ...edition, dateFin: e.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={edition.active}
            onChange={(e) => setEdition({ ...edition, active: e.target.checked })}
            className="accent-ink"
          />
          Active
        </label>
        <button type="submit" className={btnPrimaryCls}>
          Enregistrer
        </button>
      </form>
    </Modal>
  )
}
