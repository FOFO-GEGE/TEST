# Budget Perso

Application de gestion de compte personnel, strictement personnelle et
100 % locale : pas de compte utilisateur, pas de back-end, aucune donnée
ne quitte le navigateur. Fonctionne hors-ligne et s'installe comme une
application (PWA).

Le cœur de l'application n'est pas la saisie de chaque dépense, mais la
gestion des **charges récurrentes** et le calcul du **reste à vivre** :
le montant réellement disponible avant la prochaine paie, compte tenu des
échéances prévues.

## Stack

- React 18 + Vite
- Tailwind CSS
- IndexedDB via Dexie.js (`dexie-react-hooks` pour la réactivité, pas de
  state manager externe)
- Recharts (courbe du prévisionnel)
- date-fns (locale `fr`)
- vite-plugin-pwa
- lucide-react
- `@fontsource-variable/fraunces` — police serif italique (titres, gros
  montants), self-hébergée pour rester utilisable hors-ligne ; ajoutée hors
  de la liste imposée d'origine pour la refonte visuelle, donc signalée ici

Toute la logique de calcul (occurrences des charges, soldes, reste à
vivre, projection sur 12 mois) est isolée dans `src/lib/`, sous forme de
fonctions pures sans dépendance à Dexie, testées avec Vitest.

## Commandes

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # sert le build de production localement
npm test          # tests unitaires (Vitest)
```

## Fonctionnement

1. **Réglages** : créez au moins un compte (courant ou épargne) et
   vérifiez les catégories (un jeu de catégories françaises courantes est
   créé automatiquement).
2. **Charges** : ajoutez vos charges récurrentes (loyer, salaire,
   abonnements…) — le modèle de la charge, pas ses occurrences. Les
   échéances futures sont calculées à la volée, jamais enregistrées tant
   qu'elles ne sont pas validées.
3. **Accueil** : le reste à vivre, les soldes par compte et les
   échéances des 30 prochains jours, avec un bouton « Valider » qui
   transforme une échéance prévue en transaction réelle (rapprochement).
4. **Transactions** : saisie rapide ou détaillée des mouvements réels,
   filtrable par compte, catégorie ou période.
5. **Prévisionnel** : projection du solde jour par jour sur 12 mois, avec
   alerte si le solde passe sous un seuil réglable.

## Export (sauvegarde)

L'application est 100 % locale : toutes les données vivent dans
l'IndexedDB du navigateur. C'est pratique, mais **fragile** — voir
l'avertissement ci-dessous.

- **Exporter** : Réglages → Sauvegarde → « Exporter mes données ».
  Télécharge un fichier `budget-AAAA-MM-JJ.json` contenant l'intégralité
  des comptes, catégories, charges récurrentes et transactions, avec un
  numéro de version de schéma.
- Un bandeau discret apparaît sur l'accueil si le dernier export a plus
  de 30 jours.
- Il n'y a pas de fonction d'import (JSON ou CSV) : toute saisie se fait
  manuellement dans l'application.

## ⚠️ Avertissement — risque de perte de données

Toutes les données sont stockées **uniquement dans le navigateur**
(IndexedDB). Il n'existe aucune copie ailleurs. Vider le cache, les
données de site, ou désinstaller le navigateur **supprime définitivement
toutes vos données**, sans aucun moyen de récupération.

**Exportez régulièrement vos données** (bouton dans Réglages) et
conservez le fichier JSON en lieu sûr.
