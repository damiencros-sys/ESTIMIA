ESTIM’IA V13.92 — AUDIT ÉLARGI
21 octobre 2026

Base complète V13.91 conservée.
Corrections : surface globale appartement/studio reprise pour le calcul même sans liste de pièces ; propriétaire sans civilité et mention appartient à ; consorts conservés sans prénom artificiel ; nature et surface de terrain déclarées conservées ; régime copropriété explicite affiché.
Le moteur DVF ne prend pas en charge les terrains : message explicite, aucun prix de logement appliqué.

40 scénarios documentés dans BILAN_TESTS_V13_92.html : 24 logements avec prix simulés et 16 terrains avec refus explicite. Les simulations ne valident pas des prix réels ni la disponibilité des sources en production. Régressions POMES et appartement + studio, copropriété, parcelles/urbanisme, historique et modification de prix vérifiées. Aucun nouveau contrôle visuel Word/PDF dans cette session ; contenus transmis aux exports contrôlés. Aucun déploiement effectué.

Installation : remplacer les fichiers GitHub, laisser Render redéployer, puis Ctrl+F5. Exporter vos dossiers locaux avant installation.

Notes de la version précédente :
ESTIM’IA V13.91 — ADRESSE, CADASTRE, URBANISME ET COPROPRIÉTÉ
Base complète V13.90 conservée. Livraison : 95 fichiers.

CAUSES REPRODUITES DANS LA VIDÉO
Le bouton cadastral attendait une section et un numéro déjà connus : une adresse vérifiée ne suffisait donc pas à lancer l’urbanisme. La dictée « remise énorme électrique » échappait au filtre limité à « remise aux normes ». Les champs de copropriété n’étaient pas alimentés. Enfin, deux champs utilisaient le même identifiant pour travaux votés et travaux de l’avis de valeur, avec risque de mélange à l’enregistrement.

CORRECTIONS
- Recherche des parcelles depuis l’adresse : nouveau bouton, et recherche automatique après transformation si aucune référence n’existe. La vérification d’adresse conserve les corrections manuelles. Une écriture différente ou plusieurs adresses nécessitent un choix explicite ; « rue » n’est plus remplacé silencieusement par « impasse ».
- Une adresse précise est recherchée au point dans le Parcellaire Express PCI IGN. Le serveur filtre la commune et contrôle que le polygone contient réellement ce point. Aucun voisin le plus proche n’est choisi. Une seule parcelle peut être ajoutée automatiquement ; plusieurs résultats demandent un choix. Le rattachement au bien et les autres parcelles éventuelles restent à confirmer. Cette recherche ne détermine pas les lots de copropriété.
- Les références ajoutées déclenchent la consultation d’urbanisme par parcelle et le plan. Les erreurs, l’absence de parcelle et les ambiguïtés sont explicites. Pas de zone ou de RNU inventé. Réponse tardive ignorée ; changer adresse/commune retire les références issues de l’ancienne adresse, en conservant les références manuelles.
- Copropriété : charges annuelles, syndic, précisions et travaux votés sont repris dans leurs champs et dans la fiche. Exemple filmé : environ 435 €/an, syndic bénévole, assurance de l’immeuble et électricité des parties communes. Le périmètre appartement/studio n’est pas supposé. Des charges explicitement mensuelles sont annualisées avec mention du calcul ; une valeur manuelle reste conservée.
- Étages, orientation, état, environnement, travaux à prévoir et détails de la visite sont conservés lorsqu’ils sont explicitement indiqués. Pas d’ascenseur, de location en cours ni de document disponible supposé. Les documents ne sont indiqués disponibles que si la case correspondante est cochée.
- « Remise en/aux normes » et la transcription « remise énorme électrique » ne créent pas une annexe. Une vraie remise reste reconnue. Réparation ciblée des anciennes lignes Remise issues de cette erreur à la réouverture, sans réécrire toute la fiche manuelle.
- Les compléments actuels sont exportés même s’ils ont été saisis après la dernière analyse. Chauffage et éléments décoratifs reprennent le nom complet de l’équipement. Les anciens champs perdus/mélangés de travaux restent visibles sous « Travaux d’un ancien dossier — affectation à vérifier » ; ils ne sont pas arbitrairement présentés comme travaux votés.

