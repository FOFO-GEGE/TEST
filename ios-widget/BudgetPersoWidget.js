// Widget iOS (via l'app Scriptable) — Budget Perso
//
// iOS ne permet pas à une PWA de créer un vrai widget d'écran d'accueil
// (WidgetKit est réservé aux apps natives). Ce script contourne ça en
// lisant le dernier export JSON de l'app (Réglages > Exporter) et en
// recalculant le reste à vivre du mois en cours avec la même logique que
// src/lib/resteAVivre.js et src/lib/occurrences.js — sans dépendre du
// réseau ni d'un serveur, juste du fichier exporté.
//
// Installation :
// 1. Installe l'app gratuite "Scriptable" (App Store).
// 2. Dans Scriptable : nouveau script, colle tout ce fichier, nomme-le
//    "Budget Perso".
// 3. Dans l'app Budget Perso : Réglages > Exporter, puis enregistre le
//    fichier dans iCloud Drive > Scriptable (dossier créé automatiquement
//    par l'app Scriptable). Pas besoin de le renommer : le widget prend
//    toujours le fichier budget-*.json le plus récent de ce dossier.
// 4. Écran d'accueil : appui long > "+" > "Scriptable" > widget taille
//    moyenne > script "Budget Perso", mode d'exécution "Ouvrir le script".
// 5. Pour rafraîchir les chiffres, refais l'étape 3 (nouvel export). iOS
//    ne relance le script que toutes les 15-30 minutes environ, et
//    seulement avec les données du dernier export présent dans le dossier
//    — ce n'est donc jamais "en direct", juste aussi frais que ton dernier
//    export.

const URL_APP = 'https://fofo-gege.github.io/TEST/'

const COULEURS = {
  cream: '#f6f3ec',
  ink: '#211d17',
  inkMuted: '#8c8676',
  line: '#ddd7c8',
  moss: '#4b6b52',
  rust: '#a85a3f',
  gold: '#a9793a',
}

const STEP_MOIS_PAR_FREQUENCE = { mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12 }

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function joursDansLeMois(annee, moisIndex0) {
  return new Date(annee, moisIndex0 + 1, 0).getDate()
}

function dateEcheance(annee, moisIndex0, jourPrelevement) {
  const jour = Math.min(jourPrelevement, joursDansLeMois(annee, moisIndex0))
  return new Date(annee, moisIndex0, jour)
}

function premiereEcheance(charge) {
  const debut = new Date(charge.dateDebut + 'T00:00:00')
  if (charge.frequence === 'mensuel') {
    let candidate = dateEcheance(debut.getFullYear(), debut.getMonth(), charge.jourPrelevement)
    if (candidate < debut) candidate = dateEcheance(debut.getFullYear(), debut.getMonth() + 1, charge.jourPrelevement)
    return candidate
  }
  const step = STEP_MOIS_PAR_FREQUENCE[charge.frequence]
  let candidate = dateEcheance(debut.getFullYear(), charge.moisReference - 1, charge.jourPrelevement)
  while (candidate < debut) {
    candidate = dateEcheance(candidate.getFullYear(), candidate.getMonth() + step, charge.jourPrelevement)
  }
  return candidate
}

// Port minimal de getOccurrences (src/lib/occurrences.js), restreint à une
// seule fenêtre mensuelle : pas besoin ici de l'optimisation "saut de
// palier" utile sur une projection de 12 mois.
function occurrencesDuMois(charges, debutMoisISO, finMoisISO, ajustements) {
  const debutFenetre = new Date(debutMoisISO + 'T00:00:00')
  const finFenetre = new Date(finMoisISO + 'T00:00:00')
  const parCle = new Map()
  for (const a of ajustements) parCle.set(`${a.chargeId}|${a.mois}`, a)

  const occurrences = []
  for (const charge of charges) {
    if (!charge.active) continue
    const step = STEP_MOIS_PAR_FREQUENCE[charge.frequence]
    if (!step) continue

    const finCharge = charge.dateFin ? new Date(charge.dateFin + 'T00:00:00') : null
    let date = premiereEcheance(charge)
    while (date < debutFenetre) {
      date = dateEcheance(date.getFullYear(), date.getMonth() + step, charge.jourPrelevement)
    }

    while (date <= finFenetre) {
      if (finCharge && date > finCharge) break
      const dateISO = toISO(date)
      const ajustement = parCle.get(`${charge.id}|${dateISO.slice(0, 7)}`)
      if (!ajustement || !ajustement.annulee) {
        const montant = ajustement && ajustement.montant != null ? ajustement.montant : charge.montant
        occurrences.push({ date: dateISO, montant, type: charge.type })
      }
      date = dateEcheance(date.getFullYear(), date.getMonth() + step, charge.jourPrelevement)
    }
  }
  return occurrences
}

