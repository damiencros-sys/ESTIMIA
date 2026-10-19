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
 if(title==='Annexes'){
  const items=rows.map(([designation,nombre,detail])=>`<div class="proRow annexRow"><span contenteditable="true" spellcheck="true">${E(designation)}</span><strong><span contenteditable="true" spellcheck="false">${E(nombre)}</span></strong><span contenteditable="true" spellcheck="true">${E(detail||'')}</span><button type="button" class="rowDelete" title="Supprimer">×</button></div>`).join('');
  return `<section class="proGroup editableCard annexCard"><h3 contenteditable="true" spellcheck="true">${icon} ${title}</h3><div class="annexHeader"><span>Désignation</span><span>Nombre</span><span>Détails dictés</span></div>${items}<button type="button" class="addTextRow miniEditBtn">＋ Ajouter une ligne</button></section>`;
 }
 if(title==='Chauffage & eau chaude'){
  const items=rows.map(([designation,nombre,detail])=>`<div class="proRow sanitaryRow"><span contenteditable="true" spellcheck="true">${E(designation)}${detail?' — '+E(detail):''}</span><strong><span contenteditable="true" spellcheck="false">${E(nombre)}</span></strong><button type="button" class="rowDelete" title="Supprimer">×</button></div>`).join('');
  return `<section class="proGroup editableCard sanitaryCard heatingCard"><h3 contenteditable="true" spellcheck="true">${icon} ${title}</h3><div class="sanitaryHeader"><span>Désignation</span><span>Nombre</span></div>${items}<button type="button" class="addTextRow miniEditBtn">＋ Ajouter une ligne</button></section>`;
 }
 if(title==='Sanitaires'){
  const items=rows.map(([k,v])=>{
   const value=String(v||'');
   const explicit=value.match(/^\s*(\d+)\b/);
   const quantity=explicit?explicit[1]:'—';
   const details=value.replace(/^\s*\d+\s*(?:salles?\s+de\s+bains?|salles?\s+d[’']eau|wc|toilettes?)?\s*(?:[—–-]\s*)?/i,'').replace(/^Présent(?:e|s|es)?\s*$/i,'').trim();
   const designation=k+(details?' — '+details:'');
   return `<div class="proRow sanitaryRow"><span contenteditable="true" spellcheck="true">${E(designation)}</span><strong><span contenteditable="true" spellcheck="false">${E(quantity)}</span></strong><button type="button" class="rowDelete" title="Supprimer">×</button></div>`;
  }).join('');
  return `<section class="proGroup editableCard sanitaryCard"><h3 contenteditable="true" spellcheck="true">${icon} ${title}</h3><div class="sanitaryHeader"><span>Désignation</span><span>Nombre</span></div>${items}<button type="button" class="addTextRow miniEditBtn">＋ Ajouter une ligne</button></section>`;
 }
 return `<section class="proGroup editableCard"><h3 contenteditable="true" spellcheck="true">${icon} ${title}</h3>${rows.map(([k,v])=>{const announced=k==='Surface annoncée / dictée',num=announced?String(v).replace(/\s*m²\s*$/i,''):v;return `<div class="proRow"><span contenteditable="true" spellcheck="true">${E(k)}</span><strong${announced?' class="fixedM2"':''}>${announced?`<span contenteditable="true" spellcheck="true">${E(num)}</span><em> m²</em>`:`<span contenteditable="true" spellcheck="true">${E(v)}</span>`}</strong><button type="button" class="rowDelete" title="Supprimer">×</button></div>`}).join('')}<button type="button" class="addTextRow miniEditBtn">＋ Ajouter une ligne</button></section>`;
}
function owner(t){
 let m=t.match(/\b(?:les\s+)?consorts?\s+([\p{L}'’-]+)/iu);
 if(m)return 'Consorts '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/\bfamille\s+([\p{L}'’-]+)/iu); if(m)return 'Famille '+m[1].replace(/^./,c=>c.toUpperCase());
 m=t.match(/(?:propri[ée]taire(?:s)?|chez|pour|au\s+nom\s+de)\s+(monsieur et madame|monsieur|madame|m\. et mme|m\.|mme)\s+([\p{L}'’-]+)(?:\s+([\p{L}'’-]+))?/iu);
 if(m)return [m[1],m[2],(/^(?:au|à|de|dans|une|un|la|le|maison|adresse|téléphone)$/i.test(m[3]||'')?'':m[3])].filter(Boolean).join(' ');
 m=t.match(/\bpropri[ée]taire(?:s)?\s+(?:est|sont|:)?\s*([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}?)(?=\s*(?:,|\.|;|t[ée]l[ée]phone|son\s+t[ée]l[ée]phone|adresse|maison|appartement|villa|immeuble)\b)/iu);
 if(m)return clean(m[1]);
 return '';
}
function ownerNameParts(value){
 const t=clean(value).replace(/^(?:monsieur et madame|monsieur|madame|m\. et mme|m\.|mme)\s+/iu,'').trim();
 const parts=t.split(/\s+/).filter(Boolean);
 if(parts.length<2)return {nom:t,prenom:''};
 if(/^[A-ZÀ-ÖØ-Þ'’-]+$/.test(parts[0]) && !/^[A-ZÀ-ÖØ-Þ'’-]+$/.test(parts[1]))return {nom:parts[0],prenom:parts.slice(1).join(' ')};
 return {nom:parts.slice(0,-1).join(' '),prenom:parts.at(-1)};
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
function emailFromDictation(t){
 // Conserve les adresses déjà correctement transcrites par le navigateur.
 const m=String(t||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
 return m?m[0].replace(/[.,;]+$/,''):'';
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
 const s=clean(t);
 // Ex: "une maison 2 impasse de la Fontette 34240 à Lamalou-les-Bains".
 const spoken=s.match(/\b(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|route|chemin|impasse|place|all[ée]e|lotissement|quai|cours|traverse|mont[ée]e)\s+[^,.;!?]{3,85}?)\s*,?\s*(\d{5})\s+(?:à\s+|a\s+|sur\s+)?([\p{L}][\p{L}'’ -]{1,55}?)(?=\s+(?:section|parcelle|cadastr[ée]e?|maison|sur\s+deux|avec|un\s+s[ée]jour|une\s+cuisine)\b|[,.;!?]|$)/iu);
 if(spoken)return {street:clean(spoken[1]),postcode:spoken[2],city:clean(spoken[3])};
 // Adresse annoncée dans une visite : « chez Mme X, au 18 avenue ..., 34240 Ville ».
 // La capture ne doit pas avaler le nom du propriétaire ou la description suivante.
 const direct=/\b(?:au|à|situ[ée]e?\s+au|situ[ée]e?\s+à)\s+(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|route|chemin|impasse|place|all[ée]e|lotissement|quai|cours|traverse|mont[ée]e)\s+[^,.;!?]{3,85}?)\s*,?\s*(\d{5})\s+([\p{L}][\p{L}'’ -]{1,45}?)(?=\s*[.,;!?]|\s+(?:le\s+num[ée]ro|la\s+propri[ée]t[ée]|il\s+s['’]agit|la\s+maison|le\s+bien|le\s+terrain|section|cadastr[ée]e?)\b|$)/iu;
 const dm=s.match(direct);if(dm)return {street:clean(dm[1]),postcode:dm[2],city:clean(dm[3])};
 const ways='(?:route|rue|chemin|avenue|boulevard|impasse|lotissement|place|all[ée]e|mont[ée]e|traverse|quai|cours)';
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
 // Ne pas changer de niveau pour une simple mention de trappe / accès / isolation
 // ou une description des combles non aménagés. Un changement de zone doit être explicite.
 add(/\b(?:dans\s+les|sous\s+les|aux|dans\s+des)\s+combles?\s+(?:am[ée]nag[ée]s?|habitables?|transform[ée]s?\s+en\s+\w+)?\b/ig,'combles');
 add(/\bcombles?\s+(?:am[ée]nag[ée]s?|habitables?|transform[ée]s?\s+en)\b/ig,'combles');
 // 'on monte dans les combles' et 'au niveau des combles'
 add(/\b(?:on\s+monte\s+|on\s+passe\s+|au\s+niveau\s+)(?:dans\s+|des\s+|aux\s+)?combles?\b/ig,'combles');
 add(/\b(?:1er|premier)\s+[ée]tage\b/ig,'floor',1);
 add(/\b(?:2e|2ème|deuxi[eè]me)\s+[ée]tage\b/ig,'floor',2);
 add(/\b(?:3e|3ème|troisi[eè]me)\s+[ée]tage\b/ig,'floor',3);
 add(/\b(?:4e|4ème|quatri[eè]me)\s+[ée]tage\b/ig,'floor',4);
 add(/(?:[aà]\s+l['’ ]?\s*autre\s+[ée]tage|autre\s+[ée]tage|[ée]tage\s+sup[ée]rieur|on\s+monte\s+encore(?:\s+d['’ ]un\s+[ée]tage)?)/ig,'next');
 add(/(?:[aà]\s+l['’ ]?\s*[ée]tage|au\s+[ée]tage|on\s+(?:passe|monte)\s+(?:[aà]\s+l['’ ]?\s*|au\s+)[ée]tage)/ig,'implicit');
 add(/(?:^|[.!?,;:]\s*)[ée]tage(?=\s*[:,.-]|\s+(?:il\s+y\s+a|on\s+trouve|avec|chambre|salle|bureau|palier|d[ée]gagement|wc|nous|je))/ig,'implicit');
 // Exclure les références descriptives, sans changement de niveau.
 const filtered=candidates.filter(c=>{
   if(c.kind!=='combles')return true;
   const before=text.slice(Math.max(0,c.i-55),c.i);
   return !/(?:trappe|acc[eè]s|isolation|toiture|charpente|grenier|escalier|hauteur)\s+(?:d['’ ]?acc[eè]s\s+)?(?:[aà]\s+|aux\s+|des\s+|de\s+|vers\s+)?$/i.test(before);
 });
 candidates.length=0;candidates.push(...filtered);
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
  if(!Number.isFinite(val)||val<=0||val>250)return;
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
  // Une surface ne peut être attribuée à une pièce que dans son groupe immédiat.
  // Les informations terrain/parcelle, niveaux, annexes ou dates coupent la portée.
  chunk=chunk.split(/\b(?:terrain|parcelle|cadastr[ée]e?|section|surface\s+du\s+terrain|superficie\s+du\s+terrain|au\s+rez[- ]de[- ]chauss[ée]e|au\s+premier\s+[ée]tage|au\s+deuxi[eè]me\s+[ée]tage|[àa]\s+l['’][ée]tage|combles|[àa]\s+l['’]ext[ée]rieur)\b/i)[0];
  // Au-delà de 65 caractères, une valeur risque d'appartenir à une autre information.
  chunk=chunk.slice(0,65);

  // "pièce de 8,20 m² faisant office de bureau"
  if(/^pi[eè]ce$/i.test(m.name)&&!/faisant\s+office\s+de\s+bureau/i.test(chunk))continue;

  // Explicit correction semantics for a room: "tu prends le couloir qui fait 4,90 m²"
  // wins over earlier values for the same level/name.
  // A correction is applied only by the named-room correction pass below.
  // This prevents a later correction (e.g. corridor) being stolen by mezzanine/garage/entry.
  let sm=chunk.match(/(?:\bde\b|\bmesurant\b|\bfait\b|\b:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
  if(sm){
   let area=n(sm[1]);
   // Plusieurs segments du même couloir : « 3,84 m² + 2,5 m² ».
   // Ne pas additionner une autre pièce ni une date.
   if(/^couloir$/i.test(m.name)){
    const rest=chunk.slice(sm.index+sm[0].length);
    const extra=rest.match(/^\s*\+\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
    if(extra)area=Math.round((area+n(extra[1]))*100)/100;
   }
   push(m.name,area,m.i);
  }
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
 const words={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10};
 const rx=new RegExp('\\b(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\s+(?:'+nounRx+')\\b','gi');
 const matches=[...t.matchAll(rx)];
 if(!matches.length)return null;
 const values=matches.map(m=>words[m[1].toLowerCase()]||Number(m[1]));
 // Des mentions distinctes « un WC ... un WC » correspondent à deux sanitaires.
 if(matches.length>1 && values.every(v=>v===1))return matches.length;
 return Math.max(...values);
}
function sanitary(t){
 const rows=[],s=clean(t);
 const m=s.match(/\bsalle de bains?\b([\s\S]{0,120}?)(?=\b(?:couloir|d[ée]gagement|garage|chambre|cuisine|salon|s[ée]jour|piscine|jardin|terrasse|parcelles?|$)\b)/i);
 if(m){const c=m[0];let v='1 salle de bains';const sm=c.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);if(sm)v+=' — '+fmt(n(sm[1]));const eq=[];if(/\bdouche\b/i.test(c))eq.push('douche');if(/\bbaignoire\b/i.test(c))eq.push('baignoire');if(/(?:deux|2|double)\s+vasques?|double vasque/i.test(c))eq.push('double vasque');else if(/\bvasque\b/i.test(c))eq.push('vasque');if(eq.length)v+=' — '+eq.join(' · ');rows.push(['Salle de bains',v]);}
 const e=s.match(/\bsalle d[' ]eau\b([\s\S]{0,120}?)(?=\b(?:couloir|d[ée]gagement|garage|chambre|cuisine|salon|s[ée]jour|piscine|jardin|terrasse|parcelles?|$)\b)/i);
 if(e){let v="1 salle d’eau";const sm=e[0].match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);if(sm)v+=' — '+fmt(n(sm[1]));if(/douche\s+pmr/i.test(e[0]))v+=" — douche PMR";else if(/douche à l[' ]italienne/i.test(e[0]))v+=" — douche à l’italienne";if(/\bsans\s+wc\b/i.test(e[0]))v+=" — sans WC";rows.push(["Salle d’eau",v]);}
 const positive=s.replace(/\b(?:sans|pas\s+de)\s+(?:wc|toilettes?)\b/gi,'');
 const wc=countExplicit(positive,'wc|toilettes?');if(wc)rows.push(['WC',String(wc)]);else if(/\b(?:wc|toilettes?)\b/i.test(positive))rows.push(['WC','Nombre non précisé']);
 return rows;
}
function heating(t){
 const text=clean(t).replace(/[’]/g,"'");
 const heat=[];
 const add=(rx,label)=>{if(rx.test(text))heat.push(label);};
 // Chaque mode est indépendant : un chauffage secondaire ne remplace jamais le principal.
 add(/\b(?:insert|foyer ferm[ée])\s*(?:à|au|de|en)?\s*(?:bois|b[uû]ches?)\b/i,'Insert à bois');
 add(/\b(?:insert|foyer ferm[ée])\s*(?:à|au|de|en)?\s*(?:pellets?|granul[ée]s?)\b/i,'Insert à granulés (pellets)');
 add(/\b(?:chemin[ée]e|foyer)\s*(?:à\s*)?(?:foyer\s*)?ouvert(?:e)?\b|\bfoyer ouvert\b/i,'Cheminée à foyer ouvert');
 if(/\bchemin[ée]e\b/i.test(text)&&!/\b(?:chemin[ée]e|foyer)\s*(?:à\s*)?(?:foyer\s*)?ouvert(?:e)?\b/i.test(text)
   && !/\bchemin[ée]e[^.!?]{0,30}(?:condamn[ée]e|d[ée]corative|hors service)\b/i.test(text)
   && !/\bchemin[ée]e[^.!?]{0,35}insert\b/i.test(text))heat.push('Cheminée (type non précisé)');
 add(/\bpo[eê]le\s*(?:à|au|de)?\s*bois\b/i,'Poêle à bois');
 add(/\bpo[eê]le\s*(?:à|au|de)?\s*(?:pellets?|granul[ée]s?)\b/i,'Poêle à granulés');
 add(/\b(?:radiateurs?|convecteurs?)\s*(?:[ée]lectriques?)?[^.!?]{0,40}(?:à\s+inertie|inertiels?)\b|\b(?:radiateurs?|convecteurs?)\s+[ée]lectriques?\s+à\s+inertie\b/i,'Radiateurs électriques à inertie');
 if(/\b(?:radiateurs?|convecteurs?)\b[^.!?]{0,35}[ée]lectriques?/i.test(text)
   && !heat.includes('Radiateurs électriques à inertie'))heat.push('Radiateurs électriques');
 add(/\b(?:clim(?:atisation)?|pompe\s+à\s+chaleur|pac)\s*(?:air\s*[/\-]\s*air)?\s*r[ée]versible\b|\bclimatisation\s+r[ée]versible\b/i,'Climatisation réversible');
 add(/\b(?:pompe\s+à\s+chaleur|pac)\s+air\s*[/\-]\s*eau\b/i,'Pompe à chaleur air/eau');
 add(/\b(?:pompe\s+à\s+chaleur|pac)\s+air\s*[/\-]\s*air\b/i,'Pompe à chaleur air/air');
 add(/\bchauffage\s+au\s+sol\b|\bplancher\s+chauffant\b/i,'Plancher chauffant');
 if(/\bchaudi[eè]re[^.!?]{0,70}condensation[^.!?]{0,40}gaz\b|\bchaudi[eè]re[^.!?]{0,40}gaz[^.!?]{0,40}condensation\b/i.test(text))heat.push('Chaudière gaz à condensation');
 else if(/\bchaudi[eè]re[^.!?]{0,40}gaz\b/i.test(text))heat.push('Chaudière gaz');
 if(/\bchaudi[eè]re[^.!?]{0,40}(?:fioul|fuel)\b/i.test(text))heat.push('Chaudière fioul');
 if(/\bchaudi[eè]re[^.!?]{0,40}bois\b/i.test(text))heat.push('Chaudière bois');
 if(/\bchaudi[eè]re[^.!?]{0,40}(?:pellets?|granul[ée]s?)\b/i.test(text))heat.push('Chaudière granulés');
 let ecs='';
 if(/\bballon\s+thermodynamique\b|\bchauffe.eau\s+thermodynamique\b/i.test(text))ecs='Ballon thermodynamique';
 else if(/\b(?:cumulus|ballon\s+(?:d[' ]eau\s+chaude\s+)?[ée]lectrique|chauffe.eau\s+[ée]lectrique)\b/i.test(text))ecs='Ballon électrique';
 else if(/\b(?:eau chaude|ecs|production d[' ]eau chaude)[^.!?]{0,100}chaudi[eè]re\b|\bchaudi[eè]re[^.!?]{0,100}(?:eau chaude|ecs|production d[' ]eau chaude)\b/i.test(text))
   ecs=/condensation/i.test(text)&&/gaz/i.test(text)?'Chaudière gaz à condensation':'Chaudière';
 // V13.61 : une ligne par équipement, quantité explicitement dictée uniquement.
 const equipment=/\b(?:chemin[ée]es?|foyers?|inserts?|po[eê]les?|radiateurs?|convecteurs?|climatisations?|clim|pompes?\s+à\s+chaleur|pac|planchers?\s+chauffants?|chauffage\s+au\s+sol|chaudi[eè]res?|ballons?|cumulus|chauffe.eau)\b/gi;
 const mentions=[...text.matchAll(equipment)].filter((m,i,all)=>!(i&&/chemin[ée]e/i.test(all[i-1][0])&&/^\s+à\s*$/.test(text.slice(all[i-1].index+all[i-1][0].length,m.index))));
 const rows=[];
 for(let i=0;i<mentions.length;i++){
  const m=mentions[i],end=i+1<mentions.length?mentions[i+1].index:text.length;
  const prefix=text.slice(0,m.index).match(/\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*$/i);
  const number=prefix?countExplicit(prefix[0]+m[0],m[0]):null;
  const before=text.slice(Math.max(0,m.index-25),m.index);
  if(/\b(?:sans|pas de|aucun[e]?)\s*$/i.test(before))continue;
  // Une dictée peut ne contenir aucun point : arrêter au changement de sujet.
  const fragment=clean(text.slice(m.index,end).split(/[.!?;]|\b(?:cuisine|chambres?|salon|s[ée]jour|couloir|palier|escalier|salles?|wc|toilettes?|concernant|eaux us[ée]es|fosse|assainissement|isolation|toiture|fa[çc]ade|terrain|parcelle|piscine|garage|annexes?|menuiseries?|fen[eê]tres?|taxe|[ée]tage|maison|appartement)\b/i)[0]);
  const isWater=/ballon|cumulus|chauffe.eau/i.test(m[0]);
  let label=m[0].replace(/^./,c=>c.toUpperCase());
  if(/chemin[ée]e|foyer/i.test(m[0]))label=/ouvert/i.test(fragment)?'Cheminée à foyer ouvert':/ferm[ée]/i.test(fragment)?'Cheminée à foyer fermé':'Cheminée';
  else if(/radiateur|convecteur/i.test(m[0]))label=/inertie|inertiel/i.test(fragment)?'Radiateurs électriques à inertie':/[ée]lectrique/i.test(fragment)?'Radiateurs électriques':label;
  else if(/po[eê]le|insert|chaudi[eè]re/i.test(m[0])){
   label=/po[eê]le/i.test(m[0])?'Poêle':/insert/i.test(m[0])?'Insert':'Chaudière';
   const energy=fragment.match(/\b(bois|b[uû]ches?|granul[ée]s?|pellets?|gaz|fioul|fuel)\b/i);
   if(energy)label+=' à '+energy[1].toLowerCase();
   if(/condensation/i.test(fragment))label+=' à condensation';
  }else if(/pompe|pac/i.test(m[0])){label='Pompe à chaleur';const type=fragment.match(/air\s*[/\-]\s*(?:air|eau)/i);if(type)label+=' '+type[0];}
  else if(/clim/i.test(m[0]))label='Climatisation';
  else if(/plancher|chauffage au sol/i.test(m[0]))label='Plancher chauffant';
  if(/r[ée]versible/i.test(fragment))label+=' réversible';
  // Ne jamais utiliser un fragment libre comme détail : seuls des attributs
  // d'équipement explicitement reconnus peuvent alimenter cette rubrique.
  const attributes=[];
  for(const rx of [/\b\d+(?:[.,]\d+)?\s*(?:litres?|l\b|kwh?\b|watts?|w\b)/gi,/\b(?:hors service|condamn[ée]e?|d[ée]corati(?:f|ve)|en panne|bon [ée]tat|[àa] remplacer)\b/gi,/\b(?:install[ée]e?|remplac[ée]e?)\s+en\s+\d{4}\b/gi]){
   for(const x of fragment.matchAll(rx))attributes.push(x[0]);
  }
  if(isWater){
   label="Production d'eau chaude";
   attributes.unshift(/thermodynamique/i.test(fragment)?'Ballon thermodynamique':/[ée]lectrique|cumulus/i.test(fragment)?'Ballon électrique':m[0]);
  }
  const detail=uniq(attributes).join(' · ');
  rows.push([label,number===null?'—':String(number),detail]);
 }
 // Conserver les modes reconnus sans nom d'équipement et l'ECS par chaudière.
 if(!mentions.length)for(const h of uniq(heat))rows.push([h,'—','']);
 if(ecs&&!rows.some(r=>r[0]==="Production d'eau chaude"))rows.push(["Production d'eau chaude",'—',ecs]);
 return rows;
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
 const text=clean(t),rows=[];
 const types=[
 ['Grange',/\bgranges?\b/gi],['Garage',/\bgarages?\b/gi],['Cave',/\bcaves?\b/gi],
 ['Local piscine',/\b(?:local|locaux)\s+(?:technique\s+)?(?:de\s+)?piscine\b/gi],
 ['Chalet en bois',/\bchalets?\s+(?:en\s+)?bois\b/gi],['Chalet',/\bchalets?\b/gi],
 ['Mazet en pierre',/\bmazets?\s+(?:en\s+)?pierre\b/gi],['Mazet',/\bmazets?\b/gi],
 ["Cuisine d'été",/\bcuisines?\s+d[' ]été/gi],['Loggia',/\blogg?ias?\b/gi],
 ['Terrasse couverte',/\bterrasses?\s+couvertes?\b/gi],['Terrasse',/\bterrasses?\b/gi],
 ['Buanderie',/\bbuanderies?\b/gi],['Cellier',/\bcelliers?\b/gi],
 ['Atelier',/\bateliers?\b/gi],['Remise',/\bremises?\b/gi],
 ['Dépendance',/\bdépendances?\b/gi],['Hangar',/\bhangars?\b/gi],
 ['Abri de jardin',/\babris?\s+de\s+jardin\b/gi],['Cabanon',/\bcabanons?\b/gi],
 ['Carport',/\bcarports?\b/gi],['Appentis',/\bappentis\b/gi],
 ['Grenier',/\bgreniers?\b/gi],['Combles',/\bcombles?\b/gi],
 ['Sous-sol',/\bsous[- ]sols?\b/gi],['Véranda',/\bvérandas?\b/gi],
 ['Pergola',/\bpergolas?\b/gi],['Pool house',/\bpool[- ]houses?\b/gi],
 ['Local technique',/\b(?:local|locaux)\s+techniques?\b/gi],
 ['Écurie',/(?<![A-Za-zÀ-ÿ])écuries?\b/gi],['Étable',/(?<![A-Za-zÀ-ÿ])étables?\b/gi],['Bergerie',/\bbergeries?\b/gi],
 ['Pigeonnier',/\bpigeonniers?\b/gi],['Grange agricole',/\bgranges?\s+agricoles?\b/gi],
 ['Serre',/\bserres?\b/gi],['Orangerie',/\borangeries?\b/gi],
 ['Abri voiture',/\babris?\s+(?:pour\s+)?voitures?\b/gi],
 ['Bûcher',/(?<![A-Za-zÀ-ÿ])bûchers?\b/gi],['Local à vélos',/\b(?:local|locaux)\s+à\s+vélos\b/gi],
 ['Débarras',/\bdébarras\b/gi],['Cour couverte',/\bcours?\s+couvertes?\b/gi]
 ];
 const hits=[];
 for(const [name,rx] of types){
  for(const m of text.matchAll(rx)){
   if(hits.some(h=>m.index>=h.pos&&m.index<h.end))continue;
   hits.push({name,pos:m.index,end:m.index+m[0].length,match:m[0]});
  }
 }
 hits.sort((a,b)=>a.pos-b.pos);
 // Conserver les descriptions locales sans emprunter les caractéristiques de l'annexe suivante.
 const numWords={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10};
 for(let i=0;i<hits.length;i++){
  const h=hits[i],prev=text.slice(Math.max(0,h.pos-35),h.pos);
  const countMatch=prev.match(/(?:^|[\s,;:])(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*$/i);
  const count=countMatch?(numWords[countMatch[1].toLowerCase()]||Number(countMatch[1])):1;
  let tail=text.slice(h.end,Math.min(text.length,h.end+220));
  if(i+1<hits.length)tail=tail.slice(0,Math.max(0,hits[i+1].pos-h.end));
  // Une description ne doit pas absorber la suite de la dictée (piscine, réseaux, etc.).
  tail=tail.split(/(?<!\d)\.(?!\d)|[!?;\n]|,\s*(?=(?:un|une|des|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+)\s+)|\b(?:avec\s+(?:un|une)\s+local\s+piscine|assainissement|fosse\s+septique|chauffage|piscine|toiture\s+de\s+la\s+maison|terrain|parcelle|taxe\s+fonci[eè]re)\b/i)[0];
  const detail=[];
  const area=tail.match(/(?:de|d[' ]environ|d[' ]une surface de|surface de|environ)?\s*(\d+(?:[.,]\d+)?)\s*m\s*(?:²|2|ètres?\s+carrés?)/i);
  if(area)detail.push(area[1].replace(',','.')+' m²');
  const states=[
   [/toit(?:ure)?\s+à\s+reprendre/i,'Toiture à reprendre'],
   [/à\s+r[ée]nover\s+enti[eè]rement/i,'À rénover entièrement'],
   [/à\s+r[ée]nover/i,'À rénover'],
   [/en\s+bon\s+[ée]tat/i,'Bon état'],
   [/avec\s+(?:une?\s+)?cuve\s+à\s+vin/i,'Avec cuve à vin'],
   [/avec\s+(?:une?\s+)?mezzanine/i,'Avec mezzanine']
  ];
  for(const [rx,label] of states)if(rx.test(tail)&&!(label==='À rénover'&&detail.includes('À rénover entièrement')))detail.push(label);
  // Conserver les détails complémentaires formulés explicitement « avec ... », sans phrase hors sujet.
  const withDetail=tail.match(/\bavec\s+(?!une?\s+(?:cuve\s+à\s+vin|mezzanine)\b)([^,.;!?]{3,75})/i);
  if(withDetail && !/\b(?:piscine|fosse|assainissement|maison|chauffage|toiture)\b/i.test(withDetail[1])){
    const val=clean(withDetail[1]);if(val&&!/^(?:toit(?:ure)?\s+à\s+reprendre|une?\s+cuve\s+à\s+vin|une?\s+mezzanine)$/i.test(val)&&!detail.some(d=>d.toLowerCase().includes(val.toLowerCase())))detail.push('Avec '+val);
  }
  rows.push([h.name,String(count),detail.join(' — ')]);
 }
 const merged=new Map();
 for(const [name,count,details] of rows){
  const key=name.toLocaleLowerCase('fr');
  if(!merged.has(key)){merged.set(key,[name,count,details]);continue;}
  const previous=merged.get(key);
  previous[1]=String(Math.max(Number(previous[1])||1,Number(count)||1));
  const fragments=[...new Set([previous[2],details].flatMap(x=>x.split(' — ').map(y=>y.trim()).filter(Boolean)))];
  previous[2]=fragments.join(' — ');
 }
 return [...merged.values()];
}
function menu(t){
 const men=uniq([/pvc blanc/i.test(t)?'PVC blanc':'',/double vitrage/i.test(t)?'Double vitrage':'',/triple vitrage/i.test(t)?'Triple vitrage':'',/\baluminium\b|\balu\b/i.test(t)?'Aluminium':'']);
 const shut=uniq([/volets? roulants?[^.!?]{0,35}[ée]lectriques?/i.test(t)?'Volets roulants électriques':'',/moustiquaires?/i.test(t)?(/rez[- ]de[- ]chauss[ée]e|\brdc\b/i.test((factClause(t,/moustiquaires?/i)[0]||''))?'Moustiquaires au rez-de-chaussée':'Moustiquaires'):'']);
 return [['Menuiseries / vitrages',men.join(' · ')],['Fermetures',shut.join(' · ')]];
}
function structure(t){
 const r=[],cl=clauses(t);
 // Une même visite peut mentionner plusieurs isolants et plusieurs techniques.
 // On conserve séparément matériau, mode de pose, plancher et toiture.
 const norm=t.replace(/’/g,"'");
 const facts=(patterns)=>patterns.filter(([rx])=>rx.test(norm)).map(([,label])=>label);
 const insulation=facts([
  [/laine de verre/i,'Laine de verre'],[/laine de roche/i,'Laine de roche'],[/ouate de cellulose/i,'Ouate de cellulose'],[/fibre de bois|laine de bois/i,'Fibre / laine de bois'],
  [/laine de chanvre|isolant chanvre/i,'Chanvre'],[/laine de mouton/i,'Laine de mouton'],[/laine de coton|coton recycl[ée]/i,'Coton'],
  [/li[eè]ge(?: expans[ée])?/i,'Liège'],[/polystyr[eè]ne expans[ée]|\bPSE\b/i,'Polystyrène expansé (PSE)'],
  [/polystyr[eè]ne extrud[ée]|\bXPS\b/i,'Polystyrène extrudé (XPS)'],[/polyur[ée]thane|\bPUR\b|\bPIR\b/i,'Polyuréthane / PIR'],
  [/mousse ph[ée]nolique/i,'Mousse phénolique'],[/vermiculite/i,'Vermiculite'],[/perlite/i,'Perlite'],
  [/laine de lin/i,'Lin'],[/paille/i,'Paille'],[/b[ée]ton de chanvre/i,'Béton de chanvre'],[/laine min[ée]rale/i,'Laine minérale (type non précisé)'],
  [/isolant mince|multicouche|multir[ée]flecteur/i,'Isolant mince / multicouche']
 ]);
 const insulationContext=/\b(?:combles?|isolation|isolant|isol[ée]s?|laine de|ouate de|fibre de|souffl[ée]e?|d[ée]roul[ée]e?)\b/i.test(norm);
 const poses=facts([[/souffl[ée]e?s?|insuffl[ée]e?s?/i,'soufflée / insufflée'],[/d[ée]roul[ée]e?s?/i,'déroulée'],[/projet[ée]e?s?/i,'projetée'],[/panneaux?\b/i,'en panneaux'],[/rouleaux?\b/i,'en rouleaux'],[/vrac\b/i,'en vrac']]);
 if(insulation.length&&insulationContext){
  const matches=[];
  for(const [rx,label] of [
   [/laine de verre/i,'Laine de verre'],[/laine de roche/i,'Laine de roche'],[/ouate de cellulose/i,'Ouate de cellulose'],[/fibre de bois|laine de bois/i,'Fibre / laine de bois'],
   [/laine de chanvre|isolant chanvre/i,'Chanvre'],[/laine de mouton/i,'Laine de mouton'],[/laine de coton|coton recycl[ée]/i,'Coton'],[/li[eè]ge(?: expans[ée])?/i,'Liège'],
   [/polystyr[eè]ne expans[ée]|\bPSE\b/i,'Polystyrène expansé (PSE)'],[/polystyr[eè]ne extrud[ée]|\bXPS\b/i,'Polystyrène extrudé (XPS)'],
   [/polyur[ée]thane|\bPUR\b|\bPIR\b/i,'Polyuréthane / PIR'],[/mousse ph[ée]nolique/i,'Mousse phénolique'],[/vermiculite/i,'Vermiculite'],[/perlite/i,'Perlite'],
   [/laine de lin/i,'Lin'],[/paille/i,'Paille'],[/b[ée]ton de chanvre/i,'Béton de chanvre'],[/laine min[ée]rale/i,'Laine minérale (type non précisé)'],
   [/isolant mince|multicouche|multir[ée]flecteur/i,'Isolant mince / multicouche']]){
    const m=rx.exec(norm);if(!m)continue;
    const local=norm.slice(Math.max(0,m.index-24),Math.min(norm.length,m.index+m[0].length+32));
    const pm=local.match(/\b(souffl[ée]e?s?|insuffl[ée]e?s?|d[ée]roul[ée]e?s?|projet[ée]e?s?|en panneaux?|en rouleaux?|en vrac)\b/i);
    matches.push(label+(pm?' — '+pm[0].toLowerCase():''));
   }
  r.push(['Isolation des combles',matches.join(' · ')]);
 }else if(/(?:combles?|toiture)[^.!?]{0,55}isol[ée]s?|isol[ée]s?[^.!?]{0,55}(?:combles?|toiture)/i.test(norm)){
  r.push(['Isolation des combles','Isolation mentionnée — matériau non précisé']);
 }
 const floors=facts([
  [/(?:plancher|dalle|sol)[^.!?]{0,20}\bb[ée]ton\b|\bdalle\s+(?:en\s+)?b[ée]ton\b/i,'Béton'],
  [/(?:plancher|solivage|solives?|dalle|sol)[^.!?]{0,20}\bbois\b/i,'Bois'],
  [/poutrelles?[- ]hourdis|plancher hourdis|entrevous/i,'Poutrelles-hourdis / entrevous'],
  [/plancher collaborant|bac acier collaborant/i,'Plancher collaborant'],
  [/plancher m[ée]tallique/i,'Métallique'],[/plancher terre cuite/i,'Terre cuite']
 ]);
 if(floors.length)r.push(['Plancher / dalle',floors.join(' · ')]);
 const roofs=facts([
  [/toiture\s+(?:en\s+)?dur(?:e)?\b/i,'Toiture en dur'],
  [/(?:toiture|toit)\s+(?:en\s+)?b[ée]ton\b/i,'Toiture en béton'],
  [/toiture[^.!?]{0,25}\btuile|couverture[^.!?]{0,25}\btuile/i,'Tuiles'],
  [/toiture[^.!?]{0,25}\bardoise|couverture[^.!?]{0,25}\bardoise/i,'Ardoises'],
  [/toiture[^.!?]{0,25}\bzinc/i,'Zinc'],[/toiture[^.!?]{0,25}\bbac acier/i,'Bac acier'],
  [/toiture[- ]terrasse|toit[- ]terrasse/i,'Toiture-terrasse'],
  [/toiture[^.!?]{0,25}\bfibrociment/i,'Fibrociment']
 ]);
 if(roofs.length)r.push(['Toiture / couverture',roofs.join(' · ')]);
 // Les matériaux de la toiture, du plancher et de la charpente sont indépendants.
 // Une charpente ne peut être renseignée que si le mot a été explicitement prononcé.
 const charpExplicit=norm.match(/\bcharpente\s+(?:en\s+|de\s+)?(?:bois|b[ée]ton|m[ée]tal(?:lique)?|acier|fer|traditionnelle|industrielle|fermettes?)\b/i);
 if(charpExplicit){
  const material=charpExplicit[0].replace(/^charpente\s*/i,'').replace(/^(?:en|de)\s+/i,'');
  r.push(['Charpente / structure','Charpente '+material.toLowerCase()]);
 }else if(/\bcharpente\b/i.test(norm)){
  // Une mention générique de charpente reste une mention, sans matériau inventé.
  r.push(['Charpente / structure','Charpente mentionnée — matériau non précisé']);
 }
 // La nature et l'étendue des combles sont conservées sans inventer de surface.
 // « comble aménageable » au singulier est courant dans la reconnaissance vocale.
 const hasCombles=/\bcombles?\b/i.test(norm);
 if(hasCombles){
  const details=[];
  if(/\bcombles?\s+non\s+am[ée]nag[ée]s?\b/i.test(norm))details.push('Non aménagés');
  else if(/\bcombles?\s+am[ée]nageables?\b|\bam[ée]nageables?\s+combles?\b/i.test(norm))details.push('Aménageables');
  else if(/\bcombles?\s+am[ée]nag[ée]s?\b/i.test(norm))details.push('Aménagés');
  if(/\b(?:sur\s+)?tout(?:e)?\s+la\s+surface\s+de\s+la\s+maison\b/i.test(norm))details.push('Sur toute la surface de la maison (surface non chiffrée)');
  if(/\btrappe\b[^.!?]{0,55}\bcombles?\b|\bacc[eè]s\b[^.!?]{0,55}\bcombles?\b|\bcombles?\b[^.!?]{0,55}\bacc[eè]s\b/i.test(norm))details.push('Accès mentionné');
  if(/\b(?:en\s+)?haut\s+de\s+l['’]escalier\b/i.test(norm))details.push('En haut de l’escalier');
  if(details.length)r.push(['Combles',uniq(details).join(' — ')]);
  else r.push(['Combles','Combles mentionnés — caractéristiques non précisées']);
 }
 const facade=cl.find(c=>/façade|crépi|enduit/i.test(c));if(facade&&/retrait|décollement|fissure/i.test(facade))r.push(['Façade / enduit',/retrait de cr[eé]pi/i.test(facade)?'Retrait de crépi signalé':clean(facade)]);
 return r;
}

function exteriors(t){
 const text=clean(t),rows=[];
 const types=[
 ['Piscine',/(?<!\b(?:local|locaux)\s)(?<!\blocal\s+technique\s)\bpiscines?\b/gi],['Bassin de baignade',/\bbassins?\s+de\s+baignade\b/gi],['Bassin',/\bbassins?\b/gi],
 ['Jardin d’agrément',/\bjardins?\s+d[' ]agr[ée]ment\b/gi],['Jardin paysager',/\bjardins?\s+paysagers?\b/gi],['Jardin',/\bjardins?\b/gi],
 ['Parc arboré',/\bparcs?\s+arbor[ée]s?(?![A-Za-zÀ-ÿ])/gi],['Parc',/\bparcs?\b/gi],['Potager',/\bpotagers?\b/gi],
 ['Fontaine',/\bfontaines?\b/gi],['Barbecue',/\bbarbecues?\b/gi],['Plancha extérieure',/\bplanchas?\s+ext[ée]rieures?\b/gi],
 ['Terrain de pétanque',/\bterrains?\s+de\s+p[ée]tanque\b|\bboulodromes?\b/gi],['Poulailler',/\bpoulaillers?\b/gi],
 ['Verger',/\bvergers?\b/gi],['Oliveraie',/\boliveraies?\b/gi],['Vigne',/\bvignes?\b/gi],['Mare',/\bmares?\b/gi],
 ['Étang',/(?<![A-Za-zÀ-ÿ])[ée]tangs?\b/gi],['Puits',/\bpuits\b/gi],['Forage',/\bforages?\b/gi],
 ['Récupérateur d’eau',/\br[ée]cup[ée]rateurs?\s+d[' ]eau\b/gi],['Arrosage automatique',/\barrosage\s+automatique\b/gi],
 ['Serre',/\bserres?\b/gi],['Carré potager',/\bcarr[ée]s?\s+potagers?\b/gi],
 ['Terrasse couverte',/\bterrasses?\s+couvertes?\b/gi],['Terrasse',/\bterrasses?\b/gi],['Patio',/\bpatios?\b/gi],
 ['Cour intérieure',/\bcours?\s+int[ée]rieures?\b/gi],['Cour',/\bcours?\b/gi],
 ['Pergola bioclimatique',/\bpergolas?\s+bioclimatiques?\b/gi],['Pergola',/\bpergolas?\b/gi],
 ['Cuisine d’été',/\bcuisines?\s+d[' ]été/gi],['Salon de jardin',/\bsalons?\s+de\s+jardin\b/gi],
 ['Jacuzzi',/\bjacuzzis?\b/gi],['Spa',/\bspas?\b/gi],['Sauna extérieur',/\bsaunas?\s+ext[ée]rieurs?\b/gi],
 ['Douche extérieure',/\bdouches?\s+ext[ée]rieures?\b/gi],['Solarium',/\bsolariums?\b/gi],
 ['Terrain de tennis',/\bterrains?\s+de\s+tennis\b/gi],['Terrain multisports',/\bterrains?\s+multisports?\b/gi],
 ['Aire de jeux',/\baires?\s+de\s+jeux\b/gi],['Balancoire',/\bbalan[çc]oires?\b/gi],
 ['Portail motorisé',/\bportails?\s+motoris[ée]s?\b/gi],['Portail',/\bportails?\b/gi],
 ['Clôture',/\bcl[ôo]tures?\b/gi],['Haie',/\bhaies?\b/gi],['Allée',/\ball[ée]es?\b/gi],
 ['Parking extérieur',/\bparkings?\s+ext[ée]rieurs?\b/gi],['Abri de piscine',/\babris?\s+de\s+piscine\b/gi],
 ['Local piscine',/\blocaux?\s+piscine\b|\blocal\s+(?:technique\s+)?piscine\b/gi],
 ['Pool house',/\bpool[- ]houses?\b/gi],['Cascade',/\bcascades?\b/gi],['Ruisseau',/\bruisseaux?\b/gi]
 ];
 const hits=[];
 for(const [name,rx] of types){for(const m of text.matchAll(rx)){
   if(hits.some(h=>m.index>=h.pos&&m.index<h.end))continue;
   hits.push({name,pos:m.index,end:m.index+m[0].length});
 }}
 hits.sort((a,b)=>a.pos-b.pos);
 const nums={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10};
 const poolDetails=(fragment)=>{
   const d=[];
   const dim=fragment.match(/(\d+(?:[.,]\d+)?)\s*(?:m[eè]tres?|m)?\s*(?:sur|x|×|par)\s*(\d+(?:[.,]\d+)?)\s*(?:m[eè]tres?|m)?/i);
   if(dim)d.push('Dimensions '+dim[1].replace(',','.')+' × '+dim[2].replace(',','.')+' m');
   const area=fragment.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:²|2)(?!\d)/i);
   if(area)d.push('Surface '+area[1].replace(',','.')+' m²');
   for(const [rx,label] of [
    [/\bliner\b/i,'Liner'],[/\bcoque\b/i,'Coque'],[/\bb[ée]ton\b/i,'Béton'],[/\bcarrel[ée]e?\b/i,'Carrelage'],
    [/\bforme\s+haricot\b|\ben\s+haricot\b/i,'Forme haricot'],[/\brectangulaire\b/i,'Rectangulaire'],
    [/\bchauff[ée]e?\b/i,'Chauffée'],[/\bnon\s+chauff[ée]e?\b/i,'Non chauffée'],
    [/\btraitement\s+au\s+sel\b|\b[ée]lectrolyseur\b/i,'Traitement au sel'],[/\btraitement\s+au\s+chlore\b/i,'Traitement au chlore'],
    [/\bfiltration\s+à\s+sable\b/i,'Filtration à sable'],[/\bfiltration\s+à\s+cartouche\b/i,'Filtration à cartouche'],
    [/\bvolet\s+(?:roulant\s+)?(?:de\s+)?s[ée]curit[ée]\b/i,'Volet de sécurité'],
    [/\bb[âa]che\b/i,'Bâche'],[/\babri\s+de\s+piscine\b/i,'Abri de piscine'],
    [/\bhors\s+sol\b/i,'Hors sol'],[/\benterr[ée]e?\b/i,'Enterrée'],[/\bsemi[- ]enterr[ée]e?\b/i,'Semi-enterrée']
   ])if(rx.test(fragment)&&!(label==='Chauffée'&&/\bnon\s+chauff[ée]e?\b/i.test(fragment)))d.push(label);
   const year=fragment.match(/\b(?:construit(?:e)?|construction|r[ée]alis[ée]e?|install[ée]e?|datant\s+de|mise\s+en\s+service)\s*(?:en|de|environ|vers)?\s*((?:19|20)\d{2})\b/i);
   if(year)d.push('Année '+year[1]);
   return d;
 };
 for(let i=0;i<hits.length;i++){
  const h=hits[i],prev=text.slice(Math.max(0,h.pos-30),h.pos);
  const m=prev.match(/(?:^|[\s,;:])(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*$/i);
  const count=m?(nums[m[1].toLowerCase()]||Number(m[1])):1;
  let fragment=text.slice(h.pos,Math.min(text.length,h.pos+500));
  if(i+1<hits.length)fragment=fragment.slice(0,Math.max(0,hits[i+1].pos-h.pos));
  fragment=fragment.split(/(?<!\d)\.(?!\d)|[!?;\n]|,\s*(?=(?:un|une|des|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+)\s+)|\b(?:taxe\s+fonci[eè]re|assainissement|fosse\s+septique|chauffage|cadastre|parcelle|maison\s+comprend|int[ée]rieur\s+de\s+la\s+maison)\b/i)[0];
  let details=h.name==='Piscine'?poolDetails(fragment):[];
  if(h.name!=='Piscine'){
   const area=fragment.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:²|2)(?!\d)/i);
   if(area)details.push(area[1].replace(',','.')+' m²');
   for(const [rx,label] of [[/\b(?:tr[eè]s\s+)?bien\s+entretenu/i,'Bien entretenu'],[/\barbor[ée]/i,'Arboré'],[/(?<![A-Za-zÀ-ÿ])[ée]clair[ée]/i,'Éclairé'],[/\bcl[ôo]tur[ée]/i,'Clôturé'],[/\b[àa]\s+r[ée]nover\b/i,'À rénover'],[/\ben\s+bon\s+[ée]tat\b/i,'Bon état'],[/\bcouvert\b/i,'Couvert']])if(rx.test(fragment))details.push(label);
  }
  rows.push([h.name,String(count),[...new Set(details)].join(' — ')]);
 }
 const merged=new Map();
 for(const [name,count,details] of rows){
  const key=name.toLowerCase();if(!merged.has(key)){merged.set(key,[name,count,details]);continue;}
  const row=merged.get(key);row[1]=String(Math.max(Number(row[1])||1,Number(count)||1));
  row[2]=[...new Set([row[2],details].flatMap(v=>v.split(' — ').filter(Boolean)))].join(' — ');
 }
 return [...merged.values()];
}
function allAnnexes(t){
 const merged=new Map();
 // Les dépendances bâties et les aménagements du terrain sont réunis dans un seul tableau.
 for(const [name,count,details] of [...annexes(t),...exteriors(t)]){
  const key=clean(name).toLocaleLowerCase('fr');
  if(!merged.has(key)){merged.set(key,[name,count,details]);continue;}
  const old=merged.get(key);
  old[1]=String(Math.max(Number(old[1])||1,Number(count)||1));
  old[2]=[...new Set([old[2],details].flatMap(v=>String(v||'').split(' — ').filter(Boolean)))].join(' — ');
 }
 return [...merged.values()];
}
function divers(t){
 // Les informations déjà reconnues dans une rubrique ne doivent pas être dupliquées.
 // Conserver les observations libres non structurées dans des segments autonomes.
 const text=clean(t),rows=[],seen=new Set();
 const patterns=[
  ['Servitude',/\bservitudes?\b[^.!?;]{0,155}/gi],
  ['Mitoyenneté',/\bmitoyennet[ée]\b[^.!?;]{0,130}/gi],
  ['Accès / passage',/\b(?:droit de passage|acc[eè]s difficile|chemin priv[ée])\b[^.!?;]{0,140}/gi],
  ['Travaux complémentaires',/\b(?:travaux (?:à|a) pr[ée]voir|travaux importants|travaux de remise en [ée]tat)\b[^.!?;]{0,155}/gi],
  ['Observation complémentaire',/\b(?:particularit[ée]|point [àa] signaler|information compl[ée]mentaire)\s*[:\-]?\s*[^.!?;]{0,150}/gi]
 ];
 for(const [name,rx] of patterns)for(const match of text.matchAll(rx)){
  const detail=clean(match[0]);const key=name+'|'+detail.toLowerCase();
  if(!detail||seen.has(key))continue;
  seen.add(key);rows.push([name,detail]);
 }
 return rows;
}
function finance(t){
 const r=[];
 for(const m of clean(t).matchAll(/taxe fonci[eè]re[^.!?;]{0,120}/ig)){
  // Écarter d'abord l'année (2026), avant d'extraire la somme (990 €).
  const fragment=m[0].replace(/\b(?:19|20)\d{2}\b/g,' ');
  const money=fragment.match(/(\d{1,3}(?:[ \u00a0\u202f]\d{3})*|\d{1,5})(?:[.,](\d{1,2}))?\s*(?:€|euros?)/i);
  if(!money)continue;
  const value=Number(money[1].replace(/[ \u00a0\u202f]/g,'')+(money[2]?'.'+money[2]:''));
  if(value>0&&value<100000){r.push(['Taxe foncière / fiscalité',value.toLocaleString('fr-FR')+' €']);break;}
 }
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
 img.src='/api/cadastre/multi-map.png?commune='+encodeURIComponent($('#cadCommune').dataset.insee||com)+'&refs='+encodeURIComponent(multiRefsParam())+'&v=13.41';
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

// Remplissage prudent des compléments, à partir de la dictée complète.
// Ne remplace jamais une valeur renseignée manuellement.
function fillConstructionExtras(t){
 const set=(id,value)=>{const el=$(id);if(el&&value&&!String(el.value||'').trim()){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}};
 const norm=clean(t);
 const roof=[];
 if(/toiture[^.!?]{0,65}(?:isol[ée]e?|isolation)|isolation[^.!?]{0,65}toiture/i.test(norm))roof.push('Isolation de toiture mentionnée — caractéristiques à vérifier');
 if(/toiture[^.!?]{0,40}tuiles?\s+canal|tuiles?\s+canal/i.test(norm))roof.push('Tuiles canal');
 if(/charpente[^.!?]{0,35}bois/i.test(norm))roof.push('Charpente bois');
 set('#estRoof',uniq(roof).join(' · '));
 if(/(?:fa[çc]ade|cr[ée]pi|enduit)[^.!?]{0,55}(?:fissur|retrait|d[ée]coll)/i.test(norm))set('#estFacade','Défaut de façade/enduit signalé — à vérifier');
 const windows=[];
 if(/simple vitrage/i.test(norm))windows.push('Simple vitrage');
 if(/survitrage/i.test(norm))windows.push('Survitrage');
 if(/double vitrage/i.test(norm))windows.push('Double vitrage');
 if(/menuiseries?[^.!?]{0,30}pvc/i.test(norm))windows.push('PVC');
 set('#estWindows',uniq(windows).join(' · '));
 const equipmentRows=heating(norm);
 const equipmentText=r=>(r[1]==='—'?'':r[1]+' × ')+(r[2]||r[0]);
 set('#estHeating',equipmentRows.filter(r=>r[0]!=="Production d'eau chaude").map(equipmentText).join(' · '));
 set('#estHotWater',equipmentRows.filter(r=>r[0]==="Production d'eau chaude").map(equipmentText).join(' · '));
 const nets=[];
 if(/fosse septique/i.test(norm))nets.push('Assainissement individuel — fosse septique');
 if(/fosse septique[^.!?]{0,100}vidange|vidange[^.!?]{0,100}fosse septique/i.test(norm))nets.push('Vidange signalée — date à vérifier');
 if(/tout[- ]à[- ]l['’ ]?[ée]gout/i.test(norm))nets.push('Tout-à-l’égout');
 set('#estNetworks',uniq(nets).join(' · '));
 requestAnimationFrame(()=>window.estimiaRefreshEquipmentHeights?.());
}
async function render(){
 const raw=$('#notes').value||'',corr=$('#correction').value||'',t=clean(raw+' '+corr);
 const o=owner(t);if(o&&!$('#owner').value)$('#owner').value=o;
 const ph=phone(t);if(ph)$('#ownerPhone').value=ph;
 const mail=emailFromDictation(t);
 // Synchroniser les cartes dès que la dictée a rempli les champs historiques.
 if(o||ph||mail)ownUpdateFromDictation(o,ph,mail);
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
 out+=card('Sanitaires','🚿',sanitary(t))+card('Chauffage & eau chaude','🔥',heating(t))+card('Réseaux & compteurs','⚡',networks(t))+card('Construction / structure','🏗️',structure(t))+card('Annexes','🏚️',allAnnexes(t))+card('Divers','📌',divers(t))+card('Menuiseries & fermetures','🪟',menu(t))+card('État / désordres','⚠️',state(t))+card('Fiscalité','💶',finance(t));
 out+='</div>';
 const extras=[];

 const cuisineInfos=[];
 if(/cuisine ouverte/i.test(t))cuisineInfos.push('Ouverte');
 if(/cuisine[^.!?]{0,50}[ée]quip[ée]e/i.test(t))cuisineInfos.push('Équipée');
 if(cuisineInfos.length)extras.push(['Cuisine',uniq(cuisineInfos).join(' · ')]);
 if(extras.length)out+=card('Informations complémentaires conservées','📌',extras);
 out+='<details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>'+E(raw)+'</div></details>';
 $('#facts').innerHTML=out;
 fillConstructionExtras(t);
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
 if(c&&cadParcels.length)return '/api/cadastre/multi-map.png?commune='+encodeURIComponent($('#cadCommune').dataset.insee||c)+'&refs='+encodeURIComponent(multiRefsParam())+'&v=13.41';
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
 document.querySelectorAll('#facts .proGroup').forEach(b=>sections.push({title:b.querySelector('h3')?.innerText||'Informations',rows:[...b.querySelectorAll('.proRow')].map(r=>r.classList.contains('annexRow')?[r.children[0]?.innerText||'',(r.children[1]?.innerText||'')+' — '+(r.children[2]?.innerText||'')]:[r.querySelector('span')?.innerText||'',r.querySelector('strong')?.innerText||''])}));
 const estimateBox=document.querySelector('#estimationResults');
 const estimation={centrale:estimateBox?.querySelector('.estimationValueAmount')?.innerText||'',
  basse:estimateBox?.querySelectorAll('.estimationRangeAmount')[0]?.innerText||'',
  haute:estimateBox?.querySelectorAll('.estimationRangeAmount')[1]?.innerText||'',
  texte:estimateBox?.querySelector('p')?.innerText||'',
  reperes:[...document.querySelectorAll('#marketIndicators tr')].map(r=>[r.querySelector('th')?.innerText||'',r.querySelector('td')?.innerText||'']).concat([['Avis d’ajustement',document.querySelector('#marketAdjustmentAdvice')?.innerText||'']]),
  retenue:document.querySelector('#validatedPrice')?.value?Number(document.querySelector('#validatedPrice').value).toLocaleString('fr-FR')+' €':'',
  justification:document.querySelector('#validatedReason')?.value||''};
 const annonces=[...document.querySelectorAll('#annoncesResults .annonceCard')].slice(0,6).map(card=>({
  titre:card.querySelector('h4')?.innerText||'',description:card.querySelector('.annonceDescription')?.innerText||'',
  prix:card.querySelector('.annoncePrice')?.innerText||'',site:card.querySelector('.annonceAgency')?.innerText||'',
  photo:card.querySelector('img')?.src||'',url:card.querySelector('.annonceLink')?.href||''}));
 const roques_annonces=[...document.querySelectorAll('#roquesResults .annonceCard')].slice(0,4).map(card=>({
  titre:card.querySelector('h4')?.innerText||'',description:card.querySelector('.annonceDescription')?.innerText||'',prix:card.querySelector('.annoncePrice')?.innerText||'',site:card.querySelector('.annonceAgency')?.innerText||'',photo:card.querySelector('img')?.src||'',url:card.querySelector('.annonceLink')?.href||''}));
 const photos=[];for(const p of currentPhotos()){try{photos.push({name:p.label||photoDisplayName(p.file),data:await optimizedPhotoDataURL(p.file)})}catch{}}
 return {owner:$('#owner')?.value||'',phone:$('#ownerPhone')?.value||'',owners:ownerCardsState,address:$('#address')?.value||'',commune:$('#cadCommune')?.value||'',section:$('#cadSection')?.value||'',parcel:$('#cadParcel')?.value||'',property_type:$('#type')?.value||'',surface:$('#surfaceHab')?.value||'',surface_carrez:$('#surfaceCarrez')?.value||'',sections,parcels:cadParcels.map(p=>({section:p.section,numero:p.numero})),facts:$('#facts')?.innerText||'',photos,estimation,annonces,roques_annonces,generated_date:new Date().toLocaleDateString('fr-FR')};
}
async function downloadWord(){
 const payload=await buildExportPayload();
 try{
  const r=await fetch('/api/word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.detail||'Export impossible')}
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(!ct.includes('officedocument.wordprocessingml.document'))throw new Error('Le serveur n’a pas renvoyé un document Word valide');
  const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;
  a.download='Dossier_estimation_'+((payload.owner||payload.address||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_'))+'.docx';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
 }catch(e){alert('Export Word impossible : '+e.message)}
}

let preparedEmail=null;
function downloadEmailBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function prepareEmailDocument(kind){
 const status=$('#emailStatus'),actions=$('#emailActions');actions.hidden=false;preparedEmail=null;
 $('#emailShare').hidden=true;$('#emailEml').hidden=true;$('#emailAttachment').hidden=true;
 $('#emailWord').disabled=true;$('#emailPdf').disabled=true;
 status.textContent='Création du dossier '+(kind==='word'?'Word':'PDF')+' avec les photos et l’estimation…';
 try{
  const payload=await buildExportPayload();
  const response=await fetch('/api/'+(kind==='word'?'word':'pdf'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok){let error={};try{error=await response.json()}catch{}throw Error(error.detail||'Création du document impossible');}
  const mime=kind==='word'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf';
  if(!(response.headers.get('content-type')||'').includes(mime))throw Error('Le serveur n’a pas renvoyé le document attendu');
  const blob=await response.blob(),name='Dossier_estimation_'+String(payload.owner||payload.address||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_')+(kind==='word'?'.docx':'.pdf');
  const file=new File([blob],name,{type:mime});
  preparedEmail={file,kind,subject:'Dossier d’estimation immobilière'+(payload.address?' — '+payload.address:''),body:'Bonjour,\n\nVous trouverez en pièce jointe le dossier d’estimation immobilière'+(payload.address?' du bien situé '+payload.address:'')+'.\n\nCordialement.'};
  let shareable=false;try{shareable=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}))}catch{}
  $('#emailShare').hidden=!shareable;$('#emailEml').hidden=false;$('#emailAttachment').hidden=false;
  status.textContent='Document prêt ('+(blob.size/1024/1024).toFixed(1)+' Mo). '+(shareable?'Choisissez « Partager avec la messagerie », puis votre application de mail.':'Préparez le fichier .eml, puis ouvrez-le dans votre logiciel de messagerie.');
 }catch(error){status.textContent='Préparation impossible : '+error.message;}
 finally{$('#emailWord').disabled=false;$('#emailPdf').disabled=false;}
}
$('#emailWord')?.addEventListener('click',()=>prepareEmailDocument('word'));
$('#emailPdf')?.addEventListener('click',()=>prepareEmailDocument('pdf'));
$('#emailShare')?.addEventListener('click',async()=>{
 const email=preparedEmail;if(!email)return;
 try{await navigator.share({files:[email.file],title:email.subject,text:email.body});$('#emailStatus').textContent='Document transmis à l’application choisie. Complétez et envoyez votre message dans la messagerie.';}
 catch(error){$('#emailStatus').textContent=error.name==='AbortError'?'Partage annulé. Le document reste prêt.':'Partage indisponible. Vous pouvez préparer le fichier .eml ou télécharger la pièce jointe.';}
});
$('#emailAttachment')?.addEventListener('click',()=>{if(preparedEmail)downloadEmailBlob(preparedEmail.file,preparedEmail.file.name)});
$('#emailEml')?.addEventListener('click',async()=>{
 const email=preparedEmail;if(!email)return;const button=$('#emailEml');button.disabled=true;
 $('#emailStatus').textContent='Préparation du message avec sa pièce jointe…';
 try{
  const data=String(await fileToDataURL(email.file)).split(',')[1];
  const response=await fetch('/api/email/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document_base64:data,kind:email.kind,filename:email.file.name,subject:email.subject,body:email.body})});
  if(!response.ok){let e={};try{e=await response.json()}catch{}throw Error(e.detail||'Création du message impossible');}
  if(!(response.headers.get('content-type')||'').includes('message/rfc822'))throw Error('Format de message inattendu');
  downloadEmailBlob(await response.blob(),'Email_'+email.file.name.replace(/\.(?:pdf|docx)$/i,'')+'.eml');
  $('#emailStatus').textContent='E-mail téléchargé avec sa pièce jointe. Ouvrez le fichier .eml dans votre messagerie, renseignez le destinataire puis envoyez.';
 }catch(error){$('#emailStatus').textContent='Préparation du mail impossible : '+error.message;}
 finally{button.disabled=false;}
});
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
  a.download='Dossier_estimation_'+safe+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)
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
 if(b.classList.contains('addTextRow')){const card=b.closest('.proGroup'),d=document.createElement('div');d.className='proRow';d.innerHTML=card.classList.contains('annexCard')?'<span contenteditable="true">Nouvelle annexe</span><strong><span contenteditable="true">1</span></strong><span contenteditable="true">Détails à compléter</span><button type="button" class="rowDelete">×</button>':card.classList.contains('sanitaryCard')?'<span contenteditable="true" spellcheck="true">Nouvel équipement</span><strong><span contenteditable="true" spellcheck="false">—</span></strong><button type="button" class="rowDelete">×</button>':'<span contenteditable="true" spellcheck="true">Nouvelle information</span><strong contenteditable="true" spellcheck="true">À compléter</strong><button type="button" class="rowDelete">×</button>';if(card.classList.contains('sanitaryCard'))d.classList.add('sanitaryRow');if(card.classList.contains('annexCard'))d.classList.add('annexRow');card.insertBefore(d,b);return}
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

// V13.41 — historique global de la fiche.
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

// V13.41 — boutons Supprimer manquants dans les rubriques structurées.
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

// V13.41 — fenêtre centrale de progression Word/PDF.
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
// V13.41 : e-mails multiples (stockés dans le champ caché pour la sauvegarde des dossiers).
function estReadEmails(){try{return JSON.parse(document.getElementById('estEmailsJSON')?.value||'[]')}catch{return []}}
function estRenderEmails(){const box=document.getElementById('estEmailRows');if(!box)return;box.innerHTML='';estReadEmails().forEach((value,i)=>{const row=document.createElement('div');row.className='estEmailRow';const inp=document.createElement('input');inp.type='email';inp.placeholder='adresse@email.fr';inp.value=value;inp.addEventListener('input',()=>{const a=estReadEmails();a[i]=inp.value;document.getElementById('estEmailsJSON').value=JSON.stringify(a);document.getElementById('estEmailsJSON').dispatchEvent(new Event('input',{bubbles:true}))});const del=document.createElement('button');del.type='button';del.textContent='× Supprimer';del.addEventListener('click',()=>{const a=estReadEmails();a.splice(i,1);document.getElementById('estEmailsJSON').value=JSON.stringify(a);estRenderEmails();document.getElementById('estEmailsJSON').dispatchEvent(new Event('input',{bubbles:true}))});row.append(inp,del);box.append(row)})}
document.getElementById('estAddEmail')?.addEventListener('click',()=>{const a=estReadEmails();a.push('');document.getElementById('estEmailsJSON').value=JSON.stringify(a);estRenderEmails();document.querySelector('#estEmailRows .estEmailRow:last-child input')?.focus();document.getElementById('estEmailsJSON').dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('estimia:emails-restored',estRenderEmails);estRenderEmails();

// V13.41 : contacts supplémentaires (données JSON sauvegardées avec le dossier).
function estContactsRead(){try{return JSON.parse(document.getElementById('estContactsJSON')?.value||'[]')}catch{return []}}
function estContactsWrite(a){const el=document.getElementById('estContactsJSON');if(!el)return;el.value=JSON.stringify(a);el.dispatchEvent(new Event('input',{bubbles:true}))}
function estContactsRender(){
 const box=document.getElementById('estContactRows');if(!box)return;box.innerHTML='';
 estContactsRead().forEach((c,i)=>{
  const row=document.createElement('div');row.className='estContactRow';
  for(const [k,ph] of [['nom','Nom'],['prenom','Prénom'],['telephone','Téléphone']]){
   const inp=document.createElement('input');inp.placeholder=ph;inp.value=c[k]||'';inp.setAttribute('aria-label',ph);
   inp.addEventListener('input',()=>{const a=estContactsRead();a[i][k]=inp.value;estContactsWrite(a)});
   row.append(inp);
  }
  const del=document.createElement('button');del.type='button';del.textContent='× Supprimer';del.onclick=()=>{const a=estContactsRead();a.splice(i,1);estContactsWrite(a);estContactsRender()};row.append(del);box.append(row);
 });
}
document.getElementById('estAddContact')?.addEventListener('click',()=>{const a=estContactsRead();a.push({nom:'',prenom:'',telephone:''});estContactsWrite(a);estContactsRender()});
document.addEventListener('estimia:contacts-restored',estContactsRender);estContactsRender();
function estUpdateCounts(){
 document.querySelectorAll('.estExtraSection').forEach(sec=>{
  const n=[...sec.querySelectorAll('input,select,textarea')].filter(el=>el.type==='checkbox'?el.checked:!!el.value.trim()).length;
  const badge=sec.querySelector('.estCount');if(badge)badge.textContent=n?`(${n} information${n>1?'s':''})`:'';
 });
}
document.addEventListener('input',estUpdateCounts);document.addEventListener('change',estUpdateCounts);
document.addEventListener('estimia:contacts-restored',estUpdateCounts);estUpdateCounts();

// V13.41 — propriétaires indépendants, coordonnées multiples.
let ownerCardsState=[];
const ownEl=id=>document.getElementById(id);
function ownLoad(){
 let others=[];try{others=JSON.parse(ownEl('estContactsJSON')?.value||'[]')}catch{}
 let mails=[];try{mails=JSON.parse(ownEl('estEmailsJSON')?.value||'[]')}catch{}
 const name=(ownEl('owner')?.value||'').trim(),parts=name.split(/\s+/);
 ownerCardsState=[{...ownerNameParts(name),phones:[ownEl('ownerPhone')?.value||''],emails:mails.length?mails:['']}];
 for(const c of others)ownerCardsState.push({nom:c.nom||'',prenom:c.prenom||'',phones:c.phones||[c.telephone||''],emails:c.emails||['']});
 ownRender();
}
function ownUpdateFromDictation(name,telephone,email){
 const first=ownerCardsState[0];if(!first)return;
 if(name){
  const parts=String(name).trim().split(/\s+/);
  const parsed=ownerNameParts(name);first.nom=parsed.nom;first.prenom=parsed.prenom;
 }
 if(telephone){
  if(!first.phones.length)first.phones.push(telephone);
  else first.phones[0]=telephone;
 }
 if(email){if(!Array.isArray(first.emails))first.emails=[];if(!first.emails.includes(email)){const blank=first.emails.indexOf('');if(blank>=0)first.emails[blank]=email;else first.emails.push(email)}}
 ownSync();ownRender();
}
function ownSync(){
 const first=ownerCardsState[0]||{nom:'',prenom:'',phones:[],emails:[]};
 if(ownEl('owner'))ownEl('owner').value=[first.nom,first.prenom].filter(Boolean).join(' ');
 if(ownEl('ownerPhone'))ownEl('ownerPhone').value=first.phones[0]||'';
 const others=ownerCardsState.slice(1).map(c=>({nom:c.nom,prenom:c.prenom,telephone:c.phones[0]||'',phones:c.phones,emails:c.emails}));
 for(const [id,val] of [['estContactsJSON',others],['estEmailsJSON',first.emails]]){
  const el=ownEl(id);if(el){el.value=JSON.stringify(val);el.dispatchEvent(new Event('input',{bubbles:true}))}
 }
}
function ownRender(){
 const box=ownEl('ownersCards');if(!box)return;box.innerHTML='';
 ownEl('ownersCount').textContent=ownerCardsState.length;
 ownerCardsState.forEach((c,i)=>{
  const card=document.createElement('article');card.className='ownerCard';
  const head=document.createElement('div');head.className='ownerCardHead';
  const title=document.createElement('div');title.className='ownerCardIdentity';
  const av=document.createElement('span');av.className='ownerAvatar';av.textContent='👤';
  const name=document.createElement('span');name.textContent='Propriétaire '+(i+1);title.append(av,name);head.append(title);
  if(i>0){const del=document.createElement('button');del.className='ownerRemove';del.type='button';del.textContent='× Supprimer';del.onclick=()=>{if(confirm('Supprimer ce propriétaire et ses coordonnées ?')){ownerCardsState.splice(i,1);ownSync();ownRender()}};head.append(del)}
  card.append(head);
  const fields=document.createElement('div');fields.className='ownerFields';
  for(const [key,label] of [['nom','Nom'],['prenom','Prénom']]){
   const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.value=c[key]||'';input.placeholder=label;input.addEventListener('input',()=>{c[key]=input.value;ownSync()});wrap.append(input);fields.append(wrap)
  }card.append(fields);
  for(const [key,label,typ] of [['phones','Téléphones','tel'],['emails','E-mails','email']]){
   const grp=document.createElement('div');grp.className='ownerDetailGroup';const strong=document.createElement('strong');strong.textContent=label;grp.append(strong);
   (c[key]||[]).forEach((val,k)=>{
    const row=document.createElement('div');row.className='ownerDetail';
    const wrap=document.createElement('label');const input=document.createElement('input');input.type=typ;input.placeholder=typ==='tel'?'Numéro de téléphone':'adresse@email.fr';input.value=val||'';
    input.addEventListener('input',()=>{c[key][k]=input.value;ownSync()});wrap.append(input);row.append(wrap);
    const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Supprimer cette coordonnée';del.onclick=()=>{c[key].splice(k,1);ownSync();ownRender()};row.append(del);grp.append(row)
   });
   const add=document.createElement('button');add.type='button';add.className='ownerAddDetail';add.textContent='＋ Ajouter un '+(key==='phones'?'téléphone':'e-mail');add.onclick=()=>{c[key].push('');ownSync();ownRender()};grp.append(add);card.append(grp);
  }box.append(card);
 });
}
ownEl('addOwnerCard')?.addEventListener('click',()=>{ownerCardsState.push({nom:'',prenom:'',phones:[''],emails:['']});ownSync();ownRender()});
document.addEventListener('estimia:contacts-restored',()=>setTimeout(ownLoad,0));
// La dictée renseigne les champs historiques : synchroniser la première fiche après la structuration.

document.addEventListener('input',e=>{
 if(e.target?.id==='owner'||e.target?.id==='ownerPhone')ownLoad();
});
ownLoad();

})();
(function(){
 function grow(el){if(!el?.classList?.contains('estAutoGrow'))return;el.style.height='auto';el.style.height=Math.max(64,el.scrollHeight+3)+'px';}
 function refresh(){document.querySelectorAll('textarea.estAutoGrow').forEach(grow);}
 document.addEventListener('input',e=>grow(e.target));
 document.addEventListener('change',e=>grow(e.target));
 document.addEventListener('click',()=>requestAnimationFrame(refresh));
 window.addEventListener('load',refresh);
 window.addEventListener('resize',refresh);
 window.estimiaRefreshEquipmentHeights=refresh;
})();
