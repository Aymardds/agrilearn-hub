# Configuration du Module CRUD Éditeur et Validation

Ce document décrit les étapes pour activer et utiliser le module de gestion des cours pour les éditeurs.

## 1. Mise à jour de la Base de Données (CRITIQUE)

Pour que les nouvelles fonctionnalités fonctionnent (statuts de validation, permissions), vous devez exécuter le script SQL suivant dans votre projet Supabase (SQL Editor).

**Fichier :** `supabase/migrations/2025-12-18_editor_crud_policies.sql`

Ce script va :
- Ajouter la colonne `review_status` ('draft', 'pending', 'approved', 'rejected') à la table `courses`.
- Ajouter la colonne `rejection_reason` à la table `courses`.
- Mettre à jour les politiques de sécurité (RLS) pour permettre aux éditeurs de :
    - Insérer des cours.
    - Voir/Modifier/Supprimer UNIQUEMENT leurs propres cours.
- Permettre aux administrateurs de voir et modifier tous les cours.

## 2. Fonctionnalités Éditeur

Les utilisateurs ayant le rôle `editeur` (ou `editor`) auront accès à :
- **Tableau de bord Éditeur** : Vue d'ensemble.
- **Mes Cours** : Une nouvelle section dans le menu latéral.
    - Liste des cours créés.
    - Filtrage par statut (Brouillon, En attente, Publié...).
    - Bouton "Nouveau cours".
- **Éditeur de cours** : Formulaire pour créer/modifier un cours.
    - **Enregistrer brouillon** : Garde le cours en `draft` (non visible admin pour validation).
    - **Soumettre pour validation** : Passe le statut à `pending`.

## 3. Fonctionnalités Administrateur

Dans la page "Gestion des cours" (`/admin/courses`) :
- Les administrateurs verront une nouvelle colonne "Statut".
- Pour les cours en statut "En attente" (`pending`), deux boutons d'action apparaissent :
    - **Approuver (✓)** : Passe le cours en `approved` et `published`.
    - **Rejeter (X)** : Demande une raison et passe le cours en `rejected`. L'éditeur verra la raison du rejet sur sa liste de cours.

## 4. Déploiement

Le projet a été buildé avec succès. Pour déployer en ligne :
1. Committez et poussez les changements vers votre dépôt Git connecté à Vercel.
2. Vercel lancera un nouveau déploiement automatiquement.
3. **N'oubliez pas d'appliquer la migration SQL sur votre base de données de production Supabase également.**
