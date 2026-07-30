import { differenceInDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { getDernierExport } from '../lib/backup.js'

export default function ExportReminderBanner() {
  const dernierExport = getDernierExport()
  const jours = dernierExport ? differenceInDays(new Date(), dernierExport) : null
  const doitAlerter = jours === null || jours > 30

  if (!doitAlerter) return null

  return (
    <div className="mx-5 mt-5 flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        {dernierExport
          ? `Dernier export il y a ${jours} jours. Pensez à sauvegarder vos données.`
          : 'Aucun export effectué. Pensez à sauvegarder vos données.'}
      </span>
    </div>
  )
}
