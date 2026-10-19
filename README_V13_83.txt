ESTIM’IA V13.83 — ESTIMATION MODIFIABLE
Base complète V13.82 conservée. Le bouton « Modifier l’estimation » remplace la valeur centrale par le montant validé et sa justification. Fourchettes : −15 % et +15 %, arrondies au millier (bornées pour les très petits montants).
Exemple : 179000 € donne 152000 € / 179000 € / 206000 €.
La proposition initiale (centrale et fourchettes) reste en petit à l’écran. Elle est conservée lors de plusieurs modifications et lors de l’enregistrement/réouverture du dossier. Un nouveau calcul DVF produit une nouvelle proposition initiale.
Les documents Word/PDF et l’impression de la fiche utilisent le montant modifié et les fourchettes recalculées. La proposition initiale n’est pas envoyée aux exports ; la ligne du repère « prix au m² de l’estimation statistique » est exclue après modification. Les transactions et le repère médian DVF restent des sources distinctes, pas une seconde estimation du bien.
La sélection des annonces utilise le montant validé. Aucun changement de méthode DVF ni de dictée. Les correctifs WC, annexes, décimales et totaux de V13.82 sont conservés. Aucun envoi par mail ou service payant ajouté.
Livraison testée localement, non déployée automatiquement sur Render. Déployer via GitHub, actualiser Ctrl+F5, vérifier V13.83.

VALIDATION LOCALE
- 179000 € : centrale remplacée, basse 152000 €, haute 206000 €.
- Deux modifications successives : proposition initiale inchangée.
- Enregistrement/réouverture : estimation modifiée et référence initiale conservées.
- Montant négatif refusé ; nouveau calcul DVF réinitialisant l’ajustement.
- Exports Word/PDF : 179000/152000/206000 présents ; 222000/189000/255000 absents dans le cas de contrôle. PDF vérifié visuellement ; impression HTML contrôlée sans proposition initiale.
- 80 tests de dictée et régressions V13.80, V13.81, V13.82 réussis : surfaces, WC/cave, doublons et chaîne estimation + 4 Roques + 6 autres.
