ESTIM’IA V14.06 — SURFACES CONTRÔLÉES ET SAUVEGARDE LOCALE
Base complète V14.05, issue de la lignée validée V13.60. 95 fichiers.

NOUVEAUTÉS
- Plus de double sauvegarde implicite : le bouton Enregistrer sauvegarde sur l’appareil. La route /api/save refuse les nouvelles écritures. Les anciennes routes d’IA serveur sont désactivées. Les photos sont décrites comme jointes aux documents, sans promesse d’analyse IA.
- Les exports Word/PDF transmettent la fiche et les photos au serveur et sont générés en mémoire par ces routes. L’interface distingue cette transmission de la conservation des dossiers et rappelle les vérifications à effectuer sur l’hébergement et les journaux.
- Contrôle des surfaces par logement : alerte bloquante si pièce sans affectation, valeur de pièce suspecte présente dans le relevé ou écart supérieur à 0,02 m² entre annoncé et détail non arbitré. Ce seuil est une tolérance technique de comparaison, pas une règle de mesurage légale.
- Choix explicite : surface annoncée, somme des pièces ou surface manuelle positive. Choix sauvegardé et invalidé si les données de surface ou d’affectation changent. Le brouillon et la sauvegarde JSON restent accessibles ; calcul, validation et dossier client attendent la résolution des alertes. Un ancien montant éventuellement affiché est signalé comme référence périmée.
- Affectation et classement des pièces modifiables. Les annonces de logement et les marqueurs explicites sont utilisés ; un programme de pièces semblable ne suffit plus à attribuer automatiquement un relevé ambigu. Les dépendances ne deviennent pas automatiquement des logements.
- Appartement/studio exportés séparément avec surface retenue et détail. Studio sans détail conservé. Annexes hors total habitable. Surface Carrez distincte.
- Évaluation DVF séparée par logement. Budget net spécifique facultatif : il remplace la décote d’état du seul logement concerné. Pas de cumul avec un budget global ; justification exigée pour chaque budget spécifique.
- Export/import de tous les dossiers sur fichier JSON, photos enregistrées et historique compris. L’import crée des copies, sans écraser les dossiers existants. Les photos sauvegardées sont les versions optimisées par l’application, pas nécessairement les originaux de l’appareil. Fichier non chiffré : conserver dans un emplacement protégé.
- Historique interne des calculs et décisions : date, proposition calculée, montant précédent/retenu, motif et auteur déclaré (ou Non identifié). Commence avec cette version, ne reconstitue pas les décisions anciennes. Journal local modifiable, non signé et non imprimé dans le dossier client.
- Marge conventionnelle ±15 % recalculée autour de la valeur centrale finale, arrondie au millier. Elle n’est ni une dispersion observée ni un intervalle de confiance. Nombre, période, médiane et quartiles des références disponibles apparaissent séparément, avec avertissement sous 5 références (seuil interne).
- Nettoyage ciblé des écritures de surfaces brutes ; petits tableaux Word et blocs PDF mieux regroupés.

ANCIENS DOSSIERS SERVEUR
Aucun ancien fichier n’a été supprimé et aucun inventaire distant n’a été effectué. Après accès autorisé à l’environnement Render, un administrateur peut exécuter « python server.py --audit-storage » : la commande liste uniquement les identifiants de dossiers locaux EST-*, leurs nombres de fichiers et tailles. Elle ne supprime rien. Vérifier les fichiers et les obligations de conservation avant une éventuelle suppression manuelle ; aucune route publique de consultation ou de suppression n’est ajoutée.
Les corrections de code ne certifient pas la conformité RGPD. Les responsabilités avec l’agence, la conservation, les conditions et la région de l’hébergement restent à vérifier.

INSTALLATION
Remplacer les fichiers GitHub par le contenu complet du ZIP. Attendre le déploiement Render, puis Ctrl+F5 et vérifier V14.06. Les dossiers du navigateur utilisent la même clé de stockage que V14.05. Dès que possible, utiliser Mes dossiers > Exporter tous les dossiers + photos.
Le nouveau blocage de surfaces peut demander un choix pour des dossiers anciens avant de recalculer ou d’exporter. Il est volontaire. Aucune annonce ou aucun prix n’est inventé si un service externe ne répond pas.

PÉRIMÈTRE
Aucun service payant ajouté. Les fonctions d’annonces, DVF, cadastre et urbanisme restent tributaires des sources externes. L’estimation automatique des terrains n’est pas ajoutée. La source de vérification fibre reste celle de V14.05 ; son remplacement demeure une évolution distincte.
Aucun déploiement distant effectué pendant cette intervention. Bilan de tests inclus.
