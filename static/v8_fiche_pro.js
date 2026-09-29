// ESTIM'IA V8 — présentation professionnelle de la fiche.
// Ne modifie ni le microphone ni la reconnaissance vocale.
(function(){
const $=s=>document.querySelector(s);
const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const GROUPS=[
 ['🏠 Bien & distribution',['Type de bien','Surface habitable / Carrez','Pièces','Chambres','Configuration','Distribution','Surfaces par pièce']],
 ['🍽️ Cuisine',['Cuisine','Électroménager']],
 ['🚿 Sanitaires',['Sanitaires']],
 ['🪟 Menuiseries & fermetures',['Menuiseries','Fermetures']],
 ['🔥 Chauffage & confort',['Chauffage','Climatisation','Eau chaude']],
 ['⚡ Réseaux & compteurs',['Compteurs','Réseaux','Électricité — état']],
 ['🧱 État & travaux',['État général','Désordres constatés','Travaux identifiés']],
 ['🌳 Extérieurs & annexes',['Extérieurs','Annexes']],
 ['👁️ Environnement',['Vue','Atouts','Nuisances / points faibles']],
 ['📄 Diagnostics & copropriété',['Diagnostics','Copropriété','Taxe foncière','Charges']],
 ['⚠️ Contrôles',['À vérifier','Provenance / prudence']]
];

function extractCurrentFacts(){
 const out={};
 document.querySelectorAll('#facts .fact').forEach(row=>{
   const k=row.querySelector('span')?.textContent?.trim();
   const v=row.querySelector('b')?.textContent?.trim();
   if(k&&v&&k!=='Notes de visite') out[k]=v;
 });
 return out;
}
function card(title,items){
 if(!items.length)return '';
 return `<section class="proGroup"><h3>${title}</h3>${items.map(([k,v])=>
   `<div class="proRow"><span>${esc2(k)}</span><strong>${esc2(v)}</strong></div>`).join('')}</section>`;
}
function renderPro(){
 const box=$('#facts'); if(!box)return;
 const facts=extractCurrentFacts();
 const used=new Set();
 let html='<div class="proGrid">';
 for(const [title,keys] of GROUPS){
   const items=[];
   for(const k of keys) if(facts[k]){items.push([k,facts[k]]);used.add(k)}
   html+=card(title,items);
 }
 const extra=Object.entries(facts).filter(([k])=>!used.has(k));
 if(extra.length) html+=card('📌 Autres informations',extra);
 html+='</div>';

 const raw=$('#notes')?.value?.trim()||'';
 html+=`<details class="rawNotes"><summary>📝 Voir la dictée originale</summary><div>${esc2(raw)||'Aucune dictée.'}</div></details>`;
 box.innerHTML=html;
}
function missingChecks(){
 const raw=($('#notes')?.value||'').toLowerCase();
 const misses=[];
 const checks=[
  ['DPE',/\bdpe\b/],['Taxe foncière',/taxe fonci/],['Assainissement',/assainissement|tout[- ]à[- ]l|fosse septique|micro[- ]station/],
  ['Chauffage',/chauffage|chaudi[eè]re|pompe à chaleur|convecteur|radiateur|po[eê]le/],
  ['Menuiseries',/double vitrage|simple vitrage|pvc|aluminium|\balu\b|menuiserie/],
  ['Stationnement',/parking|stationnement|garage|carport/]
 ];
 for(const [n,r] of checks) if(!r.test(raw)) misses.push(n);
 return misses;
}
function addMissing(){
 const box=$('#facts'); if(!box)return;
 const m=missingChecks();
 if(!m.length)return;
 const div=document.createElement('section');
 div.className='proGroup missingGroup';
 div.innerHTML=`<h3>🔎 Informations non relevées</h3><p>${m.map(esc2).join(' · ')}</p>`;
 const grid=box.querySelector('.proGrid'); if(grid)grid.appendChild(div);
}

// Run after V7 has rendered.
document.addEventListener('DOMContentLoaded',()=>{
 const btn=$('#analyse');
 if(btn) btn.addEventListener('click',()=>setTimeout(()=>{renderPro();addMissing()},30),false);
});
})();