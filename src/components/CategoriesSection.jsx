import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import Modal from './Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

const VIDE = { nom: '', type: 'depense', couleur: '#22c55e', budgetMensuel: '' }

export default function CategoriesSection() {
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const [edition, setEdition] = useState(null)

  const ouvrirAjout = () => setEdition({ ...VIDE })
  const ouvrirEdition = (c) => setEdition({ ...c, budgetMensuel: c.budgetMensuel ?? '' })
  const fermer = () => setEdition(null)

  const enregistrer = async (e) => {
    e.preventDefault()
    const donnees = {
      nom: edition.nom.trim(),
      type: edition.type,
      couleur: edition.couleur,
      budgetMensuel: edition.budgetMensuel === '' ? null : Number(edition.budgetMensuel),
    }
    if (!donnees.nom) return
    if (edition.id) await db.categories.update(edition.id, donnees)
    else await db.categories.add(donnees)
    fermer()
  }

  const supprimer = async (c) => {
    const utilisee =
      (await db.chargesRecurrentes.where('categorieId').equals(c.id).count()) +
      (await db.transactions.where('categorieId').equals(c.id).count())
    if (utilisee > 0) {
      alert(`Impossible de supprimer « ${c.nom} » : catégorie utilisée par ${utilisee} élément(s).`)
      return
    }
    if (confirm(`Supprimer la catégorie « ${c.nom} » ?`)) await db.categories.delete(c.id)
  }

  if (!categories) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Catégories</h2>
        <button onClick={ouvrirAjout} className="flex items-center gap-1 text-sm text-emerald-400">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">Aucune catégorie.</li>
        )}
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.couleur }} />
              <div>
                <div className="text-sm font-medium text-slate-100">{c.nom}</div>
                <div className="text-xs text-slate-500">
                  {c.type === 'depense' ? 'Dépense' : 'Revenu'}
                  {c.budgetMensuel != null ? ` · enveloppe ${c.budgetMensuel} €/mois` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => ouvrirEdition(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                <Pencil size={16} />
              </button>
              <button onClick={() => supprimer(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {edition && (
        <Modal titre={edition.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={fermer}>
          <form onSubmit={enregistrer} className="space-y-3">
            <div>
              <label className={labelCls}>Nom</label>
              <input
                className={inputCls}
                value={edition.nom}
                onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                autoFocus
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
            <div>
              <label className={labelCls}>Couleur</label>
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800"
                value={edition.couleur}
                onChange={(e) => setEdition({ ...edition, couleur: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Enveloppe mensuelle (optionnel)</label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={edition.budgetMensuel}
                onChange={(e) => setEdition({ ...edition, budgetMensuel: e.target.value })}
                placeholder="Aucune limite"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </section>
  )
}
