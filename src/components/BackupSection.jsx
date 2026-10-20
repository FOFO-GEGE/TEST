import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import { exporterJSON } from '../lib/backup.js'
import { btnPrimaryCls, btnDangerCls } from './ui.js'

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
      <div className="label mb-2">Sauvegarde</div>
      <div className="space-y-2 rounded-2xl bg-card p-4">
        <button onClick={exporter} className={`flex items-center justify-center gap-2 ${btnPrimaryCls}`}>
          <Download size={16} /> Exporter mes données (JSON)
        </button>
        <button onClick={remiseAZero} className={`flex items-center justify-center gap-2 ${btnDangerCls}`}>
          <Trash2 size={16} /> Remise à zéro
        </button>
        {message && <p className="text-xs text-moss">{message.texte}</p>}
      </div>
    </section>
  )
}
