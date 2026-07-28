import { db, SCHEMA_VERSION } from '../db.js'

const CLE_DERNIER_EXPORT = 'budget-perso:dernier-export'

export function getDernierExport() {
  const valeur = localStorage.getItem(CLE_DERNIER_EXPORT)
  return valeur ? new Date(valeur) : null
}

function marquerExportFait() {
  localStorage.setItem(CLE_DERNIER_EXPORT, new Date().toISOString())
}

export async function exporterJSON() {
  const [comptes, categories, chargesRecurrentes, transactions] = await Promise.all([
    db.comptes.toArray(),
    db.categories.toArray(),
    db.chargesRecurrentes.toArray(),
    db.transactions.toArray(),
  ])

  const donnees = {
    version: SCHEMA_VERSION,
    exporteLe: new Date().toISOString(),
    comptes,
    categories,
    chargesRecurrentes,
    transactions,
  }

  const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const aujourdhui = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `budget-${aujourdhui}.json`
  a.click()
  URL.revokeObjectURL(url)

  marquerExportFait()
}
