import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import Modal from './Modal.jsx'
import { inputCls, labelCls, btnPrimaryCls } from './ui.js'

const VIDE = { nom: '', type: 'depense', couleur: '#a85a3f', budgetMensuel: '' }

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
        <div className="label">Catégories</div>
        <button onClick={ouvrirAjout} className="flex items-center gap-1 text-sm font-medium text-ink">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-muted">Aucune catégorie.</li>
        )}
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
              <div>
                <div className="text-sm font-medium text-ink">{c.nom}</div>
                <div className="text-xs text-ink-muted">
                  {c.type === 'depense' ? 'Dépense' : 'Revenu'}
                  {c.budgetMensuel != null ? ` · enveloppe ${c.budgetMensuel} €/mois` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => ouvrirEdition(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
                <Pencil size={16} />
              </button>
              <button onClick={() => supprimer(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
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
                className="h-11 w-full rounded-xl border border-line bg-white"
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
            <button type="submit" className={btnPrimaryCls}>
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </section>
  )
}
