import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, todayISO } from '../lib/format.js'
import { soldeCompte } from '../lib/soldes.js'
import Modal from './Modal.jsx'
import { inputCls, labelCls, btnPrimaryCls } from './ui.js'

const VIDE = { nom: '', type: 'courant', soldeInitial: '', dateSolde: todayISO() }

export default function ComptesSection() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
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

  if (!comptes || !transactions) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="label">Comptes</div>
        <button onClick={ouvrirAjout} className="flex items-center gap-1 text-sm font-medium text-ink">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {comptes.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-muted">Aucun compte. Ajoutez votre premier compte.</li>
        )}
        {comptes.map((c) => (
          <li key={c.id} className={`flex items-center justify-between px-4 py-3.5 ${c.archive ? 'opacity-40' : ''}`}>
            <div>
              <div className="text-sm font-medium text-ink">{c.nom}</div>
              <div className="text-xs text-ink-muted">{c.type === 'courant' ? 'Compte courant' : 'Épargne'}</div>
            </div>
            <div className="mr-2 text-sm font-medium text-ink">{formatMontant(soldeCompte(c, transactions))}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => basculerArchive(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
                {c.archive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
              <button onClick={() => ouvrirEdition(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
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
            <button type="submit" className={btnPrimaryCls}>
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </section>
  )
}
