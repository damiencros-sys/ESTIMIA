
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


const WORDNUM = {
 'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,'six':6,'sept':7,'huit':8,'neuf':9,'dix':10,
 'onze':11,'douze':12,'treize':13,'quatorze':14,'quinze':15,'seize':16,'vingt':20,'trente':30,'quarante':40,
 'cinquante':50,'soixante':60
};
function normalizeFrenchNumbers(text){
  let out=' '+text.toLowerCase().replace(/[’']/g,"'")+' ';
  Object.entries(WORDNUM).forEach(([w,n])=>{
    out=out.replace(new RegExp(`\\b${w}\\b`,'g'),String(n));
  });
  // "48 50 m²" => "48,50 m²" (common speech-recognition rendering of decimals)
  out=out.replace(/\b(\d{1,4})\s+(\d{1,2})\s*(m(?:2|²)|mètres?\s*carrés?)/g,'$1,$2 $3');
  return out.trim();
}
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
  const t=normalizeFrenchNumbers(raw);
  const facts={};
  const address=$('#address').value.trim(), type=$('#type').value.trim(), surfaceField=$('#surface').value.trim();
  if(address) facts['Adresse']=address;
  if(type) facts['Type']=type;

  let surface=surfaceField || extractNumber(t,[
    /(?:surface(?:\s+habitable|\s+carrez)?|loi carrez)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/,
    /(?:appartement|maison|villa|studio)[^0-9]{0,25}(?:de|d'environ|environ)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/,
    /\b(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)\b/
  ]);
  if(surface) facts['Surface habitable / Carrez']=String(surface).replace('.',',')+' m²';

  const rooms=extractNumber(t,[/\b(\d+)\s*pi[eè]ces?\b/,/\bt\s*(\d+)\b/]);
  const bedrooms=extractNumber(t,[/\b(\d+)\s*chambres?\b/]);
  const levels=extractNumber(t,[/\b(?:sur|avec)\s*(\d+)\s*niveaux?\b/,/\b(\d+)\s*niveaux?\b/]);
  const land=extractNumber(t,[/(?:terrain|parcelle)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/]);
  const terrace=extractNumber(t,[/terrasse[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/]);
  const balcony=extractNumber(t,[/balcon[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/]);
  const garage=extractNumber(t,[/garage[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/]);
  const cellar=extractNumber(t,[/(?:cave|cellier)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/]);
  const parking=extractNumber(t,[/\b(\d+)\s*(?:places?|stationnements?)\b/]);
  const dpe=(t.match(/\bdpe\s*(?:est|class[ée]|:|-)?\s*([a-g])\b/)||[])[1];

  if(rooms) facts['Pièces']=rooms;
  if(bedrooms) facts['Chambres']=bedrooms;
  if(levels) facts['Niveaux']=levels;
  if(land) facts['Terrain']=land.replace('.',',')+' m²';
  if(terrace) facts['Terrasse']=terrace.replace('.',',')+' m²';
  if(balcony) facts['Balcon']=balcony.replace('.',',')+' m²';
  if(garage) facts['Garage']=garage.replace('.',',')+' m²';
  if(cellar) facts['Cave / cellier']=cellar.replace('.',',')+' m²';
  if(parking) facts['Stationnement']=parking+' place(s)';
  else if(/\bparking\b|\bstationnement\b/.test(t)) facts['Stationnement']='Mentionné';
  if(dpe) facts['DPE']=dpe.toUpperCase();

  // Exposure only when explicitly attached to an orientation concept; avoids "la vue est belle" => EST.
  const expPatterns=[
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?sud[\s-]?est\b/,'SUD-EST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?sud[\s-]?ouest\b/,'SUD-OUEST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+nord[\s-]?est\b/,'NORD-EST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+nord[\s-]?ouest\b/,'NORD-OUEST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?sud\b/,'SUD'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?ouest\b/,'OUEST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?est\b/,'EST'],
    [/(?:expos[ée]|exposition|orient[ée]|orientation)\s+(?:plein\s+)?nord\b/,'NORD']
  ];
  const ep=expPatterns.find(([r])=>r.test(t)); if(ep) facts['Exposition']=ep[1];

  const heating=[];
  if(/chauffage[^.]{0,45}[ée]lectrique|radiateurs?\s+[ée]lectriques?/.test(t)) heating.push('Électrique');
  if(/pompe [àa] chaleur|\bpac\b/.test(t)) heating.push('Pompe à chaleur');
  if(/chauffage[^.]{0,30}gaz|chaudi[eè]re[^.]{0,20}gaz/.test(t)) heating.push('Gaz');
  if(/\bfioul\b/.test(t)) heating.push('Fioul');
  if(/\bpo[eê]le\b/.test(t)) heating.push('Poêle');
  if(heating.length) facts['Chauffage']=[...new Set(heating)].join(' + ');

  const dg=yesNo(t,[/double vitrage/],[/simple vitrage/]); if(dg) facts['Double vitrage']=dg;
  const ac=yesNo(t,[/climatisation|\bclim\b/],[/pas de climatisation|pas de clim\b|sans climatisation|sans clim\b/]); if(ac) facts['Climatisation']=ac;
  const pool=yesNo(t,[/\bpiscine\b/],[/pas de piscine|sans piscine/]); if(pool) facts['Piscine']=pool;
  const elevator=yesNo(t,[/ascenseur/],[/sans ascenseur|pas d'ascenseur/]); if(elevator) facts['Ascenseur']=elevator;

  const states=[
    [/tr[eè]s bon [ée]tat|excellent [ée]tat/,'Très bon état'],
    [/bon [ée]tat/,'Bon état'],
    [/rafra[iî]chissement|[àa] rafra[iî]chir/,'Rafraîchissement à prévoir'],
    [/gros travaux|[àa] r[ée]nover|r[ée]novation compl[eè]te/,'Rénovation importante à prévoir'],
    [/\btravaux\b|\br[ée]novation\b/,'Travaux à prévoir']
  ];
  const st=states.find(([r])=>r.test(t)); if(st) facts['État']=st[1];

  const features=[];
  if(/\bvue\b/.test(t)) features.push('Vue mentionnée');
  if(/vue[^.]{0,30}(belle|d[ée]gag[ée]e|panoramique|mer|montagne)/.test(t)) features.push('Vue valorisante à vérifier');
  if(/plain[- ]pied/.test(t)) features.push('Plain-pied mentionné');
  if(/volets? roulants?/.test(t)) features.push('Volets roulants');
  if(/persiennes?/.test(t)) features.push('Persiennes');
  if(/\bfibre\b/.test(t)) features.push('Fibre');
  if(/\bjardin\b/.test(t)) features.push('Jardin');
  if(/\bcour\b/.test(t)) features.push('Cour');
  if(/\bchemin[ée]e\b/.test(t)) features.push('Cheminée');
  if(features.length) facts['Éléments relevés']=[...new Set(features)].join(' · ');


  // --- Fiche immobilière enrichie V4 ---
  const floor=extractNumber(t,[/(?:au|situ[ée] au|appartement au)\s*(\d+)(?:er|e|ème)?\s*[ée]tage/,/(\d+)(?:er|e|ème)?\s*[ée]tage/]);
  if(floor) facts['Étage']=floor;
  if(/\brez[- ]de[- ]chauss[ée]e\b|\brdc\b/.test(t)) facts['Étage']='Rez-de-chaussée';

  const year=extractNumber(t,[/(?:construit|construction|ann[ée]e de construction)[^0-9]{0,20}((?:18|19|20)\d{2})/]);
  if(year) facts['Année de construction']=year;

  const charges=extractNumber(t,[/(?:charges?(?: de copropri[ée]t[ée])?)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/]);
  if(charges) facts['Charges']=charges.replace('.',',')+' € (périodicité à vérifier)';
  const tax=extractNumber(t,[/(?:taxe fonci[eè]re)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/]);
  if(tax) facts['Taxe foncière']=tax.replace('.',',')+' €';

  if(/\bcopropri[ée]t[ée]\b/.test(t)) facts['Copropriété']='Oui / mentionnée';
  if(/pas de copropri[ée]t[ée]|hors copropri[ée]t[ée]/.test(t)) facts['Copropriété']='Non';

  const kitchen=[];
  if(/cuisine[^.]{0,30}ouverte|cuisine am[ée]ricaine/.test(t)) kitchen.push('Ouverte');
  if(/cuisine[^.]{0,30}s[ée]par[ée]e/.test(t)) kitchen.push('Séparée');
  if(/cuisine[^.]{0,30}[ée]quip[ée]e/.test(t)) kitchen.push('Équipée');
  if(/cuisine[^.]{0,30}am[ée]nag[ée]e/.test(t)) kitchen.push('Aménagée');
  if(kitchen.length) facts['Cuisine']=[...new Set(kitchen)].join(' · ');

  const bath=[];
  if(/salle de bains?/.test(t)) bath.push('Salle de bains');
  if(/salle d[' ]eau/.test(t)) bath.push("Salle d’eau");
  if(/douche [àa] l[' ]italienne/.test(t)) bath.push("Douche à l’italienne");
  if(/baignoire/.test(t)) bath.push('Baignoire');
  if(bath.length) facts['Sanitaires']=[...new Set(bath)].join(' · ');
  if(/wc[^.]{0,20}s[ée]par[ée]|toilettes?[^.]{0,20}s[ée]par[ée]/.test(t)) facts['WC']='Séparé(s)';

  const shutters=[];
  if(/volets? roulants?[^.]{0,20}[ée]lectriques?/.test(t)) shutters.push('Volets roulants électriques');
  else if(/volets? roulants?/.test(t)) shutters.push('Volets roulants');
  if(/persiennes?/.test(t)) shutters.push('Persiennes');
  if(/volets? bois/.test(t)) shutters.push('Volets bois');
  if(shutters.length) facts['Fermetures']=[...new Set(shutters)].join(' · ');

  const defects=[];
  if(/bruit|bruyant|nuisance sonore/.test(t)) defects.push('Nuisance sonore mentionnée');
  if(/vis[- ]?[àa][- ]?vis/.test(t)) defects.push('Vis-à-vis mentionné');
  if(/humidit[ée]/.test(t)) defects.push('Humidité mentionnée');
  if(/fissure/.test(t)) defects.push('Fissure(s) mentionnée(s)');
  if(/toiture[^.]{0,30}[àa] refaire|toit[^.]{0,30}[àa] refaire/.test(t)) defects.push('Toiture à reprendre');
  if(/electricit[ée][^.]{0,30}[àa] refaire/.test(t)) defects.push('Électricité à reprendre');
  if(defects.length) facts['Points de vigilance']=defects.join(' · ');

  const positives=[];
  if(/lumineux|lumineuse|tr[eè]s clair/.test(t)) positives.push('Lumineux');
  if(/calme/.test(t)) positives.push('Calme');
  if(/sans vis[- ]?[àa][- ]?vis/.test(t)) positives.push('Sans vis-à-vis');
  if(/vue[^.]{0,40}panoramique/.test(t)) positives.push('Vue panoramique');
  else if(/vue[^.]{0,40}d[ée]gag[ée]e/.test(t)) positives.push('Vue dégagée');
  else if(/belle vue|vue[^.]{0,30}belle/.test(t)) positives.push('Belle vue');
  if(/montagne/.test(t) && /\bvue\b/.test(t)) positives.push('Vue montagne');
  if(/mer/.test(t) && /\bvue\b/.test(t)) positives.push('Vue mer');
  if(positives.length) facts['Atouts']=[...new Set(positives)].join(' · ');

  const diagnostics=[];
  if(/diagnostics?[^.]{0,30}(?:sans anomalie|aucun probl[eè]me|ras)/.test(t)) diagnostics.push('Pas d’anomalie signalée dans la dictée');
  if(/amiante/.test(t)) diagnostics.push('Amiante mentionné');
  if(/plomb/.test(t)) diagnostics.push('Plomb mentionné');
  if(/termites?/.test(t)) diagnostics.push('Termites mentionnées');
  if(diagnostics.length) facts['Diagnostics – notes agent']=diagnostics.join(' · ');

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
