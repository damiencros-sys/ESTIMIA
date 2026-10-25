ESTIM’IA V14.12 — MOT DE PASSE : 10 CARACTÈRES MINIMUM
Base complète V14.11. 95 fichiers. Aucun déploiement distant effectué.

Le minimum est désormais de 10 caractères, côté serveur et formulaire. Messages de configuration et procédure de secours mis à jour. Les mots de passe plus longs restent acceptés. Connexion mémorisée 30 jours et gestionnaire de mots de passe du navigateur conservés.

INSTALLATION
Déployer le ZIP complet depuis GitHub. Dans Render > Environment, ESTIMIA_ACCESS_USER contient votre identifiant (damien par défaut) et ESTIMIA_ACCESS_PASSWORD votre mot de passe personnel de 10 caractères minimum. Enregistrer et déployer les modifications Render, attendre la fin puis rouvrir ESTIM’IA. Ne pas communiquer le mot de passe ni le placer dans GitHub.
Un mot de passe de moins de 10 caractères continue d’être refusé. Si le mot de passe Render est modifié, les connexions mémorisées précédentes sont invalidées ; les dossiers et photos locaux restent conservés.
ESTIMIA_ALLOW_UNPROTECTED est réservé aux tests locaux et ne doit pas être configuré sur Render.

Les fonctions V14.11 sont conservées, dont la procédure Identifiants oubliés, les contrôles, photos IndexedDB, dictées, surfaces, annonces, calculs et exports. Analyse automatique des photos non intégrée. Bilan des tests de cette évolution inclus.
