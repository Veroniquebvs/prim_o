# Résumé des Modifications - Vue Manager
**Date :** 17 Juin 2026
**Auteur :** Loïc

## Modifications du Layout & CSS (`globals.css` & `PourToi.tsx`)
Aujourd'hui, nous avons intégré fidèlement la maquette de la vue Manager :

### 1. En-tête (Hero)
- **Logo "prim'o"** : Agrandissement du logo, avec un "o" jaune beaucoup plus grand que le "prim'", aligné parfaitement sur la même ligne de base.
- **Nom de l'équipe** : Déplacement de l'équipe complètement à droite de la même ligne que le logo.
- **Badge Token** : 
  - La fenêtre de stock de tokens a été modifiée avec un fond gris foncé (`#303236`) et un contour blanc.
  - La hauteur a été réduite et la largeur augmentée pour pouvoir accueillir de grands nombres (ex: 10 000).
  - La fenêtre chevauche de manière élégante la ligne de démarcation entre le bleu et le blanc (`translateY(55px)`).
  - Le dessin de la pièce a été remplacé par l'image `token-logo-SF.png`.
  - Le nom de l'équipe a ensuite été déplacé pour s'afficher **juste au-dessus de l'image de la pièce**.

### 2. Liste des collaborateurs
- **Titre** : Agrandissement de "Mes collaborateurs" et suppression du bouton "+ Ajouter" de l'en-tête.
- **Boutons** : Les boutons des collaborateurs gardent un style arrondi.
- **Solde des collaborateurs** : Le nombre de tokens (ex: `100 tkn`) est désormais affiché **au-dessus** du bouton `+ Envoyer`, aligné à droite de la carte de chaque membre.
- **Graphique** : Conservation du graphique horizontal en barres d'origine (plus lisible).

### 3. Panneau d'Ajout / Création
- Le panneau permettant d'ajouter ou de créer un collaborateur a été repensé. 
- Il est maintenant situé sous la liste des collaborateurs dans une fenêtre propre, avec deux boutons : "Depuis la liste" et "Créer un profil".

### 4. Git
- Les modifications ont été committées avec le message `"UI: ajustements manager dashboard (logo, token window, collab list)"`.
- Le code a été poussé sur la branche `feat/front`.
