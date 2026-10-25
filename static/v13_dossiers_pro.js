(()=>{'use strict';
const STORE='estimia_cases_v1327';
const OLD_STORES=['estimia_cases_v1318','estimia_cases_v1317','estimia_cases_v1316','estimia_cases_v1315'];
const $=s=>document.querySelector(s);
let currentId=null,restoring=false,timer=null,saveSequence=0,restoreToken=0;

function readCases(){
 try{
  let x=JSON.parse(localStorage.getItem(STORE)||'null');
  if(Array.isArray(x))return x;
  for(const k of OLD_STORES){const old=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(old)&&old.length){localStorage.setItem(STORE,JSON.stringify(old));return old}}
 }catch(e){}
 return [];
}
let dbPromise,writeQueue=Promise.resolve();
function photoDB(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('IndexedDB indisponible'));return;}const r=indexedDB.open('estimia_photos_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Base photos bloquée : fermez les autres onglets ESTIM’IA.'));r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();dbPromise=null;};resolve(r.result);};}).catch(e=>{dbPromise=null;throw e});return dbPromise;}
async function photoTransaction(mode,operation){const db=await photoDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',mode);let result;try{const request=operation(tx.objectStore('photos'));request.onsuccess=()=>result=request.result;}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Écriture photos impossible'));tx.onabort=()=>reject(tx.error||Error('Écriture photos annulée'));});}
function photoBlob(data){const [header,body]=String(data).split(',');if(!/^data:image\/(?:png|jpeg|webp);base64$/.test(header)||!body)throw Error('Photo locale invalide');const raw=atob(body),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Blob([bytes],{type:header.slice(5,-7)});}
function photoData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function resolvePhotos(d){if(!d.photoKey)return {...d,photos:d.photos||[]};const stored=await photoTransaction('readonly',store=>store.get(d.photoKey));if(!stored)throw Error('Les photos de ce dossier sont absentes du stockage local. Importez une sauvegarde complète.');return {...d,photos:await Promise.all(stored.map(async p=>({label:p.label,data:await photoData(p.blob)})))};}
function writeCases(source){const task=writeQueue.catch(()=>{}).then(async()=>{const old=readCases(),values=typeof source==='function'?source(readCases()):source;const prepared=[];const staged=[];
 try{for(const item of values){const d={...item};if(Array.isArray(d.photos)&&d.photos.length){const key=d.id+'-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random());await photoTransaction('readwrite',store=>store.put(d.photos.map(p=>({label:p.label||'Photo',blob:photoBlob(p.data||p.url)})),key));staged.push(key);d.photoKey=key;delete d.photos;if(d.html)d.html={...d.html,gallery:''};}else if(Array.isArray(d.photos)){delete d.photoKey;}prepared.push(d);}localStorage.setItem(STORE,JSON.stringify(prepared));}
 catch(e){for(const key of staged)try{await photoTransaction('readwrite',store=>store.delete(key));}catch{}throw e;}
 const retained=new Set(prepared.map(d=>d.photoKey).filter(Boolean));for(const d of old)if(d.photoKey&&!retained.has(d.photoKey))try{await photoTransaction('readwrite',store=>store.delete(d.photoKey));}catch{}
 return prepared;});writeQueue=task;return task;}
async function storageStatus(){const box=$('#photoStorageStatus');if(!box)return;try{const estimate=await navigator.storage?.estimate?.();box.textContent='Photos enregistrées dans la base locale IndexedDB.'+(estimate?.quota?' Espace utilisé estimé : '+Math.round((estimate.usage||0)/1024/1024)+' Mo / '+Math.round(estimate.quota/1024/1024)+' Mo.':'')+' Exportez régulièrement une sauvegarde complète ; effacer les données du navigateur supprime aussi cette base.';}catch{box.textContent='Stockage local des photos : exportez régulièrement une sauvegarde complète.';}}
window.estimiaCaseStore={flush:()=>writeQueue,read:readCases,resolve:resolvePhotos,save:()=>saveNow(false)};

function makeId(){return 'EST-'+Date.now().toString(36).toUpperCase()}
function allValues(){
 const values={};
 document.querySelectorAll('main input[id],main textarea[id],main select[id]').forEach(el=>{
   if(el.type==='file'||el.id==='photos')return;
   values[el.id]={value:el.value,checked:!!el.checked,type:el.type||el.tagName.toLowerCase(),dataset:{...el.dataset}};
 });
 return values;
}
function hasData(){
 return ['notes','owner','address','cadCommune','cadParcel','surfaceHab'].some(id=>String($('#'+id)?.value||'').trim())||!!document.querySelector('#facts .surfaceEditor,#facts .proRow,#photoManager .photoManageCard');
}
function captureFactsHTML(){
 const facts=$('#facts');if(!facts)return '';
 const clone=facts.cloneNode(true),original=[...facts.querySelectorAll('input,textarea,select')];
 clone.querySelectorAll('input,textarea,select').forEach((el,i)=>{const from=original[i];if(el.tagName==='SELECT'){[...el.options].forEach(o=>{if(o.value===from.value)o.setAttribute('selected','');else o.removeAttribute('selected')})}else if(el.tagName==='TEXTAREA')el.textContent=from.value;else el.setAttribute('value',from.value)});
 return clone.innerHTML;
}
function capture(){
 return {
  id:currentId||makeId(),updated:new Date().toISOString(),values:allValues(),
  html:{
   estimationResults:$('#estimationResults')?.innerHTML||'',estimationDataset:{...($('#estimationResults')?.dataset||{})},estimationStatus:$('#estimationStatus')?.textContent||'',
   facts:captureFactsHTML(),dictationHistory:$('#dictationHistory')?.innerHTML||'',
   cadPlan:document.getElementById('cadPlanBox')?.outerHTML||'',gallery:$('#gallery')?.innerHTML||''
  },
  text:{
   cadStatus:$('#cadStatus')?.textContent||'',addressStatus:$('#addressStatus')?.textContent||'',
   recordStatus:$('#recordStatus')?.textContent||'',photoStatus:$('#photoStatus')?.textContent||''
  }
 };
}
function valueOf(d,id){const x=d.values?.[id];return typeof x==='object'?(x.value||''):(x||'')}
function label(d){return valueOf(d,'owner').trim()||valueOf(d,'address').trim()||valueOf(d,'cadCommune').trim()||'Dossier sans titre'}
async function saveNow(show=false){
 if(restoring||!hasData())return;
 const sequence=++saveSequence,d=capture();currentId=d.id;try{d.photos=await window.estimiaPhotosForSave?.()||[];if(restoring||currentId!==d.id||sequence!==saveSequence)return false;await writeCases(a=>{const i=a.findIndex(x=>x.id===d.id);if(i>=0)a[i]=d;else a.unshift(d);return a});if(currentId!==d.id)return false;renderList();void storageStatus();
 if(show&&$('#saveStatus'))$('#saveStatus').textContent='✓ Dossier complet enregistré sur cet appareil';if($('#localSaveStatus'))$('#localSaveStatus').textContent='Brouillon sauvegardé sur cet appareil à '+new Date().toLocaleTimeString('fr-FR');return true;}catch(e){if($('#localSaveStatus'))$('#localSaveStatus').textContent='Échec de sauvegarde locale : exportez une sauvegarde complète sur fichier.';if($('#saveStatus'))$('#saveStatus').textContent='Enregistrement impossible : stockage de cet appareil plein ou indisponible. Le dernier dossier enregistré est conservé. Exporte les documents et libère de l’espace avant de réessayer.';return false;}
}
function schedule(){if(restoring)return;clearTimeout(timer);if(hasData()&&$('#localSaveStatus'))$('#localSaveStatus').textContent='Modifications en cours de sauvegarde sur cet appareil…';timer=setTimeout(()=>saveNow(false),650)}
function removePlan(){document.getElementById('cadPlanBox')?.remove()}
async function restore(d){
 const token=++restoreToken;++saveSequence;clearTimeout(timer);restoring=true;window.estimiaRestoringCase=true;
 try{await writeQueue.catch(()=>{});d=await resolvePhotos(readCases().find(x=>x.id===d.id)||d);}catch(e){if(token===restoreToken){restoring=false;window.estimiaRestoringCase=false;$('#saveStatus').textContent='Ouverture interrompue : '+e.message;}return;}if(token!==restoreToken)return;
 restoring=true;window.estimiaRestoringCase=true;clearTimeout(timer);currentId=d.id;
 for(const id of ['estQualityMode','estQualityRate','estWorkBudget','estOtherAdjustment','estQualityReason']){const e=document.getElementById(id);if(e){e.value=id==='estQualityMode'?'etat':'';for(const k of Object.keys(e.dataset))delete e.dataset[k];}}
 document.querySelectorAll('main input[id],main textarea[id],main select[id]').forEach(el=>{
  if(el.type==='file'||el.id==='photos')return;
  for(const k of Object.keys(el.dataset))delete el.dataset[k];
  const x=d.values?.[el.id]; if(x==null){el.value=el.tagName==='SELECT'?(el.options[0]?.value||''):(el.defaultValue||'');el.checked=el.defaultChecked||false;return;}
  const o=typeof x==='object'?x:{value:x};
  el.value=o.value??'';if('checked'in o)el.checked=!!o.checked;
  if(o.dataset)Object.entries(o.dataset).forEach(([k,v])=>el.dataset[k]=v);
 });
 if($('#facts'))$('#facts').innerHTML=d.html?.facts||d.factsHTML||'<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>';
 if($('#dictationHistory'))$('#dictationHistory').innerHTML=d.html?.dictationHistory||'';
 if($('#gallery')&&d.html?.gallery)$('#gallery').innerHTML=d.html.gallery;
 if($('#cadStatus'))$('#cadStatus').textContent=d.text?.cadStatus||d.cadStatus||'';
 if($('#addressStatus'))$('#addressStatus').textContent=d.text?.addressStatus||d.addressStatus||'';
 if($('#recordStatus'))$('#recordStatus').textContent=d.text?.recordStatus||'';
 if($('#photoStatus'))$('#photoStatus').textContent=d.text?.photoStatus||'';
 removePlan();const plan=d.html?.cadPlan||d.cadPlanHTML||'';
 if(plan){const host=$('.cadastreBox');if(host)host.insertAdjacentHTML('beforeend',plan)}
 document.dispatchEvent(new Event('estimia:surfaces-restored'));document.dispatchEvent(new Event('estimia:dictations-restored'));document.dispatchEvent(new Event('estimia:emails-restored'));document.dispatchEvent(new Event('estimia:contacts-restored'));document.querySelector('#type')?.dispatchEvent(new Event('input',{bubbles:true}));const result=$('#estimationResults');if(result){result.innerHTML=d.html?.estimationResults||'';for(const key of Object.keys(result.dataset))delete result.dataset[key];Object.assign(result.dataset,d.html?.estimationDataset||{});}
 // La notification du type invalide les anciens résultats : restaurer les montants après elle.
 for(const id of ['validatedPrice','validatedReason']){const val=d.values?.[id];if($("#"+id))$("#"+id).value=typeof val==='object'?val.value||'':val||'';}
 if($('#estimationStatus'))$('#estimationStatus').textContent=d.html?.estimationStatus||'';
 document.dispatchEvent(new Event('estimia:estimation-restored'));
 document.dispatchEvent(new CustomEvent('estimia:photos-restored',{detail:d.photos||[]}));restoring=false;window.estimiaRestoringCase=false;document.dispatchEvent(new Event('estimia:case-ready'));document.dispatchEvent(new Event('estimia:parcels-restored'));renderList();closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
}
function clearForm(){
 ++restoreToken;++saveSequence;restoring=true;window.estimiaRestoringCase=true;clearTimeout(timer);currentId=null;
 document.querySelectorAll('main input[id],main textarea[id],main select[id]').forEach(el=>{if(el.type!=='file'){el.value='';for(const k of Object.keys(el.dataset))delete el.dataset[k];if(el.type==='checkbox'||el.type==='radio')el.checked=false}});
 $('#type')?.dispatchEvent(new Event('input',{bubbles:true}));if($('#estQualityMode'))$('#estQualityMode').value='etat';
 ['facts','dictationHistory','gallery'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=id==='facts'?'<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>':''});
 ['cadStatus','addressStatus','recordStatus','photoStatus','saveStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=''});
 removePlan();document.dispatchEvent(new CustomEvent('estimia:photos-restored',{detail:[]}));restoring=false;window.estimiaRestoringCase=false;document.dispatchEvent(new Event('estimia:case-ready'));document.dispatchEvent(new Event('estimia:surfaces-restored'));document.dispatchEvent(new Event('estimia:dictations-restored'));document.dispatchEvent(new Event('estimia:contacts-restored'));document.dispatchEvent(new Event('estimia:parcels-restored'));renderList();closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
}
async function newCase(){if(hasData()&&(await saveNow(false))===false)return;if(hasData()&&!confirm('Créer un nouveau dossier ? La fiche actuelle est enregistrée.'))return;clearForm()}
async function deleteCase(id){const d=readCases().find(x=>x.id===id);if(!confirm('Supprimer définitivement le dossier « '+(d?label(d):'')+' » de cet appareil ?'))return;try{++saveSequence;clearTimeout(timer);await writeCases(a=>a.filter(x=>x.id!==id));if(currentId===id)clearForm();else renderList();void storageStatus();}catch(e){$('#saveStatus').textContent='Suppression impossible : '+e.message;}}
function renderList(){
 const box=$('#caseList');if(!box)return;const q=($('#caseSearch')?.value||'').trim().toLowerCase();
 const a=readCases().filter(d=>[valueOf(d,'owner'),valueOf(d,'address'),valueOf(d,'cadCommune')].join(' ').toLowerCase().includes(q)).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 box.innerHTML='';if(!a.length){box.innerHTML='<div class="caseEmpty">Aucun dossier enregistré.</div>';return}
 a.forEach(d=>{const el=document.createElement('div');el.className='caseItem'+(d.id===currentId?' active':'');
  const title=document.createElement('div');title.className='caseTitle';title.textContent=label(d);
  const adr=document.createElement('div');adr.className='caseAddress';adr.textContent=[valueOf(d,'address'),valueOf(d,'cadCommune')].filter(Boolean).join(' — ');
  const date=document.createElement('div');date.className='caseDate';date.textContent='Modifié le '+new Date(d.updated).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
  const acts=document.createElement('div');acts.className='caseActions';const del=document.createElement('button');del.type='button';del.className='caseDelete';del.textContent='Supprimer';del.onclick=e=>{e.stopPropagation();deleteCase(d.id)};
  acts.appendChild(del);el.append(title,adr,date,acts);el.onclick=async()=>{if(await saveNow(false)===false)return;await restore(d);};box.appendChild(el);
 });
}
function openDrawer(){$('#caseSidebar')?.classList.add('open')}function closeDrawer(){$('#caseSidebar')?.classList.remove('open')}
// Sauvegarde JSON complète sur fichier, sans appel réseau.
function backupCleanHTML(value){const t=document.createElement('template');t.innerHTML=String(value||'');t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,base,foreignObject').forEach(e=>e.remove());for(const el of t.content.querySelectorAll('*'))for(const attr of [...el.attributes]){const name=attr.name.toLowerCase(),v=attr.value.trim();if(name.startsWith('on')||name==='srcdoc'||name==='style'||name==='formaction'||name==='action'||(name==='href'&&!/^https:\/\//i.test(v))||((name==='src'||name==='xlink:href')&&!/^data:image\/(png|jpeg|webp);base64,/i.test(v)))el.removeAttribute(attr.name);}return t.innerHTML;}
function validateBackupCase(raw){if(!raw||typeof raw!=='object'||!raw.values||typeof raw.values!=='object')throw Error('Dossier invalide dans le fichier.');const d=JSON.parse(JSON.stringify(raw)),allowed=new Set([...document.querySelectorAll('main input[id],main textarea[id],main select[id]')].map(e=>e.id));d.values=Object.fromEntries(Object.entries(d.values).filter(([key,v])=>allowed.has(key)&&v&&typeof v==='object'&&typeof v.value==='string'));d.html=d.html&&typeof d.html==='object'?d.html:{};for(const key of ['facts','dictationHistory','cadPlan','gallery','estimationResults'])d.html[key]=backupCleanHTML(d.html[key]);d.photos=Array.isArray(d.photos)?d.photos:[];if(d.photos.length>60)throw Error('Trop de photos dans un dossier.');for(const photo of d.photos){const src=photo.data||photo.url||'';if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(src)||src.length>28000000)throw Error('Photo de sauvegarde invalide.');}d.importedFrom=String(d.id||'');d.id=makeId()+'-'+Math.random().toString(36).slice(2,8);return d;}
async function exportBackup(){const status=$('#backupStatus');try{clearTimeout(timer);const fresh=capture();fresh.photos=await window.estimiaPhotosForSave?.()||[];await writeQueue.catch(()=>{});const dossiers=await Promise.all(readCases().filter(d=>d.id!==fresh.id).map(resolvePhotos));if(hasData())dossiers.unshift(fresh);if(!dossiers.length)throw Error('Aucun dossier à sauvegarder.');const blob=new Blob([JSON.stringify({format:'ESTIMIA_BACKUP',version:1,created:new Date().toISOString(),dossiers})],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ESTIMIA_sauvegarde_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=dossiers.length+' dossier(s), photos et historique inclus : fichier téléchargé. Conservez-le dans un emplacement protégé.';}catch(e){status.textContent='Sauvegarde fichier impossible : '+e.message;}}
async function importBackup(file){const status=$('#backupStatus');if(!file)return;try{if(file.size>100*1024*1024)throw Error('Fichier trop volumineux (100 Mo maximum).');const data=JSON.parse(await file.text());if(data.format!=='ESTIMIA_BACKUP'||data.version!==1||!Array.isArray(data.dossiers)||data.dossiers.length>500)throw Error('Format de sauvegarde non reconnu.');const imported=data.dossiers.map(validateBackupCase);if(!imported.length)throw Error('Sauvegarde vide.');if(!confirm('Importer '+imported.length+' dossier(s) comme copies sur cet appareil ? Les dossiers existants restent conservés.'))return;await writeCases(a=>[...imported,...a]);renderList();void storageStatus();status.textContent=imported.length+' dossier(s) importé(s), photos et historique inclus. Ouvrez un dossier dans la liste.';}catch(e){status.textContent='Import impossible ; les dossiers existants restent conservés : '+e.message;}}

document.addEventListener('DOMContentLoaded',async()=>{
 try{if(readCases().some(d=>d.photos?.length))await writeCases(readCases());await storageStatus();}catch(e){$('#localSaveStatus').textContent='Migration photos non terminée : ancienne sauvegarde conservée. '+e.message;}

 $('#exportCaseBackup')?.addEventListener('click',exportBackup);$('#importCaseBackup')?.addEventListener('change',e=>{void importBackup(e.target.files?.[0]);e.target.value='';});
 $('#caseOpen')?.addEventListener('click',openDrawer);$('#caseClose')?.addEventListener('click',closeDrawer);$('#caseNew')?.addEventListener('click',newCase);$('#caseSearch')?.addEventListener('input',renderList);
 $('#save')?.addEventListener('click',()=>setTimeout(()=>saveNow(true),50));
 document.addEventListener('click',e=>{if(e.composedPath().some(n=>n?.id==='photoManager')&&e.composedPath().some(n=>n?.tagName==='BUTTON'))schedule()});
 document.addEventListener('input',e=>{if(!e.target.closest('#caseSidebar'))schedule()});document.addEventListener('change',e=>{if(!e.target.closest('#caseSidebar'))schedule()});
 ['analyse','findParcel','checkAddress'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(schedule,id==='findParcel'?1300:350)));
 const facts=$('#facts');if(facts)new MutationObserver(schedule).observe(facts,{subtree:true,childList:true,characterData:true});
 const cad=$('.cadastreBox');if(cad)new MutationObserver(schedule).observe(cad,{subtree:true,childList:true,attributes:true});
 renderList();
 $('#requestPhotoPersistence')?.addEventListener('click',async()=>{const granted=await navigator.storage?.persist?.().catch(()=>false);$('#photoStorageStatus').textContent=granted?'Conservation persistante accordée par le navigateur. Conservez aussi une sauvegarde fichier.':'Conservation persistante non accordée ; sauvegarde sur fichier recommandée.';});
});
})();