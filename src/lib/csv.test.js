import { describe, it, expect } from 'vitest'
import { parserCsvTexte, parserMontantFr, parserDateFlexible, mapperLignesEnTransactions } from './csv.js'

describe('parserCsvTexte', () => {
  it('détecte le délimiteur point-virgule et découpe les lignes', () => {
    const texte = 'Date;Libelle;Montant\n28/07/2026;Courses;-45,00\n29/07/2026;Salaire;2000,00\n'
    const { entetes, lignes } = parserCsvTexte(texte)
    expect(entetes).toEqual(['Date', 'Libelle', 'Montant'])
    expect(lignes).toEqual([
      ['28/07/2026', 'Courses', '-45,00'],
      ['29/07/2026', 'Salaire', '2000,00'],
    ])
  })

  it('détecte le délimiteur virgule', () => {
    const texte = 'Date,Libelle,Montant\n2026-07-28,Courses,-45.00\n'
    const { entetes, lignes } = parserCsvTexte(texte)
    expect(entetes).toEqual(['Date', 'Libelle', 'Montant'])
    expect(lignes).toEqual([['2026-07-28', 'Courses', '-45.00']])
  })

  it('gère les champs entre guillemets contenant le délimiteur', () => {
    const texte = 'Date;Libelle;Montant\n28/07/2026;"Restaurant; pourboire inclus";-32,50\n'
    const { lignes } = parserCsvTexte(texte)
    expect(lignes[0]).toEqual(['28/07/2026', 'Restaurant; pourboire inclus', '-32,50'])
  })

  it('ignore les lignes vides', () => {
    const texte = 'Date;Libelle;Montant\n28/07/2026;Courses;-45,00\n\n\n'
    const { lignes } = parserCsvTexte(texte)
    expect(lignes).toHaveLength(1)
  })
})

describe('parserMontantFr', () => {
  it('parse les formats français courants', () => {
    expect(parserMontantFr('-45,00')).toBe(-45)
    expect(parserMontantFr('1 234,56')).toBe(1234.56)
    expect(parserMontantFr('1.234,56')).toBe(1234.56)
    expect(parserMontantFr('45.00 €')).toBe(45)
    expect(parserMontantFr('120')).toBe(120)
    expect(parserMontantFr('-1 234,56 €')).toBe(-1234.56)
  })

  it('retourne null pour une valeur vide ou illisible', () => {
    expect(parserMontantFr('')).toBeNull()
    expect(parserMontantFr(null)).toBeNull()
    expect(parserMontantFr('abc')).toBeNull()
  })
})

describe('parserDateFlexible', () => {
  it('parse le format ISO', () => {
    expect(parserDateFlexible('2026-07-28')).toBe('2026-07-28')
  })

  it('parse le format français JJ/MM/AAAA', () => {
    expect(parserDateFlexible('28/07/2026')).toBe('2026-07-28')
    expect(parserDateFlexible('5/3/2026')).toBe('2026-03-05')
  })

  it('parse le format à année sur 2 chiffres', () => {
    expect(parserDateFlexible('28/07/26')).toBe('2026-07-28')
  })

  it('retourne null pour une date illisible', () => {
    expect(parserDateFlexible('pas une date')).toBeNull()
    expect(parserDateFlexible('')).toBeNull()
  })
})

describe('mapperLignesEnTransactions', () => {
  const categories = [
    { id: 1, nom: 'Alimentation', type: 'depense' },
    { id: 2, nom: 'Loisirs', type: 'depense' },
    { id: 3, nom: 'Salaire', type: 'revenu' },
  ]

  it('mappe une colonne Montant signée', () => {
    const { entetes, lignes } = parserCsvTexte('Date;Libelle;Montant\n28/07/2026;Courses;-45,00\n')
    const { transactions, ignorees } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(ignorees).toEqual([])
    expect(transactions).toEqual([
      { date: '2026-07-28', libelle: 'Courses', montant: -45, compteId: 7, categorieId: 1, chargeId: null, note: null },
    ])
  })

  it('mappe des colonnes Débit / Crédit séparées', () => {
    const { entetes, lignes } = parserCsvTexte(
      'Date;Libelle;Debit;Credit\n28/07/2026;Courses;45,00;\n29/07/2026;Salaire;;2000,00\n'
    )
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].montant).toBe(-45)
    expect(transactions[1].montant).toBe(2000)
  })

  it('associe la catégorie du fichier si elle correspond à une catégorie existante', () => {
    const { entetes, lignes } = parserCsvTexte('Date;Libelle;Montant;Categorie\n28/07/2026;Cinéma;-12,00;Loisirs\n')
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].categorieId).toBe(2)
  })

  it('retombe sur la catégorie par défaut si la catégorie du fichier est inconnue', () => {
    const { entetes, lignes } = parserCsvTexte('Date;Libelle;Montant;Categorie\n28/07/2026;Truc;-12,00;Inconnue\n')
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].categorieId).toBe(1)
  })

  it('écarte les lignes sans date ou montant exploitable', () => {
    const { entetes, lignes } = parserCsvTexte(
      'Date;Libelle;Montant\npas une date;Courses;-45,00\n28/07/2026;Solde;abc\n28/07/2026;Rien;0\n'
    )
    const { transactions, ignorees } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions).toEqual([])
    expect(ignorees).toHaveLength(3)
    expect(ignorees[0].raison).toBe('date illisible')
    expect(ignorees[1].raison).toBe('montant illisible ou nul')
  })

  it('associe la catégorie du fichier par correspondance partielle, restreinte au type', () => {
    const categoriesAvecTransport = [...categories, { id: 4, nom: 'Transport', type: 'depense' }]
    const { entetes, lignes } = parserCsvTexte(
      'Date;Libelle;Montant;Categorie\n28/07/2026;Métro;-1,90;Transports\n'
    )
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories: categoriesAvecTransport,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].categorieId).toBe(4)
  })

  it('ne matche pas une catégorie dont le type ne correspond pas au signe du montant', () => {
    // "Salaire" (revenu) ne doit jamais être retenu pour une dépense, même
    // en cas de coïncidence de nom.
    const categoriesAvecSalaireDepense = [...categories, { id: 5, nom: 'Salaire partiel', type: 'revenu' }]
    const { entetes, lignes } = parserCsvTexte('Date;Libelle;Montant;Categorie\n28/07/2026;Achat;-9,00;Salaire\n')
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories: categoriesAvecSalaireDepense,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].categorieId).toBe(1) // retombe sur le défaut, pas sur la catégorie revenu
  })

  it('reconnaît les en-têtes d’un export bancaire réel (Date de comptabilisation, Libelle simplifie)', () => {
    const texte =
      'Date de comptabilisation;Libelle simplifie;Libelle operation;Debit;Credit;Categorie\n' +
      '28/07/2026;ANTHROPIC CLAUUS ANTHROPIC.CO;ANTHROPIC CLAUUS ANTHROPIC.CO;-21,60;;Shopping et services\n'
    const { entetes, lignes } = parserCsvTexte(texte)
    const { transactions } = mapperLignesEnTransactions({
      entetes,
      lignes,
      categories,
      compteId: 7,
      categorieParDefautId: 1,
    })
    expect(transactions[0].date).toBe('2026-07-28')
    expect(transactions[0].libelle).toBe('ANTHROPIC CLAUUS ANTHROPIC.CO')
    expect(transactions[0].montant).toBe(-21.6)
  })
})
