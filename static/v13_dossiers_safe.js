
(()=>{'use strict';
const KEY='estimia_dossiers_v1314';
const $=s=>document.querySelector(s);
const all=s=>Array.from(document.querySelectorAll(s));
let currentId=null, saveTimer=null, loading=false;

function loadAll(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function putAll(a){localStorage.setItem(KEY,JSON.stringify(a))}
function val(id){const e=document.getElementById(id);return e?e.value:''}
function txt(id){const e=document.getElementById(id);return e?e.innerHTML:''}
function setVal(id,v){const e=document.getElementById(id);if(e)e.value=v??''}
function setHtml(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v??''}

const fieldIds=[
 'owner','ownerPhone','address','cadCommune','cadSection','cadParcel','type',
 'surface','surfaceHabitable','surfaceCarrez','notes','rawText','dictation'
];

function snapshot(){
 const fields={}; fieldIds.forEach(id=>{const e=document.getElementById(id);if(e)fields[id]=e.value});
 return {
  id:currentId||('D'+Date.now()), updated:new Date().toISOString(), fields,
  facts:txt('facts'),
  cadStatus:$('#cadStatus')?.textContent||'',
  addressStatus:$('#addressStatus')?.textContent||'',
  cadPlan:$('#cadPlan')?.innerHTML||''
 };
}
function titleOf(d){
 const f=d.fields||{}, owner=f.owner||'Sans propriétaire', city=f.cadCommune||'';
 return owner+(city?' — '+city:'');
}
function subOf(d){const f=d.fields||{};return [f.address,f.cadCommune,new Date(d.updated).toLocaleDateString('fr-FR')].filter(Boolean).join(' • ')}

function saveNow(){
 if(loading)return;
 const d=snapshot(); currentId=d.id;
 let a=loadAll(),i=a.findIndex(x=>x.id===d.id);
 if(i>=0)a[i]=d;else a.unshift(d);
 putAll(a); render();
}
function schedule(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,500)}

function restore(d){
 loading=true; currentId=d.id;
 const f=d.fields||{}; Object.keys(f).forEach(id=>setVal(id,f[id]));
 setHtml('facts',d.facts||'');
 const cs=$('#cadStatus');if(cs)cs.textContent=d.cadStatus||'';
 const as=$('#addressStatus');if(as)as.textContent=d.addressStatus||'';
 const cp=$('#cadPlan');if(cp)cp.innerHTML=d.cadPlan||'';
 // Notify the existing V13.12 UI without invoking/replacing its business logic.
 all('input,textarea,select').forEach(e=>{if(Object.prototype.hasOwnProperty.call(f,e.id))e.dispatchEvent(new Event('change',{bubbles:true}))});
 loading=false; render(); closeDrawer();
}
function clearExistingForm(){
 loading=true; currentId='D'+Date.now();
 all('input,textarea').forEach(e=>{
   if(e.id!=='dossiersSearch' && !['button','submit'].includes(e.type)) e.value='';
 });
 all('select').forEach(e=>e.selectedIndex=0);
 setHtml('facts','');
 const cp=$('#cadPlan');if(cp)cp.innerHTML='';
 const cs=$('#cadStatus');if(cs)cs.textContent='';
 const as=$('#addressStatus');if(as)as.textContent='';
 loading=false; saveNow(); closeDrawer();
}
function del(id){
 if(!confirm('Supprimer définitivement ce dossier de cet appareil ?'))return;
 let a=loadAll().filter(x=>x.id!==id);putAll(a);
 if(currentId===id)currentId=null;render();
}
function render(){
 const box=$('#dossiersList');if(!box)return;
 const q=($('#dossiersSearch')?.value||'').toLowerCase();
 const a=loadAll().filter(d=>JSON.stringify(d.fields||{}).toLowerCase().includes(q));
 box.innerHTML='';
 a.forEach(d=>{
   const el=document.createElement('div');el.className='dossierItem';
   el.innerHTML='<div class="dossierTitle"></div><div class="dossierSub"></div><div class="dossierActions"><button type="button" class="open">Ouvrir</button><button type="button" class="delete">Supprimer</button></div>';
   el.querySelector('.dossierTitle').textContent=titleOf(d);
   el.querySelector('.dossierSub').textContent=subOf(d);
   el.querySelector('.open').onclick=e=>{e.stopPropagation();restore(d)};
   el.querySelector('.delete').onclick=e=>{e.stopPropagation();del(d.id)};
   el.onclick=()=>restore(d);box.appendChild(el);
 });
}
function openDrawer(){$('#dossiersDrawer')?.classList.add('open')}
function closeDrawer(){$('#dossiersDrawer')?.classList.remove('open')}

document.addEventListener('DOMContentLoaded',()=>{
 $('#openDossiers')?.addEventListener('click',openDrawer);
 $('#closeDossiers')?.addEventListener('click',closeDrawer);
 $('#newLocalDossier')?.addEventListener('click',()=>{if(confirm('Créer un nouveau dossier ? La fiche actuelle est sauvegardée.')){saveNow();clearExistingForm()}});
 $('#dossiersSearch')?.addEventListener('input',render);
 // Autosave by observation only. No existing V13.12 listener is removed/replaced.
 document.addEventListener('input',e=>{if(!e.target.closest('#dossiersDrawer'))schedule()});
 document.addEventListener('change',e=>{if(!e.target.closest('#dossiersDrawer'))schedule()});
 const facts=$('#facts');if(facts)new MutationObserver(schedule).observe(facts,{subtree:true,childList:true,characterData:true});
 const plan=$('#cadPlan');if(plan)new MutationObserver(schedule).observe(plan,{subtree:true,childList:true,attributes:true});
 render();
});
})();
