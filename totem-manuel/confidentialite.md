# TOTEM ÉQUIPEMENTS — Manuel : politique de confidentialité

Dernière mise à jour : 19/10/2026. Éditeur : Uxello Services Bretagne (VINCI Energies).

## Ce que fait l'extension
Elle permet à un utilisateur connecté à Teepee (safeplace.teepee.fr) de créer, modifier et supprimer des équipements en masse, avec validation avant chaque écriture.

## Données traitées
Pour fonctionner, l'extension lit le jeton de session (« Bearer ») que Teepee envoie déjà à son propre API, afin d'appeler cet API au nom de l'utilisateur. Elle lit aussi les équipements et les listes de référence du site Teepee ouvert.

## Ce qui n'est jamais fait
- Aucune donnée n'est envoyée à Uxello, à VINCI ni à un tiers : les seules connexions réseau sont vers apisafeplace.teepee.fr et safeplace.teepee.fr.
- Aucun suivi, aucune publicité, aucune analyse d'usage, aucune vente de données.
- Aucun code distant n'est téléchargé ni exécuté.

## Stockage local
Le jeton, un cache des listes Teepee (24 h) et un journal technique sont conservés dans le stockage local du navigateur (chrome.storage.local). Ils sont supprimés en désinstallant l'extension.

## Contact
minkomarcus1997@gmail.com
