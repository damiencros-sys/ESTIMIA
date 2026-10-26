VERSION ACTUELLE : V14.16 — MOT DE PASSE VISIBLE SUR DEMANDE / CONNEXION RENOUVELÉE
Lire README_V14_16.txt et BILAN_TESTS_V14_16.html.

VERSION ACTUELLE : V14.12 — MOT DE PASSE 10 CARACTÈRES MINIMUM
Lire README_V14_12.txt et BILAN_TESTS_V14_12.html.

VERSION ACTUELLE : V14.11 — CONNEXION MÉMORISÉE
Lire README_V14_11.txt et BILAN_TESTS_V14_11.html.

VERSION ACTUELLE : V14.10
IMPORTANT : configurer le mot de passe Render AVANT déploiement.
Lire README_V14_10.txt et BILAN_TESTS_V14_10.html.

VERSION ACTUELLE : V14.09
Lire README_V14_09.txt et BILAN_TESTS_V14_09.html.

VERSION ACTUELLE : V14.08
Lire README_V14_08.txt et BILAN_TESTS_V14_08.html.
Les notes ci-dessous décrivent des versions historiques, pas le fonctionnement actuel.

VERSION ACTUELLE : V14.03
Lire README_V14_03.txt et BILAN_TESTS_V14_03.html.

VERSION ACTUELLE : V13.94
Lire README_V13_94.txt et BILAN_TESTS_V13_94.html.

VERSION ACTUELLE : V13.93
Lire README_V13_93.txt et BILAN_TESTS_V13_93.html.

ESTIM'IA V2 — version hébergeable HTTPS

Cette version est conçue pour être déployée sur un vrai serveur HTTPS.
Fonctions V2 :
- création d'un dossier
- import multi-photos
- enregistrement du micro via MediaRecorder
- transcription française par OpenAI gpt-transcribe
- transformation IA de la dictée en fiche structurée
- sauvegarde du dossier et des photos côté serveur

IMPORTANT
Le micro navigateur nécessite une adresse HTTPS (ou localhost).
Il faut définir la variable d'environnement OPENAI_API_KEY sur l'hébergeur.
Ne jamais mettre la clé API dans app.js ou dans le navigateur.

Lancement local :
1. python -m venv .venv
2. activer l'environnement
3. pip install -r requirements.txt
4. définir OPENAI_API_KEY
5. uvicorn server:app --reload
6. ouvrir http://localhost:8000

Déploiement :
Commande de démarrage : uvicorn server:app --host 0.0.0.0 --port $PORT
