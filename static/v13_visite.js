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
 const tidy=v=>clean(v).replace(/\s+(?:section|parcelle|cadastre|cadastrale|code postal)\b.*$/iu,'').replace(/[,:;.\s]+$/,'');
 let m=t.match(/\b(\d{5})\s+([^,.;!?]+)/iu);
 if(m)return {name:tidy(m[2]),postcode:m[1]};
 m=t.match(/(?:code postal|cp)\s*(\d{5})[^.!?]{0,35}?(?:commune(?: de)?|ville(?: de)?|à|sur)\s+([^,.;!?]+)/iu);
 if(m)return {name:tidy(m[2]),postcode:m[1]};
 m=t.match(/(?:commune de|sur la commune de|ville de)\s+([^,.;!?]+)/iu);
 if(m)return {name:tidy(m[1]),postcode:''};
 m=t.match(/(?:à|sur)\s+([^,.;!?]+?)(?:\s+(?:section|parcelle|cadastre)\b|[,;.!?])/iu);
 return m?{name:tidy(m[1]),postcode:''}:null;
}
function cad(t){
 let section='',parcel='';
 let m=t.match(/\bsection\s+([a-z]{1,3})\b/i);
 if(m)section=m[1].toUpperCase();
 m=t.match(/\bparcelle(?:\s+(?:num[ée]ro|n°))?\s*(?:n°\s*)?(\d{1,4})\b/i);
 if(m)parcel=m[1];
 // Variante « BH 60 » après une mention cadastrale explicite.
 if((!section||!parcel)){
  m=t.match(/(?:cadastre|cadastrale?|r[ée]f[ée]rence cadastrale)[^.!?]{0,100}?\bsection\s+([a-z]{1,3})\b[^0-9]{0,40}(\d{1,4})\b/i);
  if(m){section=section||m[1].toUpperCase();parcel=parcel||m[2]}
 }
 return {section,parcel};
}
function address(t){
 let m=t.match(/(?:bien\s+(?:est\s+)?situ[ée]\s+[aà]|adresse(?:\s+du\s+bien)?\s*(?:est|:)?|nous\s+sommes\s+(?:au|à)|maison\s+situ[ée]e?\s+[aà]|appartement\s+(?:situ[ée]\s+)?(?:au|à))\s+(.+?)\s+(\d{5})\s+([^,.;!?]+?)(?=\s+(?:section|parcelle|cadastre)\b|[,.;!?]|$)/iu);
 if(!m)return null;
 return {street:clean(m[1]).replace(/^(?:au|à)\s+/i,'').replace(/[,:;.\s]+$/,''),postcode:m[2],city:clean(m[3]).replace(/\s+(?:section|parcelle|cadastre).*$/iu,'').replace(/[,:;.\s]+$/,'')};
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
async function normalizeCommune(q,postcode=''){
 if(!q)return null;
 const query=[postcode,q].filter(Boolean).join(' ').trim();
 try{
  const r=await fetch('/api/commune?q='+encodeURIComponent(query)),j=await r.json();
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
function renderCadPlan(j){
 const box=ensureCadPlanBox();box.innerHTML='';if(!j||!j.found||!j.geometry)return;
 const title=document.createElement('div');title.innerHTML='<b>Plan cadastral — '+(j.commune||'')+' — section '+(j.section||'')+' — parcelle '+parseInt(j.numero,10)+'</b>';
 const img=document.createElement('img');img.alt='Plan de la parcelle cadastrale';img.style.cssText='display:block;width:100%;max-width:720px;max-height:460px;object-fit:contain;margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#fff';
 img.src='/api/cadastre/map.png?commune='+encodeURIComponent(j.code_insee||j.commune||'')+'&section='+encodeURIComponent(j.section||'')+'&numero='+encodeURIComponent(parseInt(j.numero,10))+'&v=13.8';
 img.dataset.cadMap='1';
 const link=document.createElement('a');link.href=img.src;link.target='_blank';link.rel='noopener';link.textContent='Ouvrir le plan cadastral';link.style.cssText='display:inline-block;margin-top:8px';
 box.append(title,img,link);
}
async function parcelSearch(){
 const field=$('#cadCommune'),sec=$('#cadSection').value.trim().toUpperCase(),par=$('#cadParcel').value.trim();
 let com=field.value.trim();
 if(!com||!sec||!par){$('#cadStatus').textContent='Commune, section et parcelle nécessaires.';return}
 $('#cadStatus').textContent='Recherche de la commune puis de la parcelle…';
 const oldPlan=document.getElementById('cadPlanBox');if(oldPlan)oldPlan.innerHTML='';
 try{
  let insee=field.dataset.insee||'';
  if(!insee){
   const n=await normalizeCommune(com,field.dataset.postcode||'');
   if(n){insee=n.code||'';com=n.name||com}
  }
  const r=await fetch(`/api/cadastre?commune=${encodeURIComponent(insee||com)}&section=${encodeURIComponent(sec)}&numero=${encodeURIComponent(par)}`),j=await r.json();
  if(!r.ok)throw new Error(j.detail||'Erreur');
  if(j.found){
   field.value=j.commune||com; field.dataset.insee=j.code_insee||insee;
   $('#cadSection').value=j.section||sec; $('#cadParcel').value=String(parseInt(j.numero,10));
   $('#cadStatus').textContent=`✓ Parcelle trouvée : ${j.commune||com} — section ${j.section} — parcelle ${parseInt(j.numero,10)}`;
   if(j.commune){$('#cadCommune').value=j.commune;$('#cadCommune').dataset.insee=j.code_insee||'';}
   renderCadPlan(j);
  }else $('#cadStatus').textContent=`Parcelle non trouvée pour ${j.commune||com} — section ${j.section||sec} — parcelle ${parseInt(j.numero||par,10)}.`;
 }catch(e){$('#cadStatus').textContent='Recherche impossible : '+e.message}
}
async function render(){
 const raw=$('#notes').value||'',corr=$('#correction').value||'',t=clean(raw+' '+corr);
 const o=owner(t);if(o&&!$('#owner').value)$('#owner').value=o;
 const a=address(t);if(a){if(!$('#address').value)$('#address').value=a.street;if(!$('#cadCommune').value)$('#cadCommune').value=a.city;$('#cadCommune').dataset.postcode=a.postcode||'';}
 const c=cad(t);if(c.section&&!$('#cadSection').value)$('#cadSection').value=c.section;if(c.parcel&&!$('#cadParcel').value)$('#cadParcel').value=c.parcel;
 const cm=commune(t);
 if(cm&&!$('#cadCommune').value){
  $('#cadCommune').value=cm.name;
  $('#cadCommune').dataset.postcode=cm.postcode||'';
  await normalizeCommune(cm.name,cm.postcode);
 }
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
 const c=$('#cadCommune')?.value?.trim(),s=$('#cadSection')?.value?.trim(),p=$('#cadParcel')?.value?.trim();
 return c&&s&&p?'/api/cadastre/map.png?commune='+encodeURIComponent(c)+'&section='+encodeURIComponent(s)+'&numero='+encodeURIComponent(p)+'&v=13.8':'';
}
async function downloadWord(){
 const payload={
  owner:$('#owner')?.value||'',phone:$('#ownerPhone')?.value||'',address:$('#address')?.value||'',
  commune:$('#cadCommune')?.value||'',section:$('#cadSection')?.value||'',parcel:$('#cadParcel')?.value||'',
  property_type:$('#type')?.value||'',surface:$('#surface')?.value||'',facts:$('#facts')?.innerText||''
 };
 try{
  const r=await fetch('/api/word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.detail||'Export impossible')}
  const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;
  a.download='Fiche_visite_'+((payload.owner||payload.address||'bien').replace(/[^\p{L}\p{N}-]+/gu,'_'))+'.docx';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
 }catch(e){alert('Export Word impossible : '+e.message)}
}
function printableHTML(){
 const title=ficheTitle(), facts=$('#facts')?.innerHTML||'', mapUrl=cadMapURL();
 const mapBlock=mapUrl?`<section class="cadPrint"><h2>Plan cadastral</h2><img src="${mapUrl}" alt="Plan cadastral"><div>Section ${E($('#cadSection')?.value||'')} — Parcelle ${E($('#cadParcel')?.value||'')}</div></section>`:'';
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
 <style>body{font-family:Arial,sans-serif;color:#17212b;margin:28px}h1{font-size:23px;margin-bottom:5px}.date{color:#667;font-size:12px;margin-bottom:18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px}.m{border:1px solid #ccd5db;border-radius:8px;padding:8px}.m span,.m b{display:block}.m span{font-size:11px;color:#667;margin-bottom:3px}.proGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.proGroup,.surfaceHero{border:1px solid #ccd5db;border-radius:10px;padding:10px;margin:0 0 10px;break-inside:avoid}.proGroup h3,.surfaceHero h3{margin:0 0 8px}.proRow,.surfaceRow,.surfaceTotal,.grandTotal{display:flex;justify-content:space-between;gap:15px;padding:5px 0;border-bottom:1px solid #eee}.grandTotal{font-weight:bold;font-size:16px}.rawNotes{margin-top:14px}.cadPrint{break-inside:avoid;margin:15px 0}.cadPrint img{width:100%;max-width:760px;border:1px solid #ccd5db;border-radius:8px}.dossierHead,.calculatedTop{display:none}@media print{body{margin:10mm}.proGroup,.surfaceHero{break-inside:avoid}}</style></head><body>
 <h1>FICHE DE VISITE IMMOBILIÈRE</h1><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div><div class="meta">${head}</div>${mapBlock}${facts}</body></html>`;
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
 $('#checkAddress')?.addEventListener('click',verifyAddressV137);
 $('#printVisit')?.addEventListener('click',printVisit);
 $('#downloadVisit')?.addEventListener('click',downloadVisit);
 $('#downloadWord')?.addEventListener('click',downloadWord);
});
})();
