// ESTIM'IA V14 — correctif ciblé du test V11. Micro inchangé.
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
 let m=t.match(/\b(\d{5})\s+([A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:[-\s][A-ZÀ-ÖØ-Ýa-zà-öø-ÿ][\p{L}'’-]+){0,3})/u);
 if(m)return {postcode:m[1],name:clean(m[2])};
 m=t.match(/(?:commune de|sur la commune de)\s+([\p{L}'’-]+(?:[-\s][\p{L}'’-]+){0,3})/iu);
 return m?{postcode:'',name:clean(m[1])}:null;
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
 const rx=/(retour\s+(?:au|à l[' ])\s*(?:rez[- ]de[- ]chauss[ée]e|rdc|1er|premier|2e|2ème|deuxi[eè]me|3e|3ème|troisi[eè]me)(?:\s+[ée]tage)?|sous[- ]sol|rez[- ]de[- ]jardin|rez[- ]de[- ]chauss[ée]e|\brdc\b|combles?|(?:au |à l[' ]|le )?(?:1er|premier|2e|2ème|deuxi[eè]me|3e|3ème|troisi[eè]me|4e|4ème|quatri[eè]me)\s+[ée]tage|à l[' ]autre [ée]tage|autre [ée]tage|[ée]tage sup[ée]rieur|on monte encore(?: d[' ]un [ée]tage)?|on passe à l[' ][ée]tage|on monte à l[' ][ée]tage|à l[' ][ée]tage|\b[ée]tage\b)/ig;
 const a=[]; let current=0, seen=false;
 for(const m of text.matchAll(rx)){
   const x=low(m[0]); let name='', floor=null;
   const before=low(text.slice(Math.max(0,m.index-45),m.index));
   if(x==='étage' && /escalier[^.!?]{0,35}(?:acc[eè]de|acc[eé]der|menant|dessert)\s+(?:à l[' ]|au)?$/.test(before))continue;
   if(/sous-sol/.test(x))name='Sous-sol';
   else if(/rez-de-jardin/.test(x))name='Rez-de-jardin';
   else if(/rez-de-chaussée|\brdc\b/.test(x)){name='Rez-de-chaussée';current=0;}
   else if(/combles?/.test(x))name='Combles';
   else if(/4e|4ème|quatrième/.test(x))floor=4;
   else if(/3e|3ème|troisième/.test(x))floor=3;
   else if(/2e|2ème|deuxième/.test(x))floor=2;
   else if(/1er|premier/.test(x))floor=1;
   else if(/autre étage|étage supérieur|monte encore/.test(x))floor=Math.max(1,current+1);
   else floor=seen?Math.max(1,current+1):1;
   if(floor!==null){current=floor;seen=true;name=floor===1?'1er étage':floor+'e étage';}
   const last=a[a.length-1];if(name&&(!last||m.index>=last.end))a.push({i:m.index,end:m.index+m[0].length,name});
 }
 return a;
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
function announcedSurface(t){
 const m=t.match(/(?:surface\s+(?:habitable|carrez)|loi carrez|habitable)\s*(?:annonc[ée]e?|indiqu[ée]e?|de|:|fait|mesure)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres? carr[ée]s?)/i);
 return m?n(m[1]):null;
}
function sanitary(t){
 const wn=s=>({'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5}[low(s)]||parseInt(s,10)||0);
 const qty=noun=>{const m=t.match(new RegExp("\\b(\\d+|un|une|deux|trois|quatre|cinq)\\s+"+noun,"i"));return m?wn(m[1]):0};
 let sde=qty("salles? d[' ]eau"),sdb=qty("salles? de bains?"),wc=qty("(?:wc|toilettes?)"),sh=qty("douches?");
 if(!sde&&/salle d[' ]eau/i.test(t))sde=1;if(!sdb&&/salle de bains?/i.test(t))sdb=1;if(!wc&&/\bwc\b|toilettes?/i.test(t))wc=1;if(!sh&&/\bdouche\b/i.test(t))sh=1;
 if(sde>1&&/(?:chacune|chaque)[^.!?]{0,25}(?:une )?douche/i.test(t))sh=sde;
 return [['Salle(s) d’eau',sde||''],['Douche(s)',sh||''],['Salle(s) de bains',sdb||''],['WC',wc||''],
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
  ecs=/chaudi[eè]re[^.!?]{0,100}condensation/i.test(t)&&/gaz/i.test(t)?'Chaudière gaz à condensation':'Chaudière';
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
 if(/\blinky\b/i.test(t))r.push(['Électricité','Compteur Linky']);
 const wi=/compteur d[' ]?eau[^.!?]{0,45}individuel|compteur individuel[^.!?]{0,35}eau/i.test(t);
 if(/compteur[^.!?]{0,40}eau|eau[^.!?]{0,40}compteur/i.test(t))r.push(['Eau',wi?'Compteur d’eau individuel':'Compteur d’eau']);
 if(/compteur[^.!?]{0,40}gaz|gaz[^.!?]{0,40}compteur/i.test(t))r.push(['Gaz','Compteur gaz']);
 if(/tout[- ]à[- ]l[' ]égout|tout à l[' ]égout/i.test(t))r.push(['Assainissement',"Connecté au tout-à-l'égout communal"]);
 if(/\bfibre\b/i.test(t)){
   const neg=/(?:fibre[^.!?]{0,80}(?:n[' ]est\s+)?(?:pas|non)\s+(?:connect[ée]e|raccord[ée]e)|(?:pas|non)\s+(?:connect[ée]e|raccord[ée]e)[^.!?]{0,80}fibre)/i.test(t);
   const pos=/(?:fibre[^.!?]{0,50}(?:connect[ée]e|raccord[ée]e)|(?:connect[ée]e|raccord[ée]e)[^.!?]{0,50}fibre)/i.test(t);
   r.push(['Fibre',neg?'Non connectée':(pos?'Connectée':'État de connexion à vérifier')]);
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
async let currentParcelGeometry=null;
function parcelSvg(geom){
 if(!geom)return '';const polys=geom.type==='Polygon'?[geom.coordinates]:(geom.type==='MultiPolygon'?geom.coordinates:[]),pts=[];
 polys.forEach(p=>p.forEach(r=>r.forEach(x=>pts.push(x))));if(!pts.length)return '';
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),w=720,h=420,p=35,sc=Math.min((w-2*p)/(maxx-minx||1),(h-2*p)/(maxy-miny||1));
 const path=r=>r.map((q,i)=>`${i?'L':'M'} ${(p+(q[0]-minx)*sc).toFixed(1)} ${(h-p-(q[1]-miny)*sc).toFixed(1)}`).join(' ')+' Z';
 let d='';polys.forEach(poly=>poly.forEach(r=>d+=path(r)+' '));
 return `<svg id="parcelPlan" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><path d="${d}" fill="#f4f6f7" stroke="#222" stroke-width="3"/><text x="36" y="35" font-family="Arial" font-size="20">Plan cadastral — parcelle sélectionnée</text></svg>`;
}
function showParcelPlan(g){
 currentParcelGeometry=g;let b=$('#cadPlanBox');if(!b){b=document.createElement('div');b.id='cadPlanBox';b.className='cadPlanBox';$('#cadStatus').after(b)}
 b.innerHTML=parcelSvg(g)+`<div class="cadActions"><button type="button" id="downloadPlan">⬇️ Télécharger le plan cadastral</button><a href="https://www.cadastre.gouv.fr/" target="_blank">🌐 Portail du cadastre</a></div>`;
 $('#downloadPlan')?.addEventListener('click',()=>{const s=$('#parcelPlan');if(!s)return;const bl=new Blob([new XMLSerializer().serializeToString(s)],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=`Plan_cadastral_${$('#cadSection').value}_${$('#cadParcel').value}.svg`;a.click()});
}
async function parcelSearch(){
 const com=$('#cadCommune').value.trim(),sec=$('#cadSection').value.trim(),par=$('#cadParcel').value.trim();
 if(!com||!sec||!par){$('#cadStatus').textContent='Commune, section et parcelle nécessaires.';return}
 $('#cadStatus').textContent='Recherche cadastrale…';
 try{
  const r=await fetch(`/api/cadastre?commune=${encodeURIComponent(com)}&section=${encodeURIComponent(sec)}&numero=${encodeURIComponent(par)}`),j=await r.json();
  if(!r.ok)throw new Error(j.detail||'Erreur');
  if(j.found){$('#cadCommune').value=j.commune||com;$('#cadStatus').textContent=`✓ ${j.commune||com} — section ${j.section} — parcelle ${parseInt(j.numero,10)}`;showParcelPlan(j.geometry);}
  else $('#cadStatus').textContent='Parcelle non trouvée.';
 }catch(e){$('#cadStatus').textContent='Recherche impossible : '+e.message}
}
function ficheTitle(){
 const owner=$('#owner')?.value?.trim()||'Sans propriétaire';
 const addr=$('#address')?.value?.trim()||'Adresse non renseignée';
 return `Fiche de visite — ${owner} — ${addr}`;
}
function printableHTML(){
 const title=ficheTitle(), facts=$('#facts')?.innerHTML||'', plan=$('#cadPlanBox #parcelPlan')?.outerHTML||'';
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
 <h1>FICHE DE VISITE IMMOBILIÈRE</h1><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div><div class="meta">${head}</div>${facts}${plan?`<section class="cadPrint"><h2>PLAN CADASTRAL</h2>${plan}</section>`:''}</body></html>`;
}
async function downloadVisit(){
 const b=$('#downloadVisit'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Création du Word…'}
 try{
  const payload={owner:$('#owner')?.value||'',phone:$('#ownerPhone')?.value||'',address:$('#address')?.value||'',type:$('#type')?.value||'',surface:$('#surface')?.value||'',commune:$('#cadCommune')?.value||'',section:$('#cadSection')?.value||'',parcel:$('#cadParcel')?.value||'',notes:$('#notes')?.value||'',facts_html:$('#facts')?.innerHTML||'',parcel_svg:$('#cadPlanBox #parcelPlan')?.outerHTML||''};
  const r=await fetch('/api/export-word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error('Création du document Word impossible');
  const bl=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=`Fiche_visite_${(payload.owner||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_')}.docx`;a.click();
 }catch(e){alert(e.message)}finally{if(b){b.disabled=false;b.textContent=old}}
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