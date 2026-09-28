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
