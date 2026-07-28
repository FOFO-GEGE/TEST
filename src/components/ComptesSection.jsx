import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import Modal from './Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

const VIDE = { nom: '', type: 'courant', soldeInitial: '', dateSolde: todayISO() }

export default function ComptesSection() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const [edition, setEdition] = useState(null)

  const ouvrirAjout = () => setEdition({ ...VIDE })
  const ouvrirEdition = (c) => setEdition({ ...c })
  const fermer = () => setEdition(null)

  const enregistrer = async (e) => {
    e.preventDefault()
    const donnees = {
      nom: edition.nom.trim(),
      type: edition.type,
      soldeInitial: Number(edition.soldeInitial) || 0,
      dateSolde: edition.dateSolde,
      archive: edition.archive || false,
    }
    if (!donnees.nom) return
    if (edition.id) await db.comptes.update(edition.id, donnees)
    else await db.comptes.add(donnees)
    fermer()
  }

  const basculerArchive = (c) => db.comptes.update(c.id, { archive: !c.archive })

  if (!comptes) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Comptes</h2>
        <button onClick={ouvrirAjout} className="flex items-center gap-1 text-sm text-emerald-400">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
        {comptes.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">Aucun compte. Ajoutez votre premier compte.</li>
        )}
        {comptes.map((c) => (
          <li key={c.id} className={`flex items-center justify-between px-4 py-3 ${c.archive ? 'opacity-50' : ''}`}>
            <div>
              <div className="text-sm font-medium text-slate-100">{c.nom}</div>
              <div className="text-xs text-slate-500">
                {c.type === 'courant' ? 'Compte courant' : 'Épargne'} · {formatMontant(c.soldeInitial)} au {formatDate(c.dateSolde)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => basculerArchive(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                {c.archive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
              <button onClick={() => ouvrirEdition(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                <Pencil size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {edition && (
        <Modal titre={edition.id ? 'Modifier le compte' : 'Nouveau compte'} onClose={fermer}>
          <form onSubmit={enregistrer} className="space-y-3">
            <div>
              <label className={labelCls}>Nom</label>
              <input
                className={inputCls}
                value={edition.nom}
                onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                placeholder="Compte courant"
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
                <option value="courant">Compte courant</option>
                <option value="epargne">Épargne</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Solde de référence</label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={edition.soldeInitial}
                onChange={(e) => setEdition({ ...edition, soldeInitial: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>Date à laquelle ce solde était exact</label>
              <input
                type="date"
                className={inputCls}
                value={edition.dateSolde}
                onChange={(e) => setEdition({ ...edition, dateSolde: e.target.value })}
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