// Même définition que calculerResteAVivre (src/lib/resteAVivre.js) : la
// différence entre entrées et sorties du mois calendaire en cours.
function calculerResteAVivre(donnees, aujourdHui) {
  const debutMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1)
  const finMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth() + 1, 0)
  const debutMoisISO = toISO(debutMois)
  const finMoisISO = toISO(finMois)

  const occurrences = occurrencesDuMois(donnees.chargesRecurrentes ?? [], debutMoisISO, finMoisISO, donnees.ajustements ?? [])
  const transactionsDuMois = (donnees.transactions ?? []).filter((t) => t.date >= debutMoisISO && t.date <= finMoisISO)

  const totalRevenus =
    occurrences.filter((o) => o.type === 'revenu').reduce((s, o) => s + o.montant, 0) +
    transactionsDuMois.filter((t) => t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const totalDepenses =
    occurrences.filter((o) => o.type === 'depense').reduce((s, o) => s + o.montant, 0) +
    transactionsDuMois.filter((t) => t.montant < 0).reduce((s, t) => s - t.montant, 0)

  return { resteAVivre: totalRevenus - totalDepenses, totalRevenus, totalDepenses, debutMois, finMois }
}

function formatMontant(valeur) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(valeur)
}

function dernierFichierExport(fm, dossier) {
  const fichiers = fm
    .listContents(dossier)
    .filter((nom) => /^budget-\d{4}-\d{2}-\d{2}\.json$/.test(nom))
    .sort()
  return fichiers.length > 0 ? fichiers[fichiers.length - 1] : null
}

async function chargerDernierExport() {
  const fm = FileManager.iCloud()
  const dossier = fm.documentsDirectory()
  const nomFichier = dernierFichierExport(fm, dossier)
  if (!nomFichier) return null

  const chemin = fm.joinPath(dossier, nomFichier)
  if (fm.isFileDownloaded(chemin) === false) await fm.downloadFileFromiCloud(chemin)

  const donnees = JSON.parse(fm.readString(chemin))
  const dateExport = nomFichier.match(/\d{4}-\d{2}-\d{2}/)[0]
  return { donnees, dateExport }
}

function construireWidget(contenu) {
  const widget = new ListWidget()
  widget.backgroundColor = new Color(COULEURS.cream)
  widget.url = URL_APP
  widget.setPadding(16, 18, 16, 18)
  contenu(widget)
  return widget
}

async function main() {
  const export_ = await chargerDernierExport()

  if (!export_) {
    const widget = construireWidget((w) => {
      const titre = w.addText('BUDGET PERSO')
      titre.font = Font.mediumSystemFont(11)
      titre.textColor = new Color(COULEURS.inkMuted)
      w.addSpacer(10)
      const message = w.addText("Exporte tes données depuis l'app (Réglages > Exporter) et enregistre-les dans iCloud Drive > Scriptable.")
      message.font = Font.systemFont(13)
      message.textColor = new Color(COULEURS.ink)
    })
    Script.setWidget(widget)
    Script.complete()
    return
  }

  const { donnees, dateExport } = export_
  const aujourdHui = new Date()
  const resultat = calculerResteAVivre(donnees, aujourdHui)
  const libelleMois = aujourdHui.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const widget = construireWidget((w) => {
    const label = w.addText('RESTE À VIVRE')
    label.font = Font.mediumSystemFont(11)
    label.textColor = new Color(COULEURS.inkMuted)

    const sousLabel = w.addText(libelleMois.toUpperCase())
    sousLabel.font = Font.mediumSystemFont(9)
    sousLabel.textColor = new Color(COULEURS.inkMuted)

    w.addSpacer(6)

    const montant = w.addText(formatMontant(resultat.resteAVivre))
    montant.font = Font.italicSystemFont(34)
    montant.textColor = new Color(resultat.resteAVivre < 0 ? COULEURS.rust : COULEURS.ink)

    w.addSpacer(8)

    const ligneDetail = w.addStack()
    ligneDetail.spacing = 14
    const entrees = ligneDetail.addText(`+ ${formatMontant(resultat.totalRevenus)}`)
    entrees.font = Font.mediumSystemFont(11)
    entrees.textColor = new Color(COULEURS.moss)
    const sorties = ligneDetail.addText(`- ${formatMontant(resultat.totalDepenses)}`)
    sorties.font = Font.mediumSystemFont(11)
    sorties.textColor = new Color(COULEURS.rust)

    w.addSpacer()

    const [annee, mois, jour] = dateExport.split('-')
    const pied = w.addText(`Export du ${jour}/${mois}/${annee}`)
    pied.font = Font.systemFont(9)
    pied.textColor = new Color(COULEURS.inkMuted)
  })

  Script.setWidget(widget)
  if (!config.runsInWidget) await widget.presentMedium()
  Script.complete()
}

await main()