TEST RÉEL DU 21 OCTOBRE 2026
Adresse vérifiée affichée dans la vidéo : 1 Impasse du Castelet, Lamalou-les-Bains. Géocodage officiel précis puis recherche ponctuelle : C 1522. Consultation officielle : PLU 34126_PLU_20170307, zone Ua — zone urbaine dense de centre ancien, environ 100 % de cette parcelle. Règlement identifié, plan généré. Le point d’adresse ne prouve pas à lui seul le périmètre de propriété ou les lots vendus.
Sources : https://data.geopf.fr/geocodage/search/ ; https://apicarto.ign.fr/api/doc/cadastre ; https://apicarto.ign.fr/api/doc/gpu ; https://www.geoportail-urbanisme.gouv.fr/.

BILAN DES TESTS
87 tests d’extraction réussis. Scénario de la vidéo : transcription exacte du passage litigieux, charges approximatives annuelles, syndic, postes cités, copropriété et champs de travaux indépendants ; sauvegarde/réouverture et ancien dossier contrôlés.
Cas complémentaires : charges mensuelles annualisées, annuelles corrigées, montant nul, valeur manuelle conservée, négation du syndic bénévole, absence déclarée de travaux votés, absence de doublons d’identifiants HTML.
Cadastre : vraie géométrie C1522, autre commune, point extérieur sans attribution d’un voisin, plusieurs résultats, coordonnées invalides, panne. UI : adresse différente non remplacée, choix des candidats, parcelle ambiguë, réponse tardive ignorée, parcelles enregistrées et urbanisme restauré.
Urbanisme : PLU réel figé ; scénarios PLUi/carte communale/RNU explicite, indisponibilité, contradiction, document abrogé et contact de bord.
Régressions : séquences de dictée modifiables, cas surfaces collectives 40 m², estimation 89,01 m² et 4 Roques + 6 autres, estimation modifiée 179 000 et bornes 152 000/206 000, scénario appartement97+studio17, calcul distinct des logements, pas de total partiel, réponse DVF tardive ignorée. Les catalogues et réponses de calcul sont contrôlés dans ces tests ; cela ne garantit pas la disponibilité future des sites tiers.
Word/PDF : contenu des charges, syndic, périmètre, parcelle, plan et zonage vérifié ; rendus examinés visuellement ; travaux de copropriété et justification indépendants. Tests de valeur à 14 pt et des trois montants sur une même page réussis. Données de contrôle et vidéos exclues du ZIP.

INSTALLATION ET REPRISE DU DOSSIER
1. Transférer tous les fichiers via GitHub/Render, puis Ctrl+F5 et vérifier V13.91.
2. Rouvrir le dossier : les compléments manquants et la fausse annexe sont réparés de façon ciblée. Cliquer « Transformer en fiche » pour réanalyser le texte complet.
3. Si aucune parcelle n’apparaît, cliquer « Rechercher les parcelles depuis l’adresse » ou « Vérifier ». Confirmer une proposition si l’écriture diffère ; ne retenir que les références correspondant au bien.
4. L’urbanisme se consulte automatiquement après ajout de la parcelle. Le bouton d’actualisation permet une nouvelle consultation. Vérifier les sources et le règlement.
5. Contrôler le périmètre des charges, l’affectation des pièces aux logements, les noms propres mal transcrits et les anciens textes de travaux ; relancer estimation/annonces si les données du bien ont changé.
Aucun nouveau service payant ; diagnostics facultatifs ; envoi par mail toujours supprimé. Pas de déploiement effectué par l’assistant.

HISTORIQUE PRÉCÉDENT
ESTIM’IA V13.90 — APPARTEMENT + STUDIO ET CORRECTIONS SUCCESSIVES
Base complète V13.89 validée conservée. Archive complète de 95 fichiers.

