ESTIM’IA V13.87 — URBANISME OFFICIEL PAR PARCELLE
Base complète V13.86 validée conservée. Nouvelle rubrique sous Cadastre, indépendante du calcul d’estimation.
Pour chaque parcelle : document/régime (PLUi, PLU, carte communale, RNU, autres types publiés), références, statut publié, zones réellement couvrantes, libellés et parts approximatives, liens vers les documents/règlements écrits, date de consultation.
La consultation se lance après modification des parcelles ; le bouton « Consulter / actualiser l’urbanisme » permet de la relancer. Commune + références cadastrales nécessaires. Jusqu’à 20 parcelles par dossier, deux consultations en parallèle.
Sources publiques gratuites : cadastre IGN API Carto, module GPU de l’API Carto, métadonnées officielles du Géoportail de l’urbanisme. Aucun abonnement ni clé payante. Nouvelle dépendance libre shapely pour les intersections géométriques ; installation par requirements.txt sur Render.
Les contours complets des parcelles sont interrogés : un simple contact de bord ne suffit pas pour attribuer une zone. Les pourcentages sont approximatifs, pas un mesurage opposable. Plusieurs zones peuvent concerner une même parcelle.
RNU uniquement si l’indicateur officiel l’affirme et qu’aucun document contradictoire n’est trouvé. Une absence de document, de zonage ou une panne donne « Non déterminé » ou une information partielle, jamais un RNU supposé.
Les résultats sont enregistrés avec le dossier et repris dans Word/PDF/impression. Une commune ou des parcelles modifiées invalident le résultat précédent. Un dossier rouvert conserve la date de sa consultation enregistrée ; utiliser Actualiser pour une nouvelle recherche.

VERIFICATIONS
- Appel réel complet : Lamalou-les-Bains, C 1253, PLU 34126_PLU_20170307 ; Uc environ 28,06 % et Uci environ 71,94 % ; règlement écrit identifié.
- Types PLUi et carte communale contrôlés dans les métadonnées officielles ; scénarios PLUi/CC/RNU, document absent, panne, zonage partiel, contradiction et document abrogé testés avec réponses contrôlées.
- Deux parcelles affichées séparément, sauvegarde/réouverture, changement de commune, réponse tardive ignorée, exports Word/PDF et impression contrôlés. Exports Word/PDF examinés visuellement.
- Régressions : 80 dictées, cas vidéo des 40 m² collectifs, surface 89,01, estimation et annonces, estimation modifiée et référence initiale exclue des documents, valeur centrale à 14 pt.

INSTALLATION
Déployer cette archive complète via GitHub/Render, y compris requirements.txt, puis Ctrl+F5 et vérifier V13.87. Ajouter/rechercher les parcelles ou rouvrir le dossier puis Consulter / actualiser l’urbanisme. Livraison testée localement et sources publiques testées en ligne ; la nouvelle version n’a pas été déployée par l’assistant.
Le zonage ne résume pas toutes les prescriptions/SUP et ne vaut pas autorisation de construire. Les liens officiels permettent de lire le règlement. Les anciens modules défaillants ne sont pas réactivés. Envoi par mail toujours supprimé.
