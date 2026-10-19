ESTIM’IA V13.79 — CALCUL ET ANNONCES
Recherche d’annonces : calcul automatique de l’estimation si elle manque. Une indisponibilite Roques ne bloque plus les autres catalogues ; ses annonces restent prioritaires lorsqu’elles repondent. Sans estimation exploitable, les autres annonces sont explicitement provisoires, classees par surface, sans prix d’estimation invente.
Les boutons sont reactives apres une erreur. Delai DVF borne, explication visible si la surface habitable manque apres un controle de coherence. Les seuils 25 m²/chambre, 15 m²/sanitaire et la correction 10 metres virgule 35 restent conserves.
Envoi mail toujours supprime. Les autres limitations du bilan precedent restent applicables, notamment la couverture des catalogues et les types de biens estimes.

CONTROLES V13.79
80 tests de dictee/surfaces reussis. 8 scenarios de calcul/recherche verifies : ordre normal, annonces avant estimation, panne Roques, timeout Roques, panne DVF, surface manquante, studio et panne du catalogue general. Verification de la reactivation des boutons et de l’absence de montant invente en panne DVF.
Chaine complete via les boutons de la fiche testee dans un DOM simule : transformation du cas capture, 89,01 m², estimation DVF, 4 cartes Roques et 6 autres, donnees d’export completes. Verifications HTTP reelles des trois services sur serveur local : DVF indicatif, 4 annonces Roques, 35 annonces de catalogue. L’affichage sur le Render deploye et le telephone n’a pas ete observe directement.
Apres deploiement, actualiser avec Ctrl+F5 pour charger tous les scripts V13.79.
