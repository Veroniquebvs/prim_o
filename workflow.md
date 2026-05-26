# Git Workflow — PRIM'O

## Branches

| Branche | Rôle |
|---|---|
| `main` | Production-ready — protégée, aucun push direct |
| `dev` | Développement actif — intégration des features |
| `feature/*` | Une branche par fonctionnalité, créée depuis `dev` |

---

## Historique des actions

### Initialisation du dépôt (main)
- Initialisation du dépôt Git
- Création de l'arborescence du projet (`/client`, `/server`, `/docker`, `/docs`)
- Ajout du `.gitignore`, `.env.example`, `README.md`
- Création des `Dockerfile` backend et frontend
- Création du `docker-compose.yml` (services : `api`, `client`, `postgres`)

### Création de la branche dev
```bash
git checkout -b dev
git push -u origin dev
```

---

## Commandes utiles

```bash
# Créer une feature branch depuis dev
git checkout dev
git checkout -b feature/nom-de-la-feature

# Fusionner une feature dans dev (via PR)
# → ouvrir une Pull Request sur GitHub : feature/* → dev

# Fusionner dev dans main (via PR)
# → ouvrir une Pull Request sur GitHub : dev → main
```

---

## Règles

- Ne jamais commiter directement sur `main`
- Toute feature passe par une branche `feature/*`
- Toute PR requiert une review avant merge
- Format des commits : `type(scope): description`
  - Exemples : `feat(auth): add JWT middleware`, `fix(tokens): fix balance computation`
