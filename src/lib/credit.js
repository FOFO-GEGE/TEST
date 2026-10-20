import { addMonths, endOfMonth, format, parseISO } from 'date-fns'

/**
 * Répartit un montant total sur N mensualités égales, en centimes. La
 * division ne tombe pas toujours juste (500 / 3 = 166,666…) : le dernier
 * mois absorbe l'écart d'arrondi pour que la somme des mensualités
 * corresponde exactement au montant total, jamais au-dessus.
 */
export function calculerMensualites(montantTotal, nombreMois) {
  const montantBase = Math.floor((montantTotal / nombreMois) * 100) / 100
  const montantDernier = Math.round((montantTotal - montantBase * (nombreMois - 1)) * 100) / 100
  return Array.from({ length: nombreMois }, (_, i) => (i === nombreMois - 1 ? montantDernier : montantBase))
}

/**
 * Une charge « crédit » est une charge mensuelle ordinaire dont dateFin est
 * fixée pour ne générer que `nombreMois` occurrences, à partir du 1er jour
 * de `moisDepart` (format yyyy-MM) — aucun nouveau mécanisme, on réutilise
 * le moteur d'occurrences existant.
 */
export function calculerPeriodeCredit(moisDepart, nombreMois) {
  const debut = parseISO(`${moisDepart}-01`)
  const dateDebut = format(debut, 'yyyy-MM-dd')
  const dateFin = format(endOfMonth(addMonths(debut, nombreMois - 1)), 'yyyy-MM-dd')
  const dernierMois = format(addMonths(debut, nombreMois - 1), 'yyyy-MM')
  return { dateDebut, dateFin, dernierMois }
}
