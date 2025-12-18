# Configuration de l'Authentification Supabase

Ce guide vous aide à configurer la confirmation par email et la réinitialisation de mot de passe dans votre projet Supabase.

## 1. Configuration des Emails dans Supabase

### Accéder aux paramètres d'authentification
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Naviguez vers **Authentication** → **Email Templates**

### A. Template de Confirmation d'Email

1. Cliquez sur **Confirm signup**
2. Personnalisez le template avec le texte suivant :

**Sujet :** `Confirmez votre inscription à E-GrainoLab`

**Corps du message :**
```html
<h2>Bienvenue sur E-GrainoLab ! 🌱</h2>

<p>Bonjour,</p>

<p>Merci de vous être inscrit sur E-GrainoLab, la plateforme d'apprentissage pour le secteur agricole.</p>

<p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirmer mon email</a></p>

<p>Ou copiez ce lien dans votre navigateur :</p>
<p style="color: #666; font-size: 12px;">{{ .ConfirmationURL }}</p>

<p>Ce lien est valable pendant 24 heures.</p>

<p>Si vous n'avez pas créé de compte sur E-GrainoLab, vous pouvez ignorer cet email.</p>

<p>À bientôt !<br>L'équipe E-GrainoLab</p>
```

### B. Template de Réinitialisation de Mot de Passe

1. Cliquez sur **Reset password**
2. Personnalisez le template avec le texte suivant :

**Sujet :** `Réinitialisation de votre mot de passe E-GrainoLab`

**Corps du message :**
```html
<h2>Réinitialisation de mot de passe 🔐</h2>

<p>Bonjour,</p>

<p>Vous avez demandé à réinitialiser votre mot de passe sur E-GrainoLab.</p>

<p>Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Réinitialiser mon mot de passe</a></p>

<p>Ou copiez ce lien dans votre navigateur :</p>
<p style="color: #666; font-size: 12px;">{{ .ConfirmationURL }}</p>

<p>Ce lien est valable pendant 1 heure.</p>

<p><strong>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</strong> Votre mot de passe actuel reste inchangé.</p>

<p>Cordialement,<br>L'équipe E-GrainoLab</p>
```

## 2. Configuration des Paramètres d'Authentification

### Accéder aux paramètres
1. Naviguez vers **Authentication** → **Settings**
2. Configurez les paramètres suivants :

### Email Settings
- ✅ **Enable email confirmations** : Activé
- ✅ **Secure email change** : Activé (recommandé)
- ✅ **Double confirm email changes** : Activé (recommandé)

### Redirect URLs
Ajoutez les URLs suivantes dans **Redirect URLs** :
```
http://localhost:5173/auth
http://localhost:5173/reset-password
https://votre-domaine.com/auth
https://votre-domaine.com/reset-password
```

### Session Settings
- **JWT expiry** : 3600 (1 heure) - recommandé
- **Refresh token rotation** : Activé

## 3. Configuration SMTP (Email Provider)

Pour les emails en production, configurez un service SMTP :

### Option A : SendGrid (Recommandé)
1. Créez un compte sur [SendGrid](https://sendgrid.com)
2. Générez une clé API
3. Dans Supabase, allez à **Project Settings** → **Auth** → **SMTP Settings**
4. Configurez :
   - **Host** : smtp.sendgrid.net
   - **Port** : 587
   - **Username** : apikey
   - **Password** : Votre clé API SendGrid
   - **Sender email** : noreply@votre-domaine.com
   - **Sender name** : E-GrainoLab

### Option B : Gmail (Développement uniquement)
1. Activez l'authentification à 2 facteurs sur votre compte Gmail
2. Générez un mot de passe d'application
3. Configurez dans Supabase :
   - **Host** : smtp.gmail.com
   - **Port** : 587
   - **Username** : votre-email@gmail.com
   - **Password** : Mot de passe d'application
   - **Sender email** : votre-email@gmail.com
   - **Sender name** : E-GrainoLab

### Option C : Autres providers
- **Mailgun** : smtp.mailgun.org:587
- **AWS SES** : email-smtp.region.amazonaws.com:587
- **Postmark** : smtp.postmarkapp.com:587

## 4. Appliquer la Migration SQL

Dans votre projet, exécutez la migration :

```bash
# Si vous utilisez Supabase CLI
supabase db push

# Ou appliquez manuellement dans le SQL Editor de Supabase
# Copiez le contenu de : supabase/migrations/2025-12-18_optimize_authentication.sql
```

## 5. Tester l'Authentification

### Test de l'inscription
1. Créez un nouveau compte sur `/auth`
2. Vérifiez que vous recevez l'email de confirmation
3. Cliquez sur le lien de confirmation
4. Vérifiez que vous êtes redirigé vers `/dashboard`

### Test de réinitialisation de mot de passe
1. Sur la page de connexion, cliquez sur "Mot de passe oublié"
2. Entrez votre email
3. Vérifiez que vous recevez l'email
4. Cliquez sur le lien
5. Créez un nouveau mot de passe
6. Testez la connexion avec le nouveau mot de passe

## 6. Configuration Avancée (Optionnel)

### A. Limite de tentatives (Rate Limiting)
La migration inclut une protection contre le spam de réinitialisation :
- Maximum 3 tentatives par 15 minutes par email
- Nettoyage automatique après 24h

### B. Nettoyage des comptes non confirmés
Pour programmer un nettoyage automatique :

```sql
-- Dans le SQL Editor de Supabase
-- Créer une tâche cron pour nettoyer les comptes non confirmés après 7 jours
SELECT cron.schedule(
  'cleanup-unconfirmed-users',
  '0 2 * * *',  -- Tous les jours à 2h du matin
  'SELECT delete_unconfirmed_users();'
);

-- Nettoyer les anciennes tentatives de réinitialisation
SELECT cron.schedule(
  'cleanup-reset-attempts',
  '0 3 * * *',  -- Tous les jours à 3h du matin
  'SELECT cleanup_old_reset_attempts();'
);
```

## 7. Variables d'Environnement

Assurez-vous que votre fichier `.env` contient :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

## 8. Troubleshooting

### Les emails ne sont pas envoyés
1. Vérifiez les logs dans **Authentication** → **Logs**
2. Vérifiez la configuration SMTP
3. Vérifiez que les redirect URLs sont correctes
4. Vérifiez les spams de votre boîte mail

### Erreur "Email not confirmed"
1. L'utilisateur doit cliquer sur le lien de confirmation
2. Le lien est valable 24h
3. Renvoyez un email de confirmation si nécessaire

### Lien de réinitialisation invalide
1. Le lien est valable 1h
2. Ne peut être utilisé qu'une seule fois
3. Redemandez un nouveau lien si expiré

## 9. Sécurité

✅ **Bonnes pratiques implémentées :**
- Confirmation par email obligatoire
- Tokens à usage unique
- Expiration des liens de réinitialisation
- Rate limiting sur les tentatives
- Messages d'erreur génériques (pour éviter l'énumération d'emails)
- Validation de la force du mot de passe côté client

## Support

Pour plus d'informations : [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
