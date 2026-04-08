# TEST

Site web minimal avec :
- une page de connexion (prénom, nom, numéro de téléphone),
- un espace personnel avec une zone de notes.

## Lancer le projet

Comme c'est un site statique, lance un serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000`.

## Fonctionnement

- Les données de session et la note sont stockées en local dans le navigateur (`localStorage`).
- Le bouton **Se déconnecter** supprime la session locale.
