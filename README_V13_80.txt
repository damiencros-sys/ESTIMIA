ESTIM’IA V13.80 — SURFACES CORRIGEABLES ET ANALYSE UNIQUE

Un seul analyseur transforme la dictée. La fiche est remplie sans attendre le réseau des communes.
Les chambres au-delà de 25 m² et sanitaires au-delà de 15 m² restent visibles avec une alerte dans les lignes de surfaces. Corriger la valeur de la pièce dans cette ligne puis relancer le calcul. Une valeur suspecte ne devient jamais automatiquement 10,35 m². Une surface globale confirmée peut être saisie dans Surface habitable.
Après correction de toutes les lignes signalées, le total est recalculé et les résultats précédents invalidés pour éviter un prix périmé.

IMPORTANT DVF : une base synthétique était présente dans les archives antérieures. Les montants issus de cette base, dont le résultat 198000 € du contrôle précédent, ne constituent pas un avis de valeur. Cette base est retirée du ZIP et ignorée par V13.80, même si elle reste sur Render. Le nouveau cache dvf_officiel.sqlite3 est rempli par les téléchargements officiels ou l’import DVF. Le premier calcul peut prendre plus de temps. Les dossiers enregistrés ne sont pas supprimés.

Déployer les fichiers de cette archive dans GitHub puis attendre le déploiement Render. Actualiser Ctrl+F5 et vérifier V13.80. Aucun changement n’est déployé automatiquement par cette livraison.
Les anciens dossiers peuvent conserver des chiffres déjà enregistrés : relancer leur estimation.
Envoi par mail toujours supprimé. Aucun service payant ajouté.

CONTROLES EFFECTUES SUR LE CODE LIVRE
- 80 tests de dictées : décimales, chambres, sanitaires, cave + garage, limites.
- Réseau communes bloqué : type et surfaces disponibles immédiatement.
- Chambre 35 et WC 20 signalés ; correction en 10,35 et 1,72 ; total avec séjour 30 = 42,07 m². Un seul correctif ne débloque pas l'autre alerte.
- Chaîne complète simulée avec résultat DVF officiel et catalogue récupéré : estimation + 4 Roques + 6 autres ; 12 tests de doublons et sélection.
- 8 scénarios de panne/usage : DVF inaccessible, Roques inaccessible, délai Roques, autres annonces indisponibles, surface absente, studio, recherche avant calcul, cas normal. Ces tests de panne utilisent des réponses contrôlées.
- 6 exports Word/PDF : décimales, quatre chambres et avertissements présents.
- Téléchargement réel DVF 2025 Lamalou : 61 ventes indexées, 14 comparables pour une maison de 89,01 m². Ces valeurs servent à vérifier le fonctionnement, pas à estimer le dossier Pomes sans examen.

LIMITES
Cette livraison a été testée localement. Son installation sur Render et le dossier réel complet restent à vérifier après déploiement. Les deux dernières captures n'étaient pas accessibles dans cet environnement ; le texte exact de toute nouvelle alerte sera nécessaire si le blocage persiste.
Ce correctif ne signifie pas que tous les défauts du bilan V13.76 sont résolus. L'estimation automatique DVF reste limitée aux maisons et appartements ; la présence de 4 + 6 annonces dépend des catalogues disponibles.
