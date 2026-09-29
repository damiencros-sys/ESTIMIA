// ESTIM'IA V11 — couche de structuration déterministe.
// Le moteur micro d'origine n'est pas touché.
(function(){
const $=s=>document.querySelector(s), E=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=s=>String(s||'').replace(/[’]/g,"'").replace(/\b(?:euh|heu|hum|hmm)\b[,. ]*/gi,' ').replace(/\s+/g,' ').trim();
const low=s=>clean(s).toLowerCase();
const fnum=s=>parseFloat(String(s).replace(',','.')), fmt=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²';
const uniq=a=>[...new Set(a.filter(Boolean))];
function card(title,icon,rows){
 rows=rows.filter(r=>r[1]!==''&&r[1]!=null&&(!(Array.isArray(r[1]))||r[1].length));
 if(!rows.length)return '';
 return `<section class="proGroup"><h3>${icon} ${title}</h3>${rows.map(([k,v])=>`<div class="proRow"><span>${E(k)}</span><strong>${E(Array.isArray(v)?v.join(' · '):v)}</strong></div>`).join('')}</section>`;
}
function snippets(t,rx,max=8){
 const a=[]; for(const m of t.matchAll(rx)){let x=clean(m[0]);if(x&&!a.includes(x))a.push(x);if(a.length>=max)break} return a;
}
function getOwner(t){
 let m=t.match(/(?:propri[ée]taire(?:s)?|chez)\s+(?:(monsieur et madame|monsieur|madame|m\.|mme)\s+)?([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3})/iu);
 return m?[(m[1]||''),m[2]].filter(Boolean).join(' ').trim():'';
}
function getAddress(t){
 let m=t.match(/(?:adresse(?: du bien)?(?: est| :)?|situ[ée]e? (?:au|à)|nous sommes au|bien (?:au|à))\s+(\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|boulevard|chemin|impasse|place|route|all[ée]e|lotissement|quai|passage|mont[ée]e|hameau|lieu[- ]dit)\s+[^,.!?]{2,100})/iu);
 return m?clean(m[1]):'';
}
function parseCad(t){
 const m=t.match(/(?:cadastre|cadastrale?|parcelle)\s*(?:section)?\s*([a-z]{1,3})\s*(?:parcelle|num[ée]ro|n°)?\s*(\d{1,4})/i);
 return m?{section:m[1].toUpperCase(),parcel:m[2]}:{};
}
function typeOf(t){return (t.match(/\b(maison de village|maison|villa|appartement|studio|immeuble|terrain|local commercial)\b/i)||[])[1]||''}
function construction(t){
 const rows=[];
 const yr=(t.match(/(?:construite?|construction|ann[ée]e)[^0-9]{0,25}((?:18|19|20)\d{2})/)||[])[1]; if(yr)rows.push(['Année de construction',yr]);
 let lv='';
 if(/(?:deux|2)\s+niveaux|rez[- ]de[- ]chauss[ée]e[^.!?]{0,100}(?:1er|premier) [ée]tage/i.test(t))lv='2 niveaux : rez-de-chaussée + 1er étage';
 else if(/(?:trois|3)\s+niveaux/i.test(t))lv='3 niveaux';
 if(lv)rows.push(['Organisation',lv]);
 let mit='';
 if(/non mitoyenne?|sans mitoyennet[ée]/i.test(t))mit='Non mitoyenne';
 else if(/mitoyenne?[^.!?]{0,25}(?:deux|2|des deux) c[oô]t[ée]s/i.test(t))mit='Mitoyenne des deux côtés';
 else if(/\bmitoyenne?\b/i.test(t))mit='Mitoyenneté mentionnée';
 if(mit)rows.push(['Mitoyenneté',mit]);
 return rows;
}
function levelMarkers(text){
 const rx=/(sous[- ]sol|rez[- ]de[- ]jardin|rez[- ]de[- ]chauss[ée]e|\brdc\b|(?:retour |on passe |passage |mont[ée]e )?(?:au |à l[' ]|le )?(?:1er|premier|2e|2ème|deuxi[eè]me|3e|3ème|troisi[eè]me) [ée]tage|combles?)/ig;
 const a=[];
 for(const m of text.matchAll(rx)){
  const x=low(m[0]); let n='';
  if(/sous-sol/.test(x))n='Sous-sol'; else if(/rez-de-jardin/.test(x))n='Rez-de-jardin';
  else if(/rez-de-chaussée|\brdc\b/.test(x))n='Rez-de-chaussée';
  else if(/1er|premier/.test(x))n='1er étage'; else if(/2e|2ème|deuxième/.test(x))n='2e étage'; else if(/3e|3ème|troisième/.test(x))n='3e étage'; else if(/comble/.test(x))n='Combles';
  if(n)a.push({i:m.index,name:n});
 }
 return a;
}
function surfaces(text){
 const marks=levelMarkers(text), out=[];
 const rx=/\b(s[ée]jour|salon|salle à manger|cuisine|chambre(?:\s*(?:\d+|un|une|deux|trois|parentale))?|bureau|salle d[' ]eau|salle de bains?|wc|toilettes?|d[ée]gagement|couloir|entr[ée]e|hall|cellier|buanderie|dressing|mezzanine|garage|cave|grenier|atelier|d[ée]pendance|local|abri|carport|terrasse|balcon|loggia)\s*(?:fait|mesure|de|d[' ]une surface de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m[eè]tres? carr[ée]s?)/ig;
 for(const m of text.matchAll(rx)){
  let lvl='Niveau non précisé'; for(const mk of marks){if(mk.i<=m.index)lvl=mk.name;else break}
  const name=clean(m[1]), val=fnum(m[2]);
  const cat=/garage|cave|grenier|atelier|dépendance|local|abri|carport/i.test(name)?'Annexe':/terrasse|balcon|loggia/i.test(name)?'Extérieur':'Intérieur';
  out.push({lvl,name,val,cat});
 }
 return out;
}
function surfaceCard(rows,declared){
 if(!rows.length)return '';
 let s='<section class="surfaceHero"><h3>📐 SURFACES PAR NIVEAU</h3>';
 const inside=rows.filter(x=>x.cat==='Intérieur'), levels=uniq(inside.map(x=>x.lvl));
 for(const lv of levels){
  const rr=inside.filter(x=>x.lvl===lv), tot=rr.reduce((a,x)=>a+x.val,0);
  s+=`<div class="levelBlock"><h4>🪜 ${E(lv)}</h4>${rr.map(x=>`<div class="surfaceRow"><span>${E(x.name)}</span><b>${fmt(x.val)}</b></div>`).join('')}<div class="surfaceTotal"><span>Total ${E(lv)}</span><strong>${fmt(tot)}</strong></div></div>`;
 }
 const total=inside.reduce((a,x)=>a+x.val,0);
 if(inside.length)s+=`<div class="grandTotal"><span>TOTAL INTÉRIEUR RENSEIGNÉ</span><strong>${fmt(total)}</strong></div>`;
 if(declared&&inside.length){const d=fnum(declared);s+=`<div class="surfaceDiff"><span>Surface annoncée : ${fmt(d)}</span> · <b>écart ${fmt(total-d)}</b></div>`}
 const ann=rows.filter(x=>x.cat==='Annexe'), ext=rows.filter(x=>x.cat==='Extérieur');
 if(ann.length)s+=`<div class="otherSurface"><h4>🏚️ Annexes</h4>${ann.map(x=>`<div class="surfaceRow"><span>${E(x.name)}${x.lvl!=='Niveau non précisé'?' — '+E(x.lvl):''}</span><b>${fmt(x.val)}</b></div>`).join('')}</div>`;
 if(ext.length)s+=`<div class="otherSurface"><h4>🌳 Extérieurs</h4>${ext.map(x=>`<div class="surfaceRow"><span>${E(x.name)}${x.lvl!=='Niveau non précisé'?' — '+E(x.lvl):''}</span><b>${fmt(x.val)}</b></div>`).join('')}</div>`;
 return s+'</section>';
}
function counts(t){
 const count=(rx)=>{const m=t.match(rx);return m?m[1]:''};
 let showers=count(/\b(\d+)\s+douches?\b/i), wc=count(/\b(\d+)\s+wc\b/i), baths=count(/\b(\d+)\s+(?:salles? de bains?|baignoires?)\b/i);
 if(!showers){const n=(t.match(/\bdouche\b/gi)||[]).length;if(n)showers=String(n)}
 if(!wc){const n=(t.match(/\bwc\b/gi)||[]).length;if(n)wc=String(n)}
 return [['Salle(s) d’eau',count(/\b(\d+)\s+salles? d[' ]eau\b/i)],['Douche(s)',showers],['Salle(s) de bains / baignoire',baths],['WC',wc],
 ['Équipements',uniq([/douche à l[' ]italienne/i.test(t)?"Douche à l'italienne":'',/double vasque/i.test(t)?'Double vasque':'',/s[eè]che[- ]serviettes/i.test(t)?'Sèche-serviettes':'',/\bvmc\b/i.test(t)?'VMC':'']).join(' · ')]];
}
function technical(t){
 let heat=[];
 if(/chaudi[eè]re[^.!?]{0,50}condensation[^.!?]{0,30}gaz|chaudi[eè]re[^.!?]{0,30}gaz[^.!?]{0,30}condensation/i.test(t))heat.push('Chaudière gaz à condensation');
 else if(/chaudi[eè]re[^.!?]{0,30}gaz/i.test(t))heat.push('Chaudière gaz');
 if(/po[eê]le[^.!?]{0,20}bois/i.test(t))heat.push('Poêle à bois');
 if(/po[eê]le[^.!?]{0,20}granul/i.test(t))heat.push('Poêle à granulés');
 if(/radiateurs?[^.!?]{0,25}[ée]lectriques?/i.test(t))heat.push('Radiateurs électriques');
 let ecs='';
 if(/(?:eau chaude|production d[' ]eau chaude)[^.!?]{0,80}chaudi[eè]re/i.test(t))ecs=/condensation[^.!?]{0,30}gaz|gaz[^.!?]{0,30}condensation/i.test(t)?'Chaudière gaz à condensation':'Chaudière';
 else if(/ballon thermodynamique/i.test(t))ecs='Ballon thermodynamique';
 else if(/ballon[^.!?]{0,30}[ée]lectrique|cumulus/i.test(t))ecs='Ballon électrique';
 return [['Mode(s) de chauffage',heat.join(' + ')],["Production d'eau chaude",ecs]];
}
function networks(t){
 const rows=[];
 let linky=''; const lm=t.match(/[^.!?]{0,70}\blink[y]?\b[^.!?]{0,80}/i); if(lm)linky='Compteur Linky'+(lm[0].match(/(?:dans|situ[ée]|plac[ée]|install[ée])[^,.!?]{0,45}/i)?' — '+clean(lm[0]):'');
 if(linky)rows.push(['Électricité',linky]);
 const gm=t.match(/[^.!?]{0,60}compteur[^.!?]{0,30}gaz[^.!?]{0,70}/i); if(gm)rows.push(['Gaz',clean(gm[0])]);
 const wm=t.match(/[^.!?]{0,60}(?:compteur[^.!?]{0,30}eau|eau[^.!?]{0,30}compteur)[^.!?]{0,70}/i); if(wm)rows.push(['Eau',clean(wm[0])]);
 if(/tout[- ]à[- ]l[' ]égout|tout à l[' ]égout/i.test(t))rows.push(['Assainissement',"Connecté au tout-à-l'égout"]);
 if(/\bfibre\b/i.test(t)){
  const neg=/fibre[^.!?]{0,40}(?:pas connect[ée]e|non connect[ée]e|pas raccord[ée]e|non raccord[ée]e)|(?:pas|non)[^.!?]{0,30}(?:connect[ée]|raccord[ée])[^.!?]{0,30}fibre/i.test(t);
  rows.push(['Fibre',neg?'Présente / disponible mais NON connectée au bien':'Fibre mentionnée']);
 }
 return rows;
}
function disorders(t){
 const negFiss=/pas de fissures? apparentes?|aucune fissure apparente|sans fissure apparente/i.test(t);
 const rows=[]; if(negFiss)rows.push(['Fissures','Aucune fissure apparente signalée']);
 const ss=snippets(t,/(?:[^.!?]{0,75})(?:retrait de cr[eé]pi|microfissure|fissure|l[ée]zarde|humidit[ée]|aur[ée]ole|moisissure|salp[eê]tre|infiltration)(?:[^.!?]{0,100})/gi,10)
   .filter(x=>!(negFiss&&/\bfissure\b/i.test(x)&&!/retrait de cr[eé]pi|microfissure/i.test(x)));
 ss.forEach((x,i)=>rows.push(['Observation '+(i+1),x]));
 return rows;
}
function annexDetails(t){
 const rows=[];
 if(/garage[^.!?]{0,80}mezzanine|mezzanine[^.!?]{0,80}garage/i.test(t))rows.push(['Garage','Garage avec mezzanine']);
 const a=snippets(t,/(?:garage|cave|buanderie|cellier|atelier|d[ée]pendance)[^.!?]{0,100}/gi,8);
 a.forEach((x,i)=>rows.push(['Détail '+(i+1),x])); return rows;
}
async function verifyAddress(q){
 if(!q)return; try{
  const r=await fetch('/api/geocode?q='+encodeURIComponent(q)),j=await r.json();
  const b=$('#addressSuggestions'); if(!b)return;
  b.innerHTML=(j.results||[]).map((x,i)=>`<button type="button" class="suggestion" data-i="${i}"><b>${E(x.label)}</b><small>${E([x.postcode,x.city].filter(Boolean).join(' · '))}</small></button>`).join('');
  b.querySelectorAll('.suggestion').forEach(bt=>bt.onclick=()=>{const x=j.results[+bt.dataset.i];$('#address').value=x.label||q;if(x.citycode)$('#cadCommune').value=x.citycode;$('#addressStatus').textContent='✓ Adresse normalisée sélectionnée.';b.innerHTML=''});
 }catch(e){}
}
function render(){
 const raw=$('#notes').value||'', corr=$('#correction').value||'', t=clean(raw+' '+corr), tl=low(t);
 const owner=getOwner(t); if(owner&&!$('#owner').value.trim())$('#owner').value=owner;
 const addr=getAddress(t); if(addr&&!$('#address').value.trim()){ $('#address').value=addr; verifyAddress(addr); }
 const cad=parseCad(t); if(cad.section&&!$('#cadSection').value)$('#cadSection').value=cad.section;if(cad.parcel&&!$('#cadParcel').value)$('#cadParcel').value=cad.parcel;
 const type=typeOf(t); if(type&&!$('#type').value)$('#type').value=type;
 const sr=surfaces(t);
 let out='<div class="dossierHead">';
 if($('#owner').value)out+=`<div><span>👤 Propriétaire</span><strong>${E($('#owner').value)}</strong></div>`;
 if($('#address').value)out+=`<div><span>📍 Adresse du bien</span><strong>${E($('#address').value)}</strong></div>`;
 if(cad.section||cad.parcel)out+=`<div><span>🗺️ Cadastre dicté</span><strong>${E([cad.section&&'Section '+cad.section,cad.parcel&&'Parcelle '+cad.parcel].filter(Boolean).join(' · '))}</strong></div>`;
 out+='</div><div class="proGrid">';
 out+=card('Bien & construction','🏠',[['Type de bien',type],...construction(t)]);
 out+='</div>'+surfaceCard(sr,$('#surface').value);
 out+='<div class="proGrid">';
 out+=card('Sanitaires','🚿',counts(t));
 out+=card('Chauffage & eau chaude','🔥',technical(t));
 out+=card('Réseaux & compteurs','⚡',networks(t));
 out+=card('Annexes — détails','🏚️',annexDetails(t));
 out+=card('Désordres / état','⚠️',disorders(t));
 const men=uniq([/pvc blanc/i.test(t)?'PVC blanc':'',/double vitrage/i.test(t)?'Double vitrage':'',/triple vitrage/i.test(t)?'Triple vitrage':'',/aluminium|\balu\b/i.test(t)?'Aluminium':'']);
 const ferm=uniq([/volets? roulants?[^.!?]{0,30}[ée]lectriques?/i.test(t)?'Volets roulants électriques':'',/moustiquaires?/i.test(t)?'Moustiquaires':'']);
 out+=card('Menuiseries & fermetures','🪟',[['Menuiseries / vitrages',men],['Fermetures',ferm],['Correction dictée',corr?clean(corr):'']]);
 out+='</div>';
 out+=`<details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>${E(raw)}</div></details>`;
 $('#facts').innerHTML=out;
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#analyse')?.addEventListener('click',()=>setTimeout(render,80),false);
 $('#checkAddress')?.addEventListener('click',()=>verifyAddress($('#address').value.trim()));
});
})();