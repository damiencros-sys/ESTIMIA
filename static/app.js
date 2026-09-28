
const $=s=>document.querySelector(s);
let recognition=null, recognizing=false, photoFiles=[];

function setStatus(id,msg){$(id).textContent=msg}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

$('#photos').addEventListener('change',e=>{
  photoFiles=[...e.target.files].slice(0,60);
  const g=$('#gallery'); g.innerHTML='';
  photoFiles.forEach(f=>{const im=document.createElement('img');im.src=URL.createObjectURL(f);im.alt=f.name;g.appendChild(im)});
  setStatus('#photoStatus',photoFiles.length?`${photoFiles.length} photo(s) prête(s) pour ce dossier.`:'');
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function appendTranscript(text){
  const notes=$('#notes');
  const old=notes.value.trim();
  notes.value=(old?old+' ':'')+text.trim();
  notes.dispatchEvent(new Event('input'));
}

$('#record').addEventListener('click',()=>{
  if(!SpeechRecognition){
    setStatus('#recordStatus',"La dictée directe n'est pas disponible dans ce navigateur. Sur Samsung, ouvre ESTIM’IA dans Chrome. Tu peux aussi utiliser le micro du clavier Samsung/Google dans la zone de notes.");
    $('#notes').focus();
    return;
  }
  if(recognizing && recognition){
    recognition.stop();
    return;
  }

  recognition=new SpeechRecognition();
  recognition.lang='fr-FR';
  recognition.continuous=true;
  recognition.interimResults=true;

  let finalText='';
  recognition.onstart=()=>{
    recognizing=true;
    $('#record').textContent='⏹️ Arrêter la dictée';
    $('#record').classList.add('recording');
    setStatus('#recordStatus','🎙️ Dictée en cours… parle normalement.');
  };
  recognition.onresult=(event)=>{
    let interim='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const t=event.results[i][0].transcript;
      if(event.results[i].isFinal) finalText+=t+' ';
      else interim+=t;
    }
    setStatus('#recordStatus', interim ? '🎙️ '+interim : '🎙️ Dictée en cours…');
  };
  recognition.onerror=(event)=>{
    const map={
      'not-allowed':"Micro non autorisé. Autorise le micro pour ce site.",
      'no-speech':"Je n’ai pas entendu de parole. Réessaie.",
      'network':"La reconnaissance vocale du navigateur n’est pas disponible pour le moment."
    };
    setStatus('#recordStatus',map[event.error]||('Erreur de dictée : '+event.error));
  };
  recognition.onend=()=>{
    recognizing=false;
    $('#record').textContent='🎙️ Démarrer la dictée';
    $('#record').classList.remove('recording');
    if(finalText.trim()){
      appendTranscript(finalText);
      setStatus('#recordStatus','✓ Dictée ajoutée aux notes. Tu peux corriger le texte.');
    }
  };
  try{recognition.start()}catch(e){setStatus('#recordStatus','Impossible de démarrer la dictée : '+e.message)}
});

function extractNumber(text, patterns){
  for(const p of patterns){
    const m=text.match(p);
    if(m) return m[1].replace(',','.');
  }
  return null;
}
function yesNo(text, yesPatterns, noPatterns=[]){
  if(noPatterns.some(p=>p.test(text))) return 'Non';
  if(yesPatterns.some(p=>p.test(text))) return 'Oui';
  return null;
}
function localStructure(){
  const raw=$('#notes').value.trim();
  const t=raw.toLowerCase();
  const facts={};
  const address=$('#address').value.trim(), type=$('#type').value.trim(), surface=$('#surface').value.trim();
  if(address) facts['Adresse']=address;
  if(type) facts['Type']=type;
  if(surface) facts['Surface habitable / Carrez']=surface+' m²';

  const rooms=extractNumber(t,[/(\d+)\s*pi[eè]ces?/,/\bt\s*(\d+)\b/]);
  const bedrooms=extractNumber(t,[/(\d+)\s*chambres?/,/chambre[^0-9]{0,15}(\d+)/]);
  const land=extractNumber(t,[/(?:terrain|parcelle)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*m/]);
  const terrace=extractNumber(t,[/terrasse[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*m/]);
  const garage=extractNumber(t,[/garage[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*m/]);
  const cellar=extractNumber(t,[/(?:cave|cellier)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*m/]);
  const parking=extractNumber(t,[/(\d+)\s*(?:places?|stationnements?)/]);
  const dpe=(t.match(/\bdpe\s*[:\-]?\s*([a-g])\b/)||[])[1];

  if(rooms) facts['Pièces']=rooms;
  if(bedrooms) facts['Chambres']=bedrooms;
  if(land) facts['Terrain']=land+' m²';
  if(terrace) facts['Terrasse']=terrace+' m²';
  if(garage) facts['Garage']=garage+' m²';
  if(cellar) facts['Cave / cellier']=cellar+' m²';
  if(parking) facts['Stationnement']=parking+' place(s)';
  if(dpe) facts['DPE']=dpe.toUpperCase();

  const exposures=['sud-est','sud est','sud-ouest','sud ouest','plein sud','sud','nord-est','nord est','nord-ouest','nord ouest','est','ouest','nord'];
  const exp=exposures.find(x=>t.includes(x));
  if(exp) facts['Exposition']=exp.replace('plein ','').replace('-', ' ').toUpperCase();

  const heating=[];
  if(/chauffage[^.]{0,40}électrique|radiateurs?\s+électriques?/.test(t)) heating.push('Électrique');
  if(/pompe à chaleur|pac\b/.test(t)) heating.push('Pompe à chaleur');
  if(/gaz/.test(t)) heating.push('Gaz');
  if(/fioul/.test(t)) heating.push('Fioul');
  if(/po[eê]le/.test(t)) heating.push('Poêle');
  if(heating.length) facts['Chauffage']=[...new Set(heating)].join(' + ');

  const dg=yesNo(t,[/double vitrage/],[/simple vitrage/]);
  if(dg) facts['Double vitrage']=dg;
  const ac=yesNo(t,[/climatisation|clim\b/],[/pas de clim|sans clim/]);
  if(ac) facts['Climatisation']=ac;
  const pool=yesNo(t,[/piscine/],[/pas de piscine|sans piscine/]);
  if(pool) facts['Piscine']=pool;

  const states=[
    [/tr[eè]s bon [ée]tat/,'Très bon état'],
    [/bon [ée]tat/,'Bon état'],
    [/rafra[iî]chissement|à rafra[iî]chir/,'Rafraîchissement à prévoir'],
    [/travaux|à r[ée]nover|r[ée]novation/,'Travaux / rénovation à prévoir']
  ];
  const st=states.find(([p])=>p.test(t)); if(st) facts['État']=st[1];

  const features=[];
  if(/vue/.test(t)) features.push('Vue mentionnée');
  if(/plain[- ]pied/.test(t)) features.push('Plain-pied mentionné');
  if(/volets? roulants?/.test(t)) features.push('Volets roulants');
  if(/persiennes?/.test(t)) features.push('Persiennes');
  if(/fibre/.test(t)) features.push('Fibre');
  if(features.length) facts['Éléments relevés']=features.join(' · ');

  facts['Notes de visite']=raw;
  return facts;
}

$('#analyse').addEventListener('click',()=>{
  const notes=$('#notes').value.trim();
  if(!notes){setStatus('#recordStatus','Dicte ou écris d’abord tes notes.');return}
  renderFacts(localStructure());
  setStatus('#recordStatus','✓ Fiche préparée gratuitement à partir de tes notes. Vérifie les informations.');
});

function renderFacts(j){
  const entries=Object.entries(j).filter(([k,v])=>v!==null&&v!==''&&!(Array.isArray(v)&&!v.length));
  $('#facts').innerHTML=entries.length?entries.map(([k,v])=>`<div class="fact"><span>${esc(k)}</span><strong>${esc(Array.isArray(v)?v.join(' · '):typeof v==='object'?JSON.stringify(v):v)}</strong></div>`).join(''):'<div class="empty">Aucune information structurée.</div>';
}

$('#save').addEventListener('click',async()=>{
  const fd=new FormData();
  fd.append('address',$('#address').value);fd.append('type',$('#type').value);fd.append('surface',$('#surface').value);
  fd.append('notes',$('#notes').value);fd.append('correction',$('#correction').value);
  photoFiles.forEach(f=>fd.append('photos',f));
  try{
    const r=await fetch('/api/save',{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw new Error(j.detail||'Erreur');
    setStatus('#saveStatus',`✓ Dossier ${j.id} enregistré (${j.photos} photo(s)).`);
  }catch(e){setStatus('#saveStatus','Enregistrement impossible : '+e.message)}
});

$('#new').addEventListener('click',()=>{if(confirm('Créer un nouveau dossier ?'))location.reload()});
