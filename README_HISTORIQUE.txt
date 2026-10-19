README_V3.txt
ESTIM'IA V3 GRATUITE
- Hébergement compatible Render Free.
- Dictée via reconnaissance vocale du navigateur (Chrome/Android recommandé).
- Aucun appel à l'API OpenAI pour la dictée ou la structuration.
- Structuration locale simple des notes.
- Aucun OPENAI_API_KEY requis.


README_V3_1.txt
ESTIM'IA V3.1 GRATUITE
Améliorations du moteur local :
- nombres simples écrits en lettres
- décimales dictées du type 48 50 m²
- surface appartement/maison
- pièces, chambres, niveaux
- annexes : terrain, terrasse, balcon, garage, cave
- DPE, chauffage, vitrage, climatisation, piscine, ascenseur
- exposition avec contexte explicite (suppression du faux positif « est »)
- état et éléments qualitatifs
Aucune API OpenAI requise pour ces fonctions.


README_V4.txt
ESTIM'IA V4 - FICHE COMPLETE GRATUITE
Ajouts :
- étage / RDC, niveaux, année de construction
- copropriété, charges, taxe foncière
- cuisine et sanitaires
- fermetures
- atouts détaillés : calme, luminosité, vue dégagée/panoramique/montagne/mer
- points de vigilance : bruit, vis-à-vis, humidité, fissures, toiture, électricité
- notes diagnostics
- conservation intégrale de la dictée
Toujours sans clé API OpenAI.


README_V5.txt
ESTIM'IA V5 - DICTÉE PRO (GRATUITE)
- dictées successives
- affichage de la reconnaissance en direct
- nettoyage prudent des euh/heu/hum et répétitions immédiates
- correction orale simple des nombres : « 30 m², non pardon 25 m² »
- annuler la dernière dictée
- effacer toute la dictée
- historique des séquences de dictée
- vocabulaire immobilier favorisé si le navigateur le supporte
- corrections agent prises en compte lors de la structuration
- extraction du dernier nombre pertinent pour favoriser une correction ultérieure
- surfaces par pièce
- informations « à vérifier »
- aucune clé API payante
Limite : SpeechRecognition dépend du navigateur/service vocal disponible ; le fonctionnement hors-ligne n'est pas garanti.


README_V5_1.txt
ESTIM'IA V5.1 — CORRECTIF DICTÉE
Cette version repart de V4, dont la dictée fonctionnait sur Samsung/Chrome.
Le bloc SpeechRecognition de V4 n'a pas été remplacé.
Ajouts autour du moteur existant :
- nettoyage prudent euh/heu/hum
- répétitions immédiates
- correction chiffrée simple
- historique
- annuler dernière dictée
- effacer toute la dictée
Toujours sans API payante.


README_V6.txt
ESTIM'IA V6 — DICTÉE PROFESSIONNELLE
Base micro : V5.1/V4 conservée, car validée sur Samsung + Chrome.
Le moteur vocal n'a pas été remplacé.

Nouveautés d'interprétation :
- corrections "3 chambres pardon 2"
- corrections "terrasse 30 m² non je corrige 25 m²"
- corrections simples de chauffage
- surfaces individualisées par pièce
- vue détaillée (dégagée, montagnes, mer, panoramique)
- catégorie À vérifier (assainissement, toiture, surface, taxe foncière, urbanisme, électricité)
- prudence sur les déclarations propriétaire/vendeur
- historique, annulation dernière dictée et effacement conservés

Principe : en cas d'information absente, ne rien inventer.
Toujours sans clé API payante.
