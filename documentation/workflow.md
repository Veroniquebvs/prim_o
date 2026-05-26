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

## Mise en place pour un nouveau développeur

Commandes à lancer une seule fois après avoir cloné le projet :

```bash
# 1. Cloner le dépôt et se placer sur dev
git clone https://github.com/Loic2888/prim_o.git
cd prim_o
git checkout dev

# 2. Copier les fichiers d'environnement
cp server/.env.example server/.env
cp client/.env.example client/.env
# → Remplir les valeurs manquantes dans server/.env (JWT_SECRET, STRIPE_SECRET_KEY…)

# 3. Lancer l'environnement Docker
docker compose up --build
```

Les trois services démarrent automatiquement :
- Frontend → http://localhost:3000
- API → http://localhost:5000
- PostgreSQL → localhost:5433 (client externe type DBeaver, pgAdmin)

---

## Commandes quotidiennes

```bash
# Créer une feature branch depuis dev
git checkout dev
git pull origin dev
git checkout -b feature/nom-de-la-feature

# Fusionner une feature dans dev
# → ouvrir une Pull Request sur GitHub : feature/* → dev

# Fusionner dev dans main
# → ouvrir une Pull Request sur GitHub : dev → main
```

---

## Règles

- Ne jamais commiter directement sur `main`
- Toute feature passe par une branche `feature/*`
- Toute PR requiert une review avant merge
- Format des commits : `type(scope): description`
  - Exemples : `feat(auth): add JWT middleware`, `fix(tokens): fix balance computation`
