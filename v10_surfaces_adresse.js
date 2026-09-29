// ESTIM'IA V10 — propriétaire, adresse/cadastre et surfaces par niveau.
// Le moteur microphone n'est pas modifié.
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ').trim();
const num=s=>parseFloat(String(s).replace(',','.'));
const fmt=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²';

function inferOwner(raw){
 let t=String(raw||'');
 const patterns=[
  /(?:propri[ée]taire(?:s)?|chez)\s+(monsieur et madame|m\. et mme|monsieur|madame|m\.|mme)\s+([A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]+){0,3})/iu,
  /(?:propri[ée]taire(?:s)?|vendeur(?:s)?|vendeuse)\s*(?:est|sont|:)?\s*([A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]+){0,3})/iu
 ];
 for(const r of patterns){const m=t.match(r);if(m)return m.slice(1).filter(Boolean).join(' ').trim()}
 return '';
}
function inferAddress(raw){
 const t=String(raw||'').replace(/\n/g,' ');
 const r=/(?:adresse(?: du bien)?(?: est| :)?|situ[ée]e? au|situ[ée]e? à|nous sommes au|bien au|maison au|appartement au|chez [^,.]{1,60},?\s+)(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|chemin|impasse|place|route|all[ée]e|lotissement|quai|passage|mont[ée]e|hameau|lieu[- ]dit)\s+[^,.!?]{2,100})/iu;
 const m=t.match(r);
 return m?m[1].trim().replace(/\s+/g,' '):'';
}
async function geocode(q){
 const r=await fetch('/api/geocode?q='+encodeURIComponent(q));
 const j=await r.json(); if(!r.ok)throw new Error(j.detail||'Recherche impossible'); return j.results||[];
}
function renderSuggestions(items){
 const b=$('#addressSuggestions'); if(!b)return;
 b.innerHTML=items.length?items.map((x,i)=>`<button type="button" class="suggestion" data-i="${i}">
   <b>${esc(x.label)}</b><small>${esc([x.postcode,x.city].filter(Boolean).join(' · '))}</small>
 </button>`).join(''):'';
 b.querySelectorAll('.suggestion').forEach(bt=>bt.onclick=()=>{
   const x=items[+bt.dataset.i];
   $('#address').value=x.label||'';
   if(x.citycode) $('#cadCommune').value=x.citycode;
   if(x.parcels?.length){
     $('#cadStatus').textContent='Parcelle(s) associée(s) par le référentiel adresse : '+x.parcels.join(', ')+' — à confirmer.';
   }
   $('#addressStatus').textContent='✓ Adresse normalisée sélectionnée.';
   b.innerHTML='';
 });
}
async function verifyAddress(){
 const q=$('#address').value.trim(); if(!q)return;
 $('#addressStatus').textContent='Recherche dans le référentiel national des adresses…';
 try{
  const items=await geocode(q); renderSuggestions(items);
  $('#addressStatus').textContent=items.length?'Choisis l’adresse correcte ci-dessous.':'Aucune adresse suffisamment proche trouvée.';
 }catch(e){$('#addressStatus').textContent='Recherche d’adresse indisponible : '+e.message}
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#checkAddress')?.addEventListener('click',verifyAddress);
 $('#address')?.addEventListener('change',()=>{ if($('#address').value.trim().length>8) verifyAddress(); });
 $('#findParcel')?.addEventListener('click',async()=>{
   const commune=$('#cadCommune').value.trim(), section=$('#cadSection').value.trim(), parcel=$('#cadParcel').value.trim();
   if(!commune||!section||!parcel){$('#cadStatus').textContent='Renseigne commune/code INSEE, section et numéro de parcelle.';return}
   $('#cadStatus').textContent='Recherche cadastrale…';
   try{
    const r=await fetch(`/api/cadastre?commune=${encodeURIComponent(commune)}&section=${encodeURIComponent(section)}&numero=${encodeURIComponent(parcel)}`);
    const j=await r.json(); if(!r.ok)throw new Error(j.detail||'Erreur');
    $('#cadStatus').textContent=j.found?`✓ Parcelle trouvée : ${j.label}`:'Parcelle non trouvée avec ces références.';
   }catch(e){$('#cadStatus').textContent='Recherche cadastrale indisponible : '+e.message}
 });
});

