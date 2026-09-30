// ESTIM'IA V13.13 — gestion locale persistante des dossiers (IndexedDB).
// N'altère ni le micro, ni l'analyse, ni les surfaces, ni le cadastre, ni les exports.
(function(){
'use strict';
const $=s=>document.querySelector(s);
const DB='estimia_local_v1', STORE='dossiers';
let db=null,currentId=null,loadedPhotos=[],photoUrls=[],saveTimer=null;
const fields=['owner','ownerPhone','address','cadCommune','cadSection','cadParcel','type','surfaceHab','surfaceCarrez','notes','correction'];
const val=id=>document.getElementById(id)?.value||'';
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('updated','updated')}};r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error)})}
function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function getAll(){return new Promise((res,rej)=>{const r=tx().getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function getOne(id){return new Promise((res,rej)=>{const r=tx().get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(x){return new Promise((res,rej)=>{const r=tx('readwrite').put(x);r.onsuccess=()=>res(x);r.onerror=()=>rej(r.error)})}
function del(id){return new Promise((res,rej)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function uuid(){return crypto.randomUUID?crypto.randomUUID():'D-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
function titleOf(d){return d.owner||d.address||'Dossier sans nom'}
function subOf(d){return [d.address,d.commune].filter(Boolean).join(' · ')||'Adresse non renseignée'}
function fmtDate(x){try{return new Date(x).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch{return ''}}
async function filesFromInput(){const arr=[];for(const f of ($('#photos')?.files||[])){arr.push({name:f.name,type:f.type,lastModified:f.lastModified,blob:f})}return arr}
function collectBase(){const d={id:currentId||uuid(),created:Date.now(),updated:Date.now()};for(const id of fields)d[id]=val(id);const cc=$('#cadCommune');d.commune=val('cadCommune');d.insee=cc?.dataset.insee||'';d.postcode=cc?.dataset.postcode||'';d.facts=$('#facts')?.innerHTML||'';d.history=$('#dictationHistory')?.innerHTML||'';d.addressStatus=$('#addressStatus')?.textContent||'';d.cadStatus=$('#cadStatus')?.textContent||'';d.cadMap=$('#cadPlanBox img')?.src||'';return d}
async function saveCurrent(show=true){
 const base=collectBase();const old=currentId?await getOne(currentId):null;if(old?.created)base.created=old.created;
 const fresh=await filesFromInput();base.photos=[...(loadedPhotos||[]),...fresh];
 // dédoublonnage simple nom/taille/date
 const seen=new Set();base.photos=base.photos.filter(p=>{const k=[p.name,p.blob?.size||0,p.lastModified||0].join('|');if(seen.has(k))return false;seen.add(k);return true});
 await put(base);currentId=base.id;loadedPhotos=base.photos;document.body.dataset.dossierId=currentId;
 if(show){const s=$('#saveStatus');if(s)s.textContent='✓ Dossier sauvegardé sur cet appareil';}
 await refreshList();return base;
}
function revokePhotos(){photoUrls.forEach(URL.revokeObjectURL);photoUrls=[]}
function showStoredPhotos(photos){
 revokePhotos();const g=$('#gallery');if(!g)return;g.innerHTML='';
 for(const p of photos||[]){if(!p.blob)continue;const u=URL.createObjectURL(p.blob);photoUrls.push(u);const box=document.createElement('div');box.className='savedPhoto';box.innerHTML=`<img alt="${esc(p.name)}"><small>${esc(p.name)}</small>`;box.querySelector('img').src=u;g.appendChild(box)}
 const st=$('#photoStatus');if(st&&photos?.length)st.textContent=`${photos.length} photo(s) sauvegardée(s) dans ce dossier.`;
}
function clearForm(){
 currentId=null;loadedPhotos=[];revokePhotos();document.body.dataset.dossierId='';
 for(const id of fields){const e=document.getElementById(id);if(e)e.value=''}
 const cc=$('#cadCommune');if(cc){delete cc.dataset.insee;delete cc.dataset.postcode}
 const facts=$('#facts');if(facts)facts.innerHTML='<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>';
 ['addressStatus','cadStatus','saveStatus','recordStatus','photoStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=''});
 const hist=$('#dictationHistory');if(hist)hist.innerHTML='';const plan=$('#cadPlanBox');if(plan)plan.remove();const g=$('#gallery');if(g)g.innerHTML='';const p=$('#photos');if(p)p.value='';
 updateCurrentLabel();
}
async function loadDossier(id){
 const d=await getOne(id);if(!d)return;currentId=id;loadedPhotos=d.photos||[];document.body.dataset.dossierId=id;
 for(const fid of fields){const e=document.getElementById(fid);if(e)e.value=d[fid]||''}
 const cc=$('#cadCommune');if(cc){cc.dataset.insee=d.insee||'';cc.dataset.postcode=d.postcode||''}
 if($('#facts'))$('#facts').innerHTML=d.facts||'<div class="empty">Aucune analyse sauvegardée.</div>';
 if($('#dictationHistory'))$('#dictationHistory').innerHTML=d.history||'';
 if($('#addressStatus'))$('#addressStatus').textContent=d.addressStatus||'';if($('#cadStatus'))$('#cadStatus').textContent=d.cadStatus||'';
 if(d.cadMap){let box=$('#cadPlanBox');if(!box){box=document.createElement('div');box.id='cadPlanBox';$('#cadStatus')?.insertAdjacentElement('afterend',box)}if(box)box.innerHTML=`<div><b>Plan cadastral sauvegardé</b></div><img data-cad-map="1" src="${esc(d.cadMap)}" style="display:block;width:100%;max-width:720px;max-height:460px;object-fit:contain;margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#fff">`}
 showStoredPhotos(loadedPhotos);updateCurrentLabel();closeMobile();window.scrollTo({top:0,behavior:'smooth'});
}
async function removeDossier(id){const d=await getOne(id);if(!d)return;if(!confirm(`Supprimer définitivement le dossier « ${titleOf(d)} » ?`))return;await del(id);if(currentId===id)clearForm();await refreshList()}
async function refreshList(){
 const q=($('#dossierSearch')?.value||'').trim().toLowerCase();let rows=await getAll();rows.sort((a,b)=>(b.updated||0)-(a.updated||0));if(q)rows=rows.filter(d=>[d.owner,d.address,d.commune,d.ownerPhone].join(' ').toLowerCase().includes(q));
 const box=$('#dossierList');if(!box)return;box.innerHTML=rows.length?'':'<div class="noDossier">Aucun dossier enregistré sur cet appareil.</div>';
 for(const d of rows){const el=document.createElement('div');el.className='dossierItem'+(d.id===currentId?' active':'');el.innerHTML=`<button class="openDossier" type="button"><b>${esc(titleOf(d))}</b><span>${esc(subOf(d))}</span><small>Modifié ${esc(fmtDate(d.updated))}</small></button><button class="deleteDossier" title="Supprimer" type="button">🗑️</button>`;el.querySelector('.openDossier').onclick=()=>loadDossier(d.id);el.querySelector('.deleteDossier').onclick=()=>removeDossier(d.id);box.appendChild(el)}
 updateCurrentLabel();
}
function updateCurrentLabel(){const e=$('#currentDossier');if(!e)return;e.textContent=currentId?'Dossier ouvert — modifications sauvegardées automatiquement':'Nouveau dossier non enregistré'}
function scheduleAutosave(){if(!currentId)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveCurrent(false).catch(()=>{}),700)}
function closeMobile(){document.body.classList.remove('dossiersOpen')}
function buildUI(){
 const aside=document.createElement('aside');aside.id='dossierSidebar';aside.innerHTML=`<div class="dossierSideHead"><div><b>MES DOSSIERS</b><small id="currentDossier"></small></div><button id="closeDossiers" type="button">×</button></div><button id="sideNew" class="sideNew" type="button">＋ Nouveau dossier</button><input id="dossierSearch" type="search" placeholder="Rechercher nom, adresse, commune…"><div id="dossierList"></div><div class="localNotice">Sauvegarde locale sur cet appareil</div>`;document.body.prepend(aside);
 const toggle=document.createElement('button');toggle.id='toggleDossiers';toggle.type='button';toggle.textContent='☰ Mes dossiers';document.body.appendChild(toggle);
 $('#toggleDossiers').onclick=()=>document.body.classList.toggle('dossiersOpen');$('#closeDossiers').onclick=closeMobile;$('#dossierSearch').oninput=refreshList;
 $('#sideNew').onclick=()=>{if(currentId && !confirm('Créer un nouveau dossier ? Les modifications du dossier ouvert sont sauvegardées automatiquement.'))return;clearForm();closeMobile()};
}
async function init(){
 buildUI();try{await openDB()}catch(e){$('#dossierList').innerHTML='<div class="noDossier">Stockage local indisponible.</div>';return}
 // Remplace uniquement l'action Enregistrer/Nouveau par la sauvegarde locale durable.
 const save=$('#save');if(save)save.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveCurrent(true)},true);
 const nw=$('#new');if(nw)nw.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(currentId&&!confirm('Créer un nouveau dossier ?'))return;clearForm()},true);
 document.addEventListener('input',e=>{if(e.target.matches('input,textarea'))scheduleAutosave()});document.addEventListener('change',e=>{if(e.target.id==='photos')scheduleAutosave()});
 // Les transformations IA/cadastre changent le DOM sans événement input : sauvegarde après clic si dossier ouvert.
 ['analyse','findParcel','checkAddress'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(scheduleAutosave,1200)));
 await refreshList();updateCurrentLabel();
}
document.addEventListener('DOMContentLoaded',init);
})();
