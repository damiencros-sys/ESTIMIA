// ESTIM'IA V13 — correctif ciblé du test V11. Micro inchangé.
(function(){
const $=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=s=>String(s||'').replace(/[’]/g,"'").replace(/\b(?:euh|heu|hum|hmm)\b[,. ]*/gi,' ').replace(/\s+/g,' ').trim();
const low=s=>clean(s).toLowerCase(), n=s=>parseFloat(String(s).replace(',','.'));
const fmt=x=>Number(x).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²';
const uniq=a=>[...new Set(a.filter(Boolean))];
function card(title,icon,rows){
 rows=rows.filter(r=>r[1]!==''&&r[1]!=null);
 if(!rows.length)return '';
 return `<section class="proGroup"><h3>${icon} ${title}</h3>${rows.map(([k,v])=>`<div class="proRow"><span>${E(k)}</span><strong>${E(v)}</strong></div>`).join('')}</section>`;
}
function owner(t){
 let m=t.match(/\b(?:les\s+)?consorts?\s+([\p{L}'’-]+)/iu);
 if(m)return 'Consorts '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/\bfamille\s+([\p{L}'’-]+)/iu); if(m)return 'Famille '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/(?:propri[ée]taire(?:s)?|chez)\s+(monsieur et madame|monsieur|madame|m\. et mme|m\.|mme)\s+([\p{L}'’-]+)(?:\s+([\p{L}'’-]+))?/iu);
 if(m)return [m[1],m[2],m[3]].filter(Boolean).join(' ');
 return '';
}
function commune(t){
 let m=t.match(/(?:commune de|sur la commune de|à|sur)\s+([A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:[-\s][A-ZÀ-ÖØ-Ýa-zà-öø-ÿ][\p{L}'’-]+){0,3})(?=\s*(?:,|section|parcelle|cadastre|\.|$))/u);
 return m?clean(m[1]):'';
}
function cad(t){
 let m=t.match(/(?:r[ée]f[ée]rence cadastrale|cadastre|cadastrale?|parcelle)[^.!?]{0,80}?\bsection\s+([a-z]{1,3})[^0-9]{0,30}(?:parcelle|num[ée]ro|n°)?\s*(\d{1,4})/i);
 return m?{section:m[1].toUpperCase(),parcel:m[2]}:{};
}
function address(t){
 let m=t.match(/(?:adresse(?: du bien)?(?: est| :)?|situ[ée]e? (?:au|à)|nous sommes au|bien (?:au|à))\s+(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|chemin|impasse|place|route|all[ée]e|lotissement|quai|passage|mont[ée]e|hameau|lieu[- ]dit)\s+[^,.!?]{2,100})/iu);
 return m?clean(m[1]):'';
}
function typeOf(t){return (t.match(/\b(maison de village|maison|villa|appartement|studio|immeuble|terrain|local commercial)\b/i)||[])[1]||''}
function buildInfo(t){
 const r=[['Type de bien',typeOf(t)]];
 const yr=(t.match(/(?:construite?|construction|ann[ée]e)[^0-9]{0,25}((?:18|19|20)\d{2})/)||[])[1];if(yr)r.push(['Année de construction',yr]);
 if(/(?:deux|2)\s+niveaux/i.test(t)||(/\brez[- ]de[- ]chauss[ée]e|\brdc\b/i.test(t)&&/\b[ée]tage\b/i.test(t)))r.push(['Organisation','2 niveaux : rez-de-chaussée + étage']);
 let mi='';if(/non mitoyenne?|sans mitoyennet[ée]/i.test(t))mi='Non mitoyenne';else if(/\bmitoyenne?\b/i.test(t))mi='Mitoyenneté mentionnée';if(mi)r.push(['Mitoyenneté',mi]);
 return r;
}
// V13: machine d'état contextuelle des niveaux.
// Un niveau explicite gagne toujours. Un changement implicite ("à l'autre étage",
// "étage supérieur", "on monte encore") incrémente le dernier étage connu.
// Un simple "étage" passe au 1er étage s'il n'y a pas encore eu d'étage, puis
// au niveau suivant seulement lorsqu'il est employé comme annonce de nouvelle zone.
function markers(text){
 const candidates=[];
 const add=(rx,kind,floor=null)=>{for(const m of text.matchAll(rx))candidates.push({i:m.index,end:m.index+m[0].length,kind,floor})};
 add(/\b(?:rez\s*[- ]?\s*de\s*[- ]?\s*chauss[ée]e|rdc)\b/ig,'rdc');
 add(/\brez\s*[- ]?\s*de\s*[- ]?\s*jardin\b/ig,'rdj');
 add(/\bsous\s*[- ]?\s*sol\b/ig,'ss');
 add(/\bcombles?\b/ig,'combles');
 add(/\b(?:1er|premier)\s+[ée]tage\b/ig,'floor',1);
 add(/\b(?:2e|2ème|deuxi[eè]me)\s+[ée]tage\b/ig,'floor',2);
 add(/\b(?:3e|3ème|troisi[eè]me)\s+[ée]tage\b/ig,'floor',3);
 add(/\b(?:4e|4ème|quatri[eè]me)\s+[ée]tage\b/ig,'floor',4);
 add(/(?:[aà]\s+l['’ ]?\s*autre\s+[ée]tage|autre\s+[ée]tage|[ée]tage\s+sup[ée]rieur|on\s+monte\s+encore(?:\s+d['’ ]un\s+[ée]tage)?)/ig,'next');
 add(/(?:[aà]\s+l['’ ]?\s*[ée]tage|au\s+[ée]tage|on\s+(?:passe|monte)\s+(?:[aà]\s+l['’ ]?\s*|au\s+)[ée]tage)/ig,'implicit');
 add(/(?:^|[.!?,;:]\s*)[ée]tage(?=\s*[:,.-]|\s+(?:il\s+y\s+a|on\s+trouve|avec|chambre|salle|bureau|palier|d[ée]gagement|wc|nous|je))/ig,'implicit');
 candidates.sort((x,y)=>x.i-y.i||(y.end-y.i)-(x.end-x.i));
 const chosen=[];for(const c of candidates){if(chosen.some(z=>c.i<z.end&&c.end>z.i))continue;chosen.push(c)}
 chosen.sort((x,y)=>x.i-y.i);
 const out=[];let current=0,seen=false;
 for(const c of chosen){
  let name='';
  if(c.kind==='rdc'){name='Rez-de-chaussée';current=0}
  else if(c.kind==='rdj')name='Rez-de-jardin';
  else if(c.kind==='ss')name='Sous-sol';
  else if(c.kind==='combles')name='Combles';
  else if(c.kind==='floor'){current=c.floor;seen=true;name=current===1?'1er étage':current+'e étage'}
  else if(c.kind==='next'){current=Math.max(1,current+1);seen=true;name=current===1?'1er étage':current+'e étage'}
  else {current=seen?Math.max(1,current+1):1;seen=true;name=current===1?'1er étage':current+'e étage'}
  out.push({i:c.i,end:c.end,name});
 }
 return out;
}
function surfaces(text){
 const ms=markers(text), out=[];
 const rx=/\b(s[ée]jour|salon|salle à manger|cuisine|chambre(?:\s*(?:\d+|un|une|deux|trois|parentale))?|bureau|salle d[' ]eau|salle de bains?|wc|toilettes?|d[ée]gagement|couloir|entr[ée]e|hall|cellier|buanderie|dressing|mezzanine|garage|cave|grenier|atelier|d[ée]pendance|local|abri|carport|terrasse|balcon|loggia)\s*(?:fait|mesure|de|d[' ]une surface de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres? carr[ée]s?)/ig;
 for(const m of text.matchAll(rx)){
  let lvl='Niveau non précisé';for(const z of ms){if(z.i<=m.index)lvl=z.name;else break}
  const name=clean(m[1]), val=n(m[2]);
  const cat=/garage|cave|grenier|atelier|dépendance|local|abri|carport/i.test(name)?'Annexe':/terrasse|balcon|loggia/i.test(name)?'Extérieur':'Intérieur';
  out.push({lvl,name,val,cat});
 }return out;
}
function surfHTML(rows){
 if(!rows.length)return '';
 const ins=rows.filter(x=>x.cat==='Intérieur'), levels=uniq(ins.map(x=>x.lvl));
 let s='<section class="surfaceHero"><h3>📐 SURFACES CALCULÉES PAR NIVEAU</h3>';
 for(const lv of levels){
  const rr=ins.filter(x=>x.lvl===lv), total=rr.reduce((a,x)=>a+x.val,0);
  s+=`<div class="levelBlock"><h4>🪜 ${E(lv)}</h4>${rr.map(x=>`<div class="surfaceRow"><span>${E(x.name)}</span><b>${fmt(x.val)}</b></div>`).join('')}<div class="surfaceTotal"><span>Total ${E(lv)}</span><strong>${fmt(total)}</strong></div></div>`;
 }
 const total=ins.reduce((a,x)=>a+x.val,0);
 if(ins.length)s+=`<div class="grandTotal"><span>SURFACE INTÉRIEURE CALCULÉE</span><strong>${fmt(total)}</strong></div>`;
 const ann=rows.filter(x=>x.cat==='Annexe'), ext=rows.filter(x=>x.cat==='Extérieur');
 if(ann.length)s+=`<div class="otherSurface"><h4>🏚️ Annexes — hors total intérieur</h4>${ann.map(x=>`<div class="surfaceRow"><span>${E(x.name)} — ${E(x.lvl)}</span><b>${fmt(x.val)}</b></div>`).join('')}</div>`;
 if(ext.length)s+=`<div class="otherSurface"><h4>🌳 Extérieurs — hors total intérieur</h4>${ext.map(x=>`<div class="surfaceRow"><span>${E(x.name)} — ${E(x.lvl)}</span><b>${fmt(x.val)}</b></div>`).join('')}</div>`;
 return s+'</section>';
}
function sanitary(t){
 const occurrences=(rx)=>[...t.matchAll(rx)].length;
 const explicit=rx=>{const m=t.match(rx);return m?m[1]:''};
 let wc=explicit(/\b(\d+)\s+wc\b/i)||String(occurrences(/\bwc\b/gi)||'');
 let showers=explicit(/\b(\d+)\s+douches?\b/i)||String(occurrences(/\bdouche\b/gi)||'');
 let sde=explicit(/\b(\d+)\s+salles? d[' ]eau\b/i)||String(occurrences(/salle d[' ]eau/gi)||'');
 let sdb=explicit(/\b(\d+)\s+salles? de bains?\b/i)||String(occurrences(/salle de bains?/gi)||'');
 return [['Salle(s) d’eau',sde],['Douche(s)',showers],['Salle(s) de bains',sdb],['WC',wc],
 ['Équipements',uniq([/douche à l[' ]italienne/i.test(t)?"Douche à l'italienne":'',/double vasque/i.test(t)?'Double vasque':'',/s[eè]che[- ]serviettes/i.test(t)?'Sèche-serviettes':'']).join(' · ')]];
}
function heating(t){
 let heat=[];
 if(/chaudi[eè]re[^.!?]{0,60}condensation[^.!?]{0,30}gaz|chaudi[eè]re[^.!?]{0,30}gaz[^.!?]{0,30}condensation/i.test(t))heat.push('Chaudière gaz à condensation');
 else if(/chaudi[eè]re[^.!?]{0,30}gaz/i.test(t))heat.push('Chaudière gaz');
 if(/po[eê]le[^.!?]{0,20}bois/i.test(t))heat.push('Poêle à bois');if(/po[eê]le[^.!?]{0,20}granul/i.test(t))heat.push('Poêle à granulés');
 if(/radiateurs?[^.!?]{0,25}[ée]lectriques?/i.test(t))heat.push('Radiateurs électriques');
 let ecs='';
 if(/(?:eau chaude|production d[' ]eau chaude)[^.!?]{0,100}chaudi[eè]re/i.test(t)||/chaudi[eè]re[^.!?]{0,100}(?:eau chaude|production d[' ]eau chaude)/i.test(t))
  ecs=/condensation/i.test(t)&&/gaz/i.test(t)?'Chaudière gaz à condensation':'Chaudière';
 else if(/ballon thermodynamique/i.test(t))ecs='Ballon thermodynamique';else if(/cumulus|ballon[^.!?]{0,25}[ée]lectrique/i.test(t))ecs='Ballon électrique';
 return [['Mode(s) de chauffage',heat.join(' + ')],["Production d'eau chaude",ecs]];
}
function contextLocation(t,word){
 const i=low(t).indexOf(word);if(i<0)return '';
 const frag=clean(t.slice(Math.max(0,i-70),Math.min(t.length,i+140)));
 const m=frag.match(/(?:situ[ée]|plac[ée]|install[ée]|se trouve|est)\s+(?:dans|à|au|aux|sur|en)\s+([^,.!?]{2,55})/i);
 return m?clean(m[1]):'';
}
// No free-form snippets in Networks: only facts belonging to the correct family.
function networks(t){
 const r=[];
 if(/\blinky\b/i.test(t)){const loc=contextLocation(t,'linky');r.push(['Électricité','Compteur Linky'+(loc?' — '+loc:'')]);}
 const gaz=/compteur[^.!?]{0,35}gaz|gaz[^.!?]{0,35}compteur/i.test(t);if(gaz){const loc=contextLocation(t,'gaz');r.push(['Gaz','Compteur gaz'+(loc?' — '+loc:'')]);}
 const eau=/compteur[^.!?]{0,35}eau|eau[^.!?]{0,35}compteur/i.test(t);if(eau){const loc=contextLocation(t,'eau');r.push(['Eau','Compteur d’eau'+(loc?' — '+loc:'')]);}
 if(/tout[- ]à[- ]l[' ]égout|tout à l[' ]égout/i.test(t))r.push(['Assainissement',"Connecté au tout-à-l'égout"]);
 if(/\bfibre\b/i.test(t)){
  const neg=/(?:fibre[^.!?]{0,55}(?:non|pas)\s+(?:connect[ée]e|raccord[ée]e)|(?:non|pas)\s+(?:connect[ée]e|raccord[ée]e)[^.!?]{0,55}fibre)/i.test(t);
  r.push(['Fibre',neg?'Non connectée / non raccordée':'Fibre mentionnée']);
 }
 return r;
}
function annexes(t){
 const r=[];
 if(/\bgarage\b/i.test(t)){
  let v='Garage';
  if(/garage[^.!?]{0,100}mezzanine|mezzanine[^.!?]{0,100}garage/i.test(t))v+=' avec mezzanine';
  r.push(['Garage',v]);
 }
 if(/\bcave\b/i.test(t))r.push(['Cave','Cave']);if(/\bbuanderie\b/i.test(t))r.push(['Buanderie','Buanderie']);
 if(/\bcellier\b/i.test(t))r.push(['Cellier','Cellier']);if(/\batelier\b/i.test(t))r.push(['Atelier','Atelier']);
 return r;
}
function menu(t){
 const men=uniq([/pvc blanc/i.test(t)?'PVC blanc':'',/double vitrage/i.test(t)?'Double vitrage':'',/triple vitrage/i.test(t)?'Triple vitrage':'',/\baluminium\b|\balu\b/i.test(t)?'Aluminium':'']);
 let mos='';
 if(/moustiquaires?/i.test(t)){
  const i=low(t).indexOf('moustiqu');const frag=low(t.slice(Math.max(0,i-100),i+130));
  mos=/rez[- ]de[- ]chauss[ée]e|\brdc\b/.test(frag)?'Moustiquaires au rez-de-chaussée':'Moustiquaires';
 }
 const shut=uniq([/volets? roulants?[^.!?]{0,30}[ée]lectriques?/i.test(t)?'Volets roulants électriques':'',mos]);
 return [['Menuiseries / vitrages',men.join(' · ')],['Fermetures',shut.join(' · ')]];
}
function state(t){
 const r=[];if(/pas de fissures? apparentes?|aucune fissure apparente/i.test(t))r.push(['Fissures','Aucune fissure apparente signalée']);
 if(/retrait de cr[eé]pi/i.test(t))r.push(['Enduit / crépi','Retrait de crépi signalé']);
 if(/humidit[ée]/i.test(t))r.push(['Humidité','Humidité signalée']);return r;
}
async function normalizeCommune(q){
 if(!q)return null;
 try{
  const r=await fetch('/api/commune?q='+encodeURIComponent(q)),j=await r.json();
  if(j.result){$('#cadCommune').value=j.result.name;return j.result} 
 }catch(e){} return null;
}
async function parcelSearch(){
 const com=$('#cadCommune').value.trim(),sec=$('#cadSection').value.trim(),par=$('#cadParcel').value.trim();
 if(!com||!sec||!par){$('#cadStatus').textContent='Commune, section et parcelle nécessaires.';return}
 $('#cadStatus').textContent='Recherche cadastrale…';
 try{
  const r=await fetch(`/api/cadastre?commune=${encodeURIComponent(com)}&section=${encodeURIComponent(sec)}&numero=${encodeURIComponent(par)}`),j=await r.json();
  if(!r.ok)throw new Error(j.detail||'Erreur');
  $('#cadStatus').textContent=j.found?`✓ ${j.commune||com} — section ${j.section} — parcelle ${parseInt(j.numero,10)}`:'Parcelle non trouvée.';
 }catch(e){$('#cadStatus').textContent='Recherche impossible : '+e.message}
}
async function render(){
 const raw=$('#notes').value||'',corr=$('#correction').value||'',t=clean(raw+' '+corr);
 const o=owner(t);if(o&&!$('#owner').value)$('#owner').value=o;
 const a=address(t);if(a&&!$('#address').value)$('#address').value=a;
 const c=cad(t);if(c.section&&!$('#cadSection').value)$('#cadSection').value=c.section;if(c.parcel&&!$('#cadParcel').value)$('#cadParcel').value=c.parcel;
 const cm=commune(t);if(cm&&!$('#cadCommune').value)await normalizeCommune(cm);
 const typ=typeOf(t);if(typ&&!$('#type').value)$('#type').value=typ;
 const ss=surfaces(t), total=ss.filter(x=>x.cat==='Intérieur').reduce((a,x)=>a+x.val,0);
 let out='<div class="proGrid">'+card('Bien & construction','🏠',buildInfo(t))+'</div>';
 out+=surfHTML(ss);
 if(total)out+=`<div class="calculatedTop">📏 <span>Surface intérieure calculée à partir des pièces dictées</span><strong>${fmt(total)}</strong></div>`;
 out+='<div class="proGrid">';
 out+=card('Sanitaires','🚿',sanitary(t))+card('Chauffage & eau chaude','🔥',heating(t))+card('Réseaux & compteurs','⚡',networks(t))+card('Annexes','🏚️',annexes(t))+card('Menuiseries & fermetures','🪟',menu(t))+card('État / désordres','⚠️',state(t));
 out+='</div><details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>'+E(raw)+'</div></details>';
 $('#facts').innerHTML=out;
}

function ficheTitle(){
 const owner=$('#owner')?.value?.trim()||'Sans propriétaire';
 const addr=$('#address')?.value?.trim()||'Adresse non renseignée';
 return `Fiche de visite — ${owner} — ${addr}`;
}
function printableHTML(){
 const title=ficheTitle(), facts=$('#facts')?.innerHTML||'';
 const meta=[
  ['Propriétaire',$('#owner')?.value||''],
  ['Téléphone',$('#ownerPhone')?.value||''],
  ['Adresse',$('#address')?.value||''],
  ['Type',$('#type')?.value||''],
  ['Surface annoncée',$('#surface')?.value?$('#surface').value+' m²':''],
  ['Commune / INSEE',$('#cadCommune')?.value||''],
  ['Section',$('#cadSection')?.value||''],
  ['Parcelle',$('#cadParcel')?.value||'']
 ].filter(x=>x[1]);
 const head=meta.map(x=>`<div class="m"><span>${E(x[0])}</span><b>${E(x[1])}</b></div>`).join('');
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${E(title)}</title>
 <style>body{font-family:Arial,sans-serif;color:#17212b;margin:28px}h1{font-size:23px;margin-bottom:5px}.date{color:#667;font-size:12px;margin-bottom:18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}.m{border:1px solid #ccd5db;border-radius:8px;padding:8px}.m span,.m b{display:block}.m span{font-size:11px;color:#667;margin-bottom:3px}.proGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.proGroup,.surfaceHero{border:1px solid #ccd5db;border-radius:10px;padding:10px;margin:0 0 10px;break-inside:avoid}.proGroup h3,.surfaceHero h3{margin:0 0 8px}.proRow,.surfaceRow,.surfaceTotal,.grandTotal{display:flex;justify-content:space-between;gap:15px;padding:5px 0;border-bottom:1px solid #eee}.grandTotal{font-weight:bold;font-size:16px}.rawNotes{margin-top:14px}.dossierHead,.calculatedTop{display:none}@media print{body{margin:10mm}.proGroup,.surfaceHero{break-inside:avoid}}</style></head><body>
 <h1>FICHE DE VISITE IMMOBILIÈRE</h1><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div><div class="meta">${head}</div>${facts}</body></html>`;
}
function downloadVisit(){
 const blob=new Blob([printableHTML()],{type:'text/html;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);
 const safe=(($('#owner')?.value||$('#address')?.value||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_').replace(/^_+|_+$/g,''));
 a.download=`Fiche_visite_${safe}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function printVisit(){
 const w=window.open('','_blank');
 if(!w){alert("Autorise l'ouverture de fenêtre pour imprimer la fiche.");return}
 w.document.open();w.document.write(printableHTML());w.document.close();w.focus();setTimeout(()=>w.print(),250);
}

document.addEventListener('DOMContentLoaded',()=>{
 $('#analyse')?.addEventListener('click',()=>setTimeout(render,80));
 $('#findParcel')?.addEventListener('click',parcelSearch);
 $('#printVisit')?.addEventListener('click',printVisit);
 $('#downloadVisit')?.addEventListener('click',downloadVisit);
});
})();