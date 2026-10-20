import { parseISO, format, getDaysInMonth, isBefore, isAfter, differenceInCalendarMonths } from 'date-fns'

const STEP_MOIS_PAR_FREQUENCE = {
  mensuel: 1,
  bimestriel: 2,
  trimestriel: 3,
  semestriel: 6,
  annuel: 12,
}

// jourPrelevement > nombre de jours du mois (ex: 31 en février) → dernier jour du mois.
function dateEcheance(annee, moisIndex0, jourPrelevement) {
  const joursDansLeMois = getDaysInMonth(new Date(annee, moisIndex0, 1))
  const jour = Math.min(jourPrelevement, joursDansLeMois)
  return new Date(annee, moisIndex0, jour)
}

// Fréquences non mensuelles : la 1re échéance de la charge tombe dans le
// mois `moisReference`, puis se répète tous les `step` mois. On cherche la
// première échéance de ce cycle qui n'est pas antérieure à `dateDebut`.
function premiereEcheance(charge) {
  const debut = parseISO(charge.dateDebut)

  if (charge.frequence === 'mensuel') {
    let candidate = dateEcheance(debut.getFullYear(), debut.getMonth(), charge.jourPrelevement)
    if (isBefore(candidate, debut)) {
      candidate = dateEcheance(debut.getFullYear(), debut.getMonth() + 1, charge.jourPrelevement)
    }
    return candidate
  }

  const step = STEP_MOIS_PAR_FREQUENCE[charge.frequence]
  const moisRef0 = charge.moisReference - 1
  let candidate = dateEcheance(debut.getFullYear(), moisRef0, charge.jourPrelevement)
  while (isBefore(candidate, debut)) {
    candidate = dateEcheance(candidate.getFullYear(), candidate.getMonth() + step, charge.jourPrelevement)
  }
  return candidate
}

export function cleAjustement(chargeId, mois) {
  return `${chargeId}|${mois}`
}

/**
 * Fonction pure : calcule les occurrences prévues d'une liste de charges
 * récurrentes sur une fenêtre de dates, sans aucune dépendance à Dexie.
 * Retourne { chargeId, date, montant, libelle, type, ajuste, annule }[], trié
 * par date.
 *
 * `ajustements` porte les exceptions ponctuelles déclarées par l'utilisateur
 * ({ chargeId, mois: 'yyyy-MM', montant, annulee }) : elles ne s'appliquent
 * qu'au mois visé, le modèle de la charge reste inchangé pour les autres.
 *
 * Par défaut, une échéance annulée pour un mois n'apparaît pas du tout dans
 * le résultat (c'est ce que veulent les totaux financiers : projection,
 * reste à vivre…). `inclureAnnulees: true` les inclut quand même, marquées
 * `annule: true` — nécessaire pour l'écran de détail d'un mois, où une
 * échéance annulée doit rester visible et réactivable plutôt que de
 * disparaître comme si elle avait été supprimée.
 */
export function getOccurrences(charges, dateDebut, dateFin, ajustements = [], { inclureAnnulees = false } = {}) {
  const debutFenetre = parseISO(dateDebut)
  const finFenetre = parseISO(dateFin)
  const occurrences = []

  const parCle = new Map()
  for (const a of ajustements) parCle.set(cleAjustement(a.chargeId, a.mois), a)

  for (const charge of charges) {
    if (!charge.active) continue
    const step = STEP_MOIS_PAR_FREQUENCE[charge.frequence]
    if (!step) continue

    const finCharge = charge.dateFin ? parseISO(charge.dateFin) : null
    let date = premiereEcheance(charge)

    // Saute directement au bon palier plutôt que d'itérer mois par mois
    // depuis l'origine de la charge (qui peut dater de plusieurs années).
    if (isBefore(date, debutFenetre)) {
      const moisAAvancer = differenceInCalendarMonths(debutFenetre, date)
      const paliers = Math.ceil(moisAAvancer / step)
      if (paliers > 0) {
        date = dateEcheance(date.getFullYear(), date.getMonth() + paliers * step, charge.jourPrelevement)
      }
    }

    while (!isAfter(date, finFenetre)) {
      if (finCharge && isAfter(date, finCharge)) break
      if (!isBefore(date, debutFenetre)) {
        const dateISO = format(date, 'yyyy-MM-dd')
        const ajustement = parCle.get(cleAjustement(charge.id, dateISO.slice(0, 7)))
        if (!ajustement?.annulee) {
          const montantAjuste = ajustement?.montant
          occurrences.push({
            chargeId: charge.id,
            date: dateISO,
            montant: montantAjuste == null ? charge.montant : montantAjuste,
            libelle: charge.libelle,
            type: charge.type,
            ajuste: montantAjuste != null,
            annule: false,
          })
        } else if (inclureAnnulees) {
          occurrences.push({
            chargeId: charge.id,
            date: dateISO,
            montant: charge.montant,
            libelle: charge.libelle,
            type: charge.type,
            ajuste: false,
            annule: true,
          })
        }
      }
      date = dateEcheance(date.getFullYear(), date.getMonth() + step, charge.jourPrelevement)
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date))
  return occurrences
}
