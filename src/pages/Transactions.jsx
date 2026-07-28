import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Upload } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import Modal from '../components/Modal.jsx'
import ImportCsvModal from '../components/ImportCsvModal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

const FILTRES_VIDES = { compteId: '', categorieId: '', periode: 'tout' }

function bornesPeriode(periode) {
  const aujourdhui = new Date()
  if (periode === 'mois') {
    const debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1).toISOString().slice(0, 10)
    return { debut }
  }
  if (periode === '30j') {
    const d = new Date(aujourdhui)
    d.setDate(d.getDate() - 30)
    return { debut: d.toISOString().slice(0, 10) }
  }
  return null
}

export default function Transactions() {
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), [])
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [edition, setEdition] = useState(null)
  const [saisieRapide, setSaisieRapide] = useState({ signe: 'depense', montant: '', libelle: '', categorieId: '' })
  const [importCsvOuvert, setImportCsvOuvert] = useState(false)

  if (!transactions || !comptes || !categories) return null

  if (comptes.length === 0 || categories.length === 0) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold text-slate-100">Transactions</h1>
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
          Créez d'abord un compte et une catégorie dans les réglages.
        </p>
      </div>
    )
  }

  const compteParDefaut = comptes.find((c) => !c.archive)?.id ?? comptes[0]?.id ?? null

  const enregistrerSaisieRapide = async (e) => {
    e.preventDefault()
    const montant = Number(saisieRapide.montant)
    if (!montant || !saisieRapide.libelle.trim() || !saisieRapide.categorieId || !compteParDefaut) return
    await db.transactions.add({
      date: todayISO(),
      libelle: saisieRapide.libelle.trim(),
      montant: saisieRapide.signe === 'depense' ? -Math.abs(montant) : Math.abs(montant),
      compteId: compteParDefaut,
      categorieId: Number(saisieRapide.categorieId),
      chargeId: null,
      note: null,
    })
    setSaisieRapide({ signe: saisieRapide.signe, montant: '', libelle: '', categorieId: saisieRapide.categorieId })
  }

  const ouvrirEdition = (t) => setEdition({ ...t, note: t.note ?? '' })
  const fermerEdition = () => setEdition(null)

  const enregistrerEdition = async (e) => {
    e.preventDefault()
    const donnees = {
      date: edition.date,
      libelle: edition.libelle.trim(),
      montant: Number(edition.montant),
      compteId: Number(edition.compteId),
      categorieId: Number(edition.categorieId),
      note: edition.note || null,
    }
    if (!donnees.libelle || !donnees.montant) return
    await db.transactions.update(edition.id, donnees)
    fermerEdition()
  }

  const supprimer = async (t) => {
    if (confirm(`Supprimer la transaction « ${t.libelle} » ?`)) await db.transactions.delete(t.id)
  }

  const borne = bornesPeriode(filtres.periode)
  const filtrees = transactions.filter((t) => {
    if (filtres.compteId && t.compteId !== Number(filtres.compteId)) return false
    if (filtres.categorieId && t.categorieId !== Number(filtres.categorieId)) return false
    if (borne && t.date < borne.debut) return false
    return true
  })

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Transactions</h1>
        <button
          onClick={() => setImportCsvOuvert(true)}
          className="flex items-center gap-1 text-sm text-emerald-400"
        >
          <Upload size={16} /> Importer un CSV
        </button>
      </div>

      <form onSubmit={enregistrerSaisieRapide} className="mb-4 rounded-xl bg-slate-900 p-4">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSaisieRapide({ ...saisieRapide, signe: 'depense' })}
            className={`rounded-lg p-2 ${saisieRapide.signe === 'depense' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            <ArrowDownCircle size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSaisieRapide({ ...saisieRapide, signe: 'revenu' })}
            className={`rounded-lg p-2 ${saisieRapide.signe === 'revenu' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            <ArrowUpCircle size={18} />
          </button>
          <input
            type="number"
            step="0.01"
            placeholder="Montant"
            className={inputCls}
            value={saisieRapide.montant}
            onChange={(e) => setSaisieRapide({ ...saisieRapide, montant: e.target.value })}
          />
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            placeholder="Libellé"
            className={inputCls}
            value={saisieRapide.libelle}
            onChange={(e) => setSaisieRapide({ ...saisieRapide, libelle: e.target.value })}
          />
          <select
            className={inputCls}
            value={saisieRapide.categorieId}
            onChange={(e) => setSaisieRapide({ ...saisieRapide, categorieId: e.target.value })}
          >
            <option value="">Catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
          <Plus size={16} /> Ajouter
        </button>
      </form>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <select
          className={inputCls}
          value={filtres.compteId}
          onChange={(e) => setFiltres({ ...filtres, compteId: e.target.value })}
        >
          <option value="">Tous comptes</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={filtres.categorieId}
          onChange={(e) => setFiltres({ ...filtres, categorieId: e.target.value })}
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={filtres.periode}
          onChange={(e) => setFiltres({ ...filtres, periode: e.target.value })}
        >
          <option value="tout">Tout</option>
          <option value="mois">Ce mois-ci</option>
          <option value="30j">30 derniers jours</option>
        </select>
      </div>

      {filtrees.length === 0 && (
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">Aucune transaction.</p>
      )}

      <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
        {filtrees.map((t) => {
          const compte = comptes.find((c) => c.id === t.compteId)
          const categorie = categories.find((c) => c.id === t.categorieId)
          return (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-100">{t.libelle}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(t.date)} · {compte?.nom} · {categorie?.nom}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${t.montant < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatMontant(t.montant)}
                </span>
                <button onClick={() => ouvrirEdition(t)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                  <Pencil size={16} />
                </button>
                <button onClick={() => supprimer(t)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {importCsvOuvert && (
        <ImportCsvModal comptes={comptes} categories={categories} onClose={() => setImportCsvOuvert(false)} />
      )}

      {edition && (
        <Modal titre="Modifier la transaction" onClose={fermerEdition}>
          <form onSubmit={enregistrerEdition} className="space-y-3">
            <div>
              <label className={labelCls}>Libellé</label>
              <input
                className={inputCls}
                value={edition.libelle}
                onChange={(e) => setEdition({ ...edition, libelle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Montant (signé)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={edition.montant}
                  onChange={(e) => setEdition({ ...edition, montant: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={edition.date}
                  onChange={(e) => setEdition({ ...edition, date: e.target.value })}
                />
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
            <div>
              <label className={labelCls}>Note (optionnel)</label>
              <input
                className={inputCls}
                value={edition.note}
                onChange={(e) => setEdition({ ...edition, note: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
