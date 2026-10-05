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
 return `<section class="proGroup editableCard"><h3 contenteditable="true" spellcheck="true">${icon} ${title}</h3>${rows.map(([k,v])=>{const announced=k==='Surface annoncée / dictée',num=announced?String(v).replace(/\s*m²\s*$/i,''):v;return `<div class="proRow"><span contenteditable="true" spellcheck="true">${E(k)}</span><strong${announced?' class="fixedM2"':''}>${announced?`<span contenteditable="true" spellcheck="true">${E(num)}</span><em> m²</em>`:`<span contenteditable="true" spellcheck="true">${E(v)}</span>`}</strong><button type="button" class="rowDelete" title="Supprimer">×</button></div>`}).join('')}<button type="button" class="addTextRow miniEditBtn">＋ Ajouter une ligne</button></section>`;
}
function owner(t){
 let m=t.match(/\b(?:les\s+)?consorts?\s+([\p{L}'’-]+)/iu);
 if(m)return 'Consorts '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/\bfamille\s+([\p{L}'’-]+)/iu); if(m)return 'Famille '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/(?:propri[ée]taire(?:s)?|chez)\s+(monsieur et madame|monsieur|madame|m\. et mme|m\.|mme)\s+([\p{L}'’-]+)(?:\s+([\p{L}'’-]+))?/iu);
 if(m)return [m[1],m[2],m[3]].filter(Boolean).join(' ');
 m=t.match(/\bpropri[ée]taire(?:s)?\s+(?:est|sont|:)?\s*([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}?)(?=\s*(?:,|\.|;|t[ée]l[ée]phone|son\s+t[ée]l[ée]phone|adresse|maison|appartement|villa|immeuble)\b)/iu);
 if(m)return clean(m[1]);
 return '';
}
function phone(t){
 // Numéro français même sans le mot « téléphone ». On exige 10 chiffres et un préfixe 0[1-9].
 // Accepte 06 82 81 31 64, 0682813164, 06.82.81.31.64, 06-82-81-31-64.
 const rx=/(?<!\d)(0[1-9])(?:[ .-]*)(\d{2})(?:[ .-]*)(\d{2})(?:[ .-]*)(\d{2})(?:[ .-]*)(\d{2})(?!\d)/g;
 for(const m of t.matchAll(rx)){
  const digits=m.slice(1).join('');
  if(/^0[1-9]\d{8}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g,'$1 ').trim();
 }
 return '';
}
function commune(t){
 const tidy=v=>clean(v).replace(/\s+(?:section|parcelle|cadastre|cadastrale|code postal)\b.*$/iu,'').replace(/[,:;.\s]+$/,'');
 // Priorité au couple CP + commune situé dans la partie « adresse du bien ».
 const a=address(t); if(a&&a.city)return {name:a.city,postcode:a.postcode};
 let m=t.match(/(?:code postal|cp)\s*(\d{5})[^.!?]{0,45}?(?:commune(?: de)?|ville(?: de)?|à|sur)\s+([^,.;!?]+)/iu);
 if(m)return {name:tidy(m[2]),postcode:m[1]};
 m=t.match(/\b(\d{5})\s+([\p{L}][\p{L}'’ -]{1,60}?)(?=\s+(?:section|parcelle|cadastre)\b|[,.;!?]|$)/iu);
 if(m)return {name:tidy(m[2]),postcode:m[1]};
 m=t.match(/(?:commune de|sur la commune de|ville de)\s+([^,.;!?]+)/iu);
 if(m)return {name:tidy(m[1]),postcode:''};
 return null;
}

let cadParcels=[];
function normParcel(section,numero){
 section=String(section||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 numero=String(numero||'').replace(/\D/g,'').replace(/^0+(?=\d)/,'');
 return section&&numero?{section,numero}:null;
}
function parcelKey(p){return p.section+':'+String(parseInt(p.numero,10))}
function syncCadParcels(){
 const h=$('#cadParcelsJSON');if(h)h.value=JSON.stringify(cadParcels);
 renderCadParcelsList();
 document.dispatchEvent(new Event('change',{bubbles:true}));
}
function addCadParcel(section,numero,found=false){
 const p=normParcel(section,numero);if(!p)return;
 const k=parcelKey(p),i=cadParcels.findIndex(x=>parcelKey(x)===k);
 if(i<0)cadParcels.push({...p,found:!!found}); else if(found)cadParcels[i].found=true;
 syncCadParcels();
}
function removeCadParcel(k){cadParcels=cadParcels.filter(x=>parcelKey(x)!==k);syncCadParcels();renderMultiCadPlan()}
function renderCadParcelsList(){
 const box=$('#cadParcelsList');if(!box)return;box.innerHTML='';
 if(cadParcels.length){const lab=document.createElement('div');lab.className='cadParcelsLabel';lab.textContent='Parcelles cadastrales';box.appendChild(lab);}
 cadParcels.forEach(p=>{const d=document.createElement('span');d.className='cadParcelChip'+(p.found?' ok':'');
   d.innerHTML=`<b>${E(p.section)} ${E(String(parseInt(p.numero,10)))}</b>${p.found?' ✓':''}<button type="button" title="Retirer">×</button>`;
   d.querySelector('button').onclick=()=>removeCadParcel(parcelKey(p));box.appendChild(d);});
}
function parseCadParcels(t){
 const s=clean(t)
   .replace(/[;,]/g,' , ')
   .replace(/\bnum[ée]ros?\b/gi,'numero')
   .replace(/\bn[°º]\b/gi,'numero');
 const out=[];
 // Each "section XX ..." starts a group and runs until the next section or sentence end.
 const secRx=/\bsection\s+([a-z]{1,3})\b/gi;
 const groups=[]; let m;
 while((m=secRx.exec(s)))groups.push({section:m[1].toUpperCase(),start:m.index,end:secRx.lastIndex});
 for(let i=0;i<groups.length;i++){
   const g=groups[i], stop=(i+1<groups.length?groups[i+1].start:s.length);
   let tail=s.slice(g.end,stop);
   // Stop before clearly unrelated property facts.
   tail=tail.split(/\b(?:c['’]?est|maison|appartement|terrain|garage|surface|séjour|salon|cuisine|chambre|salle|wc|toiture|chauffage|dpe|exposition|terrasse|parking)\b/i)[0];
   // Accept: "numero 60 et 61 et 63", "parcelles 60,61,63", or directly "60 et 61".
   const nums=(tail.match(/\b\d{1,4}\b/g)||[]);
   nums.forEach(n=>out.push({section:g.section,numero:n}));
 }
 // Also accept explicit forms without the word "section": "parcelle BH 60" / "parcelles BH 60 et 61".
 const explicit=/\bparcelles?\s+([a-z]{1,3})\s+([^.!?]{0,60})/gi;
 while((m=explicit.exec(s))){
   const sec=m[1].toUpperCase();
   const tail=m[2].split(/\b(?:section|maison|appartement|terrain|garage|surface|séjour|salon|cuisine|chambre|salle|wc|toiture|chauffage|dpe|exposition|terrasse|parking)\b/i)[0];
   (tail.match(/\b\d{1,4}\b/g)||[]).forEach(n=>out.push({section:sec,numero:n}));
 }
 // Natural shorthand: "parcelles C 732 et C 679"
 const repeated=/\bparcelles?\s+([a-z]{1,3})\s+(\d{1,4})\s*(?:,|et)?\s*([a-z]{1,3})?\s*(\d{1,4})/gi;
 while((m=repeated.exec(s)))out.push({section:m[1].toUpperCase(),numero:m[2]},{section:(m[3]||m[1]).toUpperCase(),numero:m[4]});
 const one=cad(t); if(one.section&&one.parcel)out.push({section:one.section,numero:one.parcel});
 const seen=new Set();
 return out.map(p=>normParcel(p.section,p.numero)).filter(Boolean).filter(p=>{
   const k=parcelKey(p); if(seen.has(k))return false; seen.add(k); return true;
 });
}
function loadCadParcelsFromHidden(){
 try{const a=JSON.parse($('#cadParcelsJSON')?.value||'[]');cadParcels=Array.isArray(a)?a.map(x=>({...normParcel(x.section,x.numero),found:!!x.found})).filter(x=>x.section&&x.numero):[]}catch{cadParcels=[]}
 renderCadParcelsList();renderMultiCadPlan();
}
function cad(t){
 const s=clean(t).replace(/\bnum[ée]ros?\b/gi,'numero').replace(/\bn[°º]\b/gi,'numero'); let m;
 m=s.match(/\b(?:r[ée]f[ée]rence\s+cadastrale\s+)?section\s+([a-z]{1,3})\s+(?:numero\s*)?(\d{1,4})\b/i);
 if(m)return {section:m[1].toUpperCase(),parcel:m[2]};
 m=s.match(/\bparcelle\s+([a-z]{1,3})\s+(\d{1,4})\b/i);
 return m?{section:m[1].toUpperCase(),parcel:m[2]}:{section:'',parcel:''};
}
function addressV1310(t){
 const text=clean(t);
 // Repère d'abord un CP + une commune, puis remonte jusqu'au début de l'adresse.
 // Cela évite qu'un téléphone ou le nom du propriétaire soit absorbé par l'adresse.
 const cpRx=/\b(\d{5})\s+([\p{L}][\p{L}'’ -]{1,60}?)(?=\s+(?:section|parcelle|cadastre|cadastrale)\b|[,.;!?]|$)/giu;
 const cps=[...text.matchAll(cpRx)];
 for(const cp of cps){
  const before=text.slice(0,cp.index);
  const marker=/(?:\b(?:le\s+)?bien\s+(?:est\s+)?situ[ée]\s+(?:au|à)|\badresse(?:\s+du\s+bien)?\s*(?:est|:)?|\bnous\s+sommes\s+(?:au|à)|\bmaison\s+situ[ée]e?\s+(?:au|à)|\bappartement\s+(?:situ[ée]\s+)?(?:au|à))\s*/giu;
  const marks=[...before.matchAll(marker)];
  if(!marks.length)continue;
  const last=marks[marks.length-1];
  let street=clean(before.slice(last.index+last[0].length)).replace(/^(?:au|à)\s+/iu,'').replace(/[,:;.\s]+$/,'');
  // Une adresse doit commencer par un numéro ou un lieu-dit/hameau clairement annoncé.
  if(!street || (!/^\d{1,4}(?:\s*(?:bis|ter|quater))?\b/iu.test(street) && !/^(?:lieu[- ]dit|hameau)\b/iu.test(street)))continue;
  return {street,postcode:cp[1],city:clean(cp[2]).replace(/[,:;.\s]+$/,'')};
 }
 return null;
}

function address(t){
 const s=clean(t), ways='(?:route|rue|chemin|avenue|boulevard|impasse|lotissement|place|all[ée]e|mont[ée]e|traverse|quai|cours)';
 const cpRx=/\b(\d{5})\s+([\p{L}][\p{L}'’ -]{1,50}?)(?=\s+(?:la\s+r[ée]f[ée]rence|r[ée]f[ée]rence|section|parcelle|cadastre|cadastrale|c['’]?est|maison|appartement|villa|terrain|salon|s[ée]jour|cuisine|chambre)\b|[,.;!?]|$)/giu;
 for(const cp of s.matchAll(cpRx)){
  const left=s.slice(Math.max(0,cp.index-180),cp.index);
  let m=left.match(new RegExp("(?:l['’]adresse|adresse)(?:\\s+de\\s+la\\s+maison|\\s+du\\s+bien)?[\\s\\S]{0,35}?(?:est|et)?\\s*(?:au|aux|à|a)?\\s*(?:deux|2)\\s+("+ways+"\\b[\\s\\S]{1,90})$","iu"));
  if(m)return {street:'2 '+clean(m[1]).replace(/[,:;.\s]+$/,''),postcode:cp[1],city:clean(cp[2]).replace(/[,:;.\s]+$/,'')};
  m=left.match(new RegExp("(?:l['’]adresse|adresse)(?:\\s+de\\s+la\\s+maison|\\s+du\\s+bien)?[\\s\\S]{0,35}?(?:est|et)?\\s*(?:au|aux|à|a)?\\s*(\\d{1,4})\\s+("+ways+"\\b[\\s\\S]{1,90})$","iu"));
  if(m)return {street:clean(m[1]+' '+m[2]).replace(/[,:;.\s]+$/,''),postcode:cp[1],city:clean(cp[2]).replace(/[,:;.\s]+$/,'')};
 }
 return {street:'',postcode:'',city:''};
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
 const t=clean(text), ms=markers(t), out=[];
 const levelAt=i=>{let lvl='Rez-de-chaussée';for(const z of ms){if(z.i<=i)lvl=z.name;else break}return lvl};
 const canon=name=>{
  name=clean(name);
  if(/^pi[eè]ce$/i.test(name))return 'Bureau';
  return name;
 };
 const push=(name,val,index)=>{
  if(!Number.isFinite(val))return;
  name=canon(name);
  const cat=/garage|cave|grenier|atelier|dépendance|local|abri|cabanon|carport/i.test(name)?'Annexe':/terrasse|balcon|loggia/i.test(name)?'Extérieur':'Intérieur';
  const lvl=/cabanon|abri/i.test(name)?'Extérieur':levelAt(index);
  out.push({lvl,name,val,cat});
 };
 const grouped=[];
 const grp=/\b(?:deux|2)\s+chambres?\s*(?:de|mesurant|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)?\s*(?:et|,)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/ig;
 for(const m of t.matchAll(grp)){push('Chambre 1',n(m[1]),m.index);push('Chambre 2',n(m[2]),m.index);grouped.push([m.index,m.index+m[0].length]);}

 const token=/\b(s[ée]jour|salon|salle à manger|cuisine|chambre(?:\s*(?:\d+|un|une|deux|trois|parentale))?|bureau|pi[eè]ce|salle d[' ]eau|salle de bains?|wc|toilettes?|d[ée]gagement|couloir|entr[ée]e|hall|cellier|buanderie|dressing|palier|mezzanine|garage|cave|grenier|atelier|d[ée]pendance|local|abri|cabanon|carport|terrasse|balcon|loggia)\b/ig;
 const marks=[...t.matchAll(token)].map(m=>({name:m[1],i:m.index,end:m.index+m[0].length}));
 for(let k=0;k<marks.length;k++){
  const m=marks[k]; if(grouped.some(([a,b])=>m.i>=a&&m.i<b))continue;
  // Ignore negated WC ("sans WC", "pas de WC")
  const pre=t.slice(Math.max(0,m.i-14),m.i);
  if(/(?:sans|pas\s+de)\s*$/i.test(pre)&&/^(wc|toilettes?)$/i.test(m.name))continue;
  const stop=k+1<marks.length?marks[k+1].i:Math.min(t.length,m.end+140);
  let chunk=t.slice(m.end,stop);

  // "pièce de 8,20 m² faisant office de bureau"
  if(/^pi[eè]ce$/i.test(m.name)&&!/faisant\s+office\s+de\s+bureau/i.test(chunk))continue;

  // Explicit correction semantics for a room: "tu prends le couloir qui fait 4,90 m²"
  // wins over earlier values for the same level/name.
  // A correction is applied only by the named-room correction pass below.
  // This prevents a later correction (e.g. corridor) being stolen by mezzanine/garage/entry.
  let sm=chunk.match(/(?:\bde\b|\bmesurant\b|\bfait\b|\b:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
  if(sm)push(m.name,n(sm[1]),m.i);
 }
 // Last explicit correction for named room replaces previous candidates.
 const corrections=/\b(?:tu\s+prends|je\s+corrige|rectification|finalement)\b[^.!?]{0,90}?\b(s[ée]jour|salon|cuisine|chambre|bureau|salle d[' ]eau|salle de bains?|wc|d[ée]gagement|couloir|entr[ée]e|cellier|buanderie|garage)\b[^.!?]{0,60}?\b(?:fait|de|à|a)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/ig;
 for(const c of t.matchAll(corrections)){
   const lvl=levelAt(c.index), nm=clean(c[1]).toLowerCase();
   for(let i=out.length-1;i>=0;i--)if(out[i].lvl===lvl&&out[i].name.toLowerCase()===nm)out.splice(i,1);
   push(c[1],n(c[2]),c.index);
 }
 const final=[];
 for(const x of out){
  const nm=x.name.toLowerCase();
  if(/^chambre/.test(nm)){final.push(x);continue;}
  const pos=final.findIndex(y=>y.lvl===x.lvl&&y.name.toLowerCase()===nm);
  if(pos>=0)final[pos]=x;else final.push(x);
 }
 const seen=new Set();
 return final.filter(x=>{const k=x.lvl+'|'+x.name.toLowerCase()+'|'+x.val;if(seen.has(k))return false;seen.add(k);return true});
}
function declaredPropertySurface(text){
 const m=clean(text).match(/\b(?:maison|villa|appartement|studio|immeuble|local commercial)\s+(?:d['’]une\s+surface\s+de|de|fait|mesure)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
 return m?n(m[1]):null;
}

// V13.12 — surfaces : distinction surface habitable / Carrez.
// Surface habitable : calcul indicatif à partir des seules pièces dictées admissibles.
// Sont exclus ici : annexes/extérieurs, sous-sol, garage/cave/remise/dépendances,
// véranda et toute partie explicitement annoncée sous 1,80 m.
function habitableRows(rows,text){
 const lowHeight=/\b(?:hauteur|sous plafond)[^.!?]{0,35}(?:inf[eé]rieure?\s+[àa]|moins de)\s*1[,.]80\s*m/i.test(text);
 return rows.filter(x=>{
  if(x.cat!=='Intérieur')return false;
  if(/^Sous-sol$/i.test(x.lvl))return false;
  if(/garage|cave|remise|grenier|atelier|d[ée]pendance|local|abri|carport|terrasse|balcon|loggia|v[ée]randa/i.test(x.name))return false;
  // Si une hauteur <1,80 m est signalée sans ventilation de surface, on ne peut pas
  // retrancher un chiffre fiable : le total est conservé mais signalé à vérifier.
  return true;
 });
}
function explicitCarrez(text){
 const m=clean(text).match(/\b(?:surface\s+)?(?:loi\s+)?carrez\s*(?:de|est|:|fait|mesure)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres? carr[ée]s?)/i);
 return m?n(m[1]):null;
}
function explicitHabitable(t){
 const m=clean(t).match(/\bsurface\s+habitable(?:\s+(?:de|est|:))?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
 return m?n(m[1]):null;
}
let manualSurfaceRows=[],manualLevels=[];
function normalizeManualLevels(rows){
 rows.forEach(x=>{if(x.cat==='Intérieur'&&(!x.lvl||x.lvl==='Niveau non précisé'))x.lvl='Rez-de-chaussée'});
 const found=uniq(rows.filter(x=>x.cat==='Intérieur').map(x=>x.lvl));
 if(!manualLevels.length)manualLevels=found.slice();
 found.forEach(x=>{if(!manualLevels.includes(x))manualLevels.push(x)});
 if(!manualLevels.length)manualLevels=['RDC'];
}
function surfaceEditorHTML(rows){
 manualSurfaceRows=rows.map((x,i)=>({...x,_id:'s'+Date.now()+'_'+i}));
 manualLevels=[];normalizeManualLevels(manualSurfaceRows);surfaceUndo=[];surfaceRedo=[];rememberSurfaceState();return renderSurfaceEditor();
}
function renderSurfaceEditor(){
 normalizeManualLevels(manualSurfaceRows);
 const ins=manualSurfaceRows.filter(x=>x.cat==='Intérieur');
 let s='<section class="surfaceHero surfaceEditor"><div class="surfaceHead"><h3>📐 SURFACES CALCULÉES PAR NIVEAU</h3><div class="surfaceToolbar"><button type="button" class="miniEditBtn" data-act="add-level">＋ Ajouter un niveau</button></div></div>';
 manualLevels.forEach(lv=>{
  const rr=ins.filter(x=>x.lvl===lv),total=rr.reduce((a,x)=>a+x.val,0);
  s+=`<div class="levelBlock" data-level="${E(lv)}"><div class="levelHead"><input class="levelName" value="${E(lv)}"><div class="levelActions"><button type="button" data-act="level-up" title="Monter le niveau">↑</button><button type="button" data-act="level-down" title="Descendre le niveau">↓</button><button type="button" data-act="delete-level" title="Supprimer le niveau">🗑</button></div></div>`;
  rr.forEach(x=>{const opts=manualLevels.map(z=>`<option ${z===lv?'selected':''}>${E(z)}</option>`).join('');
   s+=`<div class="surfaceRow editableSurface" data-id="${E(x._id)}"><input class="pieceName" value="${E(x.name)}"><input class="pieceVal" type="number" step=".01" value="${Number(x.val)}"><span class="unit">m²</span><select class="pieceLevel">${opts}</select><button type="button" data-act="piece-up" title="Monter">↑</button><button type="button" data-act="piece-down" title="Descendre">↓</button><button type="button" data-act="delete-piece" title="Supprimer">×</button></div>`;
  });
  s+=`<button type="button" class="miniEditBtn" data-act="add-piece">＋ Ajouter une pièce</button><div class="surfaceTotal"><span>Total ${E(lv)}</span><strong>${fmt(total)}</strong></div></div>`;
 });
 const total=ins.reduce((a,x)=>a+x.val,0);
 s+=`<div class="grandTotal"><span>TOTAL DES PIÈCES INTÉRIEURES RENSEIGNÉES</span><strong>${fmt(total)}</strong></div>`;
 const ann=manualSurfaceRows.filter(x=>x.cat==='Annexe'),ext=manualSurfaceRows.filter(x=>x.cat==='Extérieur');
 if(ann.length)s+=`<div class="otherSurface"><h4 contenteditable="true">🏚️ Annexes — hors total intérieur</h4>${ann.map(x=>`<div class="surfaceRow"><span contenteditable="true">${E(x.name)} — ${E(x.lvl)}</span><b contenteditable="true">${fmt(x.val)}</b></div>`).join('')}</div>`;
 if(ext.length)s+=`<div class="otherSurface"><h4 contenteditable="true">🌳 Extérieurs — hors total intérieur</h4>${ext.map(x=>`<div class="surfaceRow"><span contenteditable="true">${E(x.name)} — ${E(x.lvl)}</span><b contenteditable="true">${fmt(x.val)}</b></div>`).join('')}</div>`;
 return s+'</section>';
}
let surfaceUndo=[],surfaceRedo=[],surfaceRestoring=false;
function surfaceSnapshot(){return JSON.stringify({rows:manualSurfaceRows,levels:manualLevels})}
function rememberSurfaceState(){
 if(surfaceRestoring)return;
 const snap=surfaceSnapshot();
 if(surfaceUndo[surfaceUndo.length-1]!==snap)surfaceUndo.push(snap);
 if(surfaceUndo.length>40)surfaceUndo.shift();
 surfaceRedo=[];
}
function restoreSurfaceState(snap){
 if(!snap)return;surfaceRestoring=true;
 const o=JSON.parse(snap);manualSurfaceRows=o.rows||[];manualLevels=o.levels||[];
 surfaceRestoring=false;refreshSurfaceEditor();
}
function undoSurface(){
 if(surfaceUndo.length<2)return;
 surfaceRedo.push(surfaceUndo.pop());restoreSurfaceState(surfaceUndo[surfaceUndo.length-1]);
}
function redoSurface(){
 if(!surfaceRedo.length)return;
 const s=surfaceRedo.pop();surfaceUndo.push(s);restoreSurfaceState(s);
}
function refreshSurfaceEditor(){
 const box=document.querySelector('#facts .surfaceEditor');if(!box)return;
 const d=document.createElement('div');d.innerHTML=renderSurfaceEditor();box.replaceWith(d.firstElementChild);
 const total=manualSurfaceRows.filter(x=>x.cat==='Intérieur').reduce((a,x)=>a+x.val,0);
 if($('#surfaceHab'))$('#surfaceHab').value=total?total.toFixed(2):'';
 if(!surfaceRestoring)rememberSurfaceState();
}
function surfaceRowById(id){return manualSurfaceRows.find(x=>x._id===id)}
function movePiece(id,dir){
 const x=surfaceRowById(id);if(!x)return;const same=manualSurfaceRows.filter(y=>y.cat==='Intérieur'&&y.lvl===x.lvl);
 const pos=same.findIndex(y=>y._id===id),other=same[pos+dir];if(!other)return;
 const ia=manualSurfaceRows.indexOf(x),ib=manualSurfaceRows.indexOf(other);[manualSurfaceRows[ia],manualSurfaceRows[ib]]=[manualSurfaceRows[ib],manualSurfaceRows[ia]];refreshSurfaceEditor();
}
function deleteLevel(lv){
 const pieces=manualSurfaceRows.filter(x=>x.cat==='Intérieur'&&x.lvl===lv),others=manualLevels.filter(x=>x!==lv);
 if(pieces.length){if(!others.length){alert('Ajoute un autre niveau avant de supprimer celui-ci.');return}
  const target=prompt('Ce niveau contient des pièces. Vers quel niveau les déplacer ?\\n'+others.join(' / '),others[0]);if(!target||!others.includes(target))return;pieces.forEach(x=>x.lvl=target);}
 manualLevels=manualLevels.filter(x=>x!==lv);refreshSurfaceEditor();
}
// V13.9 — extraction factuelle : une information = un fait immobilier.
function clauses(t){
 const x=clean(t).replace(/\s+(?=(?:présence|absence|la maison|le bien|il y a|avec|sans|compteur|chauffage|eau chaude|fibre|assainissement|charpente|toiture|façade|jardin|terrasse|cabanon|taxe foncière)\b)/gi,'. ');
 return x.split(/(?<=[.!?;])\s+|\s*,\s*(?=(?:présence|absence|compteur|fibre|assainissement|charpente|toiture|façade|jardin|terrasse|cabanon)\b)/i).map(clean).filter(Boolean);
}
function factClause(t,rx){return clauses(t).filter(c=>rx.test(c));}
function locAfter(c,rx){
 const m=c.match(rx); if(!m)return '';
 return clean(m[1]||'').replace(/\s+(?:pour|avec|et|mais|qui|la maison|le bien)\b.*$/i,'').replace(/[,. ]+$/,'');
}
function countExplicit(t,nounRx){
 const m=t.match(new RegExp('\\b(\\d+)\\s+(?:'+nounRx+')','i'));return m?parseInt(m[1],10):null;
}
function sanitary(t){
 const rows=[],s=clean(t);
 const m=s.match(/\bsalle de bains?\b([\s\S]{0,120}?)(?=\b(?:couloir|d[ée]gagement|garage|chambre|cuisine|salon|s[ée]jour|piscine|jardin|terrasse|parcelles?|$)\b)/i);
 if(m){const c=m[0];let v='1 salle de bains';const sm=c.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);if(sm)v+=' — '+fmt(n(sm[1]));const eq=[];if(/\bdouche\b/i.test(c))eq.push('douche');if(/\bbaignoire\b/i.test(c))eq.push('baignoire');if(/(?:deux|2|double)\s+vasques?|double vasque/i.test(c))eq.push('double vasque');else if(/\bvasque\b/i.test(c))eq.push('vasque');if(eq.length)v+=' — '+eq.join(' · ');rows.push(['Salle de bains',v]);}
 const e=s.match(/\bsalle d[' ]eau\b([\s\S]{0,120}?)(?=\b(?:couloir|d[ée]gagement|garage|chambre|cuisine|salon|s[ée]jour|piscine|jardin|terrasse|parcelles?|$)\b)/i);
 if(e){let v="1 salle d’eau";const sm=e[0].match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);if(sm)v+=' — '+fmt(n(sm[1]));if(/douche\s+pmr/i.test(e[0]))v+=" — douche PMR";else if(/douche à l[' ]italienne/i.test(e[0]))v+=" — douche à l’italienne";if(/\bsans\s+wc\b/i.test(e[0]))v+=" — sans WC";rows.push(["Salle d’eau",v]);}
 const positive=s.replace(/\b(?:sans|pas\s+de)\s+(?:wc|toilettes?)\b/gi,'');
 const wc=countExplicit(positive,'wc|toilettes?');if(wc)rows.push(['WC',String(wc)]);else if(/\b(?:wc|toilettes?)\b/i.test(positive))rows.push(['WC','Présent']);
 return rows;
}
function heating(t){
 const heat=[];
 if(/chaudi[eè]re[^.!?]{0,70}condensation[^.!?]{0,40}gaz|chaudi[eè]re[^.!?]{0,40}gaz[^.!?]{0,40}condensation/i.test(t))heat.push('Chaudière gaz à condensation');
 else if(/chaudi[eè]re[^.!?]{0,40}gaz/i.test(t))heat.push('Chaudière gaz');
 if(/po[eê]le[^.!?]{0,25}bois/i.test(t))heat.push('Poêle à bois');if(/po[eê]le[^.!?]{0,25}granul/i.test(t))heat.push('Poêle à granulés');
 if(/radiateurs?[^.!?]{0,30}[ée]lectriques?/i.test(t))heat.push('Radiateurs électriques');
 let ecs='';
 if(/(?:eau chaude|ecs|production d[' ]eau chaude)[^.!?]{0,100}chaudi[eè]re|chaudi[eè]re[^.!?]{0,100}(?:eau chaude|ecs|production d[' ]eau chaude)/i.test(t)) ecs=/condensation/i.test(t)&&/gaz/i.test(t)?'Chaudière gaz à condensation':'Chaudière';
 else if(/ballon thermodynamique/i.test(t))ecs='Ballon thermodynamique';else if(/cumulus|ballon[^.!?]{0,30}[ée]lectrique/i.test(t))ecs='Ballon électrique';
 return [['Mode(s) de chauffage',uniq(heat).join(' + ')],["Production d'eau chaude",ecs]];
}
function networks(t){
 const rows=[],cl=clauses(t);
 const linky=cl.find(c=>/\blinky\b/i.test(c));
 if(linky){let loc=locAfter(linky,/(?:linky|compteur linky)[^,.!?]{0,30}?(?:dans|au|à l['’]|sur)\s+([^,.!?]{2,40})/i);rows.push(['Électricité','Compteur Linky'+(loc?' — localisation : '+loc:'')]);}
 const elec=cl.find(c=>/installation [ée]lectrique|tableau [ée]lectrique/i.test(c));if(elec&&!linky)rows.push(['Électricité',clean(elec)]);
 const water=cl.find(c=>/compteur d['’ ]?eau|compteur eau/i.test(c));
 if(water){let loc=locAfter(water,/compteur d['’ ]?eau[^,.!?]{0,35}?(?:est|se trouve|situ[ée])?\s*(?:dans|au|à l['’]|sur)\s+([^,.!?]{2,40})/i);if(!loc&&/extérieur/i.test(water))loc='extérieur';rows.push(['Eau','Compteur d’eau'+(loc?' — localisation : '+loc:'')]);}
 const gas=cl.find(c=>/compteur (?:de )?gaz/i.test(c));if(gas){let loc=locAfter(gas,/compteur (?:de )?gaz[^,.!?]{0,35}?(?:dans|au|à l['’]|sur)\s+([^,.!?]{2,40})/i);rows.push(['Gaz','Compteur gaz'+(loc?' — localisation : '+loc:'')]);}
 if(/tout[- ]à[- ]l['’ ]égout|tout à l['’ ]égout/i.test(t))rows.push(['Assainissement',"Raccordé au tout-à-l'égout"]);
 const fibre=cl.find(c=>/\bfibre\b/i.test(c));
 if(fibre){
  const neg=/(?:pas|non)\s+(?:de\s+)?(?:connexion|connect[ée]e?|raccord[ée]e?)\s+(?:à\s+)?la?\s*fibre|fibre[^.!?]{0,70}(?:pas|non)\s+(?:connect[ée]e?|raccord[ée]e?)/i.test(fibre);
  const prise=/prise\s+(?:de\s+)?fibre|prise\s+fibre/i.test(fibre);
  rows.push(['Fibre',neg?'Non raccordée / non connectée':'Raccordement fibre mentionné']);
  if(prise){let loc='';if(/salon/i.test(fibre))loc='salon';else if(/s[ée]jour/i.test(fibre))loc='séjour';rows.push(['Prise fibre','Présente'+(loc?' — '+loc:'')]);}
 }
 if(/adoucisseur/i.test(t)){const c=cl.find(x=>/adoucisseur/i.test(x))||'';let loc=/buanderie/i.test(c)?'buanderie':'';rows.push(['Adoucisseur','Présent'+(loc?' — '+loc:'')]);}
 return rows;
}
function annexes(t){
 const r=[],ss=surfaces(t),garage=ss.find(x=>x.cat==='Annexe'&&/\bgarage\b/i.test(x.name));
 if(/\bgarage\b/i.test(t)){let v='Garage';if(garage)v+=' — '+fmt(garage.val);if(/garage[^.!?]{0,130}mezzanine|mezzanine[^.!?]{0,130}garage/i.test(t))v+=' — avec mezzanine';r.push(['Garage',v]);}
 if(/\bbuanderie\b/i.test(t))r.push(['Buanderie','Présente']);if(/\bcellier\b/i.test(t))r.push(['Cellier','Présent']);if(/\bcave\b/i.test(t))r.push(['Cave','Présente']);if(/\batelier\b/i.test(t))r.push(['Atelier','Présent']);
 const cab=clean(t).match(/\b(?:cabanon|abri de jardin)\b[^.!?]{0,100}/i);if(cab){const m=cab[0].match(/(\d+(?:[.,]\d+)?)\s*(?:-|à|a)?\s*(\d+(?:[.,]\d+)?)?\s*m[²2]/i);let v=/fer|m[ée]tal/i.test(cab[0])?'Cabanon métallique':'Cabanon';if(m)v+=' — env. '+m[1]+(m[2]?' à '+m[2]:'')+' m²';if(/outil/i.test(cab[0]))v+=' — rangement outils';r.push(['Cabanon / abri',v]);}
 return r;
}
function menu(t){
 const men=uniq([/pvc blanc/i.test(t)?'PVC blanc':'',/double vitrage/i.test(t)?'Double vitrage':'',/triple vitrage/i.test(t)?'Triple vitrage':'',/\baluminium\b|\balu\b/i.test(t)?'Aluminium':'']);
 const shut=uniq([/volets? roulants?[^.!?]{0,35}[ée]lectriques?/i.test(t)?'Volets roulants électriques':'',/moustiquaires?/i.test(t)?(/rez[- ]de[- ]chauss[ée]e|\brdc\b/i.test((factClause(t,/moustiquaires?/i)[0]||''))?'Moustiquaires au rez-de-chaussée':'Moustiquaires'):'']);
 return [['Menuiseries / vitrages',men.join(' · ')],['Fermetures',shut.join(' · ')]];
}
function structure(t){
 const r=[],cl=clauses(t);
 const charp=cl.find(c=>/charpente|plafonnette|plancher béton|dalle béton/i.test(c));if(charp){let v='';if(/béton/i.test(charp))v='Structure / charpente béton';if(/plafonnette/i.test(charp))v+=(v?' — ':'')+'plafonnettes mentionnées';if(/pas de bois|sans bois/i.test(charp))v+=(v?' — ':'')+'absence de bois signalée';r.push(['Charpente / structure',v||clean(charp)]);}
 const comb=cl.find(c=>/trappe|accès[^.!?]{0,30}combles?|combles?[^.!?]{0,30}accès/i.test(c));if(comb){let v='Accès aux combles';if(/haut de l['’]escalier|en haut de l['’]escalier/i.test(comb))v+=' — en haut de l’escalier';r.push(['Combles',v]);}
 const facade=cl.find(c=>/façade|crépi|enduit/i.test(c));if(facade&&/retrait|décollement|fissure/i.test(facade))r.push(['Façade / enduit',/retrait de cr[eé]pi/i.test(facade)?'Retrait de crépi signalé':clean(facade)]);
 return r;
}
function exteriors(t){
 const r=[],cl=clauses(t);
 const garden=cl.find(c=>/\bjardin\b/i.test(c));
 if(garden){let v='Présent';if(/tr[eè]s bien entretenu|parfaitement entretenu/i.test(garden))v+=' — très bien entretenu';else if(/bien entretenu/i.test(garden))v+=' — bien entretenu';if(/arbres?|arbor[ée]/i.test(garden))v+=' — arboré';r.push(['Jardin',v]);}
 const pool=cl.find(c=>/\bpiscine\b/i.test(c));
 if(pool){let v='Présente';if(/haricot/i.test(pool))v+=' — forme haricot';if(/coque/i.test(pool))v+=' — coque';r.push(['Piscine',v]);}
 if(/terrain de p[ée]tanque|boulodrome/i.test(t))r.push(['Terrain de pétanque','Présent']);
 if(/cuisine d['’ ]?[ée]t[ée]/i.test(t))r.push(["Cuisine d’été",'Présente']);
 const terrace=cl.find(c=>/\bterrasse\b/i.test(c));if(terrace){let v='Présente';if(/arri[eè]re/i.test(terrace))v+=' — arrière';if(/salon/i.test(terrace))v+=' — liaison avec le salon';r.push(['Terrasse',v]);}
 return r;
}

function finance(t){
 const r=[];
 const m=t.match(/taxe fonci[eè]re[^.!?]{0,90}?(\d[\d\s]*(?:[.,]\d+)?)\s*(?:€|euros?)/i);
 if(m){let v=m[1].replace(/\s/g,'')+' €';const frag=(factClause(t,/taxe fonci[eè]re/i)[0]||'');if(/ordures m[ée]nag[eè]res|tom/i.test(frag))v+=' — montant indiqué comme correspondant uniquement aux ordures ménagères';r.push(['Taxe foncière / fiscalité',v]);}
 return r;
}
function state(t){
 const r=[];if(/pas de fissures? apparentes?|aucune fissure apparente/i.test(t))r.push(['Fissures','Aucune fissure apparente signalée']);
 if(/retrait de cr[eé]pi/i.test(t))r.push(['Enduit / crépi','Retrait de crépi signalé']);if(/humidit[ée]/i.test(t))r.push(['Humidité','Humidité signalée']);return r;
}
async function normalizeCommune(q,postcode=''){
 if(!q)return null;
 const query=[postcode,q].filter(Boolean).join(' ').trim();
 try{
  const r=await fetch('/api/commune?q='+encodeURIComponent([q,postcode].filter(Boolean).join(' '))),j=await r.json();
  if(r.ok&&j.result){
   $('#cadCommune').value=j.result.name||q;
   $('#cadCommune').dataset.insee=j.result.code||'';
   $('#cadCommune').dataset.postcode=j.result.postcode||postcode||'';
   return j.result;
  }
 }catch(e){}
 if(!$('#cadCommune').value)$('#cadCommune').value=q;
 return null;
}
function ensureCadPlanBox(){
 let box=document.getElementById('cadPlanBox');if(box)return box;
 const status=$('#cadStatus');box=document.createElement('div');box.id='cadPlanBox';box.style.marginTop='10px';
 status.parentNode.insertBefore(box,status.nextSibling);return box;
}
function multiRefsParam(){return cadParcels.map(p=>p.section+':'+parseInt(p.numero,10)).join(',')}
function renderMultiCadPlan(){
 const box=ensureCadPlanBox();box.innerHTML='';
 if(!cadParcels.length)return;
 const com=$('#cadCommune')?.value?.trim();if(!com)return;
 const title=document.createElement('div');title.innerHTML='<b>Plan cadastral — '+E(com)+' — '+cadParcels.map(p=>E(p.section)+' '+parseInt(p.numero,10)).join(' • ')+'</b>';
 const img=document.createElement('img');img.alt='Plan cadastral des parcelles';img.style.cssText='display:block;width:100%;max-width:720px;max-height:500px;object-fit:contain;margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#fff';
 img.src='/api/cadastre/multi-map.png?commune='+encodeURIComponent($('#cadCommune').dataset.insee||com)+'&refs='+encodeURIComponent(multiRefsParam())+'&v=13.36';
 img.dataset.cadMap='1';
 const link=document.createElement('a');link.href=img.src;link.target='_blank';link.rel='noopener';link.textContent='Ouvrir le plan cadastral';link.style.cssText='display:inline-block;margin-top:8px';
 box.append(title,img,link);
}
async function parcelSearch(){
 const field=$('#cadCommune'),sec=$('#cadSection').value.trim().toUpperCase(),par=$('#cadParcel').value.trim();
 let com=field.value.trim();
 if(sec&&par){
  addCadParcel(sec,par,false);
  $('#cadSection').value='';
  $('#cadParcel').value='';
 }
 if(!com||!cadParcels.length){$('#cadStatus').textContent='Commune et au moins une parcelle nécessaires.';return}
 $('#cadStatus').textContent='Vérification des parcelles…';
 try{
  let insee=field.dataset.insee||'';
  if(!insee){const n=await normalizeCommune(com,field.dataset.postcode||'');if(n){insee=n.code||'';com=n.name||com}}
  const verified=[];
  for(const p of cadParcels){
   const r=await fetch(`/api/cadastre?commune=${encodeURIComponent(insee||com)}&section=${encodeURIComponent(p.section)}&numero=${encodeURIComponent(p.numero)}`),j=await r.json();
   if(!r.ok)throw new Error(j.detail||'Erreur');
   if(j.found){verified.push({...p,section:j.section||p.section,numero:String(parseInt(j.numero,10)),found:true});field.value=j.commune||com;field.dataset.insee=j.code_insee||insee}
   else verified.push({...p,found:false});
  }
  cadParcels=verified;syncCadParcels();
  const ok=cadParcels.filter(x=>x.found),bad=cadParcels.filter(x=>!x.found);
  $('#cadStatus').textContent=`✓ ${ok.length} parcelle(s) trouvée(s)`+(bad.length?` — ${bad.length} non trouvée(s)`:'');
  if(ok.length)renderMultiCadPlan();
 }catch(e){$('#cadStatus').textContent='Recherche impossible : '+e.message}
}

async function render(){
 const raw=$('#notes').value||'',corr=$('#correction').value||'',t=clean(raw+' '+corr);
 const o=owner(t);if(o&&!$('#owner').value)$('#owner').value=o;
 const ph=phone(t);if(ph)$('#ownerPhone').value=ph;
 const a=address(t);if(a&&a.street){$('#address').value=a.street;$('#cadCommune').value=a.city;$('#cadCommune').dataset.postcode=a.postcode||'';$('#cadCommune').dataset.insee='';await normalizeCommune(a.city,a.postcode||'');}
 const cps=parseCadParcels(t);if(cps.length){cps.forEach(p=>addCadParcel(p.section,p.numero,false));$('#cadSection').value='';$('#cadParcel').value='';}
 const cm=commune(t);
 if(cm&&!$('#cadCommune').value){
  $('#cadCommune').value=cm.name;
  $('#cadCommune').dataset.postcode=cm.postcode||'';
  await normalizeCommune(cm.name,cm.postcode);
 }
 const typ=typeOf(t);if(typ&&!$('#type').value)$('#type').value=typ;applyPropertyTheme();
 const ss=surfaces(t), habRows=habitableRows(ss,t), total=habRows.reduce((a,x)=>a+x.val,0);
 const habDeclared=explicitHabitable(t), announced=declaredPropertySurface(t), carrez=explicitCarrez(t);
 if(habDeclared!=null)$('#surfaceHab').value=habDeclared.toFixed(2);
 else if(total)$('#surfaceHab').value=total.toFixed(2);
 else $('#surfaceHab').value='';
 if(carrez!=null)$('#surfaceCarrez').value=carrez.toFixed(2);
 let topRows=buildInfo(t);
 if(announced!=null)topRows.push(['Surface annoncée / dictée',fmt(announced)]);
 let out='<div class="proGrid">'+card('Bien & construction','🏠',topRows)+'</div>';
 out+=surfaceEditorHTML(ss);
 if(total){
   let msg=`<div class="calculatedTop">📏 <span>Surface habitable calculée sur les pièces admissibles chiffrées</span><strong>${fmt(total)}</strong></div>`;
   if(announced!=null && Math.abs(announced-total)>.01)msg+=`<div class="status">⚠ Surface annoncée : ${fmt(announced)} — total des pièces chiffrées : ${fmt(total)}. Écart conservé à contrôler ; aucune valeur n’est supprimée.</div>`;
   out+=msg;
 }
 out+='<div class="proGrid">';
 out+=card('Sanitaires','🚿',sanitary(t))+card('Chauffage & eau chaude','🔥',heating(t))+card('Réseaux & compteurs','⚡',networks(t))+card('Construction / structure','🏗️',structure(t))+card('Annexes','🏚️',annexes(t))+card('Extérieurs','🌳',exteriors(t))+card('Menuiseries & fermetures','🪟',menu(t))+card('État / désordres','⚠️',state(t))+card('Fiscalité','💶',finance(t));
 out+='</div>';
 const extras=[];
 if(/couloir de distribution/i.test(t))extras.push(['Circulation','Couloir de distribution — surface non renseignée']);
 const cuisineInfos=[];
 if(/cuisine ouverte/i.test(t))cuisineInfos.push('Ouverte');
 if(/cuisine[^.!?]{0,50}[ée]quip[ée]e/i.test(t))cuisineInfos.push('Équipée');
 if(cuisineInfos.length)extras.push(['Cuisine',uniq(cuisineInfos).join(' · ')]);
 if(extras.length)out+=card('Informations complémentaires conservées','📌',extras);
 out+='<details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>'+E(raw)+'</div></details>';
 $('#facts').innerHTML=out;
}

function propertyTheme(){
 const t=low($('#type')?.value||'');
 if(/appartement|studio|t[1-9]/.test(t))return {key:'appartement',color:'#2563A6'};
 if(/terrain/.test(t))return {key:'terrain',color:'#B7791F'};
 if(/immeuble/.test(t))return {key:'immeuble',color:'#8B2F45'};
 if(/local|commerce|commercial|professionnel|bureau/.test(t))return {key:'local',color:'#7651A8'};
 if(/garage|parking|box/.test(t))return {key:'garage',color:'#64748B'};
 if(/maison|villa|pavillon/.test(t))return {key:'maison',color:'#2F7D5A'};
 return {key:'autre',color:'#49697D'};
}
function applyPropertyTheme(){const th=propertyTheme();document.documentElement.style.setProperty('--property-color',th.color);document.body.dataset.propertyTheme=th.key}
function ficheTitle(){
 const owner=$('#owner')?.value?.trim()||'Sans propriétaire';
 const addr=$('#address')?.value?.trim()||'Adresse non renseignée';
 return `Fiche de visite — ${owner} — ${addr}`;
}

async function verifyAddressV137(){
 const input=$('#address'), original=input?.value?.trim(); if(!original)return;
 const commune=$('#cadCommune')?.value?.trim()||'';
 const insee=$('#cadCommune')?.dataset.insee||'';
 const cp=$('#cadCommune')?.dataset.postcode||((original.match(/\b\d{5}\b/)||[])[0]||'');
 $('#addressStatus').textContent='Vérification dans la Base Adresse Nationale (adresses issues des BAL)…';
 try{
  const qs=new URLSearchParams({q:original}); if(cp)qs.set('postcode',cp); if(commune&&!/^\d{5}$/.test(commune))qs.set('city',commune); if(insee)qs.set('citycode',insee);
  const r=await fetch('/api/geocode?'+qs.toString()), j=await r.json(); if(!r.ok)throw new Error(j.detail||'Recherche impossible');
  const x=(j.results||[])[0];
  if(!x){ $('#addressStatus').textContent='⚠ Adresse non retrouvée dans la BAL/BAN pour cette commune — adresse dictée conservée.'; return; }
  input.value=x.label||original;
  if(x.city){$('#cadCommune').value=x.city;$('#cadCommune').dataset.insee=x.citycode||insee;$('#cadCommune').dataset.postcode=x.postcode||cp}
  $('#addressStatus').textContent='✓ Adresse vérifiée dans la BAL/BAN : '+(x.label||original);
 }catch(e){ $('#addressStatus').textContent='⚠ Vérification indisponible — adresse dictée conservée.'; }
}
function cadMapURL(){
 const c=$('#cadCommune')?.value?.trim();
 if(c&&cadParcels.length)return '/api/cadastre/multi-map.png?commune='+encodeURIComponent($('#cadCommune').dataset.insee||c)+'&refs='+encodeURIComponent(multiRefsParam())+'&v=13.36';
 return '';
}

let photoItemsState=[];
function photoDisplayName(file){return (file?.name||'Photo').replace(/\.[^.]+$/,'')}
function renderPhotoManager(){
 const box=$('#photoManager');if(!box)return;
 if(!photoItemsState.length){box.innerHTML='';return}
 const selected=photoItemsState.filter(p=>p.selected).length;
 box.innerHTML=`<div class="photoManagerHead">
   <h3>📷 Photos du dossier <span class="photoCount">(${photoItemsState.length})</span></h3>
   <div class="photoBulkActions">
    <label class="photoSelectAll"><input id="photoSelectAll" type="checkbox" ${selected===photoItemsState.length?'checked':''}> Tout sélectionner</label>
    <button type="button" id="deleteSelectedPhotos" class="deleteSelectedPhotos" ${selected?'':'disabled'}>🗑 Supprimer les photos sélectionnées${selected?' ('+selected+')':''}</button>
   </div>
  </div><div class="photoManageGrid">`+photoItemsState.map((p,i)=>`
  <div class="photoManageCard ${p.selected?'selected':''}" data-photo="${i}">
   <label class="photoCheck" title="Sélectionner cette photo"><input type="checkbox" class="photoSelect" ${p.selected?'checked':''}></label>
   <img src="${p.url}" alt="${E(p.label)}">
   <input class="photoLabel" value="${E(p.label)}" title="Nom de la photo">
   <div class="photoActions">
    <button type="button" data-photo-act="left" title="Déplacer avant">←</button>
    <button type="button" data-photo-act="right" title="Déplacer après">→</button>
    <button type="button" data-photo-act="delete" title="Supprimer">×</button>
   </div>
  </div>`).join('')+'</div>';
}
function currentPhotos(){return photoItemsState}
function initPhotos(files){
 const added=[...files].filter(f=>/^image\//i.test(f.type||'')).map(f=>({file:f,label:photoDisplayName(f),url:URL.createObjectURL(f),selected:false}));
 photoItemsState.push(...added); // ajout cumulatif : ne remplace jamais les photos déjà présentes
 if($('#gallery'))$('#gallery').innerHTML='';
 const input=$('#photos');if(input)input.value=''; // permet de reprendre ensuite la même photo si nécessaire
 renderPhotoManager();globalCheckpoint();
}

async function fileToDataURL(file){
 return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
}
async function optimizedPhotoDataURL(file,maxSide=800,quality=.58){
 // Optimisation uniquement pour les documents : l'original sélectionné reste inchangé.
 if(!file || !/^image\//i.test(file.type||''))return fileToDataURL(file);
 const src=await fileToDataURL(file);
 return await new Promise(resolve=>{
  const im=new Image();
  im.onload=()=>{
   let w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
   const scale=Math.min(1,maxSide/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
   const c=document.createElement('canvas');c.width=w;c.height=h;
   const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(im,0,0,w,h);
   try{resolve(c.toDataURL('image/jpeg',quality))}catch{resolve(src)}
  };
  im.onerror=()=>resolve(src);im.src=src;
 });
}
async function buildExportPayload(){
 const sections=[];
 document.querySelectorAll('#facts .levelBlock').forEach(b=>{const title=b.querySelector('.levelName')?.value||b.dataset.level||'Niveau';const rows=[...b.querySelectorAll('.editableSurface')].map(r=>[r.querySelector('.pieceName')?.value||'',(r.querySelector('.pieceVal')?.value||'')+(r.querySelector('.pieceVal')?.value?' m²':'')]);const total=b.querySelector('.surfaceTotal');if(total)rows.push([total.querySelector('span')?.innerText||'',total.querySelector('strong')?.innerText||'']);sections.push({title,rows})});
 document.querySelectorAll('#facts .otherSurface').forEach(b=>sections.push({title:b.querySelector('h4')?.innerText||'Surfaces annexes',rows:[...b.querySelectorAll('.surfaceRow')].map(r=>[r.querySelector('span')?.innerText||'',r.querySelector('b')?.innerText||''])}));
 document.querySelectorAll('#facts .proGroup').forEach(b=>sections.push({title:b.querySelector('h3')?.innerText||'Informations',rows:[...b.querySelectorAll('.proRow')].map(r=>[r.querySelector('span')?.innerText||'',r.querySelector('strong')?.innerText||''])}));
 const photos=[];for(const p of currentPhotos()){try{photos.push({name:p.label||photoDisplayName(p.file),data:await optimizedPhotoDataURL(p.file)})}catch{}}
 return {owner:$('#owner')?.value||'',phone:$('#ownerPhone')?.value||'',address:$('#address')?.value||'',commune:$('#cadCommune')?.value||'',section:$('#cadSection')?.value||'',parcel:$('#cadParcel')?.value||'',property_type:$('#type')?.value||'',surface:$('#surfaceHab')?.value||'',surface_carrez:$('#surfaceCarrez')?.value||'',sections,parcels:cadParcels.map(p=>({section:p.section,numero:p.numero})),facts:$('#facts')?.innerText||'',photos,generated_date:new Date().toLocaleDateString('fr-FR')};
}
async function downloadWord(){
 const payload=await buildExportPayload();
 try{
  const r=await fetch('/api/word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.detail||'Export impossible')}
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(!ct.includes('officedocument.wordprocessingml.document'))throw new Error('Le serveur n’a pas renvoyé un document Word valide');
  const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;
  a.download='Fiche_visite_'+((payload.owner||payload.address||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_'))+'.docx';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
 }catch(e){alert('Export Word impossible : '+e.message)}
}
async function printableHTML(){
 const title=ficheTitle(), facts=$('#facts')?.innerHTML||'', mapUrl=cadMapURL();
 const refsTxt=cadParcels.map(p=>`${E(p.section)} ${E(String(parseInt(p.numero,10)))}`).join(' • ');
 const mapBlock=mapUrl?`<section class="cadPrint"><h2>Plan cadastral</h2><img src="${mapUrl}" alt="Plan cadastral"><div>Parcelles : ${refsTxt}</div></section>`:'';
 const photoItems=[];
 for(const p of currentPhotos()){try{const data=await optimizedPhotoDataURL(p.file),label=p.label||photoDisplayName(p.file);photoItems.push(`<figure class="photoPrint"><img src="${data}" alt="${E(label)}"><figcaption>${E(label)}</figcaption></figure>`)}catch{}}
 const photosBlock=photoItems.length?`<section class="photosPrint"><h2>Photographies du bien</h2><div class="photoGrid">${photoItems.join('')}</div></section>`:'';
 const meta=[
  ['Propriétaire',$('#owner')?.value||''],
  ['Téléphone',$('#ownerPhone')?.value||''],
  ['Adresse',$('#address')?.value||''],
  ['Type',$('#type')?.value||''],
  ['Surface habitable',$('#surfaceHab')?.value?$('#surfaceHab').value+' m²':''],
  ['Surface Carrez',$('#surfaceCarrez')?.value?$('#surfaceCarrez').value+' m²':''],
  ['Commune / INSEE',$('#cadCommune')?.value||''],
  ['Parcelles',cadParcels.map(p=>p.section+' '+parseInt(p.numero,10)).join(' • ')]
 ].filter(x=>x[1]);
 const head=meta.map(x=>`<div class="m"><span>${E(x[0])}</span><b>${E(x[1])}</b></div>`).join('');
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${E(title)}</title>
 <style>body{font-family:Arial,sans-serif;color:#17212b;margin:28px}h1{font-size:23px;margin-bottom:5px}.date{color:#667;font-size:12px;margin-bottom:18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}.m{border:1px solid #ccd5db;border-radius:8px;padding:8px}.m span,.m b{display:block}.m span{font-size:11px;color:#667;margin-bottom:3px}.proGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.proGroup,.surfaceHero{border:1px solid #ccd5db;border-radius:10px;padding:10px;margin:0 0 10px;break-inside:avoid}.proGroup h3,.surfaceHero h3{margin:0 0 8px}.proRow,.surfaceRow,.surfaceTotal,.grandTotal{display:flex;justify-content:space-between;gap:15px;padding:5px 0;border-bottom:1px solid #eee}.grandTotal{font-weight:bold;font-size:16px}.rawNotes{margin-top:14px}.cadPrint{break-inside:avoid;margin:15px 0}.cadPrint img{width:100%;max-width:760px;border:1px solid #ccd5db;border-radius:8px}.photosPrint{margin-top:18px}.photoGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.photoPrint{margin:0;break-inside:avoid;border:1px solid #ccd5db;border-radius:8px;padding:7px}.photoPrint img{display:block;width:100%;height:220px;object-fit:contain}.photoPrint figcaption{text-align:center;font-size:11px;margin-top:6px;color:#445}.dossierHead,.calculatedTop{display:none}@media print{body{margin:10mm}.proGroup,.surfaceHero{break-inside:avoid}}</style></head><body>
 <h1>FICHE DE VISITE IMMOBILIÈRE</h1><div class="date">Document généré le ${new Date().toLocaleDateString('fr-FR')}</div><div class="meta">${head}</div>${mapBlock}${facts}${photosBlock}</body></html>`;
}
async function downloadVisit(){
 const payload=await buildExportPayload();
 try{
  const r=await fetch('/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.detail||'Export PDF impossible')}
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(!ct.includes('application/pdf'))throw new Error('Le serveur n’a pas renvoyé un vrai fichier PDF');
  const b=await r.blob(),head=new Uint8Array(await b.slice(0,5).arrayBuffer());
  if(String.fromCharCode(...head)!=='%PDF-')throw new Error('Le fichier reçu n’est pas un PDF valide');
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;
  const safe=((payload.owner||payload.address||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_'));
  a.download='Fiche_visite_'+safe+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)
 }catch(e){alert('Export PDF impossible : '+e.message)}
}
async function printVisit(){
 const w=window.open('','_blank');
 if(!w){alert("Autorise l'ouverture de fenêtre pour imprimer la fiche.");return}
 w.document.open();w.document.write(await printableHTML());w.document.close();w.focus();setTimeout(()=>w.print(),700);
}

document.addEventListener('DOMContentLoaded',()=>{
 $('#analyse')?.addEventListener('click',()=>setTimeout(render,80));
 $('#findParcel')?.addEventListener('click',parcelSearch);
 $('#checkAddress')?.addEventListener('click',verifyAddressV137);
 $('#printVisit')?.addEventListener('click',()=>withExportModal('pdf',downloadVisit,'printVisit'));
 $('#downloadVisit')?.addEventListener('click',downloadVisit);
 $('#downloadWord')?.addEventListener('click',()=>withExportModal('word',downloadWord,'downloadWord'));
 document.addEventListener('estimia:parcels-restored',loadCadParcelsFromHidden);
 loadCadParcelsFromHidden();applyPropertyTheme();
 $('#type')?.addEventListener('input',applyPropertyTheme);
});

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;const row=b.closest('.proRow');
 if(b.classList.contains('rowDelete')&&row){row.remove();return}
 if(b.classList.contains('addTextRow')){const card=b.closest('.proGroup'),d=document.createElement('div');d.className='proRow';d.innerHTML='<span contenteditable="true" spellcheck="true">Nouvelle information</span><strong contenteditable="true" spellcheck="true">À compléter</strong><button type="button" class="rowDelete">×</button>';card.insertBefore(d,b);return}
 const act=b.dataset.act;if(!act)return;const level=b.closest('.levelBlock')?.dataset.level||'',sr=b.closest('.editableSurface'),id=sr?.dataset.id;
 if(act==='add-level'){let name=clean(prompt('Nom du nouveau niveau :','')||'');if(!name||manualLevels.includes(name))return;manualLevels.push(name);refreshSurfaceEditor();}
 else if(act==='delete-level')deleteLevel(level);
 else if(act==='level-up'||act==='level-down'){const i=manualLevels.indexOf(level),j=i+(act==='level-up'?-1:1);if(i<0||j<0||j>=manualLevels.length)return;[manualLevels[i],manualLevels[j]]=[manualLevels[j],manualLevels[i]];refreshSurfaceEditor();}
 else if(act==='add-piece'){manualSurfaceRows.push({_id:'m'+Date.now(),lvl:level,name:'Nouvelle pièce',val:0,cat:'Intérieur'});refreshSurfaceEditor();}
 else if(act==='piece-up')movePiece(id,-1);else if(act==='piece-down')movePiece(id,1);
 else if(act==='delete-piece'){manualSurfaceRows=manualSurfaceRows.filter(x=>x._id!==id);refreshSurfaceEditor();}
});
document.addEventListener('change',e=>{
 const sr=e.target.closest('.editableSurface'),id=sr?.dataset.id,x=id&&surfaceRowById(id);
 if(x&&e.target.classList.contains('pieceLevel')){x.lvl=e.target.value;refreshSurfaceEditor();return}
 if(x&&e.target.classList.contains('pieceVal')){x.val=Number(e.target.value)||0;refreshSurfaceEditor();return}
 if(x&&e.target.classList.contains('pieceName')){x.name=clean(e.target.value)||'Pièce';refreshSurfaceEditor();return}
 if(e.target.classList.contains('levelName')){const block=e.target.closest('.levelBlock'),old=block?.dataset.level,neu=clean(e.target.value);if(!old||!neu||neu===old)return;if(manualLevels.includes(neu)){alert('Ce niveau existe déjà.');e.target.value=old;return}manualLevels=manualLevels.map(x=>x===old?neu:x);manualSurfaceRows.forEach(x=>{if(x.lvl===old)x.lvl=neu});refreshSurfaceEditor();}
});

// V13.36 — historique global de la fiche.
let globalUndo=[],globalRedo=[],globalRestoring=false,lastFocusSnapshot='';
function globalSnapshot(){
 const vals={};document.querySelectorAll('input:not([type=file]),textarea,select').forEach((el,i)=>{if(el.id)vals['#'+el.id]=el.value});
 return {vals,facts:$('#facts')?.innerHTML||'',rows:JSON.parse(JSON.stringify(manualSurfaceRows||[])),levels:[...(manualLevels||[])],
  photos:photoItemsState.map(p=>({label:p.label,file:p.file,url:p.url}))};
}
function globalSig(s){return JSON.stringify({vals:s.vals,facts:s.facts,rows:s.rows,levels:s.levels,photos:s.photos.map(p=>p.label)})}
function globalCheckpoint(){
 if(globalRestoring)return;const s=globalSnapshot(),sig=globalSig(s),last=globalUndo[globalUndo.length-1];
 if(!last||globalSig(last)!==sig){globalUndo.push(s);if(globalUndo.length>50)globalUndo.shift();globalRedo=[]}
}
function restoreGlobal(s){
 if(!s)return;globalRestoring=true;
 Object.entries(s.vals||{}).forEach(([sel,v])=>{const el=document.querySelector(sel);if(el)el.value=v});
 if($('#facts'))$('#facts').innerHTML=s.facts||'';
 manualSurfaceRows=JSON.parse(JSON.stringify(s.rows||[]));manualLevels=[...(s.levels||[])];
 photoItemsState=(s.photos||[]).map(p=>({...p,selected:!!p.selected}));renderPhotoManager();
 globalRestoring=false;
}
function globalUndoAction(){if(globalUndo.length<2)return;globalRedo.push(globalUndo.pop());restoreGlobal(globalUndo[globalUndo.length-1])}
function globalRedoAction(){if(!globalRedo.length)return;const s=globalRedo.pop();globalUndo.push(s);restoreGlobal(s)}
document.addEventListener('focusin',e=>{if(e.target.matches('input:not([type=file]),textarea,select,[contenteditable=true]'))lastFocusSnapshot=globalSig(globalSnapshot())});
document.addEventListener('focusout',e=>{if(e.target.matches('input:not([type=file]),textarea,select,[contenteditable=true]')&&globalSig(globalSnapshot())!==lastFocusSnapshot)globalCheckpoint()});
document.addEventListener('click',e=>{
 const g=e.target.closest('[data-global-act]');
 if(g){if(g.dataset.globalAct==='undo')globalUndoAction();else globalRedoAction();return}
 if(e.target.id==='photoSelectAll'){
  const checked=e.target.checked;photoItemsState.forEach(p=>p.selected=checked);renderPhotoManager();return
 }
 if(e.target.classList.contains('photoSelect')){
  const i=Number(e.target.closest('.photoManageCard')?.dataset.photo);
  if(photoItemsState[i]){photoItemsState[i].selected=e.target.checked;renderPhotoManager()}return
 }
 if(e.target.id==='deleteSelectedPhotos'){
  const n=photoItemsState.filter(p=>p.selected).length;if(!n)return;
  if(!confirm(`Supprimer ${n} photo${n>1?'s':''} sélectionnée${n>1?'s':''} ?`))return;
  const removed=photoItemsState.filter(p=>p.selected);removed.forEach(p=>{try{URL.revokeObjectURL(p.url)}catch{}});
  photoItemsState=photoItemsState.filter(p=>!p.selected);renderPhotoManager();globalCheckpoint();return
 }
 const pb=e.target.closest('[data-photo-act]');
 if(pb){
  const card=pb.closest('.photoManageCard'),i=Number(card?.dataset.photo),act=pb.dataset.photoAct;
  if(!Number.isInteger(i)||!photoItemsState[i])return;
  if(act==='left'&&i>0)[photoItemsState[i-1],photoItemsState[i]]=[photoItemsState[i],photoItemsState[i-1]];
  if(act==='right'&&i<photoItemsState.length-1)[photoItemsState[i+1],photoItemsState[i]]=[photoItemsState[i],photoItemsState[i+1]];
  if(act==='delete')photoItemsState.splice(i,1);
  renderPhotoManager();globalCheckpoint();return;
 }
 // checkpoint after UI mutation buttons (piece/level/text delete/add/move)
 if(e.target.closest('[data-act],.rowDelete,.addTextRow'))setTimeout(globalCheckpoint,0);
});
document.addEventListener('change',e=>{
 if(e.target.id==='photos'){initPhotos(e.target.files);return}
 if(e.target.classList.contains('photoLabel')){
  const i=Number(e.target.closest('.photoManageCard')?.dataset.photo);
  if(photoItemsState[i]){photoItemsState[i].label=clean(e.target.value)||photoDisplayName(photoItemsState[i].file);renderPhotoManager();globalCheckpoint()}
 }
});
setTimeout(globalCheckpoint,0);

// V13.36 — boutons Supprimer manquants dans les rubriques structurées.
// Ne touche pas aux contrôles Photos ni Surfaces, déjà validés.
function ensureStructuredDeleteButtons(){
 document.querySelectorAll('#facts .proGroup .proRow').forEach(row=>{
  if(row.closest('.levelBlock,.surfaceEditor,.photoManageCard'))return;
  if(row.querySelector('[data-pro-delete],.rowDelete,[data-act="delete"],[data-act="delete-row"]'))return;
  const b=document.createElement('button');
  b.type='button'; b.className='proDeleteBtn'; b.dataset.proDelete='1';
  b.title='Supprimer cette ligne'; b.setAttribute('aria-label','Supprimer cette ligne'); b.textContent='×';
  row.appendChild(b);
 });
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-pro-delete]');
 if(!b)return;
 const row=b.closest('.proRow'); if(!row)return;
 globalCheckpoint();
 row.remove();
 globalCheckpoint();
});
const _v133RenderFacts=typeof renderFacts==='function'?renderFacts:null;
if(_v133RenderFacts){
 const renderFactsV134=_v133RenderFacts;
 renderFacts=function(...args){const r=renderFactsV134.apply(this,args);setTimeout(ensureStructuredDeleteButtons,0);return r}
}
setTimeout(ensureStructuredDeleteButtons,0);

// V13.36 — fenêtre centrale de progression Word/PDF.
function exportModal(state,kind){
 let ov=document.getElementById('exportOverlay');
 if(!ov)return;
 const title=document.getElementById('exportModalTitle'),msg=document.getElementById('exportModalMsg'),spin=document.getElementById('exportSpinner'),ok=document.getElementById('exportOk');
 if(state==='busy'){
  title.textContent='Création du '+(kind==='pdf'?'PDF':'Word')+' en cours';
  msg.textContent='Cela peut prendre un peu de temps… Merci de patienter.';
  spin.style.display='block';ok.style.display='none';ov.classList.add('show');
 }else if(state==='ready'){
  title.textContent='Document prêt';msg.textContent='Téléchargement lancé.';
  spin.style.display='none';ok.style.display='block';ov.classList.add('show');
  setTimeout(()=>ov.classList.remove('show'),1800);
 }else{
  title.textContent='Téléchargement impossible';msg.textContent='Une erreur est survenue.';
  spin.style.display='none';ok.style.display='none';ov.classList.add('show');
  setTimeout(()=>ov.classList.remove('show'),3000);
 }
}
async function withExportModal(kind,fn,buttonId){
 const btn=document.getElementById(buttonId);if(btn?.disabled)return;
 if(btn)btn.disabled=true;exportModal('busy',kind);
 try{await fn();exportModal('ready',kind)}
 catch(e){exportModal('error',kind);throw e}
 finally{if(btn)btn.disabled=false}
}
})();