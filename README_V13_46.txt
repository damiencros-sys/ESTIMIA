ESTIM’IA V13.46 — Passerelle DVF+ Cerema (bêta technique)

- Remplacement du service expérimental cquest par l’API DVF+ open-data du Cerema.
- Filtrage par code INSEE, type et surface ; exclusion des mutations multi-locaux lorsqu’identifiées.
- Distinction entre panne du service, insuffisance de références et estimation indicative.
- Le moteur de recherche des annonces Bing RSS reste expérimental : aucune garantie d’annonces exploitables.
- Les annonces ne sont jamais intégrées automatiquement dans le prix calculé.
- Attention : les appels réseau réels depuis Render n’ont PAS pu être vérifiés dans cet environnement.
- Si Cerema ne répond pas depuis Render, le module l’indique sans inventer de prix.
- Ne pas utiliser comme avis de valeur professionnel avant validation des références.