CORRECTIFS DU CAS VIDÉO
- Adresse sans code postal : rue et commune explicitement dictées sont reprises, puis la commune est résolue par le service existant. Aucun code postal ni nom de propriétaire n’est deviné.
- Logements distincts : surface annoncée par logement, dernière mention chiffrée retenue. Exemple 115 corrigé à 97 m² pour l’appartement, studio de 17 m² : total déclaré 114 m², Carrez non renseigné en l’absence de mesurage communiqué.
- Pièces avec logement explicitement annoncé : regroupement « Appartement — niveau » / « Studio — niveau ». Des séjours ou cuisines de même nom au même niveau ne se remplacent plus entre logements. Si leur logement n’est pas explicite, les pièces restent dans « Logement non précisé » : corriger la dictée en précisant « Dans l’appartement… », « Dans le studio… », ou modifier les niveaux de la fiche.
- Une correction de surface d’un logement ne déborde plus sur le couloir ou les chambres qui suivent. Couloir 12,80 m² conservé ; « 5 m² de salle de bain privative » et « 3 m² de salle de bain privative » reconnus séparément.
- « Remise en/aux normes » ne crée pas une annexe. Cheminée décorative identifiée comme hors chauffage. Les compléments automatiques des menuiseries et équipements suivent une correction ; une valeur remplacée manuellement reste conservée.
- Le détail des pièces du cas vidéo fait 98 m². Cette somme est conservée séparément des surfaces déclarées 97 + 17, sans ajouter de pièce ni corriger arbitrairement une surface.

ESTIMATION
Pour plusieurs logements dont les surfaces sont déclarées : une recherche DVF par logement et son type, puis addition des valeurs et bornes renvoyées. Une estimation en bloc peut différer de la somme des lots : information affichée dans la conclusion. Pas de médiane DVF globale inventée. Transactions affichées dédoublonnées, avec indication du logement concerné.
Si les données sont insuffisantes pour un logement, aucun total partiel n’est présenté comme estimation de l’ensemble. Les annonces sont sélectionnées selon le montant global obtenu. La qualité des comparables et les caractéristiques du bien restent à examiner par le conseiller.
Après transformation d’une fiche dont le type, l’adresse, la commune ou les surfaces ont changé, l’ancien montant est invalidé. Une réponse DVF arrivée après un changement de fiche est ignorée. Relancer le calcul sur la version corrigée.

VÉRIFICATIONS LOCALES
85 tests d’extraction, dont cinq nouveaux cas de logements/corrections. Reproduction des trois séquences visibles dans la vidéo : adresse, 97+17, pièces 98, couloir12,80, deux SDB5/3, suppression de la fausse remise. Historique modifiable, ajout/correction/annulation, sauvegarde et reprise contrôlés.
Calcul séparé de deux logements, addition, dédoublonnage des références, refus d’un total partiel et réponse tardive ignorée vérifiés avec réponses contrôlées. Sélection 4 Roques + 6 autres contrôlée sur catalogues figés, sans garantie de disponibilité future des services tiers. Les prix utilisés dans les tests ne sont pas une estimation réelle du bien filmé.
Régressions V13.83/V13.85/V13.88/V13.89 et urbanisme par parcelle passées. Exports Word/PDF du cas reproduit contrôlés pour contenu et mise en page ; montants à 14 pt et trois prix gardés ensemble. Les données privées de test ne sont pas incluses dans l’archive.

INSTALLATION
Transférer tous les fichiers via GitHub/Render. Après déploiement, Ctrl+F5 et vérifier V13.90 ; rouvrir le dossier, cliquer « Transformer en fiche », vérifier les surfaces puis relancer le calcul et les annonces. Les noms propres mal transcrits et l’affectation des pièces restent à contrôler.
Aucun nouveau service payant. Envoi par mail toujours supprimé, diagnostics facultatifs. Pas de déploiement effectué par l’assistant.

HISTORIQUE PRÉCÉDENT
ESTIM’IA V13.89 — HISTORIQUE DES DICTÉES MODIFIABLE
Base complète V13.88 conservée.

