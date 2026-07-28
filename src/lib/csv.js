/**
 * Fonctions pures d'import CSV, sans dépendance à Dexie. Aucune librairie
 * externe : le format des exports bancaires/CSV est trop variable pour
 * qu'une dépendance générique évite le travail de normalisation ci-dessous.
 */

// Détecte le délimiteur depuis la ligne d'en-tête, puis découpe en tenant
// compte des champs entre guillemets (qui peuvent contenir le délimiteur).
export function parserCsvTexte(texte) {
  const contenu = texte.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const finPremiereLigne = contenu.indexOf('\n')
  const ligneEntete = finPremiereLigne === -1 ? contenu : contenu.slice(0, finPremiereLigne)
  const nbVirgules = (ligneEntete.match(/,/g) || []).length
  const nbPointVirgules = (ligneEntete.match(/;/g) || []).length
  const delimiteur = nbPointVirgules > nbVirgules ? ';' : ','

  const lignes = []
  let ligneCourante = []
  let champCourant = ''
  let dansGuillemets = false

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i]
    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') {
          champCourant += '"'
          i++
        } else {
          dansGuillemets = false
        }
      } else {
        champCourant += c
      }
    } else if (c === '"') {
      dansGuillemets = true
    } else if (c === delimiteur) {
      ligneCourante.push(champCourant)
      champCourant = ''
    } else if (c === '\n') {
      ligneCourante.push(champCourant)
      lignes.push(ligneCourante)
      ligneCourante = []
      champCourant = ''
    } else {
      champCourant += c
    }
  }
  if (champCourant !== '' || ligneCourante.length > 0) {
    ligneCourante.push(champCourant)
    lignes.push(ligneCourante)
  }

  const lignesNonVides = lignes.filter((l) => l.some((champ) => champ.trim() !== ''))
  const [entetes, ...corps] = lignesNonVides
  return { entetes: (entetes || []).map((e) => e.trim()), lignes: corps }
}

export function normaliserEntete(s) {
  return String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
}

// Accepte "-45,00", "1 234,56 €", "1.234,56", "45.00"... Le dernier séparateur
// rencontré (`,` ou `.`) est traité comme décimal, les autres comme milliers.
export function parserMontantFr(valeurBrute) {
  if (valeurBrute == null) return null
  let s = String(valeurBrute).trim()
  if (s === '') return null
  s = s.replace(/[€\s ]/g, '')

  const dernierSeparateur = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (dernierSeparateur === -1) {
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  const partieEntiereBrute = s.slice(0, dernierSeparateur).replace(/[,.]/g, '')
  const partieDecimale = s.slice(dernierSeparateur + 1).replace(/[^0-9]/g, '')
  const signe = partieEntiereBrute.startsWith('-') ? '-' : ''
  const partieEntiere = partieEntiereBrute.replace(/^[-+]/, '') || '0'

  const n = Number(`${signe}${partieEntiere}.${partieDecimale || '0'}`)
  return Number.isFinite(n) ? n : null
}

// Accepte AAAA-MM-JJ (ISO), JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA, et leurs
// variantes à année sur 2 chiffres. Retourne une date ISO ou null.
export function parserDateFlexible(valeurBrute) {
  if (!valeurBrute) return null
  const s = String(valeurBrute).trim()

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})$/)
  if (m) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  return null
}

const ALIAS_COLONNES = {
  date: ['date'],
  libelle: ['libelle', 'description', 'intitule', 'label', 'libelle operation'],
  montant: ['montant', 'amount', 'valeur'],
  debit: ['debit'],
  credit: ['credit'],
  categorie: ['categorie', 'category'],
}

function trouverIndex(entetesNormalisees, cle) {
  return entetesNormalisees.findIndex((e) => ALIAS_COLONNES[cle].includes(e))
}

/**
 * Transforme les lignes CSV déjà découpées en transactions prêtes à insérer.
 * Une ligne sans date ou montant exploitable est écartée plutôt que de faire
 * échouer tout l'import — un export bancaire réel contient souvent des
 * lignes de solde ou d'en-tête parasites.
 */
export function mapperLignesEnTransactions({ entetes, lignes, categories = [], compteId, categorieParDefautId }) {
  const entetesNormalisees = entetes.map(normaliserEntete)
  const iDate = trouverIndex(entetesNormalisees, 'date')
  const iLibelle = trouverIndex(entetesNormalisees, 'libelle')
  const iMontant = trouverIndex(entetesNormalisees, 'montant')
  const iDebit = trouverIndex(entetesNormalisees, 'debit')
  const iCredit = trouverIndex(entetesNormalisees, 'credit')
  const iCategorie = trouverIndex(entetesNormalisees, 'categorie')

  const transactions = []
  const ignorees = []

  lignes.forEach((champs, i) => {
    const numeroLigne = i + 2 // ligne d'en-tête + index base 1
    const brut = (idx) => (idx === -1 || idx >= champs.length ? '' : (champs[idx] ?? '').trim())

    const date = parserDateFlexible(brut(iDate))

    let montant = null
    if (iMontant !== -1) {
      montant = parserMontantFr(brut(iMontant))
    } else if (iDebit !== -1 || iCredit !== -1) {
      const debit = parserMontantFr(brut(iDebit))
      const credit = parserMontantFr(brut(iCredit))
      if (debit) montant = -Math.abs(debit)
      else if (credit) montant = Math.abs(credit)
    }

    if (!date) {
      ignorees.push({ ligne: numeroLigne, raison: 'date illisible' })
      return
    }
    if (montant == null || montant === 0) {
      ignorees.push({ ligne: numeroLigne, raison: 'montant illisible ou nul' })
      return
    }

    let categorieId = categorieParDefautId
    if (iCategorie !== -1) {
      const nomCategorie = normaliserEntete(brut(iCategorie))
      const trouvee = categories.find((c) => normaliserEntete(c.nom) === nomCategorie)
      if (trouvee) categorieId = trouvee.id
    }

    transactions.push({
      date,
      libelle: brut(iLibelle) || 'Import CSV',
      montant,
      compteId,
      categorieId,
      chargeId: null,
      note: null,
    })
  })

  return { transactions, ignorees }
}
