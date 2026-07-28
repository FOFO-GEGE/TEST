import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Power } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, todayISO } from '../lib/format.js'
import Modal from '../components/Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

const FREQUENCES = [
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

export default function Charges() {
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const [edition, setEdition] = useState(null)

  const ouvrirAjout = () => setEdition({ ...VIDE, compteId: comptes?.[0]?.id ?? '', categorieId: categories?.[0]?.id ?? '' })
  const ouvrirEdition = (c) => setEdition({ ...c, moisReference: c.moisReference ?? '', dateFin: c.dateFin ?? '' })
  const fermer = () => setEdition(null)

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
    fermer()
  }

  const basculerActive = (c) => db.chargesRecurrentes.update(c.id, { active: !c.active })

  if (!charges || !comptes || !categories) return null

  const groupes = FREQUENCES.map((f) => ({
    ...f,
    charges: charges.filter((c) => c.frequence === f.id),
  })).filter((g) => g.charges.length > 0)

  const totalMensuelLisse = charges
    .filter((c) => c.active && c.type === 'depense')
    .reduce((somme, c) => {
      const diviseur = FREQUENCES.find((f) => f.id === c.frequence)?.diviseur ?? 1
      return somme + c.montant / diviseur
    }, 0)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Charges récurrentes</h1>
        <button onClick={ouvrirAjout} className="flex items-center gap-1 text-sm text-emerald-400">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-slate-900 p-4">
        <div className="text-xs text-slate-400">Total mensuel lissé des dépenses</div>
        <div className="text-lg font-semibold text-slate-100">{formatMontant(totalMensuelLisse)}</div>
      </div>

      {charges.length === 0 && (
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
          Aucune charge récurrente. Ajoutez votre premier loyer, abonnement ou salaire.
        </p>
      )}

      {groupes.map((groupe) => (
        <div key={groupe.id} className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{groupe.label}</h2>
          <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
            {groupe.charges.map((c) => {
              const compte = comptes.find((cp) => cp.id === c.compteId)
              const categorie = categories.find((cat) => cat.id === c.categorieId)
              return (
                <li key={c.id} className={`flex items-center justify-between px-4 py-3 ${c.active ? '' : 'opacity-50'}`}>
                  <div>
                    <div className="text-sm font-medium text-slate-100">{c.libelle}</div>
                    <div className="text-xs text-slate-500">
                      {compte?.nom} · {categorie?.nom} · jour {c.jourPrelevement}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${c.type === 'depense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.type === 'depense' ? '-' : '+'}
                      {formatMontant(c.montant)}
                    </span>
                    <button onClick={() => basculerActive(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                      <Power size={16} />
                    </button>
                    <button onClick={() => ouvrirEdition(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                      <Pencil size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {edition && (
        <Modal titre={edition.id ? 'Modifier la charge' : 'Nouvelle charge'} onClose={fermer}>
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
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={edition.active}
                onChange={(e) => setEdition({ ...edition, active: e.target.checked })}
              />
              Active
            </label>
            <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
