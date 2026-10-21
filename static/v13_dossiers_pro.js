(()=>{'use strict';
const STORE='estimia_cases_v1327';
const OLD_STORES=['estimia_cases_v1318','estimia_cases_v1317','estimia_cases_v1316','estimia_cases_v1315'];
const $=s=>document.querySelector(s);
let currentId=null,restoring=false,timer=null;

function readCases(){
 try{
  let x=JSON.parse(localStorage.getItem(STORE)||'null');
  if(Array.isArray(x))return x;
  for(const k of OLD_STORES){const old=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(old)&&old.length){localStorage.setItem(STORE,JSON.stringify(old));return old}}
 }catch(e){}
 return [];
}
function writeCases(x){localStorage.setItem(STORE,JSON.stringify(x))}
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
 return [...document.querySelectorAll('main input[id],main textarea[id],main select[id]')].some(el=>el.type!=='file'&&String(el.value||'').trim()) ||
   ($('#facts')?.innerText||'').trim().length>20;
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
function saveNow(show=false){
 if(restoring||!hasData())return;
 const d=capture();currentId=d.id;const a=readCases(),i=a.findIndex(x=>x.id===d.id);
 if(i>=0)a[i]=d;else a.unshift(d);writeCases(a);renderList();
 if(show&&$('#saveStatus'))$('#saveStatus').textContent='✓ Dossier complet enregistré sur cet appareil';
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>saveNow(false),650)}
function removePlan(){document.getElementById('cadPlanBox')?.remove()}
function restore(d){
 restoring=true;currentId=d.id;
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
 restoring=false;document.dispatchEvent(new Event('estimia:parcels-restored'));renderList();closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
}
function clearForm(){
 restoring=true;currentId=null;
 document.querySelectorAll('main input[id],main textarea[id],main select[id]').forEach(el=>{if(el.type!=='file'){el.value='';for(const k of Object.keys(el.dataset))delete el.dataset[k];if(el.type==='checkbox'||el.type==='radio')el.checked=false}});
 $('#type')?.dispatchEvent(new Event('input',{bubbles:true}));if($('#estQualityMode'))$('#estQualityMode').value='etat';
 ['facts','dictationHistory','gallery'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=id==='facts'?'<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>':''});
 ['cadStatus','addressStatus','recordStatus','photoStatus','saveStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=''});
 removePlan();restoring=false;document.dispatchEvent(new Event('estimia:surfaces-restored'));document.dispatchEvent(new Event('estimia:dictations-restored'));document.dispatchEvent(new Event('estimia:contacts-restored'));document.dispatchEvent(new Event('estimia:parcels-restored'));renderList();closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
}
function newCase(){if(hasData())saveNow(false);if(hasData()&&!confirm('Créer un nouveau dossier ? La fiche actuelle est enregistrée.'))return;clearForm()}
function deleteCase(id){const d=readCases().find(x=>x.id===id);if(!confirm('Supprimer définitivement le dossier « '+(d?label(d):'')+' » de cet appareil ?'))return;writeCases(readCases().filter(x=>x.id!==id));if(currentId===id)clearForm();else renderList()}
function renderList(){
 const box=$('#caseList');if(!box)return;const q=($('#caseSearch')?.value||'').trim().toLowerCase();
 const a=readCases().filter(d=>[valueOf(d,'owner'),valueOf(d,'address'),valueOf(d,'cadCommune')].join(' ').toLowerCase().includes(q)).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 box.innerHTML='';if(!a.length){box.innerHTML='<div class="caseEmpty">Aucun dossier enregistré.</div>';return}
 a.forEach(d=>{const el=document.createElement('div');el.className='caseItem'+(d.id===currentId?' active':'');
  const title=document.createElement('div');title.className='caseTitle';title.textContent=label(d);
  const adr=document.createElement('div');adr.className='caseAddress';adr.textContent=[valueOf(d,'address'),valueOf(d,'cadCommune')].filter(Boolean).join(' — ');
  const date=document.createElement('div');date.className='caseDate';date.textContent='Modifié le '+new Date(d.updated).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
  const acts=document.createElement('div');acts.className='caseActions';const del=document.createElement('button');del.type='button';del.className='caseDelete';del.textContent='Supprimer';del.onclick=e=>{e.stopPropagation();deleteCase(d.id)};
  acts.appendChild(del);el.append(title,adr,date,acts);el.onclick=()=>restore(d);box.appendChild(el);
 });
}
function openDrawer(){$('#caseSidebar')?.classList.add('open')}function closeDrawer(){$('#caseSidebar')?.classList.remove('open')}
document.addEventListener('DOMContentLoaded',()=>{
 $('#caseOpen')?.addEventListener('click',openDrawer);$('#caseClose')?.addEventListener('click',closeDrawer);$('#caseNew')?.addEventListener('click',newCase);$('#caseSearch')?.addEventListener('input',renderList);
 $('#save')?.addEventListener('click',()=>setTimeout(()=>saveNow(true),50));
 document.addEventListener('input',e=>{if(!e.target.closest('#caseSidebar'))schedule()});document.addEventListener('change',e=>{if(!e.target.closest('#caseSidebar'))schedule()});
 ['analyse','findParcel','checkAddress'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(schedule,id==='findParcel'?1300:350)));
 const facts=$('#facts');if(facts)new MutationObserver(schedule).observe(facts,{subtree:true,childList:true,characterData:true});
 const cad=$('.cadastreBox');if(cad)new MutationObserver(schedule).observe(cad,{subtree:true,childList:true,attributes:true});
 renderList();
});
})();