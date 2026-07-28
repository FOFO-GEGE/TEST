const CLE_SEUIL_ALERTE = 'budget-perso:seuil-alerte'
const SEUIL_PAR_DEFAUT = 100

export function getSeuilAlerte() {
  const valeur = localStorage.getItem(CLE_SEUIL_ALERTE)
  return valeur === null ? SEUIL_PAR_DEFAUT : Number(valeur)
}

export function setSeuilAlerte(valeur) {
  localStorage.setItem(CLE_SEUIL_ALERTE, String(valeur))
}
