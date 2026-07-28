import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { db } from '../db.js'
import { parserCsvTexte, mapperLignesEnTransactions } from '../lib/csv.js'
import { formatMontant, formatDate } from '../lib/format.js'
import Modal from './Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

export default function ImportCsvModal({ comptes, categories, onClose }) {
  const inputRef = useRef(null)
  const [compteId, setCompteId] = useState(comptes.find((c) => !c.archive)?.id ?? comptes[0]?.id ?? '')
  const [categorieParDefautId, setCategorieParDefautId] = useState(
    categories.find((c) => c.type === 'depense')?.id ?? categories[0]?.id ?? ''
  )
  const [apercu, setApercu] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [importe, setImporte] = useState(false)

  const choisirFichier = () => inputRef.current?.click()

  const lireFichier = async (e) => {
    const fichier = e.target.files[0]
    e.target.value = ''
    if (!fichier) return
    setErreur(null)
    setApercu(null)
    try {
      const texte = await fichier.text()
      const { entetes, lignes } = parserCsvTexte(texte)
      if (entetes.length === 0 || lignes.length === 0) {
        setErreur('Fichier vide ou illisible.')
        return
      }
      const resultat = mapperLignesEnTransactions({
        entetes,
        lignes,
        categories,
        compteId: Number(compteId),
        categorieParDefautId: Number(categorieParDefautId),
      })
      setApercu(resultat)
    } catch {
      setErreur('Impossible de lire ce fichier.')
    }
  }

  const confirmer = async () => {
    if (!apercu || apercu.transactions.length === 0) return
    await db.transactions.bulkAdd(apercu.transactions)
    setImporte(true)
  }

  return (
    <Modal titre="Importer un CSV" onClose={onClose}>
      {importe ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-emerald-400">{apercu.transactions.length} transaction(s) importée(s).</p>
          <button onClick={onClose} className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
            Fermer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Colonnes reconnues : Date, Libellé, Montant (ou Débit/Crédit séparés), Catégorie (optionnel). Séparateur
            virgule ou point-virgule détecté automatiquement.
          </p>

          <div>
            <label className={labelCls}>Compte de destination</label>
            <select className={inputCls} value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Catégorie par défaut (si absente du fichier ou inconnue)</label>
            <select
              className={inputCls}
              value={categorieParDefautId}
              onChange={(e) => setCategorieParDefautId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={choisirFichier}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-200"
          >
            <Upload size={16} /> Choisir un fichier CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={lireFichier} />

          {erreur && <p className="text-xs text-red-400">{erreur}</p>}

          {apercu && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                <span className="text-emerald-400">{apercu.transactions.length} ligne(s) prête(s)</span>
                {apercu.ignorees.length > 0 && (
                  <span className="text-amber-400"> · {apercu.ignorees.length} ignorée(s)</span>
                )}
              </p>

              {apercu.transactions.length > 0 && (
                <ul className="max-h-48 divide-y divide-slate-800 overflow-y-auto rounded-lg bg-slate-800">
                  {apercu.transactions.slice(0, 8).map((t, i) => {
                    const categorie = categories.find((c) => c.id === t.categorieId)
                    return (
                      <li key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <div className="text-slate-200">{t.libelle}</div>
                          <div className="text-slate-500">
                            {formatDate(t.date)} · {categorie?.nom}
                          </div>
                        </div>
                        <span className={t.montant < 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {formatMontant(t.montant)}
                        </span>
                      </li>
                    )
                  })}
                  {apercu.transactions.length > 8 && (
                    <li className="px-3 py-2 text-center text-xs text-slate-500">
                      + {apercu.transactions.length - 8} autre(s)
                    </li>
                  )}
                </ul>
              )}

              <button
                onClick={confirmer}
                disabled={apercu.transactions.length === 0}
                className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Confirmer l'import de {apercu.transactions.length} transaction(s)
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