// ---------- SURFACES ----------
const HAB=/^(séjour|sejour|salon|salle à manger|salle a manger|cuisine|chambre|bureau|salle d[' ]eau|salle de bains?|wc|toilettes?|dégagement|degagement|couloir|entrée|entree|hall|cellier|buanderie|dressing|mezzanine)/i;
const ANN=/^(garage|cave|grenier|atelier|dépendance|dependance|local|abri|carport)/i;
const EXT=/^(terrasse|balcon|loggia|jardin|cour|terrain)/i;

function levelName(s){
 s=norm(s);
 if(/sous[- ]sol/.test(s))return 'Sous-sol';
 if(/rez[- ]de[- ]jardin/.test(s))return 'Rez-de-jardin';
 if(/rez[- ]de[- ]chauss[ée]e|\brdc\b/.test(s))return 'Rez-de-chaussée';
 let m=s.match(/(?:au |le )?(1er|premier) [ée]tage/);if(m)return '1er étage';
 m=s.match(/(?:au |le )?(2e|2ème|deuxi[eè]me) [ée]tage/);if(m)return '2e étage';
 m=s.match(/(?:au |le )?(3e|3ème|troisi[eè]me) [ée]tage/);if(m)return '3e étage';
 if(/\bcombles?\b/.test(s))return 'Combles';
 return null;
}
function extractSurfaces(raw){
 let text=String(raw||'').replace(/[’]/g,"'");
 const marker=/(sous[- ]sol|rez[- ]de[- ]jardin|rez[- ]de[- ]chauss[ée]e|\brdc\b|(?:au |le )?(?:1er|premier|2e|2ème|deuxi[eè]me|3e|3ème|troisi[eè]me) [ée]tage|combles?)/ig;
 const marks=[...text.matchAll(marker)].map(m=>({i:m.index,name:levelName(m[0])})).filter(x=>x.name);
 const rx=/\b(séjour|sejour|salon|salle à manger|salle a manger|cuisine|chambre(?:\s*(?:\d+|un|une|deux|trois|parentale))?|bureau|salle d[' ]eau|salle de bains?|wc|toilettes?|dégagement|degagement|couloir|entrée|entree|hall|cellier|buanderie|dressing|mezzanine|garage|cave|grenier|atelier|dépendance|dependance|local|abri|carport|terrasse|balcon|loggia|jardin|cour|terrain)\s*(?:fait|mesure|de|d[' ]une surface de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres? carrés?)/ig;
 const rows=[];
 for(const m of text.matchAll(rx)){
   let lvl='Niveau non précisé';
   for(const mk of marks){if(mk.i<=m.index)lvl=mk.name;else break}
   let label=m[1].replace(/\s+/g,' ').trim(), val=num(m[2]);
   let cat=EXT.test(label)?'Extérieur':ANN.test(label)?'Annexe':'Intérieur';
   rows.push({level:lvl,label,value:val,cat});
 }
 return rows;
}
function surfaceHTML(rows, declared){
 if(!rows.length)return '';
 const inside=rows.filter(x=>x.cat==='Intérieur'), annex=rows.filter(x=>x.cat==='Annexe'), ext=rows.filter(x=>x.cat==='Extérieur');
 const levels=[...new Set(inside.map(x=>x.level))];
 let s='<section class="surfaceHero"><h3>📐 SURFACES CALCULÉES</h3>';
 if(declared)s+=`<div class="surfaceDeclared"><span>Surface habitable / Carrez annoncée</span><strong>${fmt(num(declared))}</strong></div>`;
 for(const lv of levels){
   const rr=inside.filter(x=>x.level===lv), total=rr.reduce((a,x)=>a+x.value,0);
   s+=`<div class="levelBlock"><h4>🪜 ${esc(lv)}</h4>${rr.map(x=>`<div class="surfaceRow"><span>${esc(x.label)}</span><b>${fmt(x.value)}</b></div>`).join('')}<div class="surfaceTotal"><span>Total ${esc(lv)}</span><strong>${fmt(total)}</strong></div></div>`;
 }
 const totalInside=inside.reduce((a,x)=>a+x.value,0);
 if(inside.length)s+=`<div class="grandTotal"><span>TOTAL INTÉRIEUR RENSEIGNÉ</span><strong>${fmt(totalInside)}</strong></div>`;
 if(declared&&inside.length){
   const diff=totalInside-num(declared);
   s+=`<div class="surfaceDiff ${Math.abs(diff)>.5?'warn':''}">Écart avec la surface annoncée : <b>${diff>=0?'+':''}${fmt(diff)}</b></div>`;
 }
 if(annex.length)s+=`<div class="otherSurface"><h4>🏚️ Annexes — non ajoutées au total intérieur</h4>${annex.map(x=>`<div class="surfaceRow"><span>${esc(x.label)}${x.level!=='Niveau non précisé'?' · '+esc(x.level):''}</span><b>${fmt(x.value)}</b></div>`).join('')}</div>`;
 if(ext.length)s+=`<div class="otherSurface"><h4>🌳 Extérieurs — non ajoutés au total intérieur</h4>${ext.map(x=>`<div class="surfaceRow"><span>${esc(x.label)}${x.level!=='Niveau non précisé'?' · '+esc(x.level):''}</span><b>${fmt(x.value)}</b></div>`).join('')}</div>`;
 return s+'</section>';
}

function enrichAfterAnalysis(){
 const notes=$('#notes').value||'', correction=$('#correction').value||'', all=(notes+' '+correction).trim();
 // Owner
 if(!$('#owner').value.trim()){const o=inferOwner(notes);if(o)$('#owner').value=o}
 // Address: extract from dictation, then verify against official geocoder
 if(!$('#address').value.trim()){
   const a=inferAddress(notes);
   if(a){$('#address').value=a; verifyAddress()}
 }
 // Put dossier identity + surfaces visibly before the detailed V9 sheet.
 const facts=$('#facts'); if(!facts)return;
 const existing=facts.innerHTML;
 const owner=$('#owner').value.trim(), addr=$('#address').value.trim();
 const rows=extractSurfaces(all);
 let top='<div class="dossierHead">';
 if(owner)top+=`<div><span>👤 Propriétaire</span><strong>${esc(owner)}</strong></div>`;
 if(addr)top+=`<div><span>📍 Adresse</span><strong>${esc(addr)}</strong></div>`;
 top+='</div>'+surfaceHTML(rows,$('#surface').value.trim());
 facts.innerHTML=top+existing;
}

document.addEventListener('DOMContentLoaded',()=>{
 $('#analyse')?.addEventListener('click',()=>setTimeout(enrichAfterAnalysis,180),false);
});
})();