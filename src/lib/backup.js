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

// Remplace intégralement le contenu des 4 tables par celui du fichier importé.
// L'appelant doit obtenir une confirmation explicite avant d'appeler cette fonction.
export async function importerJSON(fichier) {
  const texte = await fichier.text()
  let donnees
  try {
    donnees = JSON.parse(texte)
  } catch {
    throw new Error("Fichier invalide : ce n'est pas un JSON valide.")
  }

  if (donnees.version !== SCHEMA_VERSION) {
    throw new Error(
      `Version de schéma incompatible (fichier : ${donnees.version ?? 'inconnue'}, attendu : ${SCHEMA_VERSION}).`
    )
  }

  const tables = ['comptes', 'categories', 'chargesRecurrentes', 'transactions']
  for (const table of tables) {
    if (!Array.isArray(donnees[table])) {
      throw new Error(`Fichier invalide : table « ${table} » manquante.`)
    }
  }

  await db.transaction('rw', db.comptes, db.categories, db.chargesRecurrentes, db.transactions, async () => {
    await Promise.all(tables.map((t) => db[t].clear()))
    await Promise.all(tables.map((t) => db[t].bulkAdd(donnees[t])))
  })

  marquerExportFait()
}