Ouvrir « Historique des dictées successives — textes modifiables ». Chaque dictée possède sa propre zone de texte. Les corrections mettent immédiatement à jour le texte complet et sont enregistrées avec le dossier. Cliquer ensuite sur « Transformer en fiche » pour actualiser les caractéristiques.
Il reste possible de corriger le texte complet. Ces corrections sont reportées dans les séquences concernées et conservées lors d’une modification ultérieure de l’historique. Les dictées suivantes peuvent être ajoutées normalement ; annuler la dernière conserve les corrections des précédentes. Les textes historiques sont temporairement verrouillés pendant une prise de son, puis redeviennent modifiables après son enregistrement.
Les anciens dossiers sans historique sont repris sous forme d’une dictée modifiable. Les transcriptions brutes initiales sont conservées dans les données du dossier.

TESTS LOCAUX
Trois dictées : modification de chacune, surface réanalysée (10,35 m²), correction dans le texte complet puis modification d’une autre dictée, annulation/ajout, sauvegarde et réouverture, deux phrases identiques modifiées séparément, texte vide, caractères HTML, correction traversant plusieurs séquences, microphone simulé, ancien dossier sans historique.
80 tests de dictée et régressions : surfaces collectives, estimation, 4 annonces Roques + 6 autres avec réponses contrôlées, estimation modifiée, sauvegarde, personnalisation des exports V13.88 et urbanisme par parcelle.

INSTALLATION
Archive complète de 95 fichiers à transférer via GitHub/Render. Après déploiement, Ctrl+F5 et vérifier V13.89. Pas de déploiement effectué par l’assistant. Aucun nouveau service payant ; envoi par mail toujours supprimé.

RAPPEL DES FONCTIONS V13.88
ESTIM’IA V13.88 — DOSSIER WORD / PDF ET JUSTIFICATION DE VALEUR
Base V13.87 validée conservée, y compris urbanisme par parcelle, dictée, surfaces, chauffage/sanitaires, photos, dossiers, estimation modifiable et annonces.

NOUVEAUTÉS
Couverture avec première photographie légendée, adresse, type, surface, date et coordonnées du conseiller. Photos ajustées à leurs proportions, sans déformation ; galerie légendée avant les comparables. Synthèse et relevé de visite conservés, avec cadastre et urbanisme.
Les transactions DVF affichées dans l’application sont exportées séparément des prix demandés des annonces. Annonces Roques puis autres agences, avec photos et sources disponibles. Conclusion sur une nouvelle page, valeur centrale à 14 pt, bornes et justification.
Sous « 6 · DOSSIER », ouvrir « Personnaliser le dossier et justifier la valeur » : conseiller, agence, téléphone, points forts, vigilance, travaux et choix des comparables. Champs facultatifs enregistrés avec le dossier et repris dans les exports ; leur contenu reste sous le contrôle du conseiller. Aucun coût, diagnostic, DPE, décote ou commentaire qualitatif inventé automatiquement.
Les diagnostics ne conditionnent pas l’estimation. Une estimation modifiée conserve ses bornes et sa justification ; la proposition initiale reste seulement à l’écran et n’est pas exportée.

INSTALLATION
Transférer l’intégralité de cette archive via GitHub/Render. Vérifier V13.88 après Ctrl+F5. Aucun nouveau service ni abonnement introduit. Envoi par mail toujours supprimé. Pas de déploiement effectué par l’assistant.

CONTRÔLES LOCAUX
80 cas de dictée ; dictée vidéo et 40 m² collectifs ; estimation 89,01 m² et sélection 4 Roques + 6 autres ; ajustement 179 000 et bornes 152 000 / 206 000 ; sauvegarde/reprise ; urbanisme par parcelle et erreurs de service.
Exports Word/PDF complets, sans diagnostic, longs commentaires, images horizontales/verticales/panoramiques et image invalide. Contrôle des montants, contenus, sources et séparation ventes/annonces ; rendu des documents contrôlé visuellement. Les appels d’annonces sont simulés dans ces tests ; ils ne garantissent pas la disponibilité future des sites tiers.
Archive complète : 95 fichiers, données de test exclues.
