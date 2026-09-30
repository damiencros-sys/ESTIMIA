
(()=>{'use strict';
const STORE='estimia_cases_v1315';
const FORM_IDS=['owner','ownerPhone','address','cadCommune','cadSection','cadParcel','type','surfaceHab','surfaceCarrez','notes','correction'];
const $=s=>document.querySelector(s);
let currentId=null, restoring=false, timer=null;

function readCases(){try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function writeCases(x){localStorage.setItem(STORE,JSON.stringify(x))}
function field(id){return document.getElementById(id)}
function hasMeaningfulData(){
 return FORM_IDS.some(id=>(field(id)?.value||'').trim()) || (($('#facts')?.innerText||'').trim() && !($('#facts')?.querySelector('.empty')));
}
function makeId(){return 'EST-'+Date.now().toString(36).toUpperCase()}
function capture(){
 const values={}; FORM_IDS.forEach(id=>{if(field(id))values[id]=field(id).value});
 return {
   id:currentId||makeId(), updated:new Date().toISOString(), values,
   factsHTML:$('#facts')?.innerHTML||'',
   cadStatus:$('#cadStatus')?.textContent||'',
   addressStatus:$('#addressStatus')?.textContent||'',
   cadPlanHTML:document.getElementById('cadPlanBox')?.outerHTML||''
 };
}
function label(d){
 const v=d.values||{};
 const owner=(v.owner||'').trim(), addr=(v.address||'').trim(), city=(v.cadCommune||'').trim();
 return owner || addr || city || 'Dossier sans titre';
}
function saveNow(){
 if(restoring || !hasMeaningfulData()) return;
 const d=capture(); currentId=d.id;
 const a=readCases(), i=a.findIndex(x=>x.id===d.id);
 if(i>=0)a[i]=d; else a.unshift(d);
 writeCases(a); renderList();
}
function schedule(){clearTimeout(timer);timer=setTimeout(saveNow,450)}
function removePlan(){document.getElementById('cadPlanBox')?.remove()}
function restore(d){
 restoring=true; currentId=d.id;
 FORM_IDS.forEach(id=>{if(field(id))field(id).value=(d.values||{})[id]||''});
 if($('#facts')) $('#facts').innerHTML=d.factsHTML||'<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>';
 if($('#cadStatus')) $('#cadStatus').textContent=d.cadStatus||'';
 if($('#addressStatus')) $('#addressStatus').textContent=d.addressStatus||'';
 removePlan();
 if(d.cadPlanHTML){
   const host=$('.cadastreBox');
   if(host) host.insertAdjacentHTML('beforeend',d.cadPlanHTML);
 }
 restoring=false; renderList(); closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}
function clearForm(){
 restoring=true; currentId=null;
 FORM_IDS.forEach(id=>{if(field(id))field(id).value=''});
 if($('#facts')) $('#facts').innerHTML='<div class="empty">Dicte ta visite puis touche « Transformer en fiche ».</div>';
 if($('#cadStatus')) $('#cadStatus').textContent='';
 if($('#addressStatus')) $('#addressStatus').textContent='';
 if($('#saveStatus')) $('#saveStatus').textContent='';
 removePlan();
 const gallery=$('#gallery'); if(gallery)gallery.innerHTML='';
 const photoStatus=$('#photoStatus');if(photoStatus)photoStatus.textContent='';
 restoring=false; renderList(); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}
function newCase(){
 if(hasMeaningfulData()) saveNow();
 if(hasMeaningfulData() && !confirm('Créer un nouveau dossier ? La fiche actuelle est sauvegardée.')) return;
 clearForm();
}
function deleteCase(id){
 const d=readCases().find(x=>x.id===id);
 if(!confirm('Supprimer définitivement le dossier « '+(d?label(d):'')+' » de cet appareil ?')) return;
 writeCases(readCases().filter(x=>x.id!==id));
 if(currentId===id) clearForm(); else renderList();
}
function renderList(){
 const box=$('#caseList'); if(!box)return;
 const q=($('#caseSearch')?.value||'').trim().toLowerCase();
 const a=readCases().filter(d=>{
   const v=d.values||{};
   return [v.owner,v.address,v.cadCommune].join(' ').toLowerCase().includes(q);
 }).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 box.innerHTML='';
 if(!a.length){box.innerHTML='<div class="caseEmpty">Aucun dossier enregistré.</div>';return}
 a.forEach(d=>{
   const el=document.createElement('div');el.className='caseItem'+(d.id===currentId?' active':'');
   const v=d.values||{};
   const title=document.createElement('div');title.className='caseTitle';title.textContent=label(d);
   const adr=document.createElement('div');adr.className='caseAddress';adr.textContent=[v.address,v.cadCommune].filter(Boolean).join(' — ');
   const date=document.createElement('div');date.className='caseDate';date.textContent='Modifié le '+new Date(d.updated).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
   const acts=document.createElement('div');acts.className='caseActions';
   const del=document.createElement('button');del.type='button';del.className='caseDelete';del.textContent='Supprimer';
   del.onclick=e=>{e.stopPropagation();deleteCase(d.id)};
   acts.appendChild(del); el.append(title,adr,date,acts); el.onclick=()=>restore(d); box.appendChild(el);
 });
}
function openDrawer(){$('#caseSidebar')?.classList.add('open')}
function closeDrawer(){$('#caseSidebar')?.classList.remove('open')}

document.addEventListener('DOMContentLoaded',()=>{
 $('#caseOpen')?.addEventListener('click',openDrawer);
 $('#caseClose')?.addEventListener('click',closeDrawer);
 $('#caseNew')?.addEventListener('click',newCase);
 $('#caseSearch')?.addEventListener('input',renderList);

 // Observe only; never replace existing V13.12 event handlers.
 document.addEventListener('input',e=>{if(!e.target.closest('#caseSidebar'))schedule()});
 document.addEventListener('change',e=>{if(!e.target.closest('#caseSidebar'))schedule()});
 $('#analyse')?.addEventListener('click',()=>setTimeout(schedule,250));
 $('#findParcel')?.addEventListener('click',()=>setTimeout(schedule,1200));
 $('#checkAddress')?.addEventListener('click',()=>setTimeout(schedule,1000));

 const facts=$('#facts');
 if(facts)new MutationObserver(schedule).observe(facts,{subtree:true,childList:true,characterData:true});
 const cad=$('.cadastreBox');
 if(cad)new MutationObserver(schedule).observe(cad,{subtree:true,childList:true,attributes:true});

 renderList();
});
})();
