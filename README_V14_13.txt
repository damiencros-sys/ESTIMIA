ESTIM’IA V14.13 — AFFICHER LE MOT DE PASSE / CONNEXION MÉMORISÉE RENOUVELÉE
Base complète V14.12 ; 95 fichiers. Aucun déploiement distant effectué.

- Case Afficher le mot de passe : cocher pour lire la saisie, décocher pour la masquer. Mot de passe jamais ajouté aux dossiers ni aux sauvegardes. Au clic de connexion, le champ redevient de type password pour le gestionnaire du navigateur.
- Connexion mémorisée : fin de l’expiration à 30 jours. Cookie Secure/HttpOnly/SameSite=Lax, durée 400 jours renouvelée à chaque requête authentifiée. La session reste utilisable dans la durée tant que le navigateur conserve ce cookie et que le site est utilisé avant son expiration. Une connexion à vie n’est pas garantie : Chrome plafonne les cookies à 400 jours ; navigation privée, effacement des cookies, changement d’identifiants ou déconnexion imposent une nouvelle connexion.
- Sans Mémoriser ma connexion : session courte de 8 heures, sans cookie persistant. Les anciens cookies mémorisés de 30 jours encore valides avec plus de 8 heures restantes sont automatiquement convertis lors d’une utilisation. Sinon, reconnectez-vous une fois avec la case cochée.
- Minimum du mot de passe toujours 10 caractères. Identifiants Render inchangés : ESTIMIA_ACCESS_USER et ESTIMIA_ACCESS_PASSWORD. Ne pas activer ESTIMIA_ALLOW_UNPROTECTED en production.
- Identifiants oubliés : aide /auth/help accessible sans connexion, gestionnaire du navigateur ou réinitialisation par l’administrateur dans Render > Environment > ESTIMIA_ACCESS_PASSWORD puis Save and deploy. Pour l’identifiant : ESTIMIA_ACCESS_USER ; il est également prérempli dans le formulaire. Perte du compte Render : récupérer d’abord ce compte auprès de Render ou du fournisseur utilisé. Aucun mot de passe divulgué sur l’aide, aucun envoi mail automatique.

INSTALLATION
Remplacer les fichiers du dépôt GitHub avec le contenu complet du ZIP ; attendre le déploiement Render, actualiser et vérifier V14.13. Garder le même identifiant et mot de passe dans Render. Dossiers et photos locaux conservés. Un changement des identifiants invalide toutes les signatures de connexion précédentes ; une déconnexion locale efface le cookie de cet appareil, sans révocation centralisée d’un éventuel jeton copié.

TESTS
Contrôles serveur de signature, altération, expiration, déconnexion, quotas, origine et accès API. Dates simulées J31, J100 et J399 : connexion acceptée puis cookie renouvelé ; J401 sans utilisation : ancien jeton expiré refusé. Session courte non convertie. Essai réel en HTTPS local : case afficher/masquer, fermeture et relance Chromium avec profil conservé, reconnexion sans saisie, oubli/mot de passe remplacé puis identifiant remplacé, dossier local retrouvé après récupération. Bilan inclus.
Aucune analyse automatique des photos ajoutée. Aucun déploiement distant ni test de disponibilité des sources en production.
Source technique : https://developer.chrome.com/blog/cookie-max-age-expires/
