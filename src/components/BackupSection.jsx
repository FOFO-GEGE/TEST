import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import { exporterJSON, importerJSON } from '../lib/backup.js'

export default function BackupSection() {
  const inputRef = useRef(null)
  const [message, setMessage] = useState(null)

  const exporter = async () => {
    await exporterJSON()
    setMessage({ type: 'ok', texte: 'Export téléchargé.' })
  }

  const choisirFichier = () => inputRef.current?.click()

  const importer = async (e) => {
    const fichier = e.target.files[0]
    e.target.value = ''
    if (!fichier) return

    if (!confirm('Importer ce fichier remplacera intégralement toutes les données actuelles. Continuer ?')) return

    try {
      await importerJSON(fichier)
      setMessage({ type: 'ok', texte: 'Import terminé, données remplacées.' })
    } catch (err) {
      setMessage({ type: 'erreur', texte: err.message })
    }
  }

  const remiseAZero = async () => {
    if (!confirm('Supprimer définitivement toutes les données de cette application ?')) return
    if (!confirm('Dernière confirmation : cette action est irréversible. Continuer ?')) return
    await db.transaction('rw', db.comptes, db.categories, db.chargesRecurrentes, db.transactions, async () => {
      await db.comptes.clear()
      await db.categories.clear()
      await db.chargesRecurrentes.clear()
      await db.transactions.clear()
    })
    setMessage({ type: 'ok', texte: 'Toutes les données ont été supprimées.' })
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Sauvegarde</h2>
      <div className="space-y-2 rounded-xl bg-slate-900 p-4">
        <button
          onClick={exporter}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white"
        >
          <Download size={16} /> Exporter mes données (JSON)
        </button>
        <button
          onClick={choisirFichier}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-200"
        >
          <Upload size={16} /> Importer un fichier JSON
        </button>
        <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={importer} />
        <button
          onClick={remiseAZero}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900 py-2 text-sm font-medium text-red-400"
        >
          <Trash2 size={16} /> Remise à zéro
        </button>
        {message && (
          <p className={`text-xs ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{message.texte}</p>
        )}
      </div>
    </section>
  )
}
