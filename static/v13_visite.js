// ESTIM'IA V13 — correctif ciblé du test V11. Micro inchangé.
(function(){
window.estimiaV13Active=true;
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
 m=t.match(/(?:\bpropri[ée]taire(?:s)?\s*(?:(?:est|sont)\s+|:\s*)?|\bappartient\s+[àa]\s+)([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}?)(?=\s*(?:[,.;!?]|$|\b(?:t[ée]l[ée]phone|adresse|maison|appartement|villa|immeuble|studio|terrain)\b))/iu);
 if(m)return clean(m[1]);
 return '';
}
function ownerNameParts(value){
 const t=clean(value).replace(/\s+(?:l['’]|d['’]|le|la|les|il|elle)$/iu,'').replace(/^(?:monsieur et madame|monsieur|madame|m\. et mme|m\.|mme)\s+/iu,'').trim();
 if(/^(?:consorts?|famille)\s+/i.test(t))return {nom:t,prenom:''};
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
 $('#cadParcelsJSON')?.dispatchEvent(new Event('change',{bubbles:true}));
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
 const s=clean(t).replace(/\bnum[ée]ros?\b/gi,'numero').replace(/n[°º]/gi,'numero');
 const out=[],start=/\b(?:section\s+|parcelles?\s+(?:section\s+)?)([a-z]{1,3})\s+(?:numero\s*)?(\d{1,4})\b/gi;
 let m;
 while((m=start.exec(s))){
  let section=m[1].toUpperCase();out.push({section,numero:m[2]});let tail=s.slice(start.lastIndex);
  // Only a contiguous list is cadastral: never consume figures from the next sentence.
  const next=/^\s*(?:,|;|et|&)\s*(?:(?:section\s+)?([a-z]{1,3})\s+)?(?:numero\s*)?(\d{1,4})\b/i;
  let n;while((n=tail.match(next))){if(n[1])section=n[1].toUpperCase();out.push({section,numero:n[2]});tail=tail.slice(n[0].length);}
 }
 const seen=new Set();return out.map(p=>normParcel(p.section,p.numero)).filter(Boolean).filter(p=>{const key=parcelKey(p);if(seen.has(key))return false;seen.add(key);return true;});
}
function loadCadParcelsFromHidden(){
 try{const a=JSON.parse($('#cadParcelsJSON')?.value||'[]');cadParcels=Array.isArray(a)?a.map(x=>({...x,...normParcel(x.section,x.numero),found:!!x.found})).filter(x=>x.section&&x.numero):[]}catch{cadParcels=[]}
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
 const withoutPostcode=s.match(/\b(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|route|chemin|impasse|place|all[ée]e|lotissement|quai|cours|traverse|mont[ée]e)\s+[^,.;!?]{2,75}?)\s+[àa]\s+([\p{L}][\p{L}'’ -]{1,55}?)(?=\s+(?:en\s+centre[- ]ville|en\s+centre|il\s+appartient|elle\s+appartient|il\s+se\s+situe|l[' ]appartement|le\s+studio|section|parcelle)\b|[,.;!?]|$)/iu);
 if(withoutPostcode&&!/\d{5}/.test(withoutPostcode[1]))return {street:clean(withoutPostcode[1]),city:clean(withoutPostcode[2]),postcode:''};
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
// Surfaces annoncées par logement : la dernière mention chiffrée remplace la précédente.
function propertyUnits(text){
 const t=normalizeDictatedAreas(text),units=new Map();
 const rx=/\b(appartement|studio|maison de village|maison|villa)(?:\s+(\d+)(?=\s+(?:fait|de|mesure|:)))?\s*(?:(?:principal|ind[ée]pendant)\s*)?(?:fait|de|mesure|d[' ]une surface de|surface de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/gi;
 for(const m of t.matchAll(rx)){
  const type=m[1].toLowerCase(),key=type+(m[2]?' '+m[2]:''),surface=n(m[3]);
  if(surface>0&&surface<=1000)units.set(key,{key,label:key[0].toUpperCase()+key.slice(1),type:/studio|appartement/.test(type)?'appartement':'maison',surface});
 }
 if(/\bappartement\b/i.test(t)&&/\bstudio\b/i.test(t)){
  for(const type of ['appartement','studio'])if(![...units.values()].some(u=>u.key===type||u.key.startsWith(type+' ')))units.set(type,{key:type,label:type[0].toUpperCase()+type.slice(1),type:'appartement',surface:null});
 }
 return [...units.values()];
}
function unitNarrativeSwitches(t,units){
 const switches=[];
 for(const u of units){const label=u.key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
 const rx=new RegExp("\\b(?:dans|pour|concernant)\\s+(?:l['’ ]|le\\s+|la\\s+)?"+label+"\\b|\\b(?:l['’ ]|le\\s+)?"+label+"(?:\\s+(?:principal|ind[ée]pendant))?\\s*(?:[:;]|au\\b|comprend\\b|comporte\\b|possède\\b|dispose\\b|est\\b|s['’]organise\\b|sont\\b)",'gi');
 for(const m of t.matchAll(rx))switches.push({index:m.index,label:u.label,key:u.key});
 }
 for(const u of units){const label=u.key.replace(/\s+/g,'\\s+');const rx=new RegExp("(?:^|[.!?;]\\s*)(?:l['’]\\s*|le\\s+)?"+label+"(?:\\s+(?:principal|ind[ée]pendant))?\\s+(?:de|fait|mesure)\\s+\\d+(?:[.,]\\d+)?\\s*m[²2]\\s*(?:[,.:;]\\s*|qui\\s+)(?=(?:il\\s+|elle\\s+)?(?:comprend|comporte|dispose|possède|avec|une?\\s|salon|séjour|cuisine|pièce))",'gi');for(const m of t.matchAll(rx))switches.push({index:m.index,label:u.label,key:u.key});}
 return switches.sort((a,b)=>a.index-b.index);
}
function unitNarrativeText(t,units,key){const events=unitNarrativeSwitches(t,units);return events.filter(e=>e.key===key).map(e=>t.slice(e.index,events.find(x=>x.index>e.index)?.index||t.length)).join('. ');}
function unitScopeAt(t,index,units){
 if(units.length<2)return '';
 const prefix=t.slice(0,index),generic=[...prefix.matchAll(/\b(?:les\s+)?surfaces\s+des\s+pi[eè]ces\b/gi)].at(-1),events=unitNarrativeSwitches(prefix,units),last=events.at(-1);
 if(last&&(!generic||last.index>generic.index))return last.label;
 if(generic){
  const after=t.slice(generic.index+generic[0].length,generic.index+generic[0].length+90);
  for(const u of units)if(new RegExp("^\\s*(?:de|dans|pour)\\s+(?:l['’ ]|le\\s+|la\\s+)?"+u.key.replace(/\s+/g,'\\s+')+"\\b",'i').test(after))return u.label;
  // A later generic room list can resume a uniquely described dwelling.
  // Use the room programme, never the last surface or the dwelling's size.
  const roomSet=text=>{const set=new Set();for(const [name,rx]of [['couloir',/\bcouloir\b/i],['chambre',/\bchambres?\b/i],['salon',/\b(?:salon|séjour)\b/i],['cuisine',/\bcuisine\b/i],['repas',/\bsalle à manger\b/i],['wc',/\bwc\b/i],['bain',/\bsalle(?:s)? (?:de bains?|d['’]eau)\b/i]])if(rx.test(text))set.add(name);return set;};
  const end=unitNarrativeSwitches(t,units).find(e=>e.index>generic.index)?.index||t.length,listed=roomSet(t.slice(generic.index,end));
  if(listed.size>=3){const candidates=units.map(u=>{const described=roomSet(unitNarrativeText(t.slice(0,generic.index),units,u.key));return {label:u.label,matches:[...listed].filter(x=>described.has(x)).length};}).sort((a,b)=>b.matches-a.matches);
   if(candidates[0].matches>=3&&candidates[0].matches/listed.size>=.65&&candidates[0].matches-(candidates[1]?.matches||0)>=2)return candidates[0].label;
  }
 }
 return 'Logement non précisé';
}
function repairDeclaredUnitScopes(){
 const text=($('#notes')?.value||'')+' '+($('#correction')?.value||'');if(propertyUnits(text).length<2||!document.querySelector('#facts .levelBlock'))return;
 if(!hydrateSurfaceRows())return;const parsed=surfaces(text,true),labels=new Set();let changed=false;
 for(const row of manualSurfaceRows){if(!row.lvl.startsWith('Logement non précisé'))continue;const matches=parsed.filter(x=>x.name.toLowerCase()===row.name.toLowerCase()&&Math.abs(x.val-row.val)<.001&&!x.lvl.startsWith('Logement non précisé'));const scopes=[...new Set(matches.map(x=>x.lvl))];if(scopes.length===1){row.lvl=scopes[0];labels.add(scopes[0].split(' — ')[0]);changed=true;}}
 if(changed){manualLevels=manualLevels.filter(l=>manualSurfaceRows.some(r=>r.lvl===l));refreshSurfaceEditor(true);if(labels.size===1&&!manualSurfaceRows.some(r=>r.lvl.startsWith('Logement non précisé')))document.querySelectorAll('#facts .sanitaryCard .proRow>span').forEach(el=>{el.textContent=el.textContent.replace(/Logement non précisé/g,[...labels][0]);});}
}
function announcedUnitRows(t){
 const units=propertyUnits(t);
 return units.length>1?units.map(u=>[u.label+' — surface annoncée',u.surface?fmt(u.surface):'Surface non précisée']).concat([['Total des logements annoncés',units.every(u=>u.surface>0)?fmt(units.reduce((v,u)=>v+u.surface,0)):'À compléter par logement'],['Portée des surfaces','Surfaces déclarées, sans présumer un mesurage Carrez. La répartition des pièces peut être corrigée si nécessaire ; le détail ne s’ajoute jamais aux surfaces annoncées.']]):[];
}
function typeOf(t){return (t.match(/\b(maison de village|maison|villa|appartement|studio|immeuble|terrain de loisirs?|terrain constructible|terrain [àa] b[âa]tir|terrain|mas|local commercial)\b/i)||[])[1]||''}
function buildInfo(t){
 const r=[['Type de bien',typeOf(t)]];
 const coproMentions=[...t.matchAll(/\b(?:hors copropri[ée]t[ée]|sans copropri[ée]t[ée]|pas (?:de|en) copropri[ée]t[ée]|en copropri[ée]t[ée]|copropri[ée]t[ée] avec syndic)(?=[\s.,;!?]|$)/gi)];
 const copro=coproMentions.at(-1);if(copro)r.push(['Régime de copropriété déclaré',/^(?:hors|sans|pas)/i.test(copro[0])?'Hors copropriété':'En copropriété']);
 if(/^terrain/i.test(typeOf(t))){const areas=[...normalizeDictatedAreas(t).matchAll(/\bterrain(?:\s+(?:de loisirs?|constructible|[àa] b[âa]tir))?\s*(?:de|fait|mesure|:)\s*(\d+(?:[.,]\d+)?)\s*m[²2]/gi)];if(areas.length)r.push(['Surface du terrain déclarée',fmt(n(areas.at(-1)[1]))]);}

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
// V13.78 : normaliser uniquement une decimale explicitement dictee.
function normalizeDictatedAreas(text){
 return clean(text)
  .replace(/\b(\d+)\s*(?:m[eè]tres?|m)\s+virgule\s+(\d{1,3})\s*(?:m\s*[²2]|m[eè]tres?(?:\s+carr[ée]s?)?)?/gi,(_,a,b)=>a+','+b+' m²')
  .replace(/\b(\d+)\s+virgule\s+(\d{1,3})\s*(m\s*[²2]|m[eè]tres?\s+carr[ée]s?)/gi,(_,a,b)=>a+','+b+' m²')
  .replace(/\b(\d+)\s*([.,])\s*(\d+)\s*(m\s*[²2]|m[eè]tres?\s+carr[ée]s?)/gi,(_,a,sep,b,u)=>a+sep+b+' '+u);
}
function roomSurfaceLimit(name){
 if(/^chambre\b/i.test(name))return 25;
 if(isSanitaryRoom(name))return 15;
 return null;
}
// V13.77 : une surface commune cave/garage est conservee une seule fois.
function sharedAnnexAreas(text){
 const t=clean(text),out=[],unit=/\b(\d+(?:[.,]\d+)?)\s*(?:m\s*[²2]|m[eè]tres?\s+carr[ée]s?)/gi;
 // Une énumération annoncée par « total de » peut se terminer par WC :
 // le chiffre est celui du groupe, pas celui du dernier équipement.
 const totals=/\b(?:total|totalit[ée]|ensemble|surface\s+totale)\s+(?:de\s+|des\s+|du\s+)?([^.!?;]{0,170}?)\b(\d+(?:[.,]\d+)?)\s*(?:m\s*[²2]|m[eè]tres?\s+carr[ée]s?)/gi;
 for(const m of t.matchAll(totals)){
  const list=m[1];if(!/\bcave\b/i.test(list)||!/\bgarage\b/i.test(list)||!/\b(?:plus|et)\b|\+/i.test(list))continue;
  const index=m.index+m[0].lastIndexOf(m[2]),hasLocal=/\blocal\b/i.test(list),pool=hasLocal&&/local\s+piscine/i.test(t.slice(Math.max(0,m.index-140),m.index+m[0].length));
  out.push({start:m.index,end:m.index+m[0].length,valueIndex:index,val:n(m[2]),name:'Cave + garage'+(hasLocal?' + local'+(pool?' piscine':''):'')+' (surface totale)'});
 }
 const pair=/(?=\b(cave|garage)\b([^.!?;]{0,80}?)\b(cave|garage)\b)/gi;
 for(const m of t.matchAll(pair)){
  if(m[1].toLowerCase()===m[3].toLowerCase()||/\d+\s*(?:m[²2]|m[eè]tre)/i.test(m[2]))continue;
  const start=m.index,end=start+m[1].length+m[2].length+m[3].length;
  const tail=t.slice(end,end+150).split(/(?<!\d)\.(?!\d)|[!?;]|\b(?:terrain|parcelle|chambre|salon|s[ée]jour|cuisine|piscine|terrasse)\b/i)[0];
  for(const a of tail.matchAll(unit)){
   const pre=tail.slice(0,a.index);
   // Une petite surface explicitement liee au WC n'est pas celle des deux annexes.
   if(/\b(?:wc|toilettes?|salle\s+(?:de\s+bains?|d[' ]eau))\b/i.test(pre)&&!/\b(?:ensemble|le\s+tout|total|totalit[ée]|global|cumul[ée]|r[ée]unis)\b/i.test(pre))continue;
   const val=n(a[1]);if(!Number.isFinite(val)||val<=0)continue;
   out.push({start,end:end+a.index+a[0].length,valueIndex:end+a.index,val,name:'Cave + garage (surface totale)'});break;
  }
  if(!out.some(g=>g.start===start)){
   const before=t.slice(Math.max(0,start-90),start),values=[...before.matchAll(unit)],last=values[values.length-1];
   if(last&&/^\s*(?:(?:au|en)\s+total\s+)?(?:pour(?:\s+l[' ]ensemble\s+de)?|concernant|correspondant\s+[àa])\s*(?:la|le|les)?\s*$/i.test(before.slice(last.index+last[0].length))){
    out.push({start,end,valueIndex:Math.max(0,start-90)+last.index,val:n(last[1]),name:'Cave + garage (surface totale)'});
   }
  }
 }
 return out.filter((g,i)=>out.findIndex(x=>x.valueIndex===g.valueIndex)===i);
}
function isSanitaryRoom(name){return /^(?:wc|toilettes?|salles?\s+(?:de\s+bains?|d[' ]eau))$/i.test(clean(name));}
function sanitaryAreaPrefix(prefix){
 return /^\s*(?:(?:au|du)\s+(?:rdc|rez[- ]de[- ]chauss[ée]e|(?:1er|2e|premier|deuxi[eè]me)\s+[ée]tage)\s*[, :]?\s*)?(?:(?:de|fait|mesure|mesurant|d[' ]une?\s+(?:surface|superficie)\s+de|:)\s*)?$/i.test(prefix);
}
function sanitaryLocalFragment(text,start,end){
 const t=clean(text);
 const tail=t.slice(end,end+140).split(/(?<!\d)\.(?!\d)|[!?;]|\b(?:cave|garage|chambre|cuisine|salon|s[ée]jour|couloir|d[ée]gagement|piscine|jardin|terrasse|parcelles?|salles?\s+(?:de\s+bains?|d[' ]eau)|wc|toilettes?)\b/i)[0];
 const area=tail.match(/\b(\d+(?:[.,]\d+)?)\s*(?:m\s*[²2]|m[eè]tres?\s+carr[ée]s?)/i);
 const collective=area&&(!sanitaryAreaPrefix(tail.slice(0,area.index))||/\b(?:le\s+tout|au\s+total|totalit[ée]|ensemble|surface\s+(?:totale|globale)|font|repr[ée]sentent)\b/i.test(tail.slice(0,area.index)));
 return {tail,area:area&&!collective?n(area[1]):null,index:area&&!collective?end+area.index:-1};
}
function sanitarySurfaceWarnings(text){
 return surfaces(text,true).filter(r=>{const max=roomSurfaceLimit(r.name);return max!=null&&r.val>max}).map(r=>[r.name+' — '+r.lvl,fmt(r.val)+' dictés — surface non attribuée : supérieure au seuil de contrôle de '+roomSurfaceLimit(r.name)+' m². Corrigez la valeur sur la ligne de cette pièce dans Surfaces calculées ; aucune correction numérique inventée.']);
}
function surfaces(text,includeSuspicious=false){
 const t=normalizeDictatedAreas(text), ms=markers(t), out=[],shared=sharedAnnexAreas(t),units=propertyUnits(t);
 const levelAt=i=>{let lvl='Rez-de-chaussée';for(const z of ms){if(z.i<=i)lvl=z.name;else break}return lvl};
 const canon=name=>{
  name=clean(name);
  if(/^pi[eè]ce$/i.test(name))return 'Bureau';
  return name;
 };
 const push=(name,val,index)=>{
  if(!Number.isFinite(val)||val<=0)return;
  name=canon(name);
  const annexName=/garage|cave|grenier|atelier|d[ée]pendance|local|abri|cabanon|carport|hangar|grange|remise|v[ée]randa/i.test(name);
  const limit=roomSurfaceLimit(name);if(val>(annexName?100000:250)&&(!includeSuspicious||limit==null))return;if(!includeSuspicious&&limit!=null&&val>limit)return;
  const locatedInAnnex=isSanitaryRoom(name)&&/^(?:(?![!?;]|\.(?!\d)|\b(?:wc|toilettes?|chambre|cuisine|salon|s[ée]jour|salle)\b)[\s\S]){0,65}\b(?:dans|situ[ée]\s+dans)\s+(?:la|le|une?|les)\s+(?:cave|garage)\b/i.test(t.slice(index+name.length));
  const annexSwitch=[...t.slice(0,index).matchAll(/\b(?:dans|pour|concernant)\s+(?:la\s+|le\s+|les\s+|l['’])?(d[ée]pendance|cave|garage|combles?\s+bruts?|grenier|hangar)\b/gi)].at(-1),lastDwelling=unitNarrativeSwitches(t.slice(0,index),units).at(-1);const annexContext=annexSwitch&&(!lastDwelling||annexSwitch.index>lastDwelling.index);
  const cat=locatedInAnnex||annexContext&&isSanitaryRoom(name)?'Sanitaire':annexName||annexContext?'Annexe':/terrasse|balcon|loggia/i.test(name)?'Extérieur':'Intérieur';
  const level=/cabanon|abri/i.test(name)?'Extérieur':levelAt(index);
  const scope=annexContext?'Annexes':unitScopeAt(t,index,units),lvl=scope?scope+' — '+level:level;
  out.push({lvl,name,val,cat});
 };
 for(const g of shared)push(g.name,g.val,g.start);
 const grouped=[];
 const grp=/\b(?:deux|2)\s+chambres?\s*(?:de|mesurant|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)?\s*(?:et|,)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/ig;
 for(const m of t.matchAll(grp)){push('Chambre 1',n(m[1]),m.index);push('Chambre 2',n(m[2]),m.index);grouped.push([m.index,m.index+m[0].length]);}

 const token=/\b(s[ée]jour|salon|salle à manger|cuisine|chambre(?:\s+(?:(?:num[ée]ro|n[°o])\s*\d+|\d+(?![\d.,])(?=\s*(?:de\b|fait\b|mesure\b|[:=]|\d))|un|une|deux|trois|parentale|suppl[ée]mentaire))?|bureau|pi[eè]ce|salle d[' ]eau|salle de bains?|wc|toilettes?|d[ée]gagement|couloir|entr[ée]e|hall|cellier|buanderie|dressing|palier|mezzanine|garage|cave|grenier|atelier|d[ée]pendance|local|abri|cabanon|carport|hangars?|granges?|remise(?!\s+(?:aux?\s+normes?|[ée]norme))|v[ée]randas?|terrasse|balcon|loggia)\b/ig;
 const marks=[...t.matchAll(token)].map(m=>({name:m[1],i:m.index,end:m.index+m[0].length}));
 for(let k=0;k<marks.length;k++){
  const m=marks[k]; if(grouped.some(([a,b])=>m.i>=a&&m.i<b))continue;
  // Ignore negated WC ("sans WC", "pas de WC")
  const pre=t.slice(Math.max(0,m.i-14),m.i);
  if(/(?:sans|pas\s+de)\s*$/i.test(pre))continue;
  const stop=k+1<marks.length?marks[k+1].i:Math.min(t.length,m.end+140);
  let chunk=t.slice(m.end,stop);
  // Une surface ne peut être attribuée à une pièce que dans son groupe immédiat.
  // Les informations terrain/parcelle, niveaux, annexes ou dates coupent la portée.
  chunk=chunk.split(/\b(?:appartement|studio|terrain|parcelle|cadastr[ée]e?|section|surface\s+du\s+terrain|superficie\s+du\s+terrain|au\s+rez[- ]de[- ]chauss[ée]e|au\s+premier\s+[ée]tage|au\s+deuxi[eè]me\s+[ée]tage|[àa]\s+l['’][ée]tage|combles|[àa]\s+l['’]ext[ée]rieur)\b/i)[0];
  // Au-delà de 65 caractères, une valeur risque d'appartenir à une autre information.
  chunk=chunk.slice(0,65);

  // "pièce de 8,20 m² faisant office de bureau"
  if(/^pi[eè]ce$/i.test(m.name)&&!/faisant\s+office\s+de\s+bureau/i.test(chunk))continue;

  // Explicit correction semantics for a room: "tu prends le couloir qui fait 4,90 m²"
  // wins over earlier values for the same level/name.
  // A correction is applied only by the named-room correction pass below.
  // This prevents a later correction (e.g. corridor) being stolen by mezzanine/garage/entry.
  const reversed=isSanitaryRoom(m.name)&&t.slice(Math.max(0,m.i-55),m.i).match(/(?:avec\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)\s+de\s*$/i);
  if(reversed){push(m.name,n(reversed[1]),m.i);continue;}
  let sm=chunk.match(/(?:\bde\b|\bmesurant\b|\bfait\b|\b:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
  if(sm){
   if(isSanitaryRoom(m.name)&&(!sanitaryAreaPrefix(chunk.slice(0,sm.index))||/\b(?:le\s+tout|au\s+total|totalit[ée]|ensemble|surface\s+(?:totale|globale)|font|repr[ée]sentent)\b/i.test(chunk.slice(0,sm.index))))continue;
   let area=n(sm[1]);
   // Plusieurs segments du même couloir : « 3,84 m² + 2,5 m² ».
   // Ne pas additionner une autre pièce ni une date.
   if(/^couloir$/i.test(m.name)){
    const rest=chunk.slice(sm.index+sm[0].length);
    const extra=rest.match(/^\s*\+\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/i);
    if(extra)area=Math.round((area+n(extra[1]))*100)/100;
   }
   const valueIndex=m.end+sm.index+sm[0].search(/\d/);
   if(!shared.some(g=>g.valueIndex===valueIndex&&(/^(?:cave|garage)$/i.test(m.name)||isSanitaryRoom(m.name))))push(m.name,area,m.i);
  }
 }
 // Last explicit correction for named room replaces previous candidates.
 const corrections=/\b(?:tu\s+prends|je\s+corrige|rectification|finalement)\s+(?:(?:pour|le|la|les|du|de|au|à)\s+|l[' ]){0,4}(s[ée]jour|salon|cuisine|chambre(?:\s+(?:(?:num[ée]ro|n[°o])\s*)?\d+(?![\d.,])(?=\s*(?:fait\b|de\b|[àa]\b)))?|bureau|salle d[' ]eau|salle de bains?|wc|d[ée]gagement|couloir|entr[ée]e|cellier|buanderie|garage)\s*(?:qui\s+)?(?:fait|mesure|de|à|a|:|=)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/ig;
 for(const c of t.matchAll(corrections)){
   const scope=unitScopeAt(t,c.index,units),lvl=(scope?scope+' — ':'')+levelAt(c.index), nm=clean(c[1]).toLowerCase();
   for(let i=out.length-1;i>=0;i--)if(out[i].lvl===lvl&&out[i].name.toLowerCase()===nm)out.splice(i,1);
   push(c[1],n(c[2]),c.index);
 }
 const final=[];
 for(const x of out){
  const nm=x.name.toLowerCase();
  if(/^chambre/.test(nm)||/privati/i.test(t)&&isSanitaryRoom(nm)&&!/^wc|toilettes/i.test(nm)){final.push(x);continue;}
  const pos=final.findIndex(y=>y.lvl===x.lvl&&y.name.toLowerCase()===nm);
  if(pos>=0)final[pos]=x;else final.push(x);
 }
 const seen=new Set();
 return final.filter(x=>{if(/^chambre\b/i.test(x.name)||/privati/i.test(t)&&isSanitaryRoom(x.name)&&!/^wc|toilettes/i.test(x.name))return true;const k=x.lvl+'|'+x.name.toLowerCase()+'|'+x.val;if(seen.has(k))return false;seen.add(k);return true});
}
function declaredPropertySurface(text){
 const units=propertyUnits(text);
 if(units.length)return units.every(u=>u.surface>0)?Math.round(units.reduce((total,u)=>total+u.surface,0)*100)/100:null;
 const matches=[...normalizeDictatedAreas(text).matchAll(/\b(?:mas|immeuble)\s*(?:fait|de|mesure|d[' ]une surface de|surface de|:)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres?\s*carr[ée]s?)/gi)];
 return matches.length?n(matches.at(-1)[1]):null;
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
  if(/garage|cave|remise|grenier|atelier|d[ée]pendance|local|abri|carport|hangar|grange|terrasse|balcon|loggia|v[ée]randa/i.test(x.name))return false;
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
 manualSurfaceRows=rows.map((x,i)=>({...x,_needsReview:roomSurfaceLimit(x.name)!=null&&x.val>roomSurfaceLimit(x.name),_id:'s'+Date.now()+'_'+i}));
 manualLevels=[];normalizeManualLevels(manualSurfaceRows);surfaceUndo=[];surfaceRedo=[];rememberSurfaceState();return renderSurfaceEditor();
}
function renderSurfaceEditor(){
 normalizeManualLevels(manualSurfaceRows);
 const ins=manualSurfaceRows.filter(x=>x.cat==='Intérieur');
 let unitOptions=[];try{unitOptions=JSON.parse($('#propertyUnitsJSON')?.value||'[]')}catch{}
 const unitSelect=(lvl,cls)=>unitOptions.length>1?'<select class="'+cls+'" aria-label="Affectation au logement"><option value="">Logement à préciser</option>'+unitOptions.map(u=>'<option value="'+E(u.label)+'" '+(lvl.startsWith(u.label+' — ')?'selected':'')+'>'+E(u.label)+'</option>').join('')+'</select>':'';
 const otherRow=x=>`<div class="surfaceRow editableOther" data-id="${E(x._id)}"><input class="pieceName" aria-label="Nom de l’annexe ou extérieur" value="${E(x.name)}"><input class="pieceVal" aria-label="Surface en m²" type="number" min="0.01" step=".01" value="${x.val}"><span>m²</span><select class="pieceCategory" aria-label="Classement de la surface">${['Intérieur','Annexe','Extérieur','Sanitaire'].map(c=>`<option ${c===x.cat?'selected':''}>${c}</option>`).join('')}</select><select class="pieceLevel" aria-label="Niveau de rattachement">${[...new Set([x.lvl,...manualLevels])].map(l=>`<option ${l===x.lvl?'selected':''}>${E(l)}</option>`).join('')}</select><button type="button" data-act="delete-other">×</button></div>`;
 for(const u of unitOptions)if(!manualLevels.some(l=>l.startsWith(u.label+' — ')))manualLevels.push(u.label+' — Niveau non précisé');
 let s='<section class="surfaceHero surfaceEditor"><div class="surfaceHead"><h3>📐 SURFACES CALCULÉES PAR NIVEAU</h3><div class="surfaceToolbar"><button type="button" class="miniEditBtn" data-act="add-level">＋ Ajouter un niveau</button></div></div>';
 manualLevels.forEach(lv=>{
  const rr=ins.filter(x=>x.lvl===lv),total=rr.filter(x=>!x._needsReview).reduce((a,x)=>a+x.val,0);
  s+=`<div class="levelBlock" data-level="${E(lv)}"><div class="levelHead"><textarea class="levelName" rows="1" aria-label="Nom du bien et du niveau">${E(lv)}</textarea><div class="levelActions"><button type="button" data-act="level-up" title="Monter le niveau">↑</button><button type="button" data-act="level-down" title="Descendre le niveau">↓</button><button type="button" data-act="delete-level" title="Supprimer le niveau">🗑</button></div></div>`;
  rr.forEach(x=>{const opts=manualLevels.map(z=>`<option ${z===lv?'selected':''}>${E(z)}</option>`).join('');
   s+=`<div class="surfaceRow editableSurface" data-id="${E(x._id)}"><input class="pieceName" value="${E(x.name)}"><input class="pieceVal" type="number" step=".01" value="${Number(x.val)}"><span class="unit">${x._needsReview?'⚠ m² à vérifier':'m²'}</span><details class="pieceMove"><summary>Modifier le logement, le niveau ou le type (facultatif)</summary>${unitSelect(x.lvl,'assignPieceUnit')}<label class="pieceCategoryLabel">Type<select class="pieceCategory"><option>Intérieur</option><option>Annexe</option><option>Extérieur</option></select></label><label>Destination<select class="pieceLevel" aria-label="Destination de la pièce">${opts}</select></label></details><button type="button" data-act="piece-up" title="Monter">↑</button><button type="button" data-act="piece-down" title="Descendre">↓</button><button type="button" data-act="delete-piece" title="Supprimer">×</button></div>`;
  });
  const declaredUnit=unitOptions.find(u=>lv.startsWith(u.label+' — '))||(!unitOptions.length&&manualLevels.length===1?{surface:Number($('#surfaceHab')?.value)}:null);
  if(!rr.length)s+=`<p class="unitDeclaredOnly">${declaredUnit?.surface>0?'Surface globale retenue : <strong>'+fmt(declaredUnit.surface)+'</strong>. ':''}Aucune surface de pièce détaillée. Le total annoncé n’est pas ajouté aux pièces.</p>`;
  s+=`<button type="button" class="miniEditBtn" data-act="add-piece">＋ Ajouter une pièce</button>${rr.length?`<div class="surfaceTotal"><span>Total des pièces détaillées — ${E(lv)}</span><strong>${fmt(total)}</strong></div>`:''}</div>`;
 });
 const total=ins.filter(x=>!x._needsReview).reduce((a,x)=>a+x.val,0);
 const declaredTotal=unitOptions.length>1&&unitOptions.every(u=>u.surface>0)?unitOptions.reduce((v,u)=>v+u.surface,0):Number($('#surfaceHab')?.value)||0;
 if(unitOptions.length>1)s+=`<div class="grandTotal announcedHousingTotal"><span>TOTAL HABITABLE RETENU — ${unitOptions.map(u=>E(u.label)+' '+(u.surface>0?fmt(u.surface):'à préciser')).join(' + ')}</span><strong>${declaredTotal?fmt(declaredTotal):'À préciser'}</strong></div>`;
 s+=`<div class="grandTotal detailedHousingTotal"><span>TOTAL DES PIÈCES DÉTAILLÉES UNIQUEMENT — sans ajout des logements non détaillés</span><strong>${fmt(total)}</strong></div><button type="button" class="miniEditBtn" data-act="confirm-surface-total">${unitOptions.length>1?'Vérifier les surfaces par logement avant le calcul':'Utiliser ce total vérifié pour l’estimation'}</button><p class="small">Les surfaces globales annoncées restent distinctes du détail des pièces. Le calcul utilise les surfaces par logement confirmées ; les annexes sont exclues de la surface habitable.</p>`;
 const ann=manualSurfaceRows.filter(x=>x.cat==='Annexe'),ext=manualSurfaceRows.filter(x=>x.cat==='Extérieur');
 if(ann.length)s+=`<div class="otherSurface"><h4>Annexes — hors habitable</h4>${ann.map(otherRow).join('')}</div>`;
 const sanitaires=manualSurfaceRows.filter(x=>x.cat==='Sanitaire');if(sanitaires.length)s+=`<div class="otherSurface"><h4>Sanitaires — hors surface habitable</h4>${sanitaires.map(otherRow).join('')}</div>`;
 if(ext.length)s+=`<div class="otherSurface"><h4>Extérieurs — hors habitable</h4>${ext.map(otherRow).join('')}</div>`;
 return s+surfaceOverviewHTML()+'</section>';
}
// Une surface globale et les pièces qui la détaillent ne sont jamais additionnées.
function surfaceOverviewSections(){
 let units=[];try{units=JSON.parse($('#propertyUnitsJSON')?.value||'[]')}catch{}
 const interior=manualSurfaceRows.filter(r=>r.cat==='Intérieur');
 let totals=units.length?units.map(u=>{const rr=interior.filter(r=>r.lvl.startsWith(u.label+' — ')),sum=rr.filter(r=>!r._needsReview).reduce((v,r)=>v+r.val,0);return [u.label,'Annoncée : '+((u.declaredSurface??u.surface)>0?fmt(u.declaredSurface??u.surface):'Non renseignée')+' ; pièces détaillées : '+(rr.length?fmt(sum):'non détaillées')+(u.surface>0&&rr.length&&Math.abs((u.declaredSurface??u.surface)-sum)>.01?' ; différence entre annoncé et détail : '+fmt(Math.abs((u.declaredSurface??u.surface)-sum)):'')]}):[['Bien principal','Annoncée : '+(Number($('#surfaceHab')?.value)>0?fmt(Number($('#surfaceHab').value)):'Non renseignée')+' ; pièces détaillées : '+(interior.length?fmt(interior.filter(r=>!r._needsReview).reduce((v,r)=>v+r.val,0)):'non détaillées')]];
 if(/^terrain/i.test($('#type')?.value||'')){const land=buildInfo($('#notes')?.value||'').find(r=>r[0]==='Surface du terrain déclarée');totals=[['Surface habitable','Non applicable à un terrain'],['Surface du terrain annoncée',land?.[1]||'Non renseignée']];}
 const control=window.estimiaSurfaceControlExport?.()||[];
 const details=interior.map(r=>[r.name+' — '+r.lvl,fmt(r.val)+(r._needsReview?' — à vérifier':'')]);
 const ann=manualSurfaceRows.filter(r=>r.cat==='Annexe').map(r=>[r.name+' — '+r.lvl,fmt(r.val)+' — hors habitable']);
 // Les annexes sans surface restent visibles, sans inventer de métrage.
 document.querySelectorAll('#facts .annexCard .annexRow').forEach(row=>{const name=row.children[0]?.textContent?.trim();if(name&&!ann.some(r=>r[0].toLocaleLowerCase('fr').startsWith(name.toLocaleLowerCase('fr')+' — ')))ann.push([name,'Surface non renseignée — hors habitable']);});
 if(ann.length){const validAnn=manualSurfaceRows.filter(r=>r.cat==='Annexe'&&!r._needsReview);if(validAnn.length)ann.push(['Total des surfaces annexes chiffrées',fmt(validAnn.reduce((v,r)=>v+r.val,0))+' — surfaces non renseignées exclues']);}
 if(units.length>1&&units.every(u=>u.surface>0))totals.push(['Total habitable retenu',fmt(units.reduce((v,u)=>v+u.surface,0))+' — somme des surfaces retenues par logement, détail non additionné une seconde fois']);
 return [{title:'Surfaces habitables — synthèse par logement (sans double comptage)',rows:totals},...(control.length?control.map(u=>({title:'Logement — '+u.label,rows:[['Surface annoncée',fmt(Number(u.declared)||0)],['Surface retenue pour l’estimation',fmt(u.retained||0)],['Référence retenue',u.method],...(u.rows.length?u.rows.map(r=>[r.name+' — '+r.lvl.split(' — ').slice(-1)[0],fmt(r.val)]):[['Détail des pièces','Non détaillé — surface globale conservée']]),['Sous-total des pièces détaillées',u.rows.length?fmt(u.rows.reduce((a,r)=>a+r.val,0)):'Non détaillé']]})):[{title:'Surfaces habitables — détail des pièces',rows:details}]),...(units.length>1&&interior.some(r=>!units.some(u=>r.lvl.startsWith(u.label+' — ')))?[{title:'Détail complémentaire des pièces — répartition non précisée',rows:interior.filter(r=>!units.some(u=>r.lvl.startsWith(u.label+' — '))).map(r=>[r.name+' — '+r.lvl.replace(/^Logement non précisé — /,''),fmt(r.val)])}]:[]),{title:'Surfaces annexes — hors habitable',rows:ann.length?ann:[['Annexes','Aucune surface annexe renseignée']]}];
}
function surfaceOverviewHTML(){return '<div class="surfaceOverview"><h3>Tableaux récapitulatifs des surfaces</h3><p class="small">Les surfaces annoncées et le détail des pièces sont deux lectures du même bien. Les annexes sont séparées ; les écarts restent à vérifier.</p>'+surfaceOverviewSections().map(section=>'<h4>'+E(section.title)+'</h4><table><thead><tr><th>Bien / désignation</th><th>Surface / statut</th></tr></thead><tbody>'+section.rows.map(row=>'<tr><td>'+E(row[0])+'</td><td>'+E(row[1])+'</td></tr>').join('')+'</tbody></table>').join('')+'</div>';}
// V14.06 — arbitrage explicite, conservé par dossier et invalidé par changement des surfaces.
function arbitrationData(){try{return JSON.parse($('#surfaceArbitrationJSON').value||'{}')}catch{return {}}}
function writeArbitration(d){$('#surfaceArbitrationJSON').value=JSON.stringify(d);}
function surfaceControlModel(readDOM=true){
 if(readDOM)hydrateSurfaceRows();const state=arbitrationData();let units=[];try{units=JSON.parse($('#propertyUnitsJSON').value||'[]')}catch{}
 const multi=units.length>1,field=Number($('#surfaceHab').value)||0;
 if(!multi){const previous=state.single;units=[{key:'principal',label:$('#type').value||'Bien principal',type:/appartement|studio/i.test($('#type').value)?'appartement':'maison',surface:field,declaredSurface:previous&&Math.abs(field-previous.retained)<.001?previous.declared:field}];}
 const rows=manualSurfaceRows.map(x=>({name:x.name,val:x.val,lvl:x.lvl,cat:x.cat,review:!!x._needsReview}));
 const list=units.map(u=>{const rr=rows.filter(x=>x.cat==='Intérieur'&&(!multi||x.lvl.startsWith(u.label+' — ')));return {...u,key:u.key||u.label,declared:u.declaredSurface??u.surface,rows:rr,sum:Math.round(rr.reduce((v,x)=>v+x.val,0)*100)/100};});
 const fingerprint=JSON.stringify({units:list.map(u=>[u.key,u.label,u.declared]),rows});
 const orphans=multi?rows.filter(x=>x.cat==='Intérieur'&&!list.some(u=>x.lvl.startsWith(u.label+' — '))):[];
 const totalRetained=list.reduce((sum,u)=>sum+Number(u.surface||0),0);
 const issues=[];if(multi&&Math.abs(field-totalRetained)>.02)issues.push('Le total de la fiche diffère de la somme des logements : utilisez le total des logements vérifiés.');if(readDOM&&[...document.querySelectorAll('#facts .pieceVal')].some(el=>!(Number(el.value)>0)))issues.push('Chaque pièce doit avoir une surface positive ou être retirée du relevé chiffré.');
 if(rows.some(x=>x.review))issues.push('Une surface de pièce dépasse la limite de contrôle : corrigez ou qualifiez précisément la pièce.');
 for(const u of list){const decision=state.fingerprint===fingerprint?state.choices?.[u.key]:null;u.decision=decision;u.retained=decision?.retained??Number(u.surface);u.conflict=u.rows.length&&Math.abs((Number(u.declared)||0)-u.sum)>.02;u.pending=(u.conflict||!(Number(u.declared)>0))&&!decision;if(u.pending)issues.push(u.label+' : choisissez explicitement la surface retenue.');if(!(u.retained>0))issues.push(u.label+' : surface retenue positive requise.');}
 return {state,units:list,rows,orphans,fingerprint,multi,issues:/^terrain/i.test($('#type').value)?[]:issues};
}
function renderSurfaceControl(){const host=$('#surfaceControlPanel');if(!host)return;const m=surfaceControlModel();if(/^terrain/i.test($('#type').value)||!$('#type').value||!m.issues.length){host.hidden=true;if(!m.issues.length)$('#estimationResults .surfaceEstimateWarning')?.remove();return;}host.hidden=false;let h='<h3>Contrôle des surfaces par logement</h3><p>Surface habitable déclarée et détail des pièces restent distincts. La surface Carrez ne les remplace pas automatiquement. Annexes exclues.</p>';
 h+='<div class="surfaceGate '+(m.issues.length?'surfaceGateError':'')+'" role="status">'+(m.issues.length?'⚠ Calcul et validation bloqués : '+m.issues.map(E).join(' '):'✓ Surfaces utilisables pour le calcul. La sauvegarde du brouillon reste accessible.')+'</div>';
 if(m.multi&&m.issues.some(x=>x.startsWith('Le total de la fiche')))h+='<button type="button" data-sync-housing-total>Utiliser la somme des surfaces retenues des logements</button>';
 for(const u of m.units){if(!u.pending)continue;h+='<fieldset class="surfaceDecision" data-key="'+E(u.key)+'"><legend>'+E(u.label)+'</legend><p>Surface annoncée : <b>'+fmt(Number(u.declared)||0)+'</b> · Pièces détaillées : <b>'+(u.rows.length?fmt(u.sum):'Non détaillées')+'</b> · Surface retenue : <b>'+fmt(u.retained||0)+'</b></p>';
 h+='<label>Choisir la référence<select class="surfaceDecisionMethod"><option value="">'+(u.decision?'Choix enregistré : '+E(u.decision.method):u.pending?'Choix obligatoire':'Pas d’écart nécessitant un choix')+'</option><option value="annoncee" '+(!(u.declared>0)?'disabled':'')+'>Conserver la surface annoncée</option><option value="detail" '+(!u.rows.length?'disabled':'')+'>Retenir la somme des pièces</option><option value="manuelle">Saisir une surface corrigée</option></select></label><label class="surfaceManualLabel" hidden>Surface corrigée (m²)<input class="surfaceManualAmount" type="number" min="0.01" step="0.01"></label><button type="button" data-surface-confirm>Confirmer le choix pour ce logement</button></fieldset>';}
 const estimate=$('#estimationResults');let warning=estimate?.querySelector('.surfaceEstimateWarning');if(m.issues.length&&estimate?.querySelector('.estimationValueAmount')){estimate.dataset.calculationPending='true';if(!warning){warning=document.createElement('p');warning.className='surfaceEstimateWarning surfaceGateError';warning.setAttribute('role','status');estimate.prepend(warning);}warning.textContent='Ancien résultat conservé comme référence : surfaces non validées. Résolvez les alertes puis recalculez avant utilisation.';}else warning?.remove();
 if(host.dataset.surfaceRender!==h){host.innerHTML=h;host.dataset.surfaceRender=h;}
}
function confirmSurfaceDecision(target){const m=surfaceControlModel(),box=target.closest('.surfaceDecision'),key=box.dataset.key,u=m.units.find(x=>x.key===key),method=box.querySelector('.surfaceDecisionMethod').value;if(!method){alert('Choisissez la référence à retenir.');return;}
 const retained=method==='annoncee'?Number(u.declared):method==='detail'?u.sum:Number(box.querySelector('.surfaceManualAmount').value);if(!(retained>0&&Number.isFinite(retained))){alert('Saisissez une surface positive.');return;}
 const state=m.state.fingerprint===m.fingerprint?m.state:{choices:{}};state.fingerprint=m.fingerprint;state.choices||={};state.choices[key]={method,retained,date:new Date().toISOString(),declared:u.declared,detailed:u.sum};
 if(m.multi){let units=JSON.parse($('#propertyUnitsJSON').value);units=units.map(item=>{const k=item.key||item.label,choice=state.choices[k];return {...item,declaredSurface:item.declaredSurface??item.surface,surface:choice?choice.retained:item.surface};});$('#propertyUnitsJSON').value=JSON.stringify(units);$('#surfaceHab').value=units.reduce((a,u)=>a+Number(u.surface||0),0).toFixed(2);}else{state.single={declared:u.declared,retained};$('#surfaceHab').value=retained.toFixed(2);}
 writeArbitration(state);$('#surfaceHab').dispatchEvent(new Event('input',{bubbles:true}));window.estimiaRefreshSurfaceOverview?.();renderSurfaceControl();
}
window.estimiaRefreshSurfaceControl=renderSurfaceControl;window.estimiaSurfaceIssues=()=>surfaceControlModel().issues;
window.estimiaRequireSurfaces=()=>{const issues=window.estimiaSurfaceIssues();renderSurfaceControl();if(issues.length){$('#estimationStatus').textContent='Calcul bloqué : '+issues.join(' ');$('#visitSteps [data-step="1"]')?.click();$('#surfaceControlPanel')?.scrollIntoView({behavior:'smooth',block:'center'});return false;}return true;};
window.estimiaSurfaceControlExport=()=>{const m=surfaceControlModel(false);return m.units.map(u=>({label:u.label,declared:u.declared,retained:u.retained,method:({annoncee:'Surface annoncée confirmée',detail:'Somme des pièces retenue',manuelle:'Surface corrigée par le conseiller'}[u.decision?.method]||'Surface déclarée sans écart détecté'),rows:u.rows}));};
let surfaceControlTimer;
function scheduleSurfaceControl(e){if(e?.target?.closest('.surfaceDecision'))return;clearTimeout(surfaceControlTimer);surfaceControlTimer=setTimeout(renderSurfaceControl,120);}
document.addEventListener('input',scheduleSurfaceControl);document.addEventListener('change',e=>{if(e.target.matches('.surfaceDecisionMethod')){e.target.closest('fieldset').querySelector('.surfaceManualLabel').hidden=e.target.value!=='manuelle';return;}scheduleSurfaceControl(e);});document.addEventListener('click',e=>{if(e.target.matches('[data-sync-housing-total]')){const m=surfaceControlModel();$('#surfaceHab').value=m.units.reduce((sum,u)=>sum+u.retained,0).toFixed(2);$('#surfaceHab').dispatchEvent(new Event('input',{bubbles:true}));renderSurfaceControl();}else if(e.target.matches('[data-surface-confirm]'))confirmSurfaceDecision(e.target);else if(e.target.closest('#facts button'))scheduleSurfaceControl();});document.addEventListener('estimia:case-ready',()=>{if($('#surfaceControlPanel')){$('#surfaceControlPanel').innerHTML='';delete $('#surfaceControlPanel').dataset.surfaceRender;}scheduleSurfaceControl();});
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>scheduleSurfaceControl()).observe($('#facts'),{childList:true,subtree:true});renderSurfaceControl();});

document.addEventListener('estimia:case-ready',()=>{if(document.querySelector('#facts .editableSurface>.assignPieceUnit')){hydrateSurfaceRows();refreshSurfaceEditor(true);}});
window.estimiaRefreshSurfaceOverview=()=>refreshSurfaceOverview();
function refreshSurfaceOverview(){const box=document.querySelector('#facts .surfaceOverview');if(box){const d=document.createElement('div');d.innerHTML=surfaceOverviewHTML();box.replaceWith(d.firstElementChild);}}
document.addEventListener('input',e=>{if(e.target.closest('#facts .annexCard'))refreshSurfaceOverview();});
document.addEventListener('focusout',e=>{if(e.target.closest('#facts .otherSurface')){hydrateSurfaceRows();refreshSurfaceOverview();}});
document.addEventListener('click',e=>{if(e.target.closest('#facts .annexCard button'))setTimeout(refreshSurfaceOverview,0);});
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
function refreshSurfaceEditor(preserveDeclared=false){
 preserveDeclared=true;
 try{if(JSON.parse($('#propertyUnitsJSON')?.value||'[]').length>1)preserveDeclared=true;}catch{}
 const box=document.querySelector('#facts .surfaceEditor');if(!box)return;
 const d=document.createElement('div');d.innerHTML=renderSurfaceEditor();box.replaceWith(d.firstElementChild);renderPhotoManager();
 const pending=manualSurfaceRows.filter(x=>x._needsReview),total=manualSurfaceRows.filter(x=>x.cat==='Intérieur'&&!x._needsReview).reduce((a,x)=>a+x.val,0);
 const field=$('#surfaceHab');if(field&&!preserveDeclared){field.dataset.needsReview=String(pending.length>0);field.value=!pending.length&&total?total.toFixed(2):'';field.dispatchEvent(new Event('input',{bubbles:true}));}
 const alerts=$('#surfaceReviewAlerts');if(alerts)alerts.innerHTML=card('Surfaces à vérifier','⚠️',pending.map(x=>[x.name+' — '+x.lvl,fmt(x.val)+' à vérifier : corrigez la surface sur la ligne de cette pièce, ou renseignez une surface habitable globale confirmée.']));
 $('#surfaceCalculationNotice')?.remove();
 if(!surfaceRestoring)rememberSurfaceState();
}
function hydrateSurfaceRows(){
 const box=document.querySelector('#facts .surfaceEditor');if(!box)return false;
 manualLevels=[...box.querySelectorAll('.levelBlock')].map(b=>b.querySelector('.levelName')?.value||b.dataset.level||'Rez-de-chaussée');
 const rows=[];box.querySelectorAll('.levelBlock').forEach(b=>b.querySelectorAll('.editableSurface').forEach((r,i)=>{
 const name=clean(r.querySelector('.pieceName')?.value||'Pièce'),val=Number(r.querySelector('.pieceVal')?.value),lvl=r.querySelector('.pieceLevel')?.value||b.dataset.level;
 if(!Number.isFinite(val)||val<=0)return;
 rows.push({_id:r.dataset.id||'restored'+rows.length,name,val,lvl,cat:'Intérieur',_needsReview:roomSurfaceLimit(name)!=null&&val>roomSurfaceLimit(name)});
 }));
 // Conserver les lignes annexes et extérieures de l'éditeur, qui ne contribuent pas au total.
 box.querySelectorAll('.otherSurface').forEach(group=>{const cat=/sanitaires/i.test(group.querySelector('h4')?.textContent||'')?'Sanitaire':/ext[ée]rieur/i.test(group.querySelector('h4')?.textContent||'')?'Extérieur':'Annexe';group.querySelectorAll('.surfaceRow').forEach(r=>{const label=clean(r.querySelector('.pieceName')?.value||r.querySelector('span')?.textContent||''),val=n(r.querySelector('.pieceVal')?.value||r.querySelector('b')?.textContent||'');if(!Number.isFinite(val))return;const parts=label.split(' — ');rows.push({_id:r.dataset.id||'restoredOther'+rows.length,name:parts[0],lvl:r.querySelector('.pieceLevel')?.value||parts.slice(1).join(' — ')||'Niveau non précisé',val,cat:r.querySelector('.pieceCategory')?.value||cat,_needsReview:roomSurfaceLimit(parts[0])!=null&&val>roomSurfaceLimit(parts[0])})})});
 manualSurfaceRows=rows;return true;
}
function confirmSurfaceTotal(){renderSurfaceControl();$('#surfaceControlPanel')?.scrollIntoView({behavior:'smooth',block:'center'});}
function repairInheritedSanitaryAnnex(){
 const text=clean(($('#notes')?.value||'')+' '+($('#correction')?.value||''));if(!text)return;
 const parsed=surfaces(text,true),annexes=parsed.filter(x=>x.cat==='Annexe'&&!isSanitaryRoom(x.name));
 let changed=false;
 document.querySelectorAll('#facts .surfaceEditor .otherSurface .surfaceRow').forEach(row=>{
 const name=clean(row.querySelector('span')?.textContent||'').split(' — ')[0],val=n(row.querySelector('b')?.textContent||'');
 if(!isSanitaryRoom(name)||!Number.isFinite(val))return;
 if(parsed.some(x=>isSanitaryRoom(x.name)&&Math.abs(x.val-val)<.001))return;
 const owner=annexes.find(x=>Math.abs(x.val-val)<.001);if(!owner){row.remove();changed=true;return;}
 const group=row.closest('.otherSurface');
 const exists=[...group.querySelectorAll('.surfaceRow')].some(other=>other!==row&&low(clean(other.querySelector('span')?.textContent||'').split(' — ')[0])===low(owner.name)&&Math.abs(n(other.querySelector('b')?.textContent||'')-val)<.001);
 if(exists)row.remove();else row.querySelector('span').textContent=owner.name+' — '+owner.lvl;
 changed=true;
 });
 if(changed){
 const note=document.createElement('p');note.className='small';note.dataset.sanitaryAreaRepair='true';note.textContent='Correction du dossier : WC conservé dans les sanitaires, sans surface précisée. Seules les surfaces rattachées à une cave ou un garage sont conservées dans les annexes.';document.querySelector('#facts .surfaceEditor')?.appendChild(note);
 }
}
function reclassifySanitarySurfaceRows(){
 const box=document.querySelector('#facts .surfaceEditor');if(!box)return;
 for(const group of [...box.querySelectorAll('.otherSurface')]){
 if(/sanitaires/i.test(group.querySelector('h4')?.textContent||''))continue;
 for(const row of [...group.querySelectorAll('.surfaceRow')]){
 const name=clean(row.querySelector('span')?.textContent||'').split(' — ')[0];if(!isSanitaryRoom(name))continue;
 let target=[...box.querySelectorAll('.otherSurface')].find(g=>/sanitaires/i.test(g.querySelector('h4')?.textContent||''));if(!target){target=document.createElement('div');target.className='otherSurface';target.innerHTML='<h4>🚿 Sanitaires — hors surface habitable</h4>';box.appendChild(target);}
 target.appendChild(row);
 }
 if(!group.querySelector('.surfaceRow'))group.remove();
 }
}
document.addEventListener('estimia:surfaces-restored',()=>{
 manualSurfaceRows=[];manualLevels=[];repairInheritedSanitaryAnnex();reclassifySanitarySurfaceRows();hydrateSurfaceRows();
 const field=$('#surfaceHab'),text=clean(($('#notes')?.value||'')+' '+($('#correction')?.value||''));
 if(field&&!field.value&&manualSurfaceRows.length){
 const pending=manualSurfaceRows.some(x=>x._needsReview)||sanitarySurfaceWarnings(text).length>0;
 const total=manualSurfaceRows.filter(x=>x.cat==='Intérieur').reduce((a,x)=>a+x.val,0);
 if(!pending&&total>0){field.value=total.toFixed(2);field.dataset.needsReview='false';$('#surfaceCalculationNotice')?.remove();$('#surfaceReviewAlerts')?.remove();}
 }

 const box=document.querySelector('#facts .surfaceEditor');if(box&&!box.querySelector('[data-act="confirm-surface-total"]')){
 const b=document.createElement('button');b.type='button';b.className='miniEditBtn';b.dataset.act='confirm-surface-total';b.textContent='Utiliser ce total vérifié pour l’estimation';box.appendChild(b);}
});
function surfaceRowById(id){return manualSurfaceRows.find(x=>x._id===id)}
function movePiece(id,dir){
 const x=surfaceRowById(id);if(!x)return;const same=manualSurfaceRows.filter(y=>y.cat==='Intérieur'&&y.lvl===x.lvl);
 const pos=same.findIndex(y=>y._id===id),other=same[pos+dir];if(!other)return;
 const ia=manualSurfaceRows.indexOf(x),ib=manualSurfaceRows.indexOf(other);[manualSurfaceRows[ia],manualSurfaceRows[ib]]=[manualSurfaceRows[ib],manualSurfaceRows[ia]];refreshSurfaceEditor(true);
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
 const rows=[],s=normalizeDictatedAreas(t);
 const m=s.match(/\bsalle de bains?\b/i);
 if(m){const local=sanitaryLocalFragment(s,m.index,m.index+m[0].length),c=m[0]+local.tail;let v='1 salle de bains';if(local.area!=null&&local.area<=15&&!sharedAnnexAreas(s).some(g=>g.valueIndex===local.index))v+=' — '+fmt(local.area);const eq=[];if(/\bdouche\b/i.test(c))eq.push('douche');if(/\bbaignoire\b/i.test(c))eq.push('baignoire');if(/(?:deux|2|double)\s+vasques?|double vasque/i.test(c))eq.push('double vasque');else if(/\bvasque\b/i.test(c))eq.push('vasque');if(eq.length)v+=' — '+eq.join(' · ');rows.push(['Salle de bains',v]);}
 const e=s.match(/\bsalle d[' ]eau\b/i);
 if(e){const local=sanitaryLocalFragment(s,e.index,e.index+e[0].length),c=e[0]+local.tail;let v="1 salle d’eau";if(local.area!=null&&local.area<=15&&!sharedAnnexAreas(s).some(g=>g.valueIndex===local.index))v+=' — '+fmt(local.area);if(/douche\s+pmr/i.test(c))v+=" — douche PMR";else if(/douche à l[' ]italienne/i.test(c))v+=" — douche à l’italienne";if(/\bsans\s+wc\b/i.test(s.slice(e.index,e.index+120).split(/(?<!\d)\.(?!\d)|[!?;]/)[0]))v+=" — sans WC";rows.push(["Salle d’eau",v]);}
 const measuredBaths=surfaces(s).filter(r=>/^salle de bains?$/i.test(r.name));
 if(measuredBaths.length>1){
  const old=rows.findIndex(r=>r[0]==='Salle de bains');if(old>=0)rows.splice(old,1);
  measuredBaths.forEach((r,i)=>rows.push(['Salle de bains '+(i+1)+' — '+r.lvl,'1 salle de bains — '+fmt(r.val)]));
 }
 const positive=s.replace(/\b(?:sans|pas\s+de)\s+(?:wc|toilettes?)\b/gi,'');
 const wc=countExplicit(positive,'wc|toilettes?');
 const wm=positive.match(/\b(?:wc|toilettes?)\b/i);
 if(wm){
  let value=wc?String(wc):'Nombre non précisé';
  const local=sanitaryLocalFragment(positive,wm.index,wm.index+wm[0].length),shared=sharedAnnexAreas(positive);
  const before=positive.slice(0,wm.index).split(/(?<!\d)\.(?!\d)|[!?;]/).pop().slice(-35);
  const context=before+positive.slice(wm.index,wm.index+110).split(/(?<!\d)\.(?!\d)|[!?;]/)[0];
  const detail=[];
  if(/\brdc\b|rez[- ]de[- ]chauss[ée]e/i.test(context))detail.push('Rez-de-chaussée');
  if(/\bdans\s+(?:la|une)\s+cave\b/i.test(context))detail.push('Situé dans la cave');
  else if(/\bdans\s+(?:le|un)\s+garage\b/i.test(context))detail.push('Situé dans le garage');
  if(local.area!=null&&local.area<=15&&!shared.some(g=>g.valueIndex===local.index))detail.push(fmt(local.area));
  else if(detail.length)detail.push('Surface non précisée');
  if(detail.length)value+=' — '+detail.join(' · ');
  rows.push(['WC',value]);
 }
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
  if(/chemin[ée]e|foyer/i.test(m[0])&&/d[ée]corati(?:f|ve)s?/i.test(fragment))label='Cheminée décorative (hors chauffage)';
  if(/r[ée]versible/i.test(fragment))label+=' réversible';
  // Ne jamais utiliser un fragment libre comme détail : seuls des attributs
  // d'équipement explicitement reconnus peuvent alimenter cette rubrique.
  const attributes=[];
  for(const rx of [/\b\d+(?:[.,]\d+)?\s*(?:litres?|l\b|kwh?\b|watts?|w\b)/gi,/\b(?:hors service|condamn[ée]e?|d[ée]corati(?:f|ve)s?|en panne|bon [ée]tat|[àa] remplacer)\b/gi,/\b(?:install[ée]e?|remplac[ée]e?)\s+en\s+\d{4}\b/gi]){
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
document.addEventListener('estimia:case-ready',()=>{repairDeclaredUnitScopes();if(hydrateSurfaceRows())refreshSurfaceEditor(true);});
window.estimiaEssentialTextForUnit=(text,key)=>unitNarrativeText(text,propertyUnits(text),key);
window.estimiaEssentialNormalizeText=normalizeDictatedAreas;
window.estimiaEssentialExtract=(text)=>({heating:heating(text),condition:conditionSignals(text).at(-1)?.condition||''});
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
function workRemiseAt(t,index,length){
 const after=t.slice(index+length,index+length+70);
 return /^\s+(?:(?:en|aux?|à)\s+(?:normes?|neuf|niveau|jour|service|[ée]tat)|[ée]normes?\s+[ée]lectri)/i.test(after);
}
function annexes(t){
 const text=clean(t),rows=[],shared=sharedAnnexAreas(t);
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
   if(name==='Remise'&&workRemiseAt(text,m.index,m[0].length))continue;
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
  if(area&&!shared.some(g=>(h.name==='Cave'||h.name==='Garage')&&h.pos>=g.start&&h.pos<g.end))detail.push(area[1].replace(',','.')+' m²');
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
 for(const g of shared)merged.set('surface commune cave garage '+g.start,[g.name,'—',fmt(g.val)+' au total — répartition cave / garage non précisée']);
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
  if(r.ok&&j.result&&[$('#cadCommune').value].some(v=>low(v)===low(q)||low(v)===low(j.result.name))){
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
 if(com&&!cadParcels.length){await verifyAddressV137();return}
 if(!com||!cadParcels.length){$('#cadStatus').textContent='Renseignez la commune et une référence, ou utilisez la recherche depuis l’adresse.';return}
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

const supplementGroups=[
 ['Situation du bien',[['estAvailability','Disponibilité'],['estUsage','Usage'],['estRental','Location'],['estRent','Loyer mensuel (€)']]],
 ['Caractéristiques générales',[['estFloor','Étage'],['estYear','Année de construction'],['estCondition','État général'],['estFeatures','Détails de la visite'],['estPlannedWorks','Travaux à prévoir — déclarations'],['estPartyWall','Mitoyenneté'],['estPMR','Accessibilité PMR'],['estElevator','Ascenseur'],['estParking','Stationnements']]],
 ['Copropriété',[['estLot','Numéro de lot de copropriété'],['estSyndic','Syndic'],['estCharges','Charges annuelles déclarées (€)'],['estChargesDetails','Précisions sur les charges'],['estCoproWorks','Travaux votés — déclarations'],['estWorks','Travaux d’un ancien dossier — affectation à vérifier']]],
 ['Environnement et accès',[['estOrientation','Orientation'],['estEnvironment','Environnement'],['estNuisances','Nuisances'],['estAccess','Accès']]],
 ['Construction et équipements',[['estRoof','Toiture'],['estFacade','Façades'],['estWindows','Menuiseries'],['estHeating','Chauffage et éléments décoratifs'],['estHotWater','Production d’eau chaude'],['estNetworks','Réseaux']]]
];
function propertySupplementSections(){
 const result=supplementGroups.map(([title,fields])=>({title,rows:fields.map(([id,label])=>[label,$('#'+id)?.value||'']).filter(r=>String(r[1]).trim())})).filter(s=>s.rows.length);
 const docs=[['estDocTitle','Acte de propriété'],['estDocDpe','Diagnostics'],['estDocTax','Taxe foncière'],['estDocCopro','Documents de copropriété'],['estDocSpanc','SPANC']].filter(([id])=>$('#'+id)?.checked).map(([,label])=>[label,'Indiqué disponible — contenu non vérifié']);if(docs.length)result.push({title:'Documents disponibles déclarés',rows:docs});
 return result;
}
function renderSupplementCards(){
 const facts=$('#facts');if(!facts)return;
 facts.querySelectorAll('.supplementCard').forEach(x=>x.remove());
 for(const sec of propertySupplementSections())facts.insertAdjacentHTML('beforeend',card(sec.title,'',sec.rows).replace('proGroup','proGroup supplementCard'));
 const legacy=$('#legacyWorksLabel');if(legacy)legacy.hidden=!$('#estWorks')?.value;
}
function conditionSignals(text){
 const t=String(text||''),signals=[];
 for(const m of t.matchAll(/[àa]\s+r[ée]habiliter|[àa]\s+r[ée]nover|r[ée]novation\s+compl[èe]te|[àa]\s+rafra[iî]chir|rafra[iî]chissement|bon\s+[ée]tat/gi)){
  if(/(?:pas|non|sans)\s*(?:besoin\s+de\s+)?$/i.test(t.slice(Math.max(0,m.index-35),m.index)))continue;
  // Un réseau en bon état / à rénover n’est pas l’état général du logement.
  const start=Math.max(t.lastIndexOf('.',m.index-1),t.lastIndexOf(';',m.index-1),t.lastIndexOf('\n',m.index-1))+1,context=t.slice(start,m.index);
  const network=[...context.matchAll(/assainissement|eaux usées|fosse (?:septique|toutes eaux)|micro[- ]?station|eau potable|forage|puits|fibre/gi)].at(-1),property=[...context.matchAll(/\b(?:appartement|studio|maison|villa|logement|bien|ensemble)\b|état général/gi)].at(-1);
  if(network&&(!property||network.index>property.index)&&!/^bon\s+état\s+général/i.test(t.slice(m.index)))continue;
  const type=[...t.slice(0,m.index).matchAll(/\b(appartement|studio|maison|villa)\b/gi)].at(-1)?.[1]?.toLowerCase()||'';
  const condition=/habiliter/i.test(m[0])?'À réhabiliter':/nover|novation/i.test(m[0])?'À rénover':/fra/i.test(m[0])?'À rafraîchir':'Bon état';
  const identified=propertyUnits(t),scope=unitScopeAt(t,m.index,identified),key=identified.find(u=>u.label===scope)?.key||type;
  signals.push({type,key,condition,index:m.index});
 }return signals;
}
window.estimiaConditionSignals=conditionSignals;
function fillVisitExtras(t){
 const set=(id,value)=>{const el=$('#'+id);if(el&&(!el.value.trim()||el.value===el.dataset.dictationValue)){el.value=value;el.dataset.dictationValue=value;}};
 const text=normalizeDictatedAreas(t);
 const charges=[];
 const rx=/\bcharges?\b[^.!?;\d]{0,85}?(\d+(?:[.,]\d+)?)\s*(?:euros?|€)?\s*(?:environ\s*)?(?:par\s+(an|mois)|annuell?e?s?|mensuell?e?s?)/gi;
 for(const m of text.matchAll(rx)){const monthly=m[2]==='mois'||/mensuel/i.test(m[0]);charges.push({index:m.index,value:n(m[1])*(monthly?12:1),note:(/environ/i.test(m[0])?'Montant approximatif déclaré. ':'')+(monthly?'Charges mensuelles '+m[1]+' × 12 : montant annualisé. ':'Charges annuelles déclarées. ')})}
 const prefix=/\bcharges?\s+annuell?e?s?\s*(?:de|:|sont|font|environ)?\s*(\d+(?:[.,]\d+)?)/gi;
 for(const m of text.matchAll(prefix))charges.push({index:m.index,value:n(m[1]),note:(/environ/i.test(m[0])?'Montant approximatif déclaré. ':'')+'Charges annuelles déclarées. '});
 const monthlyPrefix=/\bcharges?\s+(?:de\s+copropri[ée]t[ée]\s+)?mensuell?e?s?\s*(?:de|:|sont|font|environ)?\s*(\d+(?:[.,]\d+)?)/gi;
 for(const m of text.matchAll(monthlyPrefix))charges.push({index:m.index,value:n(m[1])*12,note:(/environ/i.test(m[0])?'Montant approximatif déclaré. ':'')+'Charges mensuelles '+m[1]+' × 12 : montant annualisé. '});
 const amount=charges.sort((a,b)=>a.index-b.index).at(-1);
 if(amount){
  const chargeField=$('#estCharges'),manualCharge=chargeField.value.trim()&&chargeField.value!==chargeField.dataset.dictationValue;
  set('estCharges',String(Math.round(amount.value*100)/100));
  const scope=[];if(/assurance\s+de\s+l[' ]immeuble/i.test(text))scope.push('assurance de l’immeuble');
  if(/[ée]lectricit[ée]\s+(?:des?\s+)?parties?\s+communes?/i.test(text))scope.push('électricité des parties communes');
  set('estChargesDetails',(manualCharge?'Montant annuel renseigné manuellement ; dernière dictée : '+amount.value.toLocaleString('fr-FR')+' € annualisés, à rapprocher du montant retenu. ':amount.note)+(scope.length?'Postes cités : '+scope.join(' ; ')+'. ':'')+'Périmètre appartement / studio à confirmer si non précisé.');
 }else{set('estCharges','');set('estChargesDetails','')}
 const syndic=text.match(/\bsyndic\s+(?:(?:est|et|:)\s+)?(b[ée]n[ée]vole|professionnel)\b/i);
 const syndicNeg=syndic&&/(?:pas de|aucun)\s*$/i.test(text.slice(Math.max(0,syndic.index-20),syndic.index));
 set('estSyndic',syndic&&!syndicNeg?'Syndic '+syndic[1].toLowerCase():'');
 const floor=markers(text).filter(m=>/étage/.test(m.name)).at(-1);
 set('estFloor',floor?floor.name+(/dernier\s+[ée]tage/i.test(text)?' — dernier étage':''):'');
 if($('#estCondition')?.dataset.qualityManual!=='true')set('estCondition',conditionSignals(text).at(-1)?.condition||'');
 const planned=text.match(/\b(?:en termes de travaux|travaux [àa] pr[ée]voir|travaux de r[ée]novation)\b\s*(?:je r[ée]p[eè]te\s*)?([^.!?;]{1,350})/i);
 set('estPlannedWorks',planned?clean(planned[1].split(/\bje corrige\b|\bles surfaces\b/i)[0]):'');
 const features=[];
 if(/\btraversant\b/i.test(text)&&!/non\s+traversant/i.test(text))features.push('Traversant');
 if(/\blumineux\b/i.test(text)&&!/(?:non|pas|peu)\s+lumineux/i.test(text))features.push('Lumineux');
 if(/belle?\s+hauteur\s+sous\s+plafond/i.test(text))features.push('Belle hauteur sous plafond — non chiffrée');
 if(/[ée]l[ée]ments?\s+anciens?\s+au\s+sol/i.test(text))features.push('Éléments anciens au sol mentionnés — matériaux à confirmer');
 if(/studio\b[^.!?]{0,100}ind[ée]pendant/i.test(text))features.push('Studio indépendant');
 if(/studio\b[^.!?]{0,100}accessible depuis le palier/i.test(text))features.push('Studio accessible depuis le palier');
 if(/kitchenette\s+am[ée]nag[ée]e/i.test(text))features.push('Kitchenette aménagée');
 set('estFeatures',features.join(' · '));
 set('estUsage',/usage\s+mixte/i.test(text)?'Mixte':/usage\s+professionnel/i.test(text)?'Professionnel':/usage\s+(?:d[' ]|[àa]\s+l[' ])?habitation/i.test(text)?'Habitation':'');
 const orientation=text.match(/orient[ée][^.!?;]{0,12}?\b(nord|sud|est|ouest)\s*(?:et|\/|-)\s*(nord|sud|est|ouest)\b/i)||text.match(/orient[ée][^.!?;]{0,12}?\b(nord|sud|est|ouest)\b/i);
 set('estOrientation',orientation?orientation.slice(1).filter(Boolean).map(x=>x[0].toUpperCase()+x.slice(1).toLowerCase()).join(' / '):'');
 set('estEnvironment',/centre[- ]ville/i.test(text)?'Centre-ville':'');
 const voted=text.match(/\btravaux\s+vot[ée]s?\s*[:：]?\s*([^.!?;]{1,120})/i);
 const noVote=/\b(?:pas de|aucuns?)\s+travaux\s+vot[ée]s?\b/i.test(text);
 set('estCoproWorks',noVote?'Aucun travail voté déclaré':voted?clean(voted[1]):'');
}
function repairVisitSupplements(){
 const t=clean(($('#notes')?.value||'')+' '+($('#correction')?.value||''));if(!t)return;
 fillVisitExtras(t);fillConstructionExtras(t);
 const mentions=[...t.matchAll(/\bremises?\b/gi)];
 if(mentions.length&&mentions.every(m=>workRemiseAt(t,m.index,m[0].length)))$('#facts')?.querySelectorAll('.annexRow').forEach(row=>{if(/^remise$/i.test(row.children[0]?.textContent.trim()||''))row.remove()});
 renderSupplementCards();estUpdateCounts();
}
document.addEventListener('estimia:contacts-restored',repairVisitSupplements);
// Remplissage prudent des compléments, à partir de la dictée complète.
// Ne remplace jamais une valeur renseignée manuellement.
function fillConstructionExtras(t){
 const set=(id,value)=>{const el=$(id);if(el&&(!String(el.value||'').trim()||el.value===el.dataset.dictationValue)){el.value=value;el.dataset.dictationValue=value;el.dispatchEvent(new Event('change',{bubbles:true}));}};
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
 if(/^(?:décoratives?|décoratifs?)$/i.test($('#estHeating')?.value||''))$('#estHeating').value='';
 const equipmentText=r=>(r[1]==='—'?'':r[1]+' × ')+r[0]+(r[2]?' — '+r[2]:'');
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
 const estimateFields=()=>JSON.stringify(['#type','#address','#cadCommune','#surfaceHab','#propertyUnitsJSON','#estCondition','#estPlannedWorks'].map(id=>$(id)?.value||''));
 const estimateBefore=estimateFields();
 $('#notes').value=normalizeElectricalPhrase($('#notes').value);
 const raw=$('#notes').value||'',corr=$('#correction').value||'',t=clean(raw+' '+corr);
 const o=owner(t),ownerField=$('#owner'),useOwner=o&&(!ownerField.value||ownerField.value===ownerField.dataset.dictationValue);if(useOwner){ownerField.value=o;ownerField.dataset.dictationValue=o;}
 const ph=phone(t);if(ph)$('#ownerPhone').value=ph;
 const mail=emailFromDictation(t);
 // Synchroniser les cartes dès que la dictée a rempli les champs historiques.
 if(o||ph||mail)ownUpdateFromDictation(useOwner?o:'',ph,mail);
 const a=address(t);if(a&&a.street&&(!$('#address').value||$('#address').value===$('#address').dataset.dictationValue)){$('#address').value=a.street;$('#address').dataset.dictationValue=a.street;$('#cadCommune').value=a.city;$('#cadCommune').dataset.postcode=a.postcode||'';$('#cadCommune').dataset.insee='';void normalizeCommune(a.city,a.postcode||'');}
 const cps=parseCadParcels(t);if(cps.length){cps.forEach(p=>addCadParcel(p.section,p.numero,false));$('#cadSection').value='';$('#cadParcel').value='';}
 const cm=commune(t);
 if(cm&&!$('#cadCommune').value){
  $('#cadCommune').value=cm.name;
  $('#cadCommune').dataset.postcode=cm.postcode||'';
  void normalizeCommune(cm.name,cm.postcode);
 }
 const typ=typeOf(t),units=propertyUnits(t),typeField=$('#type');
 const suggestedType=units.length>1?units.map(u=>u.label).join(' + '):typ;
 if(suggestedType&&(!typeField.value||typeField.value===typeField.dataset.dictationValue||low(typeField.value)===low(typ))){typeField.value=suggestedType;typeField.dataset.dictationValue=suggestedType;}
 applyPropertyTheme();
 $('#propertyUnitsJSON').value=JSON.stringify(units.length>1?units:[]);
 const surfaceAlerts=sanitarySurfaceWarnings(t);
 const ss=surfaces(t), habRows=habitableRows(ss,t), total=habRows.reduce((a,x)=>a+x.val,0);
 const habDeclared=explicitHabitable(t), announced=declaredPropertySurface(t), carrez=explicitCarrez(t);
 $('#surfaceHab').dataset.needsReview=String(surfaceAlerts.length>0&&habDeclared==null);
 if(units.length>1&&units.every(u=>u.surface>0))$('#surfaceHab').value=declaredPropertySurface(t).toFixed(2);
 else if(habDeclared!=null)$('#surfaceHab').value=habDeclared.toFixed(2);
 else if(units.length<=1&&announced>0)$('#surfaceHab').value=announced.toFixed(2);
 else if(total&&!surfaceAlerts.length)$('#surfaceHab').value=total.toFixed(2);
 else $('#surfaceHab').value='';
 if(carrez!=null)$('#surfaceCarrez').value=carrez.toFixed(2);
 let topRows=buildInfo(t);if(units.length>1)topRows[0][1]=suggestedType;
 if(units.length>1)topRows.push(...announcedUnitRows(t));
 if(announced!=null)topRows.push(['Surface annoncée / dictée',fmt(announced)]);
 let out='<div class="proGrid">'+card('Bien & construction','🏠',topRows)+'</div>';
 out+=surfaceEditorHTML(surfaces(t,true).map(x=>x.cat==='Intérieur'&&!habitableRows([x],t).length?{...x,cat:isSanitaryRoom(x.name)?'Sanitaire':'Annexe'}:x));
 if(total){
   let msg=`<div id="surfaceCalculationNotice"><div class="calculatedTop">📏 <span>Surface habitable calculée sur les pièces admissibles chiffrées</span><strong>${fmt(total)}</strong></div>`;
   if(announced!=null && Math.abs(announced-total)>.01)msg+=`<div class="status">⚠ Surface annoncée : ${fmt(announced)} — total des pièces chiffrées : ${fmt(total)}. Écart conservé à contrôler ; aucune valeur n’est supprimée.</div>`;
   if(surfaceAlerts.length)msg+='<div class="status">⚠ Total partiel : les surfaces suspectes sont exclues. Le total des pièces n’est pas utilisé automatiquement pour l’estimation. Vérifiez les alertes ou renseignez une surface habitable globale confirmée.</div>';
   out+=msg+'</div>';
 }
 out+='<div class="proGrid">';
 out+=card('Sanitaires','🚿',sanitary(t))+card('Chauffage & eau chaude','🔥',heating(t))+card('Réseaux & compteurs','⚡',networks(t))+card('Construction / structure','🏗️',structure(t))+card('Annexes','🏚️',allAnnexes(t))+card('Divers','📌',divers(t))+card('Menuiseries & fermetures','🪟',menu(t))+card('État / désordres','⚠️',state(t))+card('Fiscalité','💶',finance(t));
 out+='<div id="surfaceReviewAlerts">'+card('Surfaces à vérifier','⚠️',surfaceAlerts)+'</div>';
 out+='</div>';
 const extras=[];

 const cuisineInfos=[];
 if(/cuisine ouverte/i.test(t))cuisineInfos.push('Ouverte');
 if(/cuisine[^.!?]{0,50}[ée]quip[ée]e/i.test(t))cuisineInfos.push('Équipée');
 if(cuisineInfos.length)extras.push(['Cuisine',uniq(cuisineInfos).join(' · ')]);
 if(extras.length)out+=card('Informations complémentaires conservées','📌',extras);
 out+='<details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>'+E(raw)+'</div></details>';
 $('#facts').innerHTML=out;
 fillVisitExtras(t);fillConstructionExtras(t);renderSupplementCards();estUpdateCounts();
 if(!cadParcels.length&&$('#address').value&&$('#cadCommune').value)void verifyAddressV137({automatic:true});
 if(estimateBefore!==estimateFields())$('#surfaceHab').dispatchEvent(new Event('input',{bubbles:true}));
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

let addressTask=0,autoAddressTried='';
function addressKey(){return JSON.stringify([$('#address')?.value||'',$('#cadCommune')?.value||''])}
function addressChoiceBox(){
 let box=$('#addressChoices');if(!box){box=document.createElement('div');box.id='addressChoices';$('#addressStatus').after(box)}return box;
}
function streetIdentity(value){return low(value).split(/\b\d{5}\b/)[0].replace(/\b(?:à|a)\s+lamalou.*$/i,'').replace(/[^a-zà-ÿ0-9]+/g,' ').trim()}
async function lookupPointParcels(address,task){
 const start=addressKey(),refsBefore=JSON.stringify(cadParcels),code=address.citycode||$('#cadCommune').dataset.insee||$('#cadCommune').value;
 if(cadParcels.length){$('#cadStatus').textContent='Références existantes conservées. Vérifiez leur rattachement à l’adresse.';return}
 const coords=address.coordinates;
 if(!Array.isArray(coords)||coords.length<2||!coords.every(Number.isFinite)||(!address.housenumber&&address.type!=='housenumber')){$('#cadStatus').textContent='Adresse sans localisation précise au numéro : aucune parcelle déduite. Renseignez les références ou précisez l’adresse.';return}
 $('#cadStatus').textContent='Recherche officielle des parcelles contenant le point de l’adresse…';
 try{
  const response=await fetch('/api/cadastre/point?'+new URLSearchParams({commune:code,lon:coords[0],lat:coords[1]})),result=await response.json();
  if(task!==addressTask||addressKey()!==start||JSON.stringify(cadParcels)!==refsBefore)return;
  if(!response.ok)throw Error(result.detail||'Recherche indisponible');
  const refs=result.parcels||[];
  const accept=ref=>{
   if(task!==addressTask||addressKey()!==start)return;
   const p=normParcel(ref.section,ref.numero);if(!p)return;
   if(!cadParcels.some(x=>parcelKey(x)===parcelKey(p)))cadParcels.push({...p,found:true,origin:'adresse',address:$('#address').value,commune:code});
   syncCadParcels();renderMultiCadPlan();
   $('#cadStatus').textContent='Parcelle(s) au point d’adresse : '+cadParcels.map(p=>p.section+' '+p.numero).join(' ; ')+'. Rattachement au bien et autres parcelles éventuelles à confirmer. L’urbanisme est consulté automatiquement.';
  };
  if(refs.length===1)accept(refs[0]);
  else if(refs.length>1){
   $('#cadStatus').textContent='Plusieurs parcelles couvrent ce point : choisissez les références à retenir. Aucun choix automatique.';
   const box=addressChoiceBox();refs.forEach(ref=>{const btn=document.createElement('button');btn.type='button';btn.textContent='Ajouter la parcelle '+ref.section+' '+ref.numero;btn.onclick=()=>{accept(ref);btn.disabled=true};box.appendChild(btn)});
  }else $('#cadStatus').textContent='Aucune parcelle ne contient le point d’adresse renvoyé par le service. Le point peut se situer dans la rue : précisez les références, aucune parcelle voisine n’est attribuée au hasard.';
 }catch(e){if(task===addressTask&&addressKey()===start)$('#cadStatus').textContent=e.message}
}
async function verifyAddressV137(options={}){
 const input=$('#address'),original=input?.value?.trim();if(!original){$('#cadStatus').textContent='Renseignez l’adresse du bien et sa commune pour rechercher les parcelles.';return}
 const automatic=options.automatic===true,start=addressKey();
 if(automatic&&autoAddressTried===start)return;if(automatic)autoAddressTried=start;
 const task=++addressTask,commune=$('#cadCommune')?.value?.trim()||'',insee=$('#cadCommune')?.dataset.insee||'';
 const cp=$('#cadCommune')?.dataset.postcode||((original.match(/\b\d{5}\b/)||[])[0]||'');
 addressChoiceBox().innerHTML='';$('#addressStatus').textContent='Vérification de l’adresse et recherche cadastrale…';
 try{
  const qs=new URLSearchParams({q:original});if(cp)qs.set('postcode',cp);if(commune&&!/^\d{5}$/.test(commune))qs.set('city',commune);if(insee)qs.set('citycode',insee);
  const response=await fetch('/api/geocode?'+qs),result=await response.json();
  if(task!==addressTask||addressKey()!==start)return;
  if(!response.ok)throw Error(result.detail||'Recherche impossible');
  const choices=(result.results||[]).filter(x=>!insee||x.citycode===insee);
  const apply=async (x,chosen=false)=>{
   if(task!==addressTask||addressKey()!==start)return;
   const canonical=x.label||original;input.value=automatic&&!chosen?original:canonical;input.dataset.verifiedAddress=canonical;if(automatic||original===input.dataset.dictationValue)input.dataset.dictationValue=input.value;
   if(x.city){$('#cadCommune').value=x.city;$('#cadCommune').dataset.insee=x.citycode||insee;$('#cadCommune').dataset.postcode=x.postcode||cp}
   addressChoiceBox().innerHTML='';$('#addressStatus').textContent='Adresse vérifiée : '+input.value;
   input.dispatchEvent(new Event('change',{bubbles:true}));
   await lookupPointParcels(x,task);
  };
  if(!choices.length){$('#addressStatus').textContent='Adresse non retrouvée dans cette commune : texte conservé. Aucune parcelle ni zone déduite.';return}
  const wanted=streetIdentity(original.replace(new RegExp('\\s*'+commune.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$','i'),''));
  const exact=choices.filter(x=>streetIdentity(x.housenumber&&x.street?x.housenumber+' '+x.street:x.label.replace(/\s+\d{5}\b[\s\S]*$/,''))===wanted&&Number(x.score)>=.75);
  if(exact.length===1){await apply(exact[0]);return}
  $('#addressStatus').textContent='Adresse à confirmer : le service propose une écriture différente ou plusieurs résultats. Le texte dicté est conservé.';
  choices.slice(0,5).forEach(x=>{const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Utiliser « '+x.label+' » et rechercher les parcelles';btn.onclick=()=>apply(x,true);addressChoiceBox().appendChild(btn)});
 }catch(e){if(task===addressTask&&addressKey()===start)$('#addressStatus').textContent='Vérification indisponible : '+e.message+'. Adresse conservée.'}
}
$('#findAddressParcels')?.addEventListener('click',()=>verifyAddressV137());
$('#address')?.addEventListener('input',()=>{
 addressTask++;autoAddressTried='';addressChoiceBox().innerHTML='';
 const kept=cadParcels.filter(p=>p.origin!=='adresse'||p.address===$('#address').value);
 if(kept.length!==cadParcels.length){cadParcels=kept;syncCadParcels();renderMultiCadPlan();$('#cadStatus').textContent='Adresse modifiée : les parcelles déduites de l’ancienne adresse ont été retirées.';}
});

$('#cadCommune')?.addEventListener('input',()=>{
 addressTask++;autoAddressTried='';addressChoiceBox().innerHTML='';
 const kept=cadParcels.filter(p=>p.origin!=='adresse');
 if(kept.length!==cadParcels.length){cadParcels=kept;syncCadParcels();renderMultiCadPlan();$('#cadStatus').textContent='Commune modifiée : relancez la recherche depuis l’adresse. Les références saisies manuellement sont conservées.';}
});

function cadMapURL(){
 const c=$('#cadCommune')?.value?.trim();
 if(c&&cadParcels.length)return '/api/cadastre/multi-map.png?commune='+encodeURIComponent($('#cadCommune').dataset.insee||c)+'&refs='+encodeURIComponent(multiRefsParam())+'&v=13.41';
 return '';
}

let photoItemsState=[];
function photoDisplayName(file){return (file?.name||'Photo').replace(/\.[^.]+$/,'')}
function photoRoomChoices(){
 const labels=new Set();
 const text=$('#notes')?.value||'';for(const match of text.matchAll(/\b(chambre(?:\s+[1-9])?|salon|s[ée]jour|cuisine|kitchenette|salle d['’]eau|salle de bain[s]?|wc|couloir|buanderie|terrasse|garage|cave|hangar|v[ée]randa)\b/gi))labels.add(match[0][0].toUpperCase()+match[0].slice(1));
 document.querySelectorAll('#facts .levelBlock').forEach(b=>{const level=b.querySelector('.levelName')?.value||b.dataset.level;labels.add(level);b.querySelectorAll('.pieceName').forEach(el=>labels.add(el.value+' — '+level));});
 document.querySelectorAll('#facts .annexCard .annexRow').forEach(r=>{if(r.children[0]?.textContent)labels.add(r.children[0].textContent.trim());});
 return [...labels].filter(Boolean);
}
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
   <label class="photoRoomField">Pièce ou lieu reconnu<select class="photoRoomSelect" aria-label="Affecter la photo à une pièce"><option value="">Choisir une pièce ou un lieu</option>${photoRoomChoices().map(label=>'<option '+(p.label===label?'selected':'')+'>'+E(label)+'</option>').join('')}<option value="__custom__">Autre nom à saisir…</option></select></label>
   <label class="photoRoomField">Légende personnalisable<textarea class="photoLabel" rows="2" title="Nom de la photo" placeholder="Ex. puits, hangar, vue de la terrasse…">${E(p.label)}</textarea></label>
   <button type="button" class="photoCoverButton" data-photo-act="cover" aria-pressed="${i===0}" ${i===0?'disabled':''}>${i===0?'✓ Photo de couverture':'Choisir comme photo de couverture'}</button>
   <div class="photoActions">
    <button type="button" data-photo-act="left" title="Déplacer avant">←</button>
    <button type="button" data-photo-act="right" title="Déplacer après">→</button>
    <button type="button" data-photo-act="delete" title="Supprimer">×</button>
   </div>
  </div>`).join('')+'</div>';
}
window.estimiaRefreshPhotoChoices=renderPhotoManager;
// Les légendes ne sont associées que par nom de fichier exact et unique.
const reviewName=s=>String(s||'').normalize('NFC').toLocaleLowerCase('fr-FR');
window.estimiaPhotoReviewEvidence=files=>files.flatMap(file=>{const matches=photoItemsState.filter(p=>[p.sourceName,p.file.name,p.label,p.label+'.jpg',p.label+'.png'].some(n=>reviewName(n)===reviewName(file)));return matches.length===1?[{file,url:matches[0].url,label:matches[0].label}]:[];});
window.estimiaPhotoReviewMatches=rows=>rows.map(row=>{const found=photoItemsState.filter(p=>[p.sourceName,p.file.name,p.label,p.label+'.jpg',p.label+'.png'].some(n=>reviewName(n)===reviewName(row.file)));return {file:row.file,count:found.length};});
window.estimiaApplyPhotoReviewCaptions=(review,options)=>{let changed=0,custom=0,ambiguous=0,missing=0;for(const row of review.photos){const found=photoItemsState.filter(p=>[p.sourceName,p.file.name,p.label,p.label+'.jpg',p.label+'.png'].some(n=>reviewName(n)===reviewName(row.file)));if(found.length!==1){if(found.length)ambiguous++;else missing++;continue;}const p=found[0],original=String(p.sourceName||p.file.name).replace(/\.[^.]+$/,'');if(!p.sourceName)p.sourceName=row.file;if(!options.captions)continue;if(!options.replace&&p.label!==original&&p.label!==row.file&&p.label!==row.caption){custom++;continue;}if(p.label!==row.caption){p.label=row.caption;changed++;}}
 let covered=false;if(options.cover&&review.cover){const found=photoItemsState.filter(p=>reviewName(p.sourceName||p.file.name)===reviewName(review.cover));if(found.length===1){const i=photoItemsState.indexOf(found[0]);photoItemsState.splice(i,1);photoItemsState.unshift(found[0]);covered=true;}}
 renderPhotoManager();globalCheckpoint();document.dispatchEvent(new Event('estimia:photo-review-applied'));return {changed,custom,ambiguous,missing,covered};};

const photoSaveCache=new WeakMap();
window.estimiaPhotosForSave=async()=>Promise.all(photoItemsState.map(async p=>{
 if(!photoSaveCache.has(p.file))photoSaveCache.set(p.file,optimizedPhotoDataURL(p.file));
 return {label:p.label,sourceName:p.sourceName||p.file.name,data:await photoSaveCache.get(p.file)};
}));
document.addEventListener('estimia:photos-restored',e=>{
 for(const p of photoItemsState)try{URL.revokeObjectURL(p.url)}catch{}
 photoItemsState=[];
 for(const p of e.detail||[])try{
  const [head,body]=p.data.split(','),mime=head.match(/^data:(image\/(?:png|jpeg|webp));base64$/i)?.[1];if(!mime)continue;
  const bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));const file=new File([bytes],p.sourceName||'photo-dossier',{type:mime});
  photoSaveCache.set(file,Promise.resolve(p.data));photoItemsState.push({file,sourceName:p.sourceName||'',label:p.label||'Photo',url:URL.createObjectURL(file),selected:false});
 }catch{}
 renderPhotoManager();globalUndo=[];globalRedo=[];globalCheckpoint();
});
function currentPhotos(){return photoItemsState}
function initPhotos(files){
 const added=[...files].filter(f=>/^image\//i.test(f.type||'')).map(f=>({file:f,sourceName:f.name,label:photoDisplayName(f),url:URL.createObjectURL(f),selected:false}));
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
function exportSurface(value){return String(value??'').replace(/(\d+(?:[.,]\d+)?)\s*m²/g,(_,v)=>Number(v.replace(',','.')).toLocaleString('fr-FR',{maximumFractionDigits:2})+' m²');}
function exportPhotoLabel(label){const value=String(label||'').trim();return /^(?:(?:IMG|DSC|PXL|PHOTO|IMAGE|VID)[_ -]*)?\d{6,}(?:[_ -]\d+)*(?:\.[a-z0-9]+)?$/i.test(value)?'':value;}
function dossierPropertyType(){let u=[];try{u=JSON.parse($('#propertyUnitsJSON')?.value||'[]')}catch{}return u.length>1?u.map(x=>x.label||x.key).join(' + '):$('#type')?.value||'';}
window.estimiaDossierPropertyType=dossierPropertyType;
async function buildExportPayload(){
 await window.estimiaEnsureCurrentEstimate?.();
 const control=window.estimiaPreflight?.();if(control?.blocking.length)throw Error('Dossier à corriger : '+control.blocking.join(' '));
 if(window.estimiaSurfaceIssues?.().length)throw Error('Conflit de surfaces : choisissez le total du logement concerné avant de générer le dossier client. La sauvegarde du brouillon reste accessible.');
 renderSupplementCards();
 hydrateSurfaceRows();
 const sections=surfaceOverviewSections();
 sections.push(...(window.estimiaPhotoObservationSections?.()||[]));
 document.querySelectorAll('#facts .otherSurface:not(:has(.editableOther))').forEach(b=>sections.push({title:b.querySelector('h4')?.textContent||'Surfaces annexes',rows:[...b.querySelectorAll('.surfaceRow')].map(r=>[r.querySelector('span')?.textContent||'',r.querySelector('b')?.textContent||''])}));
 document.querySelectorAll('#facts .proGroup:not(.supplementCard)').forEach(b=>sections.push({title:b.querySelector('h3')?.textContent||'Informations',rows:[...b.querySelectorAll('.proRow')].map(r=>r.classList.contains('annexRow')?[r.children[0]?.textContent||'',(r.children[1]?.textContent||'')+' — '+(r.children[2]?.textContent||'')]:[r.querySelector('span')?.textContent||'',r.querySelector('strong')?.textContent||''])}));
 sections.push(...propertySupplementSections());
 sections.push(...(window.estimiaEssentialExport?.()||[]));
 sections.push(...(window.estimiaNetworkExport?.()||[]));
 sections.push(...(window.estimiaMarketEvidenceSections?.()||[]));
 sections.push(...(window.estimiaUrbanismeExport?.()||[]));
 const estimateBox=document.querySelector('#estimationResults');
 const estimation={calcul:window.estimiaCalculationRows?.()||[],centrale:estimateBox?.querySelector('.estimationValueAmount')?.textContent||'',
  basse:estimateBox?.querySelectorAll('.estimationRangeAmount')[0]?.textContent||'',
  haute:estimateBox?.querySelectorAll('.estimationRangeAmount')[1]?.textContent||'',
  texte:estimateBox?.querySelector('.estimationExplanation')?.textContent||estimateBox?.querySelector('p:not(.originalEstimateReference)')?.textContent||'',
  reperes:[...document.querySelectorAll('#marketIndicators tr')].filter(r=>estimateBox?.dataset.adjusted!=='true'||!/estimation statistique/i.test(r.querySelector('th')?.textContent||'')).map(r=>[r.querySelector('th')?.textContent||'',r.querySelector('td')?.dataset.exportValue||r.querySelector('td')?.textContent||'']).concat([['Avis d’ajustement',document.querySelector('#marketAdjustmentAdvice')?.textContent||'']]),
  retenue:estimateBox?.dataset.adjusted!=='true'&&document.querySelector('#validatedPrice')?.value?Number(document.querySelector('#validatedPrice').value).toLocaleString('fr-FR')+' €':'',
  justification:document.querySelector('#validatedReason')?.value||''};
 estimation.comparables=[...estimateBox.querySelectorAll('details tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>(c.textContent||'').trim())).filter(r=>r.length===4&&r.some(v=>v));
 const transactionSource=estimateBox.querySelector('a')?.href||'';estimation.source=window.estimiaTransactionSourceUrl?.(transactionSource)||transactionSource;
 const advisor={name:$('#exportAdvisorName')?.value||'',agency:$('#exportAgency')?.value||'',phone:$('#exportAdvisorPhone')?.value||''};
 const argumentaire={forts:$('#estStrongPoints')?.value||'',limites:$('#estLimitations')?.value||'',travaux:$('#estValueWorks')?.value||'',comparables:$('#estComparableReason')?.value||''};
 const annonces=[...document.querySelectorAll('#annoncesResults .annonceCard')].slice(0,6).map(card=>({
  titre:card.querySelector('h4')?.textContent||'',description:(card.querySelector('.annonceDescription')?.textContent||'')+' — '+(card.querySelector('.annoncePrice + .small')?.textContent||''),
  prix:card.querySelector('.annoncePrice')?.textContent||'',site:card.querySelector('.annonceAgency')?.textContent||'',
  photo:card.querySelector('img')?.src||'',url:card.querySelector('.annonceLink')?.href||''}));
 const roques_annonces=[...document.querySelectorAll('#roquesResults .annonceCard')].slice(0,4).map(card=>({
  titre:card.querySelector('h4')?.textContent||'',description:(card.querySelector('.annonceDescription')?.textContent||'')+' — '+(card.querySelector('.annoncePrice + .small')?.textContent||''),prix:card.querySelector('.annoncePrice')?.textContent||'',site:card.querySelector('.annonceAgency')?.textContent||'',photo:card.querySelector('img')?.src||'',url:card.querySelector('.annonceLink')?.href||''}));
 sections.forEach(s=>s.rows=s.rows.map(([k,v])=>[k,exportSurface(v)]));// Les contrôles de préparation du dossier restent internes à l’écran.
 const photos=[];for(const p of currentPhotos()){try{photos.push({name:exportPhotoLabel(p.label||photoDisplayName(p.file)),data:await optimizedPhotoDataURL(p.file)})}catch{}}
 return {branding:window.estimiaBrandingExport?.()||{},theme_color:window.estimiaBrandColor?.()||'',client_conclusion:window.estimiaClientConclusionForExport?.()||'',advisor,argumentaire,owner:$('#owner')?.value||'',phone:$('#ownerPhone')?.value||'',owners:ownerCardsState,address:$('#address')?.value||'',commune:$('#cadCommune')?.value||'',section:$('#cadSection')?.value||'',parcel:$('#cadParcel')?.value||'',property_type:dossierPropertyType(),surface:($('#surfaceHab')?.value?Number($('#surfaceHab').value).toLocaleString('fr-FR',{maximumFractionDigits:2}):''),surface_carrez:($('#surfaceCarrez')?.value?Number($('#surfaceCarrez').value).toLocaleString('fr-FR',{maximumFractionDigits:2}):''),sections,parcels:cadParcels.map(p=>({section:p.section,numero:p.numero})),facts:$('#facts')?.textContent||'',photos,estimation,annonces,roques_annonces,generated_date:new Date().toLocaleDateString('fr-FR')};
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

window.estimiaBuildDossierPayload=buildExportPayload;
async function printableHTML(){
 await window.estimiaEnsureCurrentEstimate?.();
 renderSupplementCards();
 const title=ficheTitle(), facts=$('#facts')?.innerHTML||'', mapUrl=cadMapURL();
 const payload=await buildExportPayload(),v=payload.estimation;
 const urbanismePrint=(window.estimiaUrbanismeExport?.()||[]).map(s=>`<section class="proGroup"><h2>${E(s.title)}</h2>${s.rows.map(([k,v])=>`<p><b>${E(k)}</b> : ${E(v)}</p>`).join('')}</section>`).join('');
 const observationsPrint=(window.estimiaPhotoObservationSections?.()||[]).map(s=>`<section class="proGroup"><h2>${E(s.title)}</h2>${s.rows.map(([k,v])=>`<p style="white-space:pre-wrap"><b>${E(k)}</b> : ${E(v)}</p>`).join('')}</section>`).join('');
 const argumentairePrint=Object.entries({forts:'Points forts',limites:'Points de vigilance',travaux:'Travaux à envisager',comparables:'Choix des comparables'}).filter(([k])=>payload.argumentaire[k]?.trim()).map(([k,label])=>`<section class="proGroup"><h2>${E(label)}</h2><p>${E(payload.argumentaire[k])}</p></section>`).join('');
 const clientPrint=payload.client_conclusion?`<section class="proGroup"><h2>Avis au propriétaire</h2><p style="white-space:pre-wrap">${E(payload.client_conclusion)}</p></section>`:'';
 const brandPrint=Object.values(payload.branding).filter(x=>/^data:image\/(png|jpeg|webp);base64,/.test(x)).map(x=>`<img src="${E(x)}" style="max-width:${x===payload.branding.logo?210:160}px;max-height:${x===payload.branding.logo?115:90}px;object-fit:contain;margin:10px" alt="Identité de l’agence">`).join('');
 const estimatePrint=v.centrale?`<section class="proGroup"><h2>Estimation du bien</h2><p>Valeur centrale : <strong style="font-size:14pt">${E(v.centrale)}</strong></p><p>Fourchette basse : ${E(v.basse)} — Fourchette haute : ${E(v.haute)}</p><p>${E(v.texte)}</p></section>`:'';
 const refsTxt=cadParcels.map(p=>`${E(p.section)} ${E(String(parseInt(p.numero,10)))}`).join(' • ');
 const mapBlock=mapUrl?`<section class="cadPrint"><h2>Plan cadastral</h2><img src="${mapUrl}" alt="Plan cadastral"><div>Parcelles : ${refsTxt}</div></section>`:'';
 const photoItems=[];
 for(const p of currentPhotos()){try{const data=await optimizedPhotoDataURL(p.file),label=exportPhotoLabel(p.label||photoDisplayName(p.file));photoItems.push(`<figure class="photoPrint"><img src="${data}" alt="${E(label)}"><figcaption>${E(label)}</figcaption></figure>`)}catch{}}
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
 ${brandPrint}<h1>FICHE DE VISITE IMMOBILIÈRE</h1><div class="date">Document généré le ${new Date().toLocaleDateString('fr-FR')}</div><div class="meta">${head}</div>${estimatePrint}${mapBlock}${urbanismePrint}${facts}${observationsPrint}${photosBlock}${argumentairePrint}${clientPrint}</body></html>`;
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
 $('#analyse')?.addEventListener('click',()=>{window.estimiaFicheReady=render();});
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
 const act=b.dataset.act;if(!act)return;if(act==='delete-other'){manualSurfaceRows=manualSurfaceRows.filter(x=>x._id!==b.closest('.editableOther')?.dataset.id);refreshSurfaceEditor(true);return;}if(act==='confirm-surface-total'){confirmSurfaceTotal();return}const level=b.closest('.levelBlock')?.dataset.level||'',sr=b.closest('.editableSurface'),id=sr?.dataset.id;
 if(act==='add-level'){let name=clean(prompt('Nom du nouveau niveau :','')||'');if(!name||manualLevels.includes(name))return;manualLevels.push(name);refreshSurfaceEditor();}
 else if(act==='delete-level')deleteLevel(level);
 else if(act==='level-up'||act==='level-down'){const i=manualLevels.indexOf(level),j=i+(act==='level-up'?-1:1);if(i<0||j<0||j>=manualLevels.length)return;[manualLevels[i],manualLevels[j]]=[manualLevels[j],manualLevels[i]];refreshSurfaceEditor();}
 else if(act==='add-piece'){manualSurfaceRows.push({_id:'m'+Date.now(),lvl:level,name:'Nouvelle pièce',val:0,cat:'Intérieur'});refreshSurfaceEditor();}
 else if(act==='piece-up')movePiece(id,-1);else if(act==='piece-down')movePiece(id,1);
 else if(act==='delete-piece'){manualSurfaceRows=manualSurfaceRows.filter(x=>x._id!==id);refreshSurfaceEditor();}
});
document.addEventListener('change',e=>{
 const sr=e.target.closest('.editableSurface,.editableOther'),id=sr?.dataset.id,x=id&&surfaceRowById(id);
 if(e.target.matches('.assignLevelUnit,.assignPieceUnit')){
  const level=e.target.closest('.levelBlock')?.dataset.level,unit=e.target.value;
  const base=value=>value.includes(' — ')?value.split(' — ').slice(1).join(' — '):value;
  for(const row of manualSurfaceRows)if(e.target.classList.contains('assignLevelUnit')?row.lvl===level:row===x)row.lvl=(unit||'Logement non précisé')+' — '+base(row.lvl);
  manualLevels=manualLevels.filter(l=>manualSurfaceRows.some(r=>r.lvl===l));refreshSurfaceEditor(true);return;
 }
 if(x&&e.target.classList.contains('pieceCategory')){x.cat=e.target.value;refreshSurfaceEditor(true);return;}
 if(x&&e.target.classList.contains('pieceLevel')){x.lvl=e.target.value;refreshSurfaceEditor(true);return}
 if(x&&e.target.classList.contains('pieceVal')){const value=Number(e.target.value);if(!Number.isFinite(value)||value<=0){e.target.value=x.val;return}x.val=value;x._needsReview=roomSurfaceLimit(x.name)!=null&&value>roomSurfaceLimit(x.name);refreshSurfaceEditor();return}
 if(x&&e.target.classList.contains('pieceName')){x.name=clean(e.target.value)||'Pièce';x._needsReview=roomSurfaceLimit(x.name)!=null&&x.val>roomSurfaceLimit(x.name);refreshSurfaceEditor();return}
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
  if(act==='cover'&&i>0){const [chosen]=photoItemsState.splice(i,1);photoItemsState.unshift(chosen);}
  if(act==='left'&&i>0)[photoItemsState[i-1],photoItemsState[i]]=[photoItemsState[i],photoItemsState[i-1]];
  if(act==='right'&&i<photoItemsState.length-1)[photoItemsState[i+1],photoItemsState[i]]=[photoItemsState[i],photoItemsState[i+1]];
  if(act==='delete')photoItemsState.splice(i,1);
  renderPhotoManager();globalCheckpoint();return;
 }
 // checkpoint after UI mutation buttons (piece/level/text delete/add/move)
 if(e.target.closest('[data-act],.rowDelete,.addTextRow'))setTimeout(globalCheckpoint,0);
});
document.addEventListener('input',e=>{if(e.target.classList.contains('photoLabel')){const i=Number(e.target.closest('.photoManageCard')?.dataset.photo);if(photoItemsState[i])photoItemsState[i].label=e.target.value.trim();}});
document.addEventListener('change',e=>{
 if(e.target.id==='photos'){initPhotos(e.target.files);return}
 if(e.target.classList.contains('photoRoomSelect')){const i=Number(e.target.closest('.photoManageCard')?.dataset.photo);if(e.target.value==='__custom__'){e.target.closest('.photoManageCard').querySelector('.photoLabel').focus();return;}if(photoItemsState[i]&&e.target.value){photoItemsState[i].label=e.target.value;renderPhotoManager();globalCheckpoint();}return;}
 if(e.target.classList.contains('photoLabel')){
  const i=Number(e.target.closest('.photoManageCard')?.dataset.photo);
  if(photoItemsState[i]){photoItemsState[i].label=clean(e.target.value)||photoDisplayName(photoItemsState[i].file);e.target.value=photoItemsState[i].label;const select=e.target.closest('.photoManageCard').querySelector('.photoRoomSelect');if(select)select.value=[...select.options].some(o=>o.value===photoItemsState[i].label)?photoItemsState[i].label:'';globalCheckpoint()}
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
 ownSync();ownRender();
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
 ownerCardsState.forEach(c=>c.nom=String(c.nom||'').toLocaleUpperCase('fr-FR'));
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
   const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('textarea');input.value=c[key]||'';input.placeholder=label;input.addEventListener('input',()=>{if(key==='nom'){const pos=input.selectionStart;input.value=input.value.toLocaleUpperCase('fr-FR');input.setSelectionRange(pos,pos);}c[key]=input.value;ownSync()});wrap.append(input);fields.append(wrap)
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
 function grow(el){if(el?.tagName!=='TEXTAREA')return;el.style.height='auto';el.style.height=Math.max(64,el.scrollHeight+3)+'px';}
 function refresh(){
 document.querySelectorAll('textarea').forEach(grow);
 document.querySelectorAll('main select[id]').forEach(el=>{let note=el.nextElementSibling;if(!note?.classList.contains('selectFullValue')){note=document.createElement('span');note.className='selectFullValue small';el.after(note)}const value=el.selectedOptions[0]?.textContent||'';if(note.textContent!==value)note.textContent=value;note.hidden=value.length<35;});
 }
 document.addEventListener('input',e=>grow(e.target));
 document.addEventListener('change',e=>grow(e.target));
 document.addEventListener('click',()=>requestAnimationFrame(refresh));
 document.addEventListener('toggle',()=>requestAnimationFrame(refresh),true);
 document.addEventListener('estimia:contacts-restored',()=>requestAnimationFrame(refresh));
 new MutationObserver(()=>requestAnimationFrame(refresh)).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
 window.addEventListener('load',refresh);
 window.addEventListener('resize',refresh);
 window.estimiaRefreshEquipmentHeights=refresh;
})();

/* V14.03 — parcours libre, valeur expliquée et dossier client. */
(()=>{'use strict';
const q=s=>document.querySelector(s),field=id=>q('#'+id)?.value||'',escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const cards=[...document.querySelectorAll('#estimiaMain>section.card')],groups=[0,0,1,1,2,2,3],names=['Dictée et cadastre','Vérification du bien et photos','Comparables et estimation','Dossier client'];
let step=0,all=false;
cards.forEach((c,i)=>{c.dataset.visitStep=String(groups[i]??3);const tag=c.querySelector(':scope>.step');if(tag)tag.textContent=['DICTÉE','PROPRIÉTAIRES ET CADASTRE','COMPLÉMENTS ET PHOTOS','FICHE DU BIEN','ANNONCES COMPARABLES','CALCUL DE LA VALEUR','DOSSIER CLIENT'][i]||tag.textContent;});
function showStep(index,scroll=false){step=Math.max(0,Math.min(3,Number(index)||0));all=field('visitMode')==='all';if(q('#visitStep'))q('#visitStep').value=String(step);cards.forEach(c=>{c.hidden=!all&&Number(c.dataset.visitStep)!==step;});q('#visitStepStatus').textContent=all?'Toutes les étapes sont affichées':'Étape '+(step+1)+' sur 4 — '+names[step];document.querySelectorAll('#visitSteps [data-step]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.step)===step);if(Number(b.dataset.step)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});q('#visitPrev').disabled=all||step===0;q('#visitNext').hidden=all||step===3;q('#showAllSteps').textContent=all?'Revenir aux étapes':'Tout afficher';q('#showAllSteps').setAttribute('aria-expanded',String(all));window.estimiaRefreshEquipmentHeights?.();if(scroll)q('#visitSteps').scrollIntoView({behavior:'smooth',block:'start'});}
function go(index){q('#visitMode').value='steps';showStep(index,true);q('#visitStep').dispatchEvent(new Event('input',{bubbles:true}));}
document.querySelectorAll('#visitSteps [data-step]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.step)));q('#visitPrev')?.addEventListener('click',()=>go(step-1));q('#visitNext')?.addEventListener('click',()=>go(step+1));q('#showAllSteps')?.addEventListener('click',()=>{q('#visitMode').value=all?'steps':'all';showStep(step);});
// La transformation conserve l’étape et la position courantes pour relire la dictée et le cadastre.
const amount=selector=>Number((q(selector)?.textContent||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
function ledgerRows(forExport=false){const box=q('#estimationResults');if(!box?.querySelector('.estimationValueAmount'))return [];if(forExport&&box.dataset.adjusted==='true')return [['Méthode','Montant retenu après décision du conseiller'],['Justification',field('validatedReason')||'À préciser'],['Fourchettes','Montant retenu marge conventionnelle ±15 %, arrondie au millier, indépendante de la dispersion des ventes']];let raw={},proposal={};try{raw=JSON.parse(box.dataset.rawDvfEstimate||'{}');proposal=JSON.parse(box.dataset.originalEstimate||'{}');}catch{}const rows=[];if(raw.centrale>0)rows.push(['Base des ventes DVF avant correction',money(raw.centrale)]);const components=proposal.qualityComponents?.length?proposal.qualityComponents:(window.estimiaQualityComponentsForExport?.()||[]);if(components.length)for(const [label,value]of components)rows.push([label,money(value)]);if(raw.centrale>0&&proposal.centrale>0)rows.push(['Incidence totale des corrections',money(proposal.centrale-raw.centrale)]);if(field('estQualityReason'))rows.push(['Justification des ajustements',field('estQualityReason')]);else if(Number(field('estOtherAdjustment')))rows.push(['Justification des ajustements','Non renseignée — ajustement à justifier avant remise au propriétaire']);if(proposal.centrale>0)rows.push(['Proposition après corrections',money(proposal.centrale)]);if(box.dataset.adjusted==='true')rows.push(['Montant retenu par le conseiller',money(amount('#estimationResults .estimationValueAmount'))]);rows.push(['Portée des corrections',q('#estimationResults .estimationExplanation')?.textContent||'']);return forExport?rows.filter(([k])=>k!=='Portée des corrections'):rows;}
window.estimiaCalculationRows=()=>ledgerRows(true);
function renderLedger(){const rows=ledgerRows();q('#calculationLedger').innerHTML=rows.length?'<h3>Comprendre le montant proposé</h3><dl>'+rows.map(([k,v])=>'<div><dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd></div>').join('')+'</dl>':'<h3>Comprendre le montant proposé</h3><p class="small">Après le calcul : base DVF, incidence des corrections et montant retenu. Les hypothèses et travaux déclarés restent détaillés.</p>';}
const conclusionIds=['owner','address','cadCommune','type','surfaceHab','surfaceCarrez','estCondition','estPlannedWorks','estStrongPoints','estLimitations','estValueWorks','estComparableReason','exportAdvisorName','exportAgency','exportAdvisorPhone','validatedReason'];
function signature(){return JSON.stringify(conclusionIds.map(field).concat([q('#estimationResults .estimationValueAmount')?.textContent||'',...[...document.querySelectorAll('#estimationResults .estimationRangeAmount')].map(e=>e.textContent),q('#estimationResults .estimationExplanation')?.textContent||'']));}
function checkConclusion(){if(window.estimiaRestoringCase)return;const e=q('#estClientConclusion'),include=q('#includeClientConclusion');if(e?.value.trim()&&q('#clientConclusionSignature').value&&q('#clientConclusionSignature').value!==signature()){include.checked=false;window.estimiaRefreshConclusionInclusion?.();q('#clientConclusionStatus').textContent='La fiche ou le montant a changé. La conclusion a été retirée des documents : relisez-la, puis activez son inclusion si vous le souhaitez.';}}
window.estimiaClientConclusionForExport=()=>{checkConclusion();return q('#includeClientConclusion')?.checked?field('estClientConclusion').trim():'';};
q('#includeClientConclusion')?.addEventListener('change',()=>{if(q('#includeClientConclusion').checked){q('#clientConclusionSignature').value=signature();q('#clientConclusionStatus').textContent='Conclusion incluse après relecture.';}});
q('#estClientConclusion')?.addEventListener('input',()=>{const e=q('#estClientConclusion');if(!q('#clientConclusionSignature').value)q('#clientConclusionSignature').value=signature();q('#clientConclusionStatus').textContent='Conclusion facultative : relisez le texte avant de choisir son inclusion dans les documents.';});
q('#generateClientConclusion')?.addEventListener('click',async()=>{const status=q('#clientConclusionStatus');try{await window.estimiaEnsureCurrentEstimate?.();const central=q('#estimationResults .estimationValueAmount')?.textContent,bounds=[...document.querySelectorAll('#estimationResults .estimationRangeAmount')].map(e=>e.textContent);if(!central){status.textContent='Calculez une estimation avant de rédiger la conclusion.';return;}const lines=[];if(field('owner'))lines.push('À l’attention de '+field('owner'));lines.push('Notre avis de valeur porte sur '+(window.estimiaDossierPropertyType?.()||field('type')||'le bien')+(field('surfaceHab')?' de '+Number(field('surfaceHab')).toLocaleString('fr-FR')+' m²':'')+(field('address')?', situé '+field('address'):'')+(field('cadCommune')&&!field('address').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(field('cadCommune').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())?', à '+field('cadCommune'):'')+'. Les surfaces et caractéristiques sont celles relevées dans ce dossier.');if(field('estStrongPoints'))lines.push('Les éléments favorables retenus sont les suivants : '+field('estStrongPoints'));if(field('estLimitations'))lines.push('Les points de vigilance sont les suivants : '+field('estLimitations'));const works=field('estValueWorks')||field('estPlannedWorks');if(works)lines.push('Travaux à envisager selon les informations disponibles : '+works);lines.push('Au regard des ventes comparables retenues et des corrections détaillées dans le dossier, la valeur centrale '+(field('validatedPrice')?'retenue par le conseiller':'proposée à titre indicatif')+' est de '+central+(bounds.length===2?', pour une fourchette de '+bounds[0]+' à '+bounds[1]:'')+'.');if(field('validatedReason'))lines.push('Motif du montant retenu : '+field('validatedReason'));if(field('estComparableReason'))lines.push('Choix des références : '+field('estComparableReason'));lines.push('Cet avis est établi à partir des informations disponibles à la date du dossier. Les prix des annonces sont des prix demandés ; les hypothèses d’état et de travaux doivent être confrontées aux comparables et, le cas échéant, aux devis. Les diagnostics non communiqués restent à vérifier.');lines.push([field('exportAdvisorName'),field('exportAgency'),field('exportAdvisorPhone')].filter(Boolean).join('\n'));const e=q('#estClientConclusion');e.value=lines.join('\n\n');q('#clientConclusionSignature').value=signature();q('#includeClientConclusion').checked=false;status.textContent='Proposition rédigée : relisez les informations et adaptez le texte avant remise au propriétaire.';e.dispatchEvent(new Event('input',{bubbles:true}));window.estimiaRefreshEquipmentHeights?.();}catch(e){status.textContent=e.message;}});
function refreshAssets(){for(const [key,id]of [['exportLogoData','exportLogoPreview'],['exportAdvisorPhotoData','exportAdvisorPhotoPreview']]){const img=q('#'+id),value=field(key);img.hidden=!value;if(value)img.src=value;else img.removeAttribute('src');}}
async function importAsset(input,target){const f=input.files?.[0];if(!f)return;const status=q('#brandStatus');try{if(!/^image\/(?:png|jpeg|webp)$/.test(f.type)||f.size>5*1024*1024)throw Error('Choisis une image PNG, JPEG ou WebP de moins de 5 Mo.');const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Image illisible.'));im.src=raw;});const scale=Math.min(1,640/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);q('#'+target).value=canvas.toDataURL('image/png');q('#'+target).dispatchEvent(new Event('input',{bubbles:true}));refreshAssets();status.textContent='Image ajoutée au dossier et aux prochains documents.';}catch(e){status.textContent=e.message;}finally{input.value='';}}
q('#exportLogoFile')?.addEventListener('change',e=>importAsset(e.target,'exportLogoData'));q('#exportAdvisorPhotoFile')?.addEventListener('change',e=>importAsset(e.target,'exportAdvisorPhotoData'));for(const [button,target]of [['removeExportLogo','exportLogoData'],['removeExportAdvisorPhoto','exportAdvisorPhotoData']])q('#'+button)?.addEventListener('click',()=>{q('#'+target).value='';q('#'+target).dispatchEvent(new Event('input',{bubbles:true}));refreshAssets();});q('#exportThemeColor')?.addEventListener('input',()=>{q('#exportUseBrandColor').checked=true;});
window.estimiaBrandingExport=()=>({logo:field('exportLogoData'),advisor_photo:field('exportAdvisorPhotoData')});window.estimiaBrandColor=()=>q('#exportUseBrandColor')?.checked&&/^#[0-9a-f]{6}$/i.test(field('exportThemeColor'))?field('exportThemeColor'):'';
let previewUrl='',previewTask=0,previewController=null;
function closePreview(){q('#dossierPreviewLoading').hidden=true;q('#dossierPreviewFrame').setAttribute('aria-busy','false');previewTask++;previewController?.abort();q('#dossierPreviewFrame').removeAttribute('src');if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';q('#openDossierPreview').hidden=true;const dialog=q('#dossierPreviewDialog');if(dialog.open&&dialog.close)dialog.close();else dialog.removeAttribute('open');}
async function preview(){const dialog=q('#dossierPreviewDialog');if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}const task=++previewTask;previewController?.abort();const controller=new AbortController();previewController=controller;q('#dossierPreviewFrame').removeAttribute('src');q('#openDossierPreview').hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';q('#dossierPreviewStatus').textContent='Génération de l’aperçu PDF en cours… Merci de patienter.';q('#dossierPreviewLoading').hidden=false;q('#dossierPreviewFrame').setAttribute('aria-busy','true');try{const payload=await window.estimiaBuildDossierPayload();if(task!==previewTask)return;const response=await fetch('/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))throw Error('Aperçu PDF indisponible. Réessaie après vérification du dossier.');const blob=await response.blob();if(task!==previewTask)return;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);q('#dossierPreviewFrame').src=previewUrl;q('#openDossierPreview').href=previewUrl;q('#openDossierPreview').hidden=false;q('#dossierPreviewStatus').textContent='Aperçu du PDF produit avec les informations actuelles. Actualise-le après une modification.';}catch(e){if(e.name!=='AbortError'&&task===previewTask)q('#dossierPreviewStatus').textContent=e.message;}finally{if(task===previewTask){q('#dossierPreviewLoading').hidden=true;q('#dossierPreviewFrame').setAttribute('aria-busy','false');}}}
q('#previewDossier')?.addEventListener('click',preview);q('#refreshDossierPreview')?.addEventListener('click',preview);q('#closeDossierPreview')?.addEventListener('click',closePreview);q('#dossierPreviewDialog')?.addEventListener('cancel',e=>{e.preventDefault();closePreview();});
document.addEventListener('input',e=>{if(conclusionIds.includes(e.target?.id))checkConclusion();});new MutationObserver(()=>{renderLedger();checkConclusion();}).observe(q('#estimationResults'),{childList:true,subtree:true,characterData:true});document.addEventListener('estimia:contacts-restored',()=>{showStep(field('visitStep'));refreshAssets();});document.addEventListener('estimia:case-ready',()=>{renderLedger();checkConclusion();closePreview();});renderLedger();refreshAssets();showStep(field('visitStep'));
})();

/* V14.03 : contrôle de cohérence du dossier avant remise. */
(()=>{'use strict';const q=s=>document.querySelector(s),v=id=>q('#'+id)?.value||'';
function checks(){const rows=[];if(Number(v('estOtherAdjustment'))&&!v('estQualityReason').trim())rows.push(['Ajustement financier','Un autre ajustement de '+Number(v('estOtherAdjustment')).toLocaleString('fr-FR')+' € est appliqué sans justification renseignée. Vérifier son motif et son éventuel cumul avec la décote d’état ou le budget de travaux.']);
if(q('#includeClientConclusion')?.checked&&!v('estClientConclusion').trim())rows.push(['Conclusion facultative','L’inclusion est activée, mais le texte est vide : les documents seront téléchargés sans conclusion.']);
if(!q('#annoncesResults .annonceCard')&&!q('#roquesResults .annonceCard'))rows.push(['Annonces','Aucune fiche d’annonce jointe à ce document. Lancer une recherche puis vérifier les annonces avant de réexporter.']);
let refs=[];try{refs=JSON.parse(v('cadParcelsJSON')||'[]')}catch{}if(!refs.length&&!v('cadParcel'))rows.push(['Cadastre et urbanisme','Références cadastrales non renseignées. Aucun plan ni zonage parcellaire ne peut être confirmé.']);
if([...document.querySelectorAll('#facts .levelBlock')].some(e=>/Logement non précisé/.test(e.querySelector('.levelName')?.value||'')&&e.querySelector('.editableSurface')))rows.push(['Détail de visite','Certaines pièces ne sont pas ventilées par logement. Leur répartition reste facultative ; les surfaces globales annoncées servent au calcul, sans ajout du détail.']);return rows;}
window.estimiaDossierChecks=()=>{const rows=checks(),box=window.estimiaPreflight?null:q('#dossierChecks');if(box){box.replaceChildren();const title=document.createElement('h3');title.textContent=rows.length?'Points à vérifier avant remise':'Dossier : contrôles disponibles sans anomalie signalée';box.append(title);for(const[k,val]of rows){const p=document.createElement('p');p.textContent=k+' : '+val;box.append(p);}}return rows.length?[{title:'Points à vérifier avant remise',rows}]:[];};
let timer;const update=()=>{clearTimeout(timer);timer=setTimeout(()=>window.estimiaDossierChecks(),50);};document.addEventListener('input',update);document.addEventListener('change',update);document.addEventListener('estimia:case-ready',update);document.querySelectorAll('#visitSteps button,#visitNext,#showAllSteps').forEach(e=>e.addEventListener('click',update));new MutationObserver(update).observe(q('#estimationResults'),{childList:true,subtree:true,characterData:true});window.estimiaDossierChecks();})();

/* V14.03 — réponses essentielles et validation libre des étapes. */
(()=>{'use strict';
const q=s=>document.querySelector(s),val=id=>q('#'+id)?.value||'',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unknown='À vérifier',none='Absent',na='Non concerné';let data={units:{},common:{},validated:{}},current=0,loading=false,lastPrice='';
const choices={heat:['Électrique','Pompe à chaleur','Climatisation réversible','Chaudière gaz','Chaudière fioul','Poêle à bois','Poêle à granulés','Cheminée à foyer ouvert','Insert','Chauffage collectif',none,unknown],ecs:['Ballon électrique','Ballon thermodynamique','Chaudière','Solaire','Production collective',none,unknown],windows:['Simple vitrage','Double vitrage','Triple vitrage','Bois','PVC','Aluminium','Mixte',none,unknown],condition:['Bon état','À rafraîchir','À rénover','À réhabiliter',unknown],works:['Aucun travail signalé explicitement','Travaux déclarés','Travaux à préciser',unknown]};
const labels={heat:'Mode de chauffage',ecs:'Production d’eau chaude',glazing:'Vitrage',frames:'Matériau des menuiseries',condition:'État général',works:'Travaux connus'};
const residential=()=>!/terrain|garage|parking|local commercial|bureau/i.test(val('type'));
const terrain=()=>/terrain/i.test(val('type'));
function units(){let items=[];try{items=JSON.parse(val('propertyUnitsJSON')||'[]')}catch{}return items.length>1?items.map(u=>({key:u.key||u.label,label:u.label,area:u.surface})): [{key:'principal',label:val('type')||'Bien principal',area:Number(val('surfaceHab'))||0}];}
function unitData(key){const st=data.units[key]||(data.units[key]={answers:{},manual:{},source:{}});st.answers||={};st.manual||={};st.source||={};if(st.answers.windows){for(const k of ['glazing','frames'])if(!st.answers[k]){st.answers[k]=st.answers.windows.filter(v=>k==='glazing'?/vitrage|À vérifier|Absent|Non concerné/i.test(v):/^(Bois|PVC|Aluminium|Mixte|À vérifier|Absent|Non concerné)$/i.test(v));st.manual[k]=!!st.manual.windows;st.source[k]=st.source.windows||'';}}return st;}
choices.glazing=['Simple vitrage','Double vitrage','Triple vitrage','Mixte',none,unknown];choices.frames=['Bois','PVC','Aluminium','Mixte',none,unknown];
function syncConditionField(){const all=units(),field=q('#estCondition');if(all.length===1){const state=unitData(all[0].key).answers.condition?.[0]||unknown;field.value=state===unknown?'':state;field.dataset.qualityManual='true';}else{const values=all.map(u=>unitData(u.key).answers.condition?.[0]||unknown),same=values.every(v=>v===values[0]),mixed='États différents selon les logements';if(![...field.options].some(o=>o.value===mixed)){const option=document.createElement('option');option.value=mixed;option.textContent=mixed;option.disabled=true;field.append(option);}field.value=same?(values[0]===unknown?'':values[0]):mixed;field.dataset.qualityManual='false';}}
function choiceControl(u,key,st){const answers=st.answers[key]||[],options=[...new Set([...choices[key],...answers])],attrs='data-unit="'+esc(u.key)+'" data-field="'+key+'"',missing=!answers.length;const cls='essentialControl'+(missing?' essentialUnanswered':'');if(['condition','works'].includes(key))return '<label class="'+cls+'">'+esc(labels[key])+' *<select '+attrs+' aria-invalid="'+missing+'"><option value="">Choisir une réponse</option>'+options.map(o=>'<option '+(answers.includes(o)?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>';return '<div class="'+cls+'"><span>'+esc(labels[key])+' *</span><details class="essentialSelect"><summary aria-invalid="'+missing+'">'+esc(answers.join(' ; ')||'Choisir une ou plusieurs réponses')+'</summary><div class="essentialOptions">'+options.map(o=>'<label><input type="checkbox" '+attrs+' data-choice="'+esc(o)+'" '+(answers.includes(o)?'checked':'')+'> '+esc(o)+'</label>').join('')+'</div></details></div>';}

function store(notify=true){q('#essentialDataJSON').value=JSON.stringify(data);if(notify)q('#essentialDataJSON').dispatchEvent(new Event('input',{bubbles:true}));}
function load(){try{const parsed=JSON.parse(val('essentialDataJSON')||'{}');data={units:parsed.units||{},common:parsed.common||{},validated:parsed.validated||{}}}catch{data={units:{},common:{},validated:{}}}}
function cleanParts(text){return text.split(/[.!?;\n]+/).filter(s=>!/(?:pas de|sans|aucun|prévu|à installer|prévoir|remplacer par)\s*(?:chauffage|radiateur|pompe|chaudière|ballon|poêle|clim|double vitrage|triple vitrage|fenêtres|menuiseries)/i.test(s)).join('. ');}
function segmentFor(unit,all,text){if(all.length===1)return text;const narrative=window.estimiaEssentialTextForUnit?.(text,unit.key);if(narrative)return narrative.split(/\b(?:syndic|charges?|je corrige|en termes de travaux|les surfaces des pièces)\b/i)[0];const headers=[];for(const u of all){const label=u.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rx=new RegExp('\\b(?:dans|pour|concernant)\\s+(?:l[\'’]\\s*|le\\s+|la\\s+)?'+label+'\\b','gi');for(const m of text.matchAll(rx))headers.push({i:m.index,key:u.key});}headers.sort((a,b)=>a.i-b.i);return headers.filter(h=>h.key===unit.key).map(h=>text.slice(h.i,headers.find(z=>z.i>h.i)?.i||text.length)).join('. ');}
function prefill(){const text=window.estimiaEssentialNormalizeText?.(val('notes')+' '+val('correction'))||val('notes')+' '+val('correction'),all=units();if(!text.trim()&&!['estHeating','estHotWater','estWindows','estCondition','estPlannedWorks'].some(id=>val(id)))return;for(const u of all){const state=unitData(u.key),part=segmentFor(u,all,text)+(all.length===1?'. '+['estHeating','estHotWater','estWindows','estCondition','estPlannedWorks'].map(val).join('. '):''),positive=cleanParts(part),signals=window.estimiaEssentialExtract?.(positive)||{heating:[]};const set=(key,values)=>{if(state.manual[key]&&!(state.answers[key]?.length===1&&state.answers[key][0]===unknown&&values.filter(Boolean).length))return;state.manual[key]=false;state.answers[key]=values.filter(Boolean);state.source[key]=state.answers[key].length?'Fiche / dictée':'';};
const heat=signals.heating.filter(r=>!/(?:eau chaude|décorative|hors chauffage|hors service|condamnée|en panne)/i.test(r.join(' '))).map(r=>r[0]);if(/\bchauffage\s+[ée]lectrique\b/i.test(positive))heat.push('Électrique');if(/(?:sans chauffage|absence de chauffage|aucun chauffage)/i.test(part))set('heat',[none]);else set('heat',[...new Set(heat)]);
const water=signals.heating.filter(r=>/eau chaude/i.test(r[0])).map(r=>r[2]||r[0]);if(/eau chaude[^.!?]{0,35}solaire/i.test(positive))water.push('Solaire');set('ecs',[...new Set(water)]);
const glazing=[];for(const [rx,name]of [[/\bsimple vitrage\b/i,'Simple vitrage'],[/\bdouble vitrage\b/i,'Double vitrage'],[/\btriple vitrage\b/i,'Triple vitrage'],[/\b(?:fen[eê]tres?|menuiseries?)[^.!?]{0,30}\bpvc\b/i,'PVC'],[/\b(?:fen[eê]tres?|menuiseries?)[^.!?]{0,30}\bbois\b/i,'Bois'],[/\b(?:fen[eê]tres?|menuiseries?)[^.!?]{0,30}\b(?:alu|aluminium)\b/i,'Aluminium']])if(rx.test(positive))glazing.push(name);set('windows',glazing);set('glazing',glazing.filter(v=>/vitrage/.test(v)));set('frames',glazing.filter(v=>/^(Bois|PVC|Aluminium|Mixte)$/.test(v)));set('condition',[signals.condition]);set('works',/aucun(?:s)? travaux|pas de travaux/i.test(part)?['Aucun travail signalé explicitement']:/travaux|à rénover|à réhabiliter|à rafraîchir|remise aux normes|remplacement/i.test(part)?['Travaux déclarés']:[]);}
if(!data.common.coproManual)data.common.copro=/hors copropri[ée]t[ée]|pas de copropri[ée]t[ée]|sans copropri[ée]t[ée]/i.test(text)?'Non':/copropri[ée]t[ée]|syndic/i.test(text)?'Oui':'';
if(!data.common.syndicManual)data.common.syndic=/syndic\s+(?:est\s+)?bénévole/i.test(text+' '+val('estSyndic'))?'Bénévole':/syndic\s+(?:est\s+)?professionnel/i.test(text+' '+val('estSyndic'))?'Professionnel':'';
if(!data.common.chargesManual)data.common.charges=val('estCharges')!==''?'Montant annuel renseigné':'';
if(!data.common.assainissementManual)data.common.assainissement=/tout[- ]à[- ]l['’][ée]gout|assainissement collectif/i.test(text)?'Collectif':/fosse septique|assainissement individuel|micro[- ]station/i.test(text)?'Individuel':'';
if(!data.common.landAreaManual){const m=text.match(/terrain(?: de loisirs?| constructible| à bâtir)?\s*(?:de|fait|mesure|:)\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i);if(m)data.common.landArea=m[1].replace(',','.');}
if(!data.common.constructibilityManual)data.common.constructibility=/non constructible/i.test(text)?'Non constructible':/constructible|à bâtir/i.test(text)?'Déclaré constructible — à vérifier au document d’urbanisme':'';store(false);}
function reserves(){return units().flatMap(u=>{const st=unitData(u.key);return Object.entries(st.answers).filter(([,v])=>v.includes(unknown)||v.includes('Travaux à préciser')).map(([k])=>u.label+' — '+labels[k]);}).concat(Object.entries(data.common).filter(([k,v])=>!k.endsWith('Manual')&&v===unknown).map(([k])=>k));}
function amount(){return q('#estimationResults .estimationValueAmount')?.textContent||'';}
let lastProgressHTML='',lastEssentialHTML='';
const progressNames=['Dictée et cadastre','Vérifier le bien','Comparables et valeur','Dossier client'];
const byUnit=(unit,key)=>[...document.querySelectorAll('#essentialValidation [data-unit][data-field]')].find(el=>el.dataset.unit===unit&&el.dataset.field===key);
const byCommon=key=>[...document.querySelectorAll('#essentialValidation [data-common]')].find(el=>el.dataset.common===key);
const unsure=value=>/à vérifier|inconnu|à préciser/i.test(Array.isArray(value)?value.join(' '):String(value||''));
function progressCriteria(){const rows=[];const add=(id,step,label,complete,target,uncertain=false,required=true)=>rows.push({id,step,label,target,status:complete?(uncertain?'review':'done'):'missing',required});
add('type',0,'Type de bien — choisir une réponse',!!val('type').trim(),()=>q('#type'));add('commune',0,'Commune — renseigner la commune du bien',!!val('cadCommune').trim(),()=>q('#cadCommune'));
let refs=[];try{refs=JSON.parse(val('cadParcelsJSON')||'[]')}catch{}add('location',0,'Adresse ou références cadastrales — renseigner une localisation',!!(val('address').trim()||val('cadParcel').trim()||refs.some(p=>p.section&&p.numero)),()=>q('#address'));
if(residential()){for(const u of units()){add('area:'+u.key,units().length>1?1:0,u.label+' → Surface habitable — renseigner une surface positive',Number.isFinite(u.area)&&u.area>0,()=>units().length>1?q('#surfaceControlPanel'):q('#surfaceHab'));const st=unitData(u.key);for(const key of Object.keys(labels)){const answers=st.answers[key]||[];add('unit:'+u.key+':'+key,1,u.label+' → '+labels[key]+' — '+(answers.length?'réponse à vérifier':'choisir une réponse'),answers.length>0,()=>byUnit(u.key,key),unsure(answers));}}
add('copro',1,'Copropriété — préciser la situation',!!data.common.copro,()=>byCommon('copro'),unsure(data.common.copro));if(data.common.copro==='Oui'){add('syndic',1,'Copropriété → Type de syndic — choisir une réponse',!!data.common.syndic,()=>byCommon('syndic'),unsure(data.common.syndic));add('chargesState',1,'Copropriété → Charges — préciser si le montant est connu',!!data.common.charges,()=>byCommon('charges'),unsure(data.common.charges));if(data.common.charges==='Montant annuel renseigné')add('chargesAmount',1,'Copropriété → Montant annuel des charges — saisir un montant positif ou nul',!invalidCharges(),()=>q('#essentialChargesAmount'));}if(/maison|villa|mas/i.test(val('type')))add('sewer',1,'Assainissement — choisir une réponse',!!data.common.assainissement,()=>byCommon('assainissement'),unsure(data.common.assainissement));
}else if(terrain()){add('landArea',1,'Terrain → Surface — renseigner une surface positive',Number(data.common.landArea)>0,()=>byCommon('landArea'));add('constructibility',1,'Terrain → Constructibilité déclarée — choisir une réponse',!!data.common.constructibility,()=>byCommon('constructibility'),unsure(data.common.constructibility));add('access',1,'Terrain → Accès — choisir une réponse',!!data.common.access,()=>byCommon('access'),unsure(data.common.access));}
for(const [i,message]of (window.estimiaSurfaceIssues?.()||[]).entries()){if(units().some(u=>!(u.area>0)&&message.startsWith(u.label+' :')))continue;add('surfaceIssue:'+i,1,'Surfaces → '+message,false,()=>q('#surfaceControlPanel'));}
const supported=!val('type')||/appartement|studio|maison|villa/i.test(val('type'));if(supported)add('estimate',2,'Estimation → '+(q('#estimationResults')?.dataset.calculationPending==='true'?'actualiser le calcul':'calculer le montant'),!!amount()&&q('#estimationResults')?.dataset.calculationPending!=='true',()=>q('#launchEstimation'));
else add('specificAnalysis',2,'Bien spécifique → analyse de valeur à réaliser hors du calcul automatique',true,()=>q('#estimationStatus'),true,false);
const other=val('estOtherAdjustment'),rate=val('estQualityRate'),budget=val('estWorkBudget');if(other!==''&&!Number.isFinite(Number(other)))add('invalidAdjustment',2,'Ajustements → corriger le montant saisi',false,()=>q('#estOtherAdjustment'));
if(Number(other)!==0&&Number.isFinite(Number(other)))add('adjustmentReason',2,'Ajustements → Justification — préciser le motif de la plus-value ou moins-value',!!val('estQualityReason').trim(),()=>q('#estQualityReason'));
if(rate!==''&&(!Number.isFinite(Number(rate))||Number(rate)<-80||Number(rate)>30))add('invalidRate',2,'Ajustements → Taux — saisir un taux compris entre −80 % et +30 %',false,()=>q('#estQualityRate'));
if(val('estQualityMode')==='budget')add('workBudget',2,'Travaux → Budget net — renseigner un montant positif ou nul',budget!==''&&Number.isFinite(Number(budget))&&Number(budget)>=0,()=>q('#estWorkBudget'));
let scoped={};try{scoped=JSON.parse(val('unitAdjustmentsJSON')||'{}')}catch{}for(const[key,value]of Object.entries(scoped))if(value.method==='budget'){const field=part=>[...document.querySelectorAll('#unitPriceAdjustments fieldset')].find(el=>el.dataset.unitBudget===key)?.querySelector('[data-unit-adjust="'+part+'"]');const b=field('budget')?.value??value.budget,reason=field('reason')?.value??value.reason;add('budget:'+key,2,key+' → Budget de travaux — renseigner un montant positif ou nul',b!==''&&Number.isFinite(Number(b))&&Number(b)>=0,()=>field('budget'));add('budgetReason:'+key,2,key+' → Justification du budget — renseigner le motif',!!String(reason||'').trim(),()=>field('reason'));}
add('reviewMethod',2,'Relecture conseillée → Comparables, état et travaux (facultatif)',true,()=>byCommon('methodReviewed'),!data.common.methodReviewed,false);add('reviewFinal',3,'Relecture conseillée → Dossier client et documents (facultatif)',true,()=>byCommon('finalReviewed'),!data.common.finalReviewed,false);
if(q('#includeClientConclusion')?.checked&&!val('estClientConclusion').trim())add('optionalConclusion',3,'Conclusion facultative activée → rédiger le texte ou désactiver son inclusion',true,()=>q('#estClientConclusion'),true,false);
return rows;
}
function missing(step){return progressCriteria().filter(r=>r.step===step&&r.required&&r.status==='missing').map(r=>r.label);}
function valid(step){return missing(step).length===0;}
function markProgressFields(rows){document.querySelectorAll('[data-progress-mark]').forEach(el=>{el.classList.remove('progressFieldMissing','progressFieldReview');el.removeAttribute('aria-invalid');delete el.dataset.progressMark;});for(const r of rows){if(r.status==='done'||!r.required)continue;const el=r.target?.();if(!el)continue;const surface=r.id.startsWith('surfaceIssue:');const control=el.matches('input[type=checkbox]')?el.closest('.essentialControl')||el:el;control.classList.add(r.status==='missing'?'progressFieldMissing':'progressFieldReview');control.dataset.progressMark='true';control.setAttribute('aria-invalid',String(r.status==='missing'));if(surface)control.setAttribute('aria-label','Contrôle des surfaces à résoudre');}}
function renderProgress(){const rows=progressCriteria(),required=rows.filter(r=>r.required),missingRows=required.filter(r=>r.status==='missing'),reviewRows=rows.filter(r=>r.status==='review'),complete=required.length-missingRows.length,percent=required.length?Math.round(complete/required.length*100):0,host=q('#dossierProgress');if(!host)return;
const active=document.activeElement?.closest('#dossierProgress button')?.dataset.progressTarget,opened=host.querySelector('.progressTasks')?.open??true,reviewOpen=host.querySelector('.progressReviewTasks')?.open??false;
let html='<div class="progressHeading"><h2>Avancement du dossier</h2><strong>'+percent+' %</strong></div><progress max="100" value="'+percent+'" aria-label="Complétude des informations du dossier"></progress><p id="progressSummary" role="status" aria-live="polite">'+complete+' / '+required.length+' informations renseignées'+(missingRows.length?' — '+missingRows.length+' à compléter':reviewRows.length?' — réponses renseignées, '+reviewRows.length+' point(s) à relire':' — aucune information nécessaire manquante')+'.</p><p class="small">Complétude des informations applicables au bien, pas fiabilité du prix. Les réponses « À vérifier » comptent comme renseignées et restent orange. Navigation et sauvegarde restent libres.</p>';
if(missingRows.length)html+='<button type="button" id="nextProgressMissing">Aller au prochain champ manquant</button><details class="progressTasks" '+(opened?'open':'')+'><summary>'+missingRows.length+' information(s) à terminer</summary><ul>'+missingRows.map(r=>'<li><button type="button" data-progress-target="'+esc(r.id)+'"><span>'+esc(progressNames[r.step])+'</span>'+esc(r.label)+'</button></li>').join('')+'</ul></details>';
if(reviewRows.length)html+='<details class="progressReviewTasks" '+(reviewOpen?'open':'')+'><summary>'+reviewRows.length+' réponse(s) incertaine(s) ou relecture(s) conseillée(s)</summary><ul>'+reviewRows.map(r=>'<li><button type="button" data-progress-target="'+esc(r.id)+'">'+esc(progressNames[r.step]+' → '+r.label)+'</button></li>').join('')+'</ul></details>';
if(lastProgressHTML!==html){lastProgressHTML=html;host.innerHTML=html;if(active)host.querySelectorAll('[data-progress-target]').forEach(b=>{if(b.dataset.progressTarget===active)b.focus({preventScroll:true});});}host.dataset.percent=String(percent);host.dataset.missing=String(missingRows.length);host.dataset.review=String(reviewRows.length);host.classList.toggle('progressHasMissing',!!missingRows.length);
document.querySelectorAll('#visitSteps [data-step]').forEach(b=>{const step=Number(b.dataset.step),part=rows.filter(r=>r.step===step),red=part.filter(r=>r.required&&r.status==='missing').length,orange=part.filter(r=>r.status==='review').length;let badge=b.querySelector('.progressStepBadge');if(!badge){badge=document.createElement('small');badge.className='progressStepBadge';b.append(badge);}badge.textContent=red?red+' à compléter':orange?orange+' à relire':step===3?'Relecture facultative':'✓ Renseigné';b.classList.remove('stepValidated');b.classList.toggle('progressStepMissing',red>0);b.classList.toggle('progressStepReview',!red&&orange>0);b.classList.toggle('progressStepDone',!red&&!orange);b.title=badge.textContent;});markProgressFields(rows);
}
window.estimiaGoToValidationLabel=label=>{const row=progressCriteria().find(r=>r.label===label);if(!row)return false;goToProgress(row.id);return true;};
function goToProgress(id){const item=progressCriteria().find(r=>r.id===id);if(!item)return;const before=item.target?.(),actualStep=before?.closest('section.card')?.dataset.visitStep;document.querySelector('#visitSteps [data-step="'+(actualStep??item.step)+'"]').click();requestAnimationFrame(()=>{if(item.id.startsWith('budget'))window.estimiaRenderUnitBudgets?.();if(item.id.startsWith('surfaceIssue:')||item.id.startsWith('area:'))window.estimiaRefreshSurfaceControl?.();const fresh=progressCriteria().find(r=>r.id===id)||item;let el=fresh.target?.();if(!el){el=q('#essentialValidation');}if(!el)return;let node=el.parentElement;while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}if(el.matches('input[type=checkbox]'))el=el.closest('.essentialSelect')?.querySelector('summary')||el;el.scrollIntoView({behavior:'smooth',block:'center'});if(!el.matches('input,select,textarea,button,summary'))el.setAttribute('tabindex','-1');el.focus({preventScroll:true});el.classList.add('progressTargetPulse');setTimeout(()=>el.classList.remove('progressTargetPulse'),1500);});}
window.estimiaProgressStatus=()=>{const rows=progressCriteria(),required=rows.filter(r=>r.required),missing=required.filter(r=>r.status==='missing');return {percent:required.length?Math.round((required.length-missing.length)/required.length*100):0,total:required.length,completed:required.length-missing.length,missing:missing.map(({id,step,label})=>({id,step,label})),review:rows.filter(r=>r.status==='review').map(({id,step,label,required})=>({id,step,label,required}))};};
q('#dossierProgress').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.id==='nextProgressMissing'?progressCriteria().find(r=>r.required&&r.status==='missing')?.id:b.dataset.progressTarget;if(id)goToProgress(id);});

function invalidCharges(){return val('estCharges')===''||!Number.isFinite(Number(val('estCharges')))||Number(val('estCharges'))<0;}
function selectCommon(key,label,options){return '<label class="essentialControl '+(!data.common[key]?'essentialUnanswered':'')+'">'+esc(label)+' *<select data-common="'+key+'" aria-invalid="'+(!data.common[key])+'"><option value="">Choisir une réponse</option>'+options.map(o=>'<option '+(data.common[key]===o?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>';}
function render(){const host=q('#essentialValidation');if(!host)return;current=Math.max(0,Math.min(3,Number(val('visitStep'))||0));const step=current;let html='<h3>'+['Informations de la dictée','Informations essentielles du bien','Relecture du calcul','Relecture du dossier client'][step]+'</h3><p class="small">Les réponses de la dictée sont reprises automatiquement. Complète les champs signalés ; aucune validation d’étape n’est nécessaire.</p>';
if(step===1){if(residential()){html+='<p class="small">L’état choisi est appliqué au calcul de chaque logement : bon état 0 %, à rafraîchir −5 %, à rénover −15 %, à réhabiliter −25 %. Hypothèses provisoires ajustables à l’étape 3. Choisir un état active la méthode par état, sans cumuler un budget de travaux. Chauffage, eau chaude, vitrage et matériau acceptent plusieurs réponses.</p>';for(const u of units()){const st=unitData(u.key);html+='<fieldset class="essentialUnit"><legend>'+esc(u.label)+' — '+(u.area>0?esc(u.area)+' m²':'surface à renseigner dans la fiche')+'</legend><div class="essentialGrid">';for(const key of Object.keys(labels))html+='<div>'+choiceControl(u,key,st)+'<span class="small">'+esc(st.source[key]||'À compléter')+'</span></div>';html+='</div></fieldset>';}
html+='<div class="essentialGrid">'+selectCommon('copro','Copropriété',['Oui','Non',unknown]);if(data.common.copro==='Oui')html+=selectCommon('syndic','Type de syndic',['Bénévole','Professionnel','Sans syndic déclaré',unknown])+selectCommon('charges','Charges',['Montant annuel renseigné',unknown]);if(/maison|villa|mas/i.test(val('type')))html+=selectCommon('assainissement','Assainissement',['Collectif','Individuel',unknown]);if(data.common.copro==='Oui'&&data.common.charges==='Montant annuel renseigné')html+='<label class="essentialControl '+(invalidCharges()?'essentialUnanswered':'')+'">Montant annuel des charges (€) *<input id="essentialChargesAmount" type="number" min="0" step="0.01" value="'+esc(val('estCharges'))+'" aria-invalid="'+invalidCharges()+'"></label>';html+='</div>';
}else if(terrain())html+='<div class="essentialGrid"><label>Surface du terrain en m² *<input data-common="landArea" type="number" min="0.01" step="0.01" value="'+esc(data.common.landArea||'')+'"></label>'+selectCommon('constructibility','Constructibilité',['Déclaré constructible — à vérifier au document d’urbanisme','Non constructible',unknown])+selectCommon('access','Accès',['Accès existant','Accès à créer','Servitude déclarée',unknown])+'</div>';else html+='<label><input type="checkbox" data-common="otherReview" '+(data.common.otherReview?'checked':'')+'> Description du bien spécifique relue</label>';
}
if(step===2)html+='<label class="optionalReview"><input type="checkbox" data-common="methodReviewed" '+(data.common.methodReviewed?'checked':'')+'> Relecture du calcul effectuée (facultatif)</label><p class="small">Vérifier les comparables, l’état et les travaux, sans double comptage. Cette case ne bloque pas la navigation ou les exports.</p>';
if(step===3)html+='<label class="optionalReview"><input type="checkbox" data-common="finalReviewed" '+(data.common.finalReviewed?'checked':'')+'> Relecture finale effectuée (facultatif)</label>';
host.hidden=step===0;if(lastEssentialHTML!==html){lastEssentialHTML=html;host.innerHTML=html;}renderProgress();}
q('#essentialValidation').addEventListener('input',e=>{if(e.target.id==='essentialChargesAmount'){const target=q('#estCharges');target.value=e.target.value;data.common.methodReviewed=false;data.common.finalReviewed=false;store();target.dispatchEvent(new Event('input',{bubbles:true}));e.target.classList.toggle('essentialInvalid',target.value==='');}renderProgress();});
q('#essentialValidation').addEventListener('change',e=>{const el=e.target,openKey=el.closest('.essentialSelect')?{unit:el.dataset.unit,field:el.dataset.field,choice:el.dataset.choice}:null;if(el.id==='essentialChargesAmount'){render();return;}if(el.dataset.common){data.common[el.dataset.common]=el.type==='checkbox'?el.checked:el.value;if(el.dataset.common==='assainissement')window.estimiaNetworksFromCommon?.(el.value);data.common[el.dataset.common+'Manual']=true;}else if(el.dataset.unit){const st=unitData(el.dataset.unit),key=el.dataset.field,a=el.dataset.choice||el.value;if(el.dataset.choice){const before=st.answers[key]||[];st.answers[key]=el.checked?([unknown,none,na].includes(a)?[a]:[...new Set([...before.filter(v=>![unknown,none,na].includes(v)),a])]):before.filter(v=>v!==a);}else st.answers[key]=a?[a]:[];st.manual[key]=true;st.source[key]='Réponse manuelle';if(['glazing','frames'].includes(key))st.answers.windows=[...(st.answers.glazing||[]),...(st.answers.frames||[])];if(key==='condition'){q('#estQualityMode').value='etat';q('#estQualityRate').value='';syncConditionField();store(false);document.dispatchEvent(new Event('estimia:condition-changed'));}}if(!['methodReviewed','finalReviewed'].includes(el.dataset.common)){data.common.methodReviewed=false;data.common.finalReviewed=false;}store();render();if(openKey){const checkbox=[...q('#essentialValidation').querySelectorAll('input[data-choice]')].find(n=>n.dataset.unit===openKey.unit&&n.dataset.field===openKey.field&&n.dataset.choice===openKey.choice);if(checkbox){checkbox.closest('details').open=true;checkbox.focus();}}});
// V14.08 : navigation libre, sans bouton ni validation répétée par étape.
q('#analyse').addEventListener('click',()=>setTimeout(async()=>{await window.estimiaFicheReady;window.estimiaRefreshSurfaceOverview?.();window.estimiaRefreshPhotoChoices?.();prefill();render();store();},0));
let timer;document.addEventListener('change',e=>{if(!e.target.closest('#essentialValidation')){clearTimeout(timer);timer=setTimeout(()=>{if(e.target.id==='estQualityMode')prefill();render();},100);}});document.addEventListener('input',e=>{if(loading||window.estimiaRestoringCase||e.target.id==='essentialDataJSON'||e.target.closest('#essentialValidation'))return;clearTimeout(timer);if(e.target.id==='estCondition'){for(const u of units()){const st=unitData(u.key);st.answers.condition=[e.target.value||unknown];st.manual.condition=true;st.source.condition='État global choisi manuellement';}store(false);}
if(['notes','correction','surfaceHab','type','estCondition','estQualityRate','estWorkBudget','estOtherAdjustment','estQualityMode','estQualityReason'].includes(e.target.id)){data.common.methodReviewed=false;data.common.finalReviewed=false;store(false);}if(e.target.id==='estCharges'&&document.activeElement?.id==='essentialChargesAmount')return;timer=setTimeout(()=>{if(['estHeating','estHotWater','estWindows','estCondition','estPlannedWorks','estCharges','estSyndic'].includes(e.target.id))prefill();render();},100);});document.querySelectorAll('#visitSteps button,#visitNext,#visitPrev,#showAllSteps').forEach(e=>e.addEventListener('click',render));document.addEventListener('estimia:case-ready',()=>{window.estimiaRefreshSurfaceOverview?.();loading=true;load();prefill();lastPrice=amount();render();loading=false;if(units().some(u=>unitData(u.key).manual.condition)){syncConditionField();if(val('estQualityMode')==='etat'&&q('#estimationResults')?.dataset.adjusted!=='true')document.dispatchEvent(new Event('estimia:condition-changed'));}});new MutationObserver(()=>{if(loading||window.estimiaRestoringCase)return;if(lastPrice!==amount()){data.common.methodReviewed=false;data.common.finalReviewed=false;lastPrice=amount();store(false);}clearTimeout(timer);timer=setTimeout(render,100);}).observe(q('#estimationResults'),{subtree:true,childList:true,characterData:true});
window.estimiaEssentialExport=()=>{const result=[];if(residential())for(const u of units()){const st=unitData(u.key),rows=Object.keys(labels).map(k=>[labels[k],(st.answers[k]||[]).join(' ; ')||'Non renseigné']).concat([['Portée','Réponses déclarées ; les caractéristiques détaillées et quantités restent dans le relevé de visite.']]);result.push({title:'Informations essentielles — '+u.label,rows});}else if(terrain())result.push({title:'Informations essentielles — terrain',rows:[['Surface',(data.common.landArea||'Non renseignée')+' m²'],['Constructibilité',data.common.constructibility||'Non renseignée'],['Accès',data.common.access||'Non renseigné']]});
const common=[];for(const[key,label]of [['copro','Copropriété'],['syndic','Syndic'],['charges','Charges'],['assainissement','Assainissement']])if(data.common[key]&&(data.common.copro==='Oui'||!['syndic','charges'].includes(key)))common.push([label,key==='charges'&&data.common.charges==='Montant annuel renseigné'?(invalidCharges()?'Montant à renseigner':Number(val('estCharges')).toLocaleString('fr-FR')+' € / an'):data.common[key]]);if(common.length)result.push({title:'Réponses complémentaires essentielles',rows:common});return result;};
document.addEventListener('estimia:networks-updated',()=>{load();render();});document.addEventListener('estimia:price-recorded',()=>{data.common.methodReviewed=false;data.common.finalReviewed=false;store(false);render();});
window.estimiaChooseUnitCondition=(key,value,options={})=>{const u=units().find(x=>x.key===key);if(!u)throw Error('Choisissez un logement identifié.');const st=unitData(key);st.answers.condition=[value];st.manual.condition=true;st.source.condition=options.photo?'Constat photo accepté':'Raccourci de visite';data.common.methodReviewed=false;data.common.finalReviewed=false;if(!(options.preserveBudget&&q('#estQualityMode').value==='budget')){q('#estQualityMode').value='etat';q('#estQualityRate').value='';}syncConditionField();store();render();document.dispatchEvent(new Event('estimia:condition-changed'));};
window.estimiaPhotoWorks=(key,restore)=>{const st=unitData(key);if(restore){if(st.source.works!=='Constats photo acceptés')return false;for(const field of ['answers','manual','source']){if(restore[field]===undefined)delete st[field].works;else st[field].works=restore[field];}store();render();return true;}const previous={};for(const field of ['answers','manual','source'])if(st[field].works!==undefined)previous[field]=JSON.parse(JSON.stringify(st[field].works));st.answers.works=['Travaux déclarés'];st.manual.works=true;st.source.works='Constats photo acceptés';store();render();return previous;};
window.estimiaRestorePhotoCondition=(key,previous,expected,quality)=>{const st=unitData(key);if(st.source.condition!=='Constat photo accepté'||st.answers.condition?.[0]!==expected)return false;if(quality?.qualityAfter&&q('#estQualityMode').value===quality.qualityAfter.mode&&q('#estQualityRate').value===quality.qualityAfter.rate){q('#estQualityMode').value=quality.qualityBefore.mode;q('#estQualityRate').value=quality.qualityBefore.rate;}for(const field of ['answers','manual','source']){if(previous[field]===undefined)delete st[field].condition;else st[field].condition=previous[field];}syncConditionField();store();render();document.dispatchEvent(new Event('estimia:condition-changed'));return true;};
window.estimiaValidationStatus=()=>[0,1,2,3].map(i=>({step:i,valid:valid(i),missing:missing(i)}));load();prefill();render();})();
/* V14.04 — réseaux déclarés et vérification fibre indépendante du raccordement. */
(()=>{'use strict';
const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),host=q('#networkPanel');if(!host)return;
const unknown='Inconnu',works='À reprendre / travaux à réaliser',ok='Fonctionnel (déclaré)';
const config={sewer:{label:'Assainissement',modes:['Raccordé au réseau communal d’eaux usées','Fosse septique / toutes eaux','Microstation','Assainissement individuel — type à préciser','Non raccordé / à créer','Plusieurs installations — voir détails',unknown]},water:{label:'Eau potable',modes:['Raccordé au réseau public d’eau potable','Alimentation privée — potabilité à vérifier','Non raccordé au réseau public','Plusieurs alimentations — voir détails',unknown]},fibre:{label:'Fibre optique',modes:['Raccordé à la fibre','Non raccordé à la fibre',unknown]}};
let data={},epoch=0,request=0,pending=false,timer,lastAuto='';
const key=()=>JSON.stringify([q('#address')?.value.trim()||'',q('#cadCommune')?.value.trim()||'',q('#cadCommune')?.dataset.postcode||'']);
function load(){try{data=JSON.parse(q('#networksJSON').value||'{}')}catch{data={}}for(const k of Object.keys(config))data[k]||={mode:unknown,state:unknown,notes:'',manual:{}};pending=false;lastAuto='';}
function save(){q('#networksJSON').value=JSON.stringify(data);q('#networksJSON').dispatchEvent(new Event('input',{bubbles:true}));}
function stateOf(text){if(/hors service|en panne|ne fonctionne (?:pas|plus)|non fonctionnel/i.test(text))return'Hors service';if(/à reprendre|à refaire|à remplacer|à rénover|non conforme|travaux[^.!?]{0,30}(?:réaliser|prévoir|nécessaires?)/i.test(text))return works;if(/à contrôler|à vérifier|état inconnu|fonctionnement inconnu/i.test(text))return'À contrôler';if(/fonctionnell?e?s?|fonctionne(?:ment normal)?\b|bon état|en état|en service/i.test(text))return ok;return unknown;}
function extract(text){text=String(text||'').replace(/[’]/g,"'");const token=/\bassainissement\b|\beaux usées\b|tout[- ]à[- ]l[' ]?[ée]gout|fosse (?:septique|toutes eaux)|micro[- ]?station|\beau potable\b|\beau de (?:la ville|ville)\b|réseau (?:public |communal )?(?:d[' ]eau(?!x?\s+(?:usées|pluviales)|\s+chaude)|eau(?!x?\s+(?:usées|pluviales)|\s+chaude))|\bforage\b|\bpuits\b|\beau de source\b|\bfibre(?: optique)?\b/gi;
const marks=[...text.matchAll(token)].map(m=>({i:m.index,name:m[0],kind:/fibre/i.test(m[0])?'fibre':/assainissement|usées|égout|fosse|micro/i.test(m[0])?'sewer':'water'}));const fragments={sewer:[],water:[],fibre:[]};
for(const m of marks){const before=text.slice(Math.max(0,m.i-65),m.i),prefix=before.match(/(?:(?:n[' ]est\s+(?:pas|plus)|pas|non)\s+)?(?:raccord[ée]e?s?|connect[ée]e?s?|aliment[ée]e?s?)\s+(?:au|aux|[àa]|par)\s+(?:la|le|un|une|l[' ]|en)?\s*$|(?:sans|pas de)\s+(?:la\s+)?$/i);m.start=prefix?m.i-prefix[0].length:m.i;}
for(let i=0;i<marks.length;i++){const m=marks[i];if(i&&marks[i-1].kind===m.kind&&!/[.!?;\n]/.test(text.slice(marks[i-1].i,m.i))&&!/je corrige|rectification|finalement|en fait/i.test(text.slice(Math.max(0,m.i-65),m.i)))continue;if(/je corrige|rectification|finalement|en fait/i.test(text.slice(Math.max(0,m.i-65),m.i)))fragments[m.kind]=[];const end=marks.slice(i+1).find(n=>n.kind!==m.kind)?.start||text.length;fragments[m.kind].push(text.slice(m.start,Math.min(end,m.i+300)).split(/[.!?;\n]/)[0].trim());}
const out={};for(const k of Object.keys(config)){const raw=[...new Set(fragments[k])].join(' ; ');let mode=unknown;
if(k==='sewer'){const found=[];if(/tout[- ]à[- ]l[' ]?[ée]gout|(?:raccord|connect)[^.!?]{0,45}(?:réseau[^.!?]{0,25}(?:usées|communal)|eaux usées)|réseau communal d[' ]eaux usées|assainissement (?:collectif|communal)/i.test(raw)&&!/(?:pas|non)[^.!?]{0,20}(?:raccord|connect)|sans raccord/i.test(raw))found.push(config.sewer.modes[0]);if(/fosse (?:septique|toutes eaux)/i.test(raw))found.push(config.sewer.modes[1]);if(/micro[- ]?station/i.test(raw)&&!/(?:prévu|prévoir|remplac[^.!?]{0,20}par|installer)[^.!?]{0,20}micro[- ]?station/i.test(raw))found.push(config.sewer.modes[2]);mode=found.length>1?config.sewer.modes[5]:found[0]||(/(?:pas|non)[^.!?]{0,20}(?:raccord|connect)|sans assainissement|assainissement[^.!?]{0,20}à créer/i.test(raw)?config.sewer.modes[4]:/assainissement individuel/i.test(raw)?config.sewer.modes[3]:unknown);}
if(k==='water'){const privateSource=/forage|puits|eau de source/i.test(raw),negative=/(?:pas|non)[^.!?]{0,20}(?:raccord|connect)|sans (?:eau potable|raccordement)/i.test(raw),publicSource=/(?:raccord|connect)[^.!?]{0,50}(?:eau potable|réseau public|réseau communal)|eau de (?:la ville|ville)/i.test(raw);mode=privateSource&&publicSource&&!negative?config.water.modes[3]:privateSource?config.water.modes[1]:negative?config.water.modes[2]:publicSource?config.water.modes[0]:unknown;}
if(k==='fibre'){const neg=/(?:pas|non)[^.!?]{0,20}(?:raccord|connect)|(?:raccord|connect)[^.!?]{0,15}(?:pas|non)|sans (?:la |connexion à la )?fibre|pas (?:de |la )?fibre/i.test(raw),connected=/(?:raccord|connect|branch)[ée][^.!?]{0,30}(?:fibre)|fibre[^.!?]{0,25}(?:installée|raccordée|connectée)|prise (?:optique|fibre|PTO)/i.test(raw);mode=neg?config.fibre.modes[1]:connected?config.fibre.modes[0]:unknown;}
out[k]={mode,state:stateOf(raw),notes:raw};}return out;}
window.estimiaExtractNetworks=extract;
function prefill(){const extracted=extract((q('#notes')?.value||'')+' '+(q('#correction')?.value||''));for(const k of Object.keys(config)){data[k].manual||={};for(const f of ['mode','state','notes'])if(!data[k].manual[f])data[k][f]=extracted[k][f]|| (f==='notes'?'':unknown);}save();syncSewer(false);}
function syncSewer(manual){const mode=data.sewer.mode;if(mode===unknown)return;let essentials={};try{essentials=JSON.parse(q('#essentialDataJSON').value||'{}')}catch{}essentials.common||={};if(essentials.common.assainissementManual&&!manual)return;essentials.common.assainissement=mode===config.sewer.modes[0]?'Collectif':/Fosse|Microstation|individuel/.test(mode)?'Individuel':'À vérifier';essentials.common.assainissementManual=manual;q('#essentialDataJSON').value=JSON.stringify(essentials);document.dispatchEvent(new Event('estimia:networks-updated'));}
window.estimiaNetworksFromCommon=value=>{data.sewer.mode=value==='Collectif'?config.sewer.modes[0]:value==='Individuel'?config.sewer.modes[3]:unknown;data.sewer.manual.mode=true;save();render();};
function sourceLink(value){try{const url=new URL(value);if(url.protocol==='https:'&&['www.herault-data.fr','maconnexioninternet.arcep.fr'].includes(url.hostname))return url.href;}catch{}return 'https://maconnexioninternet.arcep.fr/';}
function lookupRows(){const r=data.lookup;if(!r||r.key!==key())return [];return [['Adresse interrogée',r.source_address||r.address_requested||''],['État publié',r.source_status||r.message||'Éligibilité non vérifiée'],...(r.source_comment?[['Information de la source',r.source_comment]]:[]),['Mise à jour de la donnée',r.source_date||'Non précisée'],['Consultation',r.checked_at?new Date(r.checked_at).toLocaleString('fr-FR'):'' ],['Source',r.source||''],['Lien source',sourceLink(r.source_url)],['Portée',r.message||'État à l’adresse ; ne confirme pas le raccordement dans le logement.']];}
window.estimiaNetworkExport=()=>Object.keys(config).map(k=>({title:'Réseaux — '+config[k].label,rows:[['Raccordement / installation',data[k].mode],['État déclaré',data[k].state],...(data[k].notes?[['Précisions',data[k].notes]]:[])]})).concat(lookupRows().length?[{title:'Fibre — vérification de l’éligibilité à l’adresse',rows:lookupRows()}]:[]);
const select=(k,f,options)=>'<label>'+(f==='mode'?'Raccordement / installation':'État déclaré')+'<span class="networkSelect"><span class="networkChoiceText" aria-hidden="true">'+esc(data[k][f])+'</span><select aria-label="'+esc(config[k].label+' — '+(f==='mode'?'Raccordement / installation':'État déclaré'))+'" data-network="'+k+'" data-part="'+f+'">'+options.map(o=>'<option '+(data[k][f]===o?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></span></label>';
function render(){host.innerHTML='<h3>Réseaux — raccordements et état</h3><p class="small">Réponses déclarées ou constatées en visite ; aucun diagnostic de conformité présumé. Pour plusieurs logements, précisez les différences dans les observations. Une alimentation privée ne prouve pas la potabilité de l’eau.</p>'+Object.keys(config).map(k=>'<fieldset class="networkGroup"><legend>'+config[k].label+'</legend><div class="networkFields">'+select(k,'mode',config[k].modes)+select(k,'state',[ok,works,'Hors service','À contrôler',unknown])+'</div><label>Précisions / logement concerné<textarea rows="2" data-network="'+k+'" data-part="notes">'+esc(data[k].notes)+'</textarea></label></fieldset>').join('')+'<div class="fibreCheck"><h4>Fibre — éligibilité à l’adresse</h4><p class="small">Vérification automatique si le bien est déclaré non raccordé. Source intégrée : données publiques IPE de l’Hérault. Hors Hérault ou sans correspondance exacte, le résultat reste non vérifié.</p><button id="checkFibreEligibility" type="button" class="miniBtn" '+(pending?'disabled':'')+'>Vérifier / actualiser l’éligibilité fibre</button><p id="fibreLookupStatus" role="status">'+(pending?'Consultation de la source publique en cours…':data.lookup?.key===key()?esc(data.lookup.message||'Résultat publié à l’adresse : '+data.lookup.source_status):'Éligibilité non vérifiée à cette adresse.')+'</p>'+lookupRows().map(([k,v])=>'<p><b>'+esc(k)+' :</b> '+(k==='Lien source'?'<a href="'+esc(v)+'" target="_blank" rel="noopener noreferrer">Consulter la source officielle</a>':esc(v))+'</p>').join('')+'<p><a href="https://maconnexioninternet.arcep.fr/" target="_blank" rel="noopener noreferrer">Consulter Ma connexion internet — Arcep</a></p></div>';syncFacts();}
function syncFacts(){const group=[...document.querySelectorAll('#facts .proGroup')].find(g=>/Réseaux.*compteurs/i.test(g.querySelector('h3')?.textContent||''));if(!group)return;for(const [k,c]of Object.entries(config)){const label=k==='fibre'?'Fibre':c.label;let row=[...group.querySelectorAll('.proRow')].find(r=>r.querySelector('span')?.textContent.trim()===label);if(!row){row=document.createElement('div');row.className='proRow';row.innerHTML='<span></span><strong></strong>';row.querySelector('span').textContent=label;group.append(row);}row.querySelector('strong').textContent=data[k].mode+' — '+data[k].state;}}
async function check(force=false){const started=key(),currentEpoch=epoch;if(!force&&data.fibre.mode!==config.fibre.modes[1])return;if(!force&&(data.lookup?.key===started||lastAuto===started))return;const address=q('#address').value.trim(),commune=q('#cadCommune').value.trim();if(!address||!commune){if(force){data.lookup={key:started,message:'Renseignez l’adresse complète et la commune.',address_requested:address};save();render();}return;}lastAuto=started;const serial=++request;pending=true;render();try{const params=new URLSearchParams({address,commune,postcode:q('#cadCommune').dataset.postcode||''});const response=await fetch('/api/fibre/eligibilite?'+params);if(!response.ok)throw Error('Source indisponible');const result=await response.json();if(epoch!==currentEpoch||serial!==request||key()!==started)return;data.lookup={...result,key:started};}catch{if(epoch!==currentEpoch||serial!==request||key()!==started)return;data.lookup={key:started,status:'indisponible',message:'Éligibilité non vérifiée : source indisponible. Réessayez ou consultez la carte officielle.',address_requested:address,source_url:'https://maconnexioninternet.arcep.fr/',checked_at:new Date().toISOString()};}finally{if(epoch===currentEpoch&&serial===request){pending=false;save();render();}}}
host.addEventListener('change',e=>{const k=e.target.dataset.network,f=e.target.dataset.part;if(!k)return;data[k][f]=e.target.value;data[k].manual[f]=true;save();if(k==='sewer'&&f==='mode')syncSewer(true);if(k==='fibre'&&f==='mode'){request++;pending=false;lastAuto='';}if(f!=='notes')render();if(k==='fibre'&&f==='mode')check();});
host.addEventListener('input',e=>{const k=e.target.dataset.network;if(k&&e.target.dataset.part==='notes'){data[k].notes=e.target.value;data[k].manual.notes=true;save();}});
host.addEventListener('click',e=>{if(e.target.id==='checkFibreEligibility')check(true);});
q('#analyse').addEventListener('click',()=>setTimeout(async()=>{await window.estimiaFicheReady;prefill();render();check();},0));
document.addEventListener('input',e=>{if(!['address','cadCommune'].includes(e.target.id))return;request++;pending=false;lastAuto='';render();clearTimeout(timer);timer=setTimeout(()=>{check();},450);});
document.addEventListener('estimia:case-ready',()=>{epoch++;request++;load();prefill();render();check();});load();render();
})();

/* V14.04 — justification visible des ajustements financiers. */
(()=>{function refresh(){const amount=document.getElementById('estOtherAdjustment'),reason=document.getElementById('estQualityReason'),error=document.getElementById('adjustmentReasonError');if(!amount||!reason||!error)return;const n=Number(amount.value.replace(',','.')),invalid=Number.isFinite(n)&&n!==0&&!reason.value.trim();reason.classList.toggle('adjustmentReasonInvalid',invalid);reason.setAttribute('aria-invalid',String(invalid));error.hidden=!invalid;if(invalid)reason.setAttribute('aria-describedby','adjustmentReasonError');else if(reason.getAttribute('aria-describedby')==='adjustmentReasonError')reason.removeAttribute('aria-describedby');}for(const event of ['input','change'])document.addEventListener(event,e=>{if(['estOtherAdjustment','estQualityReason'].includes(e.target.id))refresh();});document.addEventListener('estimia:case-ready',refresh);refresh();})();

/* V14.05 — commande facultative, sans condition de validation. */
(()=>{const q=s=>document.querySelector(s);function refresh(){const input=q('#includeClientConclusion'),state=q('#conclusionInclusionState');if(!input||!state)return;state.textContent=input.checked?'Oui — conclusion incluse si renseignée':'Non — conclusion non incluse';}window.estimiaRefreshConclusionInclusion=refresh;q('#includeClientConclusion')?.addEventListener('change',()=>{refresh();q('#clientConclusionStatus').textContent=q('#includeClientConclusion').checked?'Conclusion incluse si renseignée. Vous pouvez télécharger les documents.':'Conclusion non incluse. Vous pouvez valider le dossier et télécharger les documents.';});q('#estClientConclusion')?.addEventListener('input',refresh);document.addEventListener('estimia:case-ready',refresh);refresh();})();
/* V14.06 — historique interne et indicateurs issus des références, distincts de la marge. */
(()=>{'use strict';const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>Number(n||0).toLocaleString('fr-FR')+' €';
function readHistory(){try{return JSON.parse(q('#priceHistoryJSON').value||'[]')}catch{return []}}
function renderHistory(){const rows=readHistory();q('#priceHistoryPanel').innerHTML='<details><summary>Historique interne des montants ('+rows.length+')</summary><p>Conservé avec la sauvegarde du dossier ; non imprimé dans le dossier client. Ce journal local n’est ni signé ni infalsifiable.</p>'+rows.map(r=>'<p>'+esc(new Date(r.date).toLocaleString('fr-FR'))+' · '+esc(r.author)+' · '+esc(r.kind)+' : '+esc(money(r.previous))+' → '+esc(money(r.retained))+'<br>Proposition calculée : '+esc(money(r.calculated))+' · Motif : '+esc(r.reason)+'</p>').join('')+'</details>';}
window.estimiaRecordPrice=kind=>{if(window.estimiaRestoringCase)return;const box=q('#estimationResults');let calculated=0;try{calculated=JSON.parse(box.dataset.originalEstimate||'{}').centrale||0}catch{}const retained=Number((box.querySelector('.estimationValueAmount')?.textContent||'').replace(/[^\d,.-]/g,'').replace(',','.'));if(!(retained>0))return;const history=readHistory(),reason=kind==='retenu'?q('#estAdjustmentReason').value.trim():(q('#estQualityReason').value.trim()||q('#qualityAdjustmentStatus').textContent||'Calcul DVF et ajustements déclarés');const author=kind==='retenu'?(q('#priceHistoryAuthor').value.trim()||'Non identifié'):'ESTIM’IA — calcul automatique';const previous=history.at(-1)?.retained||calculated;const last=history.at(-1);if(last&&last.kind===kind&&last.retained===retained&&last.reason===reason&&last.author===author)return;history.push({date:new Date().toISOString(),kind,calculated,retained,previous,author,reason});q('#priceHistoryJSON').value=JSON.stringify(history);q('#priceHistoryJSON').dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('estimia:price-recorded'));renderHistory();};
function quantile(values,p){const i=(values.length-1)*p,a=Math.floor(i);return values[a]+(values[Math.min(a+1,values.length-1)]-values[a])*(i-a);}
window.estimiaMarketEvidenceSections=()=>{let base;try{base=JSON.parse(q('#estimationResults').dataset.dvfBase||'null')}catch{}if(!base)return [];const groups=base.unitBases?.length?base.unitBases.map(v=>({label:v.unit.label,value:v.value})):[{label:'Votre bien',value:base}];return [{title:'Portée des fourchettes',rows:[['Marge conventionnelle','±15 % autour de la valeur centrale, après corrections et arrondis ; indépendante de la dispersion des ventes. Ce n’est pas un intervalle de confiance.']]},...groups.map(g=>{const refs=g.value.comparables||[],v=refs.map(c=>Number(c.prix_m2)).filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);const rows=[['Ventes retenues',String(g.value.nombre??refs.length)],['Références détaillées disponibles',String(refs.length)],['Période',String(g.value.periode_debut||'Non renseignée')+' → '+String(g.value.periode_fin||'Non renseignée')]];if(v.length)rows.push(['Médiane €/m² des références détaillées',money(quantile(v,.5))+'/m²'],['Quartiles Q1 — Q3',money(quantile(v,.25))+' — '+money(quantile(v,.75))+'/m²'],['Écart interquartile',money(quantile(v,.75)-quantile(v,.25))+'/m²']);rows.push(['Limites',(v.length<5?'Échantillon détaillé réduit (seuil interne de 5 références) : analyse fragile. ':'')+(refs.length<Number(g.value.nombre||0)?'Statistiques calculées sur les références détaillées disponibles, pas sur la totalité des ventes retenues. ':'')+'Quartiles interpolés, descriptifs de cet échantillon uniquement. Ni probabilité ni garantie de prix.']);return {title:'Ventes DVF — '+g.label,rows};})];};
window.estimiaRenderMarketEvidence=()=>{let host=q('#marketEvidence');if(!host){host=document.createElement('section');host.id='marketEvidence';host.className='proGroup';q('#estimationResults').after(host);}const sections=window.estimiaMarketEvidenceSections();host.innerHTML=sections.map(s=>'<h3>'+esc(s.title)+'</h3><dl>'+s.rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>').join('');};document.addEventListener('estimia:case-ready',()=>{renderHistory();window.estimiaRenderMarketEvidence();});renderHistory();})();

(()=>{const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(){let units=[],settings={};try{units=JSON.parse(q('#propertyUnitsJSON').value||'[]');settings=JSON.parse(q('#unitAdjustmentsJSON').value||'{}')}catch{}const host=q('#unitPriceAdjustments');host.hidden=units.length<2&&!Object.values(settings).some(v=>v.method==='budget');host.innerHTML='<h3>Travaux nets par logement (facultatif)</h3><p>Un budget remplace la décote d’état du logement concerné. Les autres logements conservent leur état. Ne cumulez pas avec un budget global. Aucune dépense n’est déduite sans choix explicite.</p>'+[...new Map([...units.map(u=>[u.key||u.label,u.label]),...Object.keys(settings).filter(k=>!units.some(u=>(u.key||u.label)===k)).map(k=>[k,k+' — logement retiré, désactivez son budget'])])].map(([k,label])=>{const v=settings[k]||{};return '<fieldset data-unit-budget="'+esc(k)+'"><legend>'+esc(label)+'</legend><label>Méthode<select data-unit-adjust="method"><option value="etat">État déclaré / réglage global</option><option value="budget" '+(v.method==='budget'?'selected':'')+'>Budget net de travaux spécifique</option></select></label><label>Budget net (€)<input data-unit-adjust="budget" type="number" min="0" step="100" value="'+esc(v.budget??'')+'"></label><label>Justification du budget<textarea data-unit-adjust="reason">'+esc(v.reason||'')+'</textarea></label></fieldset>';}).join('');}q('#unitPriceAdjustments').addEventListener('change',e=>{if(!e.target.dataset.unitAdjust)return;const f=e.target.closest('fieldset'),key=f.dataset.unitBudget;let settings={};try{settings=JSON.parse(q('#unitAdjustmentsJSON').value||'{}')}catch{}settings[key]=Object.fromEntries([...f.querySelectorAll('[data-unit-adjust]')].map(el=>[el.dataset.unitAdjust,el.value]));q('#unitAdjustmentsJSON').value=JSON.stringify(settings);if(settings[key].method==='budget')q('#estQualityMode').value='etat';q('#unitAdjustmentsJSON').dispatchEvent(new Event('input',{bubbles:true}));});document.addEventListener('estimia:case-ready',render);window.estimiaRenderUnitBudgets=render;q('#analyse').addEventListener('click',()=>setTimeout(()=>Promise.resolve(window.estimiaFicheReady).then(render),0));render();})();

/* V14.10 — contrôle final interne, sans cases obligatoires supplémentaires. */
(()=>{'use strict';const q=s=>document.querySelector(s),v=id=>q('#'+id)?.value||'';
window.estimiaPreflight=()=>{const blocking=[...(window.estimiaSurfaceIssues?.()||[])],warnings=[];const other=Number(v('estOtherAdjustment'));if(other&&!v('estQualityReason').trim())blocking.push('Justifiez la plus-value ou moins-value.');if(v('validatedPrice')&&!v('validatedReason').trim())blocking.push('Justifiez le montant retenu.');if(q('#estimationResults')?.dataset.calculationPending==='true')blocking.push('Actualisez le calcul après les modifications.');
if(!q('#estimationResults .estimationValueAmount'))warnings.push('Estimation absente : le document sera une fiche sans montant calculé.');
for(const row of window.estimiaValidationStatus?.()||[])for(const label of row.missing)if(!/calculer le montant|actualiser le calcul|Surfaces →/.test(label))warnings.push(label);
for(const u of window.estimiaSurfaceControlExport?.()||[])if(u.rows.length&&u.declared>0&&Math.abs(u.rows.reduce((a,r)=>a+r.val,0)-u.declared)/u.declared>.1)warnings.push(u.label+' : écart supérieur à 10 % entre surface annoncée et pièces détaillées ; expliquer le choix retenu.');
if([...document.querySelectorAll('#facts .levelName')].some(e=>/non précisé/i.test(e.value)))warnings.push('Certaines pièces restent sans répartition : détail conservé séparément, répartition facultative.');
let base;try{base=JSON.parse(q('#estimationResults')?.dataset.dvfBase||'null')}catch{}const groups=base?.unitBases?.length?base.unitBases.map(x=>({label:x.unit.label,value:x.value})):base?[{label:'Votre bien',value:base}]:[];
for(const g of groups){const refs=g.value.comparables||[];if((g.value.nombre??refs.length)<5)warnings.push(g.label+' : moins de 5 ventes DVF, repère fragile (seuil interne).');const keys=new Set();for(const r of refs){const key=JSON.stringify([r.mutation||r.reference||'',r.date,r.surface,r.prix]);if(keys.has(key)){warnings.push(g.label+' : doublons DVF probables à contrôler.');break;}keys.add(key);}const values=refs.map(r=>Number(r.prix_m2)).filter(x=>x>0).sort((a,b)=>a-b);if(values.length>=4){const qt=t=>{const i=(values.length-1)*t,k=Math.floor(i);return values[k]+(values[k+1]===undefined?0:(values[k+1]-values[k])*(i-k));},a=qt(.25),b=qt(.75),iqr=b-a;if(values.some(x=>x<a-1.5*iqr||x>b+1.5*iqr))warnings.push(g.label+' : prix au m² isolé dans les références, à examiner sans exclusion automatique.');}}
if(!/\bDPE\s*[:=]?\s*[A-G]\b/i.test(v('notes')+' '+(q('#facts')?.textContent||'')))warnings.push('DPE non identifié : aucun classement énergétique présumé ; renseignez-le si un document est disponible.');
if(v('exportLogoData')||v('exportLogoDataURL')||q('#exportLogoPreview')?.getAttribute('src'))warnings.push('Vérifiez visuellement que le logo de couverture est bien celui de l’agence.');if(q('#exportAdvisorPhotoPreview')?.getAttribute('src'))warnings.push('Vérifiez que la photo du conseiller est un portrait professionnel.');
if(!/^terrain/i.test(v('type'))&&!v('estYear').trim())warnings.push('Année de construction non renseignée ; aucun âge du bâtiment présumé.');if(/appartement|studio/i.test(v('type'))&&!v('estElevator'))warnings.push('Présence ou absence d’ascenseur à préciser.');
if(!q('#annoncesResults .annonceCard')&&!q('#roquesResults .annonceCard'))warnings.push('Aucune annonce jointe ; les annonces ne remplacent pas les ventes DVF.');
return {blocking:[...new Set(blocking)],warnings:[...new Set(warnings)]};};
function goToIssue(message){
 if(window.estimiaGoToValidationLabel?.(message))return;
 const routes=[[/Justifiez la plus-value|moins-value/i,'#estQualityReason'],[/Justifiez le montant/i,'#validatedReason'],[/Actualisez le calcul|Estimation absente/i,'#launchEstimation'],[/sans répartition/i,'#facts'],[/surface|surfaces/i,'#surfaceControlPanel'],[/DPE/i,'#estFeatures'],[/logo/i,'#exportLogoPreview'],[/portrait professionnel/i,'#exportAdvisorPhotoPreview'],[/Année de construction/i,'#estYear'],[/ascenseur/i,'#estElevator'],[/ventes DVF|doublons DVF|références/i,'#estimationResults'],[/annonce/i,'#marketListingsModule']];
 const selector=routes.find(([re])=>re.test(message))?.[1]||'#essentialValidation';let el=/sans répartition/i.test(message)?[...document.querySelectorAll('#facts .levelName')].find(e=>/non précisé/i.test(e.value))||q(selector):q(selector);if(!el)return;
 const card=el.closest('section.card'),step=card?.dataset.visitStep;if(step!==undefined)q('#visitSteps [data-step="'+step+'"]').click();
 requestAnimationFrame(()=>{let node=el;while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}if(!el.matches('input,select,textarea,button,summary'))el.setAttribute('tabindex','-1');el.scrollIntoView({behavior:'smooth',block:'center'});el.focus({preventScroll:true});el.classList.add('progressTargetPulse');setTimeout(()=>el.classList.remove('progressTargetPulse'),1500);});
}
function render(){const host=q('#dossierChecks');if(!host)return;const result=window.estimiaPreflight();host.replaceChildren();const title=document.createElement('h3');title.textContent='Avant de remettre le dossier : '+result.blocking.length+' erreur(s), '+result.warnings.length+' point(s) à vérifier';host.append(title);for(const [items,cls]of [[result.blocking,'preflightError'],[result.warnings,'preflightWarning']])for(const text of items){const line=document.createElement('button');line.type='button';line.className=cls+' preflightLink';line.textContent=text+' →';line.setAttribute('aria-label',text+' — ouvrir la rubrique concernée');line.addEventListener('click',()=>goToIssue(text));host.append(line);}const note=document.createElement('p');note.textContent='Seules les incohérences bloquantes empêchent un export. Les avertissements n’imposent aucune case à cocher et ne sont pas imprimés.';host.append(note);}
let timer;const update=()=>{clearTimeout(timer);timer=setTimeout(render,130);};for(const event of ['input','change','estimia:case-ready','estimia:price-recorded'])document.addEventListener(event,update);q('#checkBeforeExport')?.addEventListener('click',render);document.querySelectorAll('#visitSteps button').forEach(b=>b.addEventListener('click',update));new MutationObserver(update).observe(q('#estimationResults'),{childList:true,subtree:true,characterData:true});render();
})();
/* Raccourcis de terrain : les caractéristiques ajoutent une observation ; l’état est appliqué au logement choisi. */
(()=>{const q=s=>document.querySelector(s),host=q('#fieldShortcuts');if(!host)return;function units(){let list=[];try{list=JSON.parse(q('#propertyUnitsJSON').value||'[]')}catch{}return list.length>1?list:[{key:'principal',label:q('#type').value||'Bien principal'}];}function render(){const previous=q('#shortcutUnit')?.value;host.innerHTML='<h3>Compléter la visite en un geste</h3><label>Logement concerné<select id="shortcutUnit"></select></label><div class="shortcutButtons">'+['Traversant','Lumineux','Sans vis-à-vis','À rafraîchir'].map(label=>'<button type="button" data-visit-tag="'+label+'">'+label+'</button>').join('')+'</div><p id="shortcutStatus" role="status">Les caractéristiques complètent les points forts. L’état actualise le calcul ; un budget spécifique reste prioritaire.</p>';const select=q('#shortcutUnit'),list=units();if(list.length>1)select.add(new Option('Choisir le logement',''));for(const u of list)select.add(new Option(u.label,u.key));if(list.some(u=>u.key===previous))select.value=previous;}
host.addEventListener('click',e=>{const tag=e.target.dataset.visitTag;if(!tag)return;const key=q('#shortcutUnit').value,u=units().find(x=>x.key===key),status=q('#shortcutStatus');if(!u){status.textContent='Choisissez le logement concerné.';return;}if(tag==='À rafraîchir'){try{window.estimiaChooseUnitCondition(key,tag);status.textContent=u.label+' : état « À rafraîchir » sélectionné. Décote d’état −5 % si cette méthode s’applique ; le budget spécifique éventuel reste prioritaire.';}catch(err){status.textContent=err.message;}}else{const field=q('#estStrongPoints'),text=u.label+' : '+tag+'.';if(!field.value.includes(text))field.value=[field.value.trim(),text].filter(Boolean).join('\n');field.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=text+' Ajouté aux points forts du dossier.';}});document.addEventListener('estimia:case-ready',render);q('#analyse').addEventListener('click',()=>setTimeout(async()=>{await window.estimiaFicheReady;render();},0));render();})();

// V14.16 — synthèse manuelle des observations photo, indépendante du calcul.
(()=>{
 const q=s=>document.querySelector(s),store=q('#photoObservationsJSON'),host=q('#photoObservationsEditors');if(!store||!host)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fields={observed:'Constats visibles et photos concernées',checks:'Points à vérifier sur place',strengths:'Atouts visibles à valoriser'};
 let state={included:false,items:{}};
 function load(){try{const d=JSON.parse(store.value||'{}');state={included:d.included===true,items:{},reviewTitle:typeof d.reviewTitle==='string'?d.reviewTitle.slice(0,200):'',review:d.review&&typeof d.review==='object'?d.review:null};if(d.items&&typeof d.items==='object')for(const [k,v]of Object.entries(d.items)){if(!v||typeof v!=='object')continue;state.items[k]={label:String(v.label||k),...Object.fromEntries(Object.keys(fields).map(f=>[f,String(v[f]||'')]))};}}catch{state={included:false,items:{}};}}
 function groups(){let units=[];try{units=JSON.parse(q('#propertyUnitsJSON')?.value||'[]')}catch{}return [{key:'__general__',label:'Ensemble du bien / parties communes'},...units.filter(u=>u&&u.label).map(u=>({key:'unit:'+String(u.key||u.label),label:u.label}))];}
 function nonempty(item){return Object.keys(fields).some(f=>item[f]?.trim());}
 function persist(){store.value=JSON.stringify(state);store.dispatchEvent(new Event('input',{bubbles:true}));status();}
 function status(){const n=Object.values(state.items).filter(nonempty).length;q('#photoObservationsStatus').textContent=!n?'Aucune observation saisie.':state.included?'Synthèse incluse dans le dossier client. Les modifications sont reprises dans les prochains exports. Aucun prix modifié.':'Brouillon enregistré avec le dossier ; absent des documents client.';q('#includePhotoObservations').disabled=!n;q('#excludePhotoObservations').disabled=!state.included;}
 function render(){const list=groups();for(const [key,v]of Object.entries(state.items))if(nonempty(v)&&!list.some(u=>u.key===key))list.push({key,label:v.label+' — rattachement à vérifier'});host.innerHTML=list.map(u=>{const v=state.items[u.key]||{};return '<fieldset data-photo-unit="'+esc(u.key)+'"><legend>'+esc(u.label)+'</legend>'+Object.entries(fields).map(([f,label])=>'<label>'+label+'<textarea data-photo-observation="'+f+'" rows="3" placeholder="Facultatif — nommez les photos concernées">'+esc(v[f]||'')+'</textarea></label>').join('')+'</fieldset>';}).join('');status();renderDecisions();}
 host.addEventListener('input',e=>{const f=e.target.dataset.photoObservation;if(!fields[f])return;const k=e.target.closest('fieldset').dataset.photoUnit,u=groups().find(u=>u.key===k);state.items[k]={...state.items[k],label:u?.label||state.items[k]?.label||k,[f]:e.target.value};persist();});
 q('#includePhotoObservations').addEventListener('click',()=>{state.included=true;persist();});q('#excludePhotoObservations').addEventListener('click',()=>{state.included=false;persist();});
 window.estimiaPhotoObservationSections=()=>!state.included?[]:Object.values(state.items).filter(nonempty).map(v=>({title:'Observations photo — '+v.label,rows:[...Object.entries(fields).filter(([f])=>v[f]?.trim()).map(([f,label])=>[label,v[f].trim()]),['Portée','Constats visuels retenus par le conseiller, non techniques ; ne remplacent ni diagnostic ni expertise.']]}));

 const importStatus=q('#photoReviewImportStatus'),preview=q('#photoReviewPreview');let pending=null,importToken=0;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const identity=()=>['owner','address','notes','propertyUnitsJSON'].map(id=>q('#'+id)?.value||'').join('\u001f');
 function validateReview(raw){const str=(s,max)=>{if(typeof s!=='string'||s.length>max)throw Error('Texte absent ou trop long dans l’analyse.');return s.trim();};if(!raw||raw.format!=='ESTIMIA_PHOTO_REVIEW'||raw.version!==1||!Array.isArray(raw.photos)||!Array.isArray(raw.items)||raw.photos.length>60||!raw.photos.length||raw.items.length>12||!raw.items.length)throw Error('Format d’analyse non reconnu.');const seen=new Set();const photos=raw.photos.map(p=>{if(!p||typeof p!=='object')throw Error('Photo invalide.');const file=str(p.file,200);if(!file||/[\\/]/.test(file)||seen.has(norm(file)))throw Error('Nom de photo absent, ambigu ou dupliqué.');seen.add(norm(file));return {file,caption:str(p.caption,500),observed:str(p.observed||'',5000),check:str(p.check||'',5000)};});const items=raw.items.map(v=>({label:str(v.label,200),...Object.fromEntries(Object.keys(fields).map(f=>[f,str(v[f]||'',20000)]))}));if(items.some(v=>!v.label))throw Error('Logement sans nom.');const cover=str(raw.cover||'',200);if(cover&&!photos.some(p=>p.file===cover))throw Error('Couverture absente de l’analyse.');const ids=new Set(),conditionUnits=new Set();const findings=(raw.findings||[]).map(f=>{if(!f||typeof f!=='object')throw Error('Constat invalide.');const id=str(f.id,100),unit=str(f.unit,200),kind=str(f.kind,30);if(!id||ids.has(id)||!['strength','works','check','condition'].includes(kind))throw Error('Constat absent, dupliqué ou inconnu.');ids.add(id);if(!Array.isArray(f.evidence)||!f.evidence.length||f.evidence.some(file=>!photos.some(p=>p.file===file)))throw Error('Photo justificative absente.');const condition=kind==='condition'?str(f.condition,100):'';if(kind==='condition'){if(conditionUnits.has(norm(unit)))throw Error('Plusieurs états proposés pour le même logement.');conditionUnits.add(norm(unit));}if(kind==='condition'&&!['Bon état','À rafraîchir','À rénover','À réhabiliter'].includes(condition))throw Error('État proposé invalide.');return {id,unit,kind,condition,text:str(f.text,5000),impact:str(f.impact||'',2000),evidence:f.evidence};});if(findings.length>40)throw Error('Trop de constats.');return {title:str(raw.title,200),method:str(raw.method||'',2000),photos,items,cover,findings};}
 window.estimiaValidatePhotoReview=validateReview;
 function cancelPreview(){pending=null;preview.replaceChildren();preview.hidden=true;}
 function showPreview(review){pending={review,identity:identity()};preview.replaceChildren();preview.hidden=false;const heading=document.createElement('h4');heading.textContent=review.title;preview.append(heading);const matches=window.estimiaPhotoReviewMatches(review.photos),n=matches.filter(x=>x.count===1).length;const info=document.createElement('p');info.textContent=review.items.length+' synthèse(s), '+review.photos.length+' photo(s) décrite(s), '+n+' correspondance(s) de fichier unique(s) avec ce dossier. Les autres images ne seront pas renommées. Aucun état, prix ou total de surface ne sera modifié.';preview.append(info);const method=document.createElement('p');method.textContent=review.method;preview.append(method);
 for(const item of review.items){const detail=document.createElement('details'),sum=document.createElement('summary');sum.textContent=item.label;detail.append(sum);for(const [key,label]of Object.entries(fields)){if(!item[key])continue;const p=document.createElement('p');p.style.whiteSpace='pre-wrap';p.textContent=label+' : '+item[key];detail.append(p);}preview.append(detail);}
 const photoDetails=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Voir les légendes et constats des '+review.photos.length+' photos';photoDetails.append(summary);for(const photo of review.photos){const p=document.createElement('p');p.textContent=photo.file+' — '+photo.caption+'\n'+photo.observed+'\nÀ vérifier : '+photo.check;p.style.whiteSpace='pre-wrap';photoDetails.append(p);}preview.append(photoDetails);
 for(const [id,label,checked]of [['reviewApplyCaptions','Appliquer les légendes aux photos reconnues',true],['reviewReplaceCaptions','Remplacer aussi mes légendes personnalisées',false],['reviewApplyCover','Utiliser la photo de couverture proposée',false]]){const l=document.createElement('label');l.className='photoReviewOption';const input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=checked;l.append(input,document.createTextNode(' '+label));preview.append(l);}
 const apply=document.createElement('button');apply.type='button';apply.className='miniBtn';apply.textContent='C’est le bon dossier : ajouter l’analyse en brouillon';apply.addEventListener('click',()=>{if(!pending||pending.identity!==identity()){cancelPreview();importStatus.textContent='Le dossier a changé : réimportez l’analyse dans le dossier concerné.';return;}const r=pending.review;if(state.review?.content?.title&&state.review.content.title!==r.title&&Object.values(state.review.decisions||{}).some(v=>v.answer==='yes')){importStatus.textContent='Une autre analyse comporte des constats acceptés. Retirez ces décisions avant de remplacer l’analyse ; votre dossier est conservé.';return;}if(state.review?.content?.title!==r.title)state.review={content:r,decisions:{}};else{const previous=state.review;state.review={content:r,workStates:previous.workStates||{},decisions:Object.fromEntries(Object.entries(previous.decisions||{}).filter(([id])=>r.findings.some(f=>f.id===id&&JSON.stringify(f)===JSON.stringify(previous.content.findings?.find(x=>x.id===id))))) };}if(!r.findings.length)for(const item of r.items){const group=groups().find(g=>norm(g.label)===norm(item.label))||{key:'imported:'+norm(item.label),label:item.label};const old=state.items[group.key]||{label:group.label};state.items[group.key]={...old};for(const key of Object.keys(fields)){const next=item[key].trim();if(next&&!old[key]?.includes(next))state.items[group.key][key]=[old[key]?.trim(),next].filter(Boolean).join('\n\n');}state.items[group.key].label=group.label;}state.included=false;state.reviewTitle=r.title;const result=window.estimiaApplyPhotoReviewCaptions(r,{captions:q('#reviewApplyCaptions').checked,replace:q('#reviewReplaceCaptions').checked,cover:q('#reviewApplyCover').checked});persist();render();cancelPreview();importStatus.textContent='Analyse ajoutée en brouillon : '+result.changed+' légende(s) appliquée(s), '+result.custom+' légende(s) personnalisée(s) conservée(s), '+result.missing+' photo(s) absente(s), '+result.ambiguous+' correspondance(s) ambiguë(s). '+(result.covered?'Couverture choisie. ':'')+(r.findings.length?'Répondez Oui, Non ou À vérifier aux constats ci-dessous. Seuls les constats acceptés pourront être repris. ':'Relisez la synthèse. ')+ 'Utilisez Reprendre cette synthèse dans le dossier client pour l’exporter.';});const cancel=document.createElement('button');cancel.type='button';cancel.className='miniBtn secondary';cancel.textContent='Annuler cet import';cancel.addEventListener('click',()=>{cancelPreview();importStatus.textContent='Import annulé ; dossier inchangé.';});preview.append(apply,cancel);
 }

 function actualUnit(label){let list=[];try{list=JSON.parse(q('#propertyUnitsJSON').value||'[]')}catch{}if(list.length<2)list=[{key:'principal',label:q('#type').value||'Bien principal'}];return list.find(u=>norm(u.label)===norm(label));}
 function eraseAdded(record){for(const entry of record?.added||[]){if(entry.target==='summary'){const item=state.items[entry.key];if(item&&item[entry.field])item[entry.field]=item[entry.field].split('\n\n').filter(p=>p!==entry.text).join('\n\n');}else{const el=q('#'+entry.target);if(el){el.value=el.value.split('\n').filter(line=>line!==entry.text).join('\n');el.dispatchEvent(new Event('input',{bubbles:true}));}}}if(record?.condition){const saved=record.condition;const restored=window.estimiaRestorePhotoCondition(saved.key,saved.previous,saved.value,saved);if(!restored)importStatus.textContent='L’état a été modifié depuis votre accord photo : votre réglage actuel est conservé.';}}
 function decide(finding,answer){state.review.decisions||={};const previous=state.review.decisions[finding.id];if(previous?.answer===answer)return;const u=finding.kind==='condition'?actualUnit(finding.unit):null;if(answer==='yes'&&finding.kind==='condition'&&!u){importStatus.textContent='Le logement '+finding.unit+' n’est pas identifié dans la fiche. Complétez la fiche avant d’appliquer cette proposition d’état ; les autres constats restent utilisables.';return;}eraseAdded(previous);const record={answer,date:new Date().toISOString(),added:[]};
 if(answer==='yes'){const group=groups().find(g=>norm(g.label)===norm(finding.unit))||{key:'imported:'+norm(finding.unit),label:finding.unit};state.items[group.key]||={label:group.label};const field=finding.kind==='strength'?'strengths':finding.kind==='check'?'checks':'observed',text=finding.text+' (Photos : '+finding.evidence.map(f=>f.replace(/\.[^.]+$/,'')).join(', ')+'.)';const item=state.items[group.key];if(!item[field]?.includes(text)){item[field]=[item[field],text].filter(Boolean).join('\n\n');record.added.push({target:'summary',key:group.key,field,text});}
 const target={strength:'estStrongPoints',works:'estPlannedWorks',check:'estLimitations'}[finding.kind];if(target){const el=q('#'+target),line=finding.unit+' — '+finding.text;if(el&&!el.value.includes(line)){el.value=[el.value.trim(),line].filter(Boolean).join('\n');record.added.push({target,text:line});el.dispatchEvent(new Event('input',{bubbles:true}));}}
 if(u){let data={};try{data=JSON.parse(q('#essentialDataJSON').value||'{}')}catch{}const st=data.units?.[u.key]||{},old={};for(const key of ['answers','manual','source'])if(st[key]?.condition!==undefined)old[key]=JSON.parse(JSON.stringify(st[key].condition));record.condition={key:u.key,previous:old,value:finding.condition,qualityBefore:{mode:q('#estQualityMode').value,rate:q('#estQualityRate').value}};window.estimiaChooseUnitCondition(u.key,finding.condition,{photo:true,preserveBudget:true});record.condition.qualityAfter={mode:q('#estQualityMode').value,rate:q('#estQualityRate').value};}}
 state.review.decisions[finding.id]=record;if(finding.kind==='works'){const unit=actualUnit(finding.unit);if(unit){state.review.workStates||={};const active=state.review.content.findings.some(f=>f.kind==='works'&&norm(f.unit)===norm(finding.unit)&&state.review.decisions[f.id]?.answer==='yes');if(active&&!state.review.workStates[unit.key])state.review.workStates[unit.key]=window.estimiaPhotoWorks(unit.key);else if(!active&&state.review.workStates[unit.key]){window.estimiaPhotoWorks(unit.key,state.review.workStates[unit.key]);delete state.review.workStates[unit.key];}}}persist();render();}
 function renderDecisions(){const host=q('#photoReviewDecisions');if(!host)return;host.replaceChildren();let content;try{if(!state.review?.content)return;content=validateReview({...state.review.content,format:'ESTIMIA_PHOTO_REVIEW',version:1});}catch{return;}if(!content.findings.length)return;const heading=document.createElement('h4');heading.textContent='Constats photo — votre décision';host.append(heading);const note=document.createElement('p');note.textContent='Oui : reprend le constat dans la fiche. Non et À vérifier : aucun effet sur l’état ou le calcul. Seule une proposition d’état acceptée peut modifier la correction d’état ; les autres constats n’ajoutent aucun coût. Vous pouvez laisser des constats sans réponse.';host.append(note);
 for(const finding of content.findings){const record=state.review.decisions?.[finding.id],card=document.createElement('article');card.className='photoFinding';card.dataset.decision=record?.answer||'pending';const title=document.createElement('strong');title.textContent=finding.unit+' — '+(finding.kind==='condition'?'Proposition d’état':'Constat visible');const text=document.createElement('p');text.textContent=finding.text;const impact=document.createElement('p');impact.className='small';impact.textContent=finding.impact;const evidence=document.createElement('p');evidence.className='small';evidence.textContent='Photos : '+finding.evidence.join(', ');card.append(title,text,impact,evidence);const images=window.estimiaPhotoReviewEvidence(finding.evidence);if(images.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Voir les photos de ce constat';details.append(summary);const grid=document.createElement('div');grid.className='photoFindingEvidence';for(const photo of images){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=photo.url;img.alt=photo.label;img.loading='lazy';caption.textContent=photo.label;figure.append(img,caption);grid.append(figure);}details.append(grid);card.append(details);}const buttons=document.createElement('div');buttons.className='photoFindingChoices';for(const [answer,label]of [['yes','Oui'],['no','Non'],['check','À vérifier']]){const b=document.createElement('button');b.type='button';b.className='miniBtn';b.textContent=label;b.dataset.findingId=finding.id;b.dataset.answer=answer;b.setAttribute('aria-pressed',String(record?.answer===answer));b.addEventListener('click',()=>decide(finding,answer));buttons.append(b);}card.append(buttons);host.append(card);}
 }
 q('#photoReviewFile').addEventListener('change',async e=>{const file=e.target.files[0],token=++importToken,start=identity();e.target.value='';if(!file)return;try{if(file.size>500000)throw Error('Fichier trop volumineux (500 Ko maximum).');const review=validateReview(JSON.parse(await file.text()));if(token!==importToken||start!==identity())return;showPreview(review);importStatus.textContent='Vérifiez l’analyse et le dossier avant application.';}catch(err){if(token!==importToken)return;cancelPreview();importStatus.textContent='Import impossible, dossier inchangé : '+err.message;}});
 document.addEventListener('estimia:case-ready',()=>{importToken++;cancelPreview();importStatus.textContent='';});
 document.addEventListener('estimia:case-ready',()=>{load();render();});document.addEventListener('estimia:surfaces-restored',render);q('#analyse')?.addEventListener('click',()=>setTimeout(()=>Promise.resolve(window.estimiaFicheReady).then(render),0));
 load();render();
})();
