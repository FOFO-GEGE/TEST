import { differenceInDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { getDernierExport } from '../lib/backup.js'

export default function ExportReminderBanner() {
  const dernierExport = getDernierExport()
  const jours = dernierExport ? differenceInDays(new Date(), dernierExport) : null
  const doitAlerter = jours === null || jours > 30

  if (!doitAlerter) return null

  return (
    <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-950/50 px-3 py-2 text-xs text-amber-300">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        {dernierExport
          ? `Dernier export il y a ${jours} jours. Pensez à sauvegarder vos données.`
          : 'Aucun export effectué. Pensez à sauvegarder vos données.'}
      </span>
    </div>
  )
}
