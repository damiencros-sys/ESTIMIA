ESTIM’IA V13.95 — SOURCE DVF / TABLEAU COMPLET

Version complète issue de V13.94.

1. Le lien Source des transactions mène à la page officielle data.gouv.fr, et non au répertoire technique files.data.gouv.fr. Les liens des dossiers restaurés sont corrigés.
2. Les cellules des ventes retenues sont exportées même quand leur panneau est replié. Cette lecture a été vérifiée dans Chromium réel ; l’ancienne lecture renvoyait une chaîne vide.

Tests : 28 lignes avec quatre cellules renseignées, panneau fermé puis ouvert ; Word et PDF générés et vérifiés visuellement (5 pages par document) ; 112 tests autonomes ; régression des ajustements automatiques et des 60 champs enregistrés/restaurés.

Installation GitHub/Render puis Ctrl+F5 : vérifier V13.95. Retélécharger les documents : les PDF et Word créés précédemment ne sont pas modifiés automatiquement. Aucun déploiement effectué par l’assistant.

Voir BILAN_TESTS_V13_95.html. ZIP complet : 95 fichiers.
