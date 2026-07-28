import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import { exporterJSON } from '../lib/backup.js'

export default function BackupSection() {
  const [message, setMessage] = useState(null)

  const exporter = async () => {
    await exporterJSON()
    setMessage({ type: 'ok', texte: 'Export téléchargé.' })
  }

  const remiseAZero = async () => {
    if (!confirm('Supprimer définitivement toutes les données de cette application ?')) return
    if (!confirm('Dernière confirmation : cette action est irréversible. Continuer ?')) return
    await db.transaction(
      'rw',
      db.comptes,
      db.categories,
      db.chargesRecurrentes,
      db.transactions,
      db.ajustements,
      async () => {
        await db.comptes.clear()
        await db.categories.clear()
        await db.chargesRecurrentes.clear()
        await db.transactions.clear()
        await db.ajustements.clear()
      }
    )
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
