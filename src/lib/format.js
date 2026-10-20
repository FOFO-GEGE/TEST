import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const formateurMontant = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMontant(valeur) {
  return formateurMontant.format(valeur || 0)
}

export function formatDate(dateISO) {
  if (!dateISO) return ''
  const d = typeof dateISO === 'string' ? parseISO(dateISO) : dateISO
  return format(d, 'dd/MM/yyyy', { locale: fr })
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
