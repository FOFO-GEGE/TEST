import { describe, it, expect } from 'vitest'
import { getOccurrences } from './occurrences.js'

function charge(overrides) {
  return {
    id: 1,
    libelle: 'Loyer',
    montant: 800,
    type: 'depense',
    compteId: 1,
    categorieId: 1,
    frequence: 'mensuel',
    jourPrelevement: 5,
    moisReference: null,
    dateDebut: '2024-01-01',
    dateFin: null,
    active: true,
    ...overrides,
  }
}

describe('getOccurrences — jourPrelevement en fin de mois', () => {
  it('ramène le 31 au dernier jour d’un mois de 30 jours', () => {
    const occ = getOccurrences([charge({ jourPrelevement: 31 })], '2024-04-01', '2024-04-30')
    expect(occ).toHaveLength(1)
    expect(occ[0].date).toBe('2024-04-30')
  })

  it('ramène le 31 au 29 février une année bissextile', () => {
    const occ = getOccurrences([charge({ jourPrelevement: 31 })], '2024-02-01', '2024-02-29')
    expect(occ).toHaveLength(1)
    expect(occ[0].date).toBe('2024-02-29')
  })

  it('ramène le 31 au 28 février une année non bissextile', () => {
    const occ = getOccurrences(
      [charge({ jourPrelevement: 31, dateDebut: '2023-01-01' })],
      '2023-02-01',
      '2023-02-28'
    )
    expect(occ).toHaveLength(1)
    expect(occ[0].date).toBe('2023-02-28')
  })
})

describe('getOccurrences — respect de dateDebut, dateFin, active', () => {
  it('décale au mois suivant si le jour de prélèvement est avant la date de début', () => {
    const c = charge({ jourPrelevement: 5, dateDebut: '2025-01-10' })
    expect(getOccurrences([c], '2025-01-01', '2025-01-31')).toHaveLength(0)
    const occFevrier = getOccurrences([c], '2025-02-01', '2025-02-28')
    expect(occFevrier).toHaveLength(1)
    expect(occFevrier[0].date).toBe('2025-02-05')
  })

  it('exclut toute occurrence postérieure à dateFin', () => {
    const c = charge({ dateFin: '2024-03-31' })
    const occ = getOccurrences([c], '2024-01-01', '2024-06-30')
    expect(occ.map((o) => o.date)).toEqual(['2024-01-05', '2024-02-05', '2024-03-05'])
  })

  it('ignore les charges inactives', () => {
    const c = charge({ active: false })
    expect(getOccurrences([c], '2024-01-01', '2024-12-31')).toEqual([])
  })
})

describe('getOccurrences — fréquences non mensuelles', () => {
  it('calcule un trimestriel depuis moisReference', () => {
    const c = charge({
      frequence: 'trimestriel',
      jourPrelevement: 15,
      moisReference: 2,
      dateDebut: '2024-01-01',
    })
    const occ = getOccurrences([c], '2024-01-01', '2024-12-31')
    expect(occ.map((o) => o.date)).toEqual(['2024-02-15', '2024-05-15', '2024-08-15', '2024-11-15'])
  })

  it('calcule un annuel depuis moisReference', () => {
    const c = charge({
      frequence: 'annuel',
      jourPrelevement: 20,
      moisReference: 9,
      dateDebut: '2023-01-01',
    })
    const occ = getOccurrences([c], '2024-01-01', '2026-12-31')
    expect(occ.map((o) => o.date)).toEqual(['2024-09-20', '2025-09-20', '2026-09-20'])
  })

  it('décale la 1re échéance à l’année suivante si moisReference est déjà passé', () => {
    const c = charge({
      frequence: 'semestriel',
      jourPrelevement: 10,
      moisReference: 1,
      dateDebut: '2024-03-15',
    })
    // 1re échéance théorique janvier 2024 < dateDebut → palier suivant : juillet 2024
    const occ = getOccurrences([c], '2024-01-01', '2024-12-31')
    expect(occ.map((o) => o.date)).toEqual(['2024-07-10'])
  })
})

describe('getOccurrences — fenêtre éloignée de la date de début', () => {
  it('avance directement au bon palier sans dépendre du nombre d’années écoulées', () => {
    const c = charge({ dateDebut: '2015-01-01', jourPrelevement: 10 })
    const occ = getOccurrences([c], '2026-06-01', '2026-06-30')
    expect(occ).toHaveLength(1)
    expect(occ[0].date).toBe('2026-06-10')
  })
})

describe('getOccurrences — ajustements ponctuels', () => {
  const loyer = charge({ id: 1, libelle: 'Loyer', montant: 800, jourPrelevement: 5 })

  it('applique un montant ajusté au seul mois visé', () => {
    const ajustements = [{ chargeId: 1, mois: '2026-09', montant: 950, annulee: false }]
    const occ = getOccurrences([loyer], '2026-08-01', '2026-10-31', ajustements)
    expect(occ.map((o) => [o.date, o.montant])).toEqual([
      ['2026-08-05', 800],
      ['2026-09-05', 950],
      ['2026-10-05', 800],
    ])
  })

  it('marque l’occurrence ajustée pour que l’interface puisse la signaler', () => {
    const ajustements = [{ chargeId: 1, mois: '2026-09', montant: 950, annulee: false }]
    const occ = getOccurrences([loyer], '2026-08-01', '2026-10-31', ajustements)
    expect(occ.map((o) => o.ajuste)).toEqual([false, true, false])
  })

  it('supprime l’échéance du mois annulé sans toucher aux autres', () => {
    const ajustements = [{ chargeId: 1, mois: '2026-09', montant: null, annulee: true }]
    const occ = getOccurrences([loyer], '2026-08-01', '2026-10-31', ajustements)
    expect(occ.map((o) => o.date)).toEqual(['2026-08-05', '2026-10-05'])
  })

  it('n’applique un ajustement qu’à la charge concernée', () => {
    const autre = charge({ id: 2, libelle: 'Assurance', montant: 30, jourPrelevement: 5 })
    const ajustements = [{ chargeId: 1, mois: '2026-09', montant: 950, annulee: false }]
    const occ = getOccurrences([loyer, autre], '2026-09-01', '2026-09-30', ajustements)
    expect(occ.map((o) => [o.libelle, o.montant])).toEqual([
      ['Loyer', 950],
      ['Assurance', 30],
    ])
  })

  it('accepte un montant ajusté à 0 sans le confondre avec « pas d’ajustement »', () => {
    const ajustements = [{ chargeId: 1, mois: '2026-09', montant: 0, annulee: false }]
    const occ = getOccurrences([loyer], '2026-09-01', '2026-09-30', ajustements)
    expect(occ[0].montant).toBe(0)
    expect(occ[0].ajuste).toBe(true)
  })
})
