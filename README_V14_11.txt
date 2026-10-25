ESTIM’IA V14.11 — CONNEXION MÉMORISÉE
Base complète V14.10, 95 fichiers. Aucun déploiement distant effectué.

CONNEXION
Un formulaire remplace la boîte de dialogue HTTP Basic. Utiliser l’identifiant et le mot de passe configurés dans Render.
La case « Rester connecté sur cet appareil pendant 30 jours » est cochée par défaut. Elle enregistre un jeton signé dans un cookie Secure, HttpOnly et SameSite=Lax ; le mot de passe n’est pas stocké en clair dans le navigateur par ESTIM’IA, dans localStorage, IndexedDB ou dans les sauvegardes des dossiers.
Le navigateur peut proposer de mémoriser les identifiants dans son propre gestionnaire, grâce aux champs autocomplete username/current-password. Cette proposition dépend de ses réglages ; ESTIM’IA ne force pas l’enregistrement d’un mot de passe.
Sans la case, cookie de session navigateur, avec expiration serveur après 8 heures. Avec la case, expiration après 30 jours. Les cookies supprimés par l’utilisateur, une navigation privée ou les réglages du navigateur peuvent interrompre cette mémorisation.
Le bouton Se déconnecter efface le cookie de cet appareil. Un changement d’identifiant ou de mot de passe Render invalide toutes les anciennes signatures. Un redémarrage de Render ne les invalide pas si ces variables restent identiques. La déconnexion locale n’est pas un système de révocation centralisée de chaque jeton : modifier le mot de passe Render pour invalider tous les appareils.

INSTALLATION
Avant déploiement, Render > Environment : ESTIMIA_ACCESS_USER = damien (ou votre identifiant) ; ESTIMIA_ACCESS_PASSWORD = votre mot de passe personnel de 16 caractères minimum. Ces deux variables sont inchangées depuis V14.10. Ne pas ajouter ESTIMIA_ALLOW_UNPROTECTED dans Render ; cette option est réservée aux tests locaux.
Remplacer les fichiers GitHub par le ZIP complet, attendre Render puis actualiser et vérifier V14.11. Le formulaire et les cookies sécurisés nécessitent HTTPS (URL Render). Les dossiers et photos locaux restent conservés.
Ne pas mettre les identifiants dans GitHub ou le ZIP. Le mot de passe n’est jamais renvoyé au formulaire HTML. Aucun mot de passe fourni dans cette archive.

VÉRIFICATIONS DE CETTE ÉVOLUTION
44 contrôles serveur : formulaire, champs autocomplete, refus des routes sans connexion, identifiants erronés, origine étrangère, cookie persistant, session simple, signature, corruption, expiration, changement du mot de passe, réutilisation après réouverture, déconnexion et quotas.
Parcours Chromium de non-régression : progression, champs manquants, navigation libre, ajustement justifié, sauvegarde/restauration, absence des indicateurs internes des exports et affichage ordinateur/mobile.
Les fonctionnalités et correctifs V14.10 sont conservés : photos IndexedDB, contrôles, raccourcis, liens courts, contour rouge unique et texte foncé. Analyse automatique des photos non intégrée.
Bilan inclus. Aucun service payant ajouté. Aucun contrôle de disponibilité des sources externes ou déploiement Render effectué.

IDENTIFIANTS OUBLIÉS
Un lien Identifiants oubliés ? ouvre /auth/help, accessible sans connexion. La procédure propose le gestionnaire du navigateur puis, pour l’administrateur, Render > service ESTIM’IA > Environment : retrouver ESTIMIA_ACCESS_USER, remplacer ESTIMIA_ACCESS_PASSWORD, choisir Save and deploy. Un bouton permet d’imprimer cette procédure. Aucun mot de passe n’y est affiché. Si le compte Render est aussi inaccessible, il faut d’abord récupérer ce compte auprès de Render ou de son fournisseur de connexion. Cette procédure ne supprime pas les dossiers locaux. Ne pas vider les données du navigateur pour résoudre un problème de mot de passe.
Source officielle : https://render.com/docs/configure-environment-variables

TEST COMPLÉMENTAIRE EN NAVIGATEUR RÉEL
Connexion sur serveur HTTPS local, cookie HttpOnly inaccessible au JavaScript, fermeture et redémarrage de Chromium avec son profil : connexion retrouvée sans ressaisie. Dossier local rouvert, déconnexion et API refusée, page de secours accessible sur mobile, mot de passe changé côté serveur, nouvelle connexion et dossier conservé. Test réalisé localement, pas sur Render.
