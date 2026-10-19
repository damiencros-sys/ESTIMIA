(function(){
const q=s=>document.querySelector(s);
const fmt=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=q('#launchEstimation');if(!btn)return;
let estimateTask=null;
function calculateEstimate(){
 if(estimateTask)return estimateTask;
 estimateTask=performEstimate().finally(()=>{estimateTask=null;});return estimateTask;
}
btn.addEventListener('click',calculateEstimate);
async function performEstimate(){
 if(window.estimiaFicheReady)await window.estimiaFicheReady;
 const commune=(q('#cadCommune')?.value||'').trim();
 const addr=(q('#address')?.value||'').trim();
 const typ=(q('#type')?.value||'').toLowerCase();
 const type_bien=(/appartement|studio/.test(typ))?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
 const surface=Number(q('#surfaceHab')?.value||0);
 const status=q('#estimationStatus'),result=q('#estimationResults');result.replaceChildren();result.dataset.dvfMedian='';result.dataset.dvfCount='';if(q('#validatedPrice'))q('#validatedPrice').value='';
 if(!type_bien||!Number.isFinite(surface)||surface<=0){status.textContent=!surface&&q('#surfaceHab')?.dataset.needsReview==='true'?'Une surface de pièce est à vérifier : corrigez la ligne signalée dans Surfaces calculées, ou renseignez une surface habitable globale confirmée, puis relancez le calcul. Aucun total partiel n’est utilisé.':'Renseignez le type maison/appartement et une surface habitable positive dans la fiche.';return false;}
 let code=(q('#cadCommune')?.dataset.insee||'').trim();
 if(!/^\d{5}$/.test(code))code=commune;
 if(!code && /lamalou/i.test(addr))code='34126';
 if(!code){status.textContent='Renseigne la commune dans le champ Cadastre (ex. Lamalou-les-Bains ou 34126).';return false;}
 // Le serveur accepte le nom et le résout en code INSEE avant toute requête DVF.
 if((code==='34240'||/lamalou/i.test(code)) && (/lamalou/i.test(addr)||/lamalou/i.test(commune)))code='34126';
 btn.disabled=true;status.textContent='Recherche des ventes réelles en cours…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);
 try{
  const u='/api/estimation/dvf?'+new URLSearchParams({commune:code,type_bien,surface});
  const resp=await fetch(u,{signal:controller.signal});const d=await resp.json();if(!resp.ok)throw Error(d.detail||'Erreur du service');
  if(d.status!=='indicatif'){
   status.textContent=(d.message||'Données insuffisantes')+(d.diagnostic?' (Diagnostic : '+d.diagnostic+')':'');return false;
  }
  result.dataset.dvfMedian=String(d.prix_m2_median||'');result.dataset.dvfCount=String(d.nombre||'');result.dataset.periodStart=d.periode_debut||'';result.dataset.periodEnd=d.periode_fin||'';
  if(q('#validatedPrice'))q('#validatedPrice').value='';if(q('#validatedReason'))q('#validatedReason').value='';if(q('#retainedEstimateText'))q('#retainedEstimateText').textContent='';
  status.textContent=`${d.nombre} ventes filtrées — valeur statistique indicative (sans ajustement qualitatif).`;
  const table=d.comparables.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.surface)} m²</td><td>${fmt(c.prix)}</td><td>${fmt(c.prix_m2)}/m²</td></tr>`).join('');
  result.innerHTML=`<div class="estimationValueMain"><div class="estimationValueLabel">Estimation du bien — valeur centrale</div><div class="estimationValueAmount">${fmt(d.centrale)}</div><div class="small">Valeur statistique indicative issue des ventes DVF retenues</div></div><div class="estimationRange"><div><strong>Fourchette basse</strong><div class="estimationRangeAmount">${fmt(d.basse)}</div></div><div><strong>Fourchette haute</strong><div class="estimationRangeAmount">${fmt(d.haute)}</div></div></div><p>${esc(d.avertissement)}</p><details><summary>Voir les ventes retenues</summary><div style="overflow:auto"><table><thead><tr><th>Date</th><th>Surface</th><th>Prix</th><th>Prix/m²</th></tr></thead><tbody>${table}</tbody></table></div></details><p><a href="${esc(d.source)}" target="_blank" rel="noopener">Source des transactions</a></p>`;
  return true;
 }catch(e){status.textContent=e.name==='AbortError'?'La recherche DVF dépasse le délai prévu. Réessayez ou utilisez l’import DVF manuel. Aucun prix n’est inventé.':'Impossible de consulter les transactions : '+e.message+'. Aucun montant calculé.';return false;}
 finally{clearTimeout(timer);btn.disabled=false;}
}


q('#dvfImport')?.addEventListener('click',async()=>{
 const f=q('#dvfZip')?.files?.[0],status=q('#dvfImportStatus');
 const commune=(q('#cadCommune')?.dataset.insee||q('#cadCommune')?.value||'').trim();
 if(!f||!commune){status.textContent='Choisir un ZIP DVF officiel et renseigner la commune.';return;}
 const btn=q('#dvfImport');btn.disabled=true;status.textContent='Import DVF en cours : cela peut prendre plusieurs minutes…';
 try{const fd=new FormData();fd.append('file',f);fd.append('commune',commune);
 const r=await fetch('/api/estimation/dvf/import',{method:'POST',body:fd});const d=await r.json();
 if(!r.ok)throw Error(typeof d.detail==='string'?d.detail:'Import impossible');status.textContent=d.message;
 }catch(e){status.textContent='Erreur import : '+e.message}finally{btn.disabled=false;}
});

const annoncesBtn=q('#launchAnnonces');
const manual=[];let found=[];
let roquesFound=[],roquesReady=false;
function estimationReference(){
 const approved=Number(q('#validatedPrice')?.value||0);if(approved>0)return approved;
 const value=q('#estimationResults .estimationValueAmount')?.textContent||'';
 const amount=Number(value.replace(/[^0-9,.-]/g,'').replace(',','.'));
 return Number.isFinite(amount)&&amount>0?amount:0;
}
function sameProperty(a,b){
 const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(a.url&&a.url===b.url)return true;
 const ref=x=>{const u=decodeURIComponent(String(x.url||''));return u.match(/roques[^/]*?-(\d+)(?:$|[/?#])/i)?.[1]||u.match(/roques-immobilier\.com\/vente\/[^/]+\/[^/]+\/(\d+)-/i)?.[1]||'';};
 const ra=ref(a),rb=ref(b);if(ra&&rb&&ra===rb)return true;
 if(a.commune&&b.commune&&normalize(a.commune)!==normalize(b.commune))return false;
 const rooms=x=>String(x.titre||'').match(/(\d+)\s*pi[eè]ce(?:\(s\)|s)?/i)?.[1]||'';
 const roomsA=rooms(a),roomsB=rooms(b);if(roomsA&&roomsB&&roomsA!==roomsB)return false;
 const sa=Number(a.surface),sb=Number(b.surface),pa=Number(a.prix),pb=Number(b.prix);
 // Les surfaces peuvent différer d'un ou deux m² selon le portail.
 return sa>0&&sb>0&&pa>0&&pb>0&&Math.abs(sa-sb)<=Math.max(2,Math.min(sa,sb)*.015)&&Math.abs(pa-pb)<=Math.min(pa,pb)*.02;
}
function otherProperties(rows,roques){
 const kept=[];
 for(const row of rows){
  if(/roques/i.test(String(row.site||'')+' '+String(row.url||'')))continue;
  if(roques.some(r=>sameProperty(row,r))||kept.some(r=>sameProperty(row,r)))continue;
  kept.push(row);
 }
 return kept;
}
function closestAnnonces(rows,price,surface){
 const unique=[...new Map(rows.filter(a=>Number(a.prix)>0).map(a=>[a.url,a])).values()];
 return unique.sort((a,b)=>Math.abs(a.prix-price)-Math.abs(b.prix-price)||
  Math.abs((Number(a.surface)||0)-surface)-Math.abs((Number(b.surface)||0)-surface)||String(a.url).localeCompare(String(b.url))).slice(0,6);
}
function marketIndicators(rows,surface,commune){
 const key=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!(surface>0))return {count:0,median:0,minSurface:0,maxSurface:0};
 const sample=[];
 for(const row of rows){
  const area=Number(row.surface),price=Number(row.prix);
  if(!(price>0&&area>=surface*.75&&area<=surface*1.25))continue;
  // Le code INSEE du cadastre n'est pas un nom : les résultats du serveur
  // sont déjà limités à la commune demandée dans ce cas.
  if(commune&&!/^\d{5}$/.test(commune)&&row.commune&&key(commune)!==key(row.commune))continue;
  if(sample.some(x=>sameProperty(x,row)))continue;
  sample.push(row);
 }
 const values=sample.map(x=>Number(x.prix)/Number(x.surface)).sort((a,b)=>a-b);
 const median=values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:0;
 return {count:sample.length,median:sample.length>=3?median:0,minSurface:surface*.75,maxSurface:surface*1.25};
}
function renderMarketIndicators(){
 const box=q('#marketIndicators');if(!box)return;
 const result=q('#estimationResults'),surface=Number(q('#surfaceHab')?.value||0),commune=(q('#cadCommune')?.value||'').trim();
 const m=marketIndicators(found,surface,commune),dvf=Number(result?.dataset.dvfMedian||0),count=Number(result?.dataset.dvfCount||0);
 const central=Number((result?.querySelector('.estimationValueAmount')?.textContent||'').replace(/[^0-9,.-]/g,'').replace(',','.'));
 const retained=estimationReference(),today=new Date().toLocaleDateString('fr-FR');
 const period=[result?.dataset.periodStart,result?.dataset.periodEnd].filter(Boolean).join(' au ');
 const metricRows=[
 ['Prix médian des ventes DVF',dvf?fmt(dvf)+'/m² — '+count+' ventes'+(period?' — du '+period:''):'Données insuffisantes'],
 ['Prix médian des annonces comparables',m.median?fmt(m.median)+'/m² — '+m.count+' annonces':'Échantillon insuffisant : '+m.count+' annonce(s), minimum 3'],
 ['Prix au m² de l’estimation statistique',central>0&&surface>0?fmt(central/surface)+'/m²':'Estimation à calculer'],
 ['Prix au m² du montant retenu',retained>0&&surface>0?fmt(retained/surface)+'/m²':'Montant à définir'],
 ['Périmètre des annonces',commune+' — même type — surfaces de '+Math.round(m.minSurface)+' à '+Math.round(m.maxSurface)+' m² (±25 %)'],
 ['Date de consultation des annonces',found.length?today:'Recherche des annonces à lancer']];
 box.innerHTML='<table><tbody>'+metricRows.map(([k,v])=>'<tr><th style="text-align:left;padding:8px">'+esc(k)+'</th><td style="padding:8px">'+esc(v)+'</td></tr>').join('')+'</tbody></table><p class="small">Annonces dédoublonnées, sélectionnées sans filtre de prix. Catalogues partiels, prix demandés et non prix de vente. Aucune correction automatique de la valeur DVF.</p>';
 let advice='Calculez l’estimation et recherchez les annonces pour obtenir un avis d’ajustement.';
 if(dvf&&m.median){
  const gap=(m.median/dvf-1)*100;
  advice='Écart annonces / ventes DVF : '+(gap>=0?'+':'')+gap.toFixed(1)+' %. ';
  advice+=Math.abs(gap)<=5?'Les deux repères sont proches : conserver la base DVF peut être cohérent, sous réserve des caractéristiques du bien.':gap>0?'Les prix demandés sont supérieurs aux ventes DVF. Une hausse ne se justifie que si l’état, l’emplacement et les prestations du bien la confirment ; cet écart n’est pas une hausse de marché démontrée.':'Les prix demandés sont inférieurs aux ventes DVF. Vérifiez la pertinence et l’ancienneté des ventes, les travaux et le positionnement du bien avant d’envisager une baisse.';
  if(m.count<5||count<5)advice+=' Échantillon réduit : conclusion fragile.';
 }
 if(q('#marketAdjustmentAdvice'))q('#marketAdjustmentAdvice').textContent=advice;
 if(q('#estRetainedPrice'))q('#estRetainedPrice').placeholder=central>0?String(central):'Montant à valider';
}
q('#validateRetainedEstimate')?.addEventListener('click',()=>{
 const status=q('#retainedEstimateText'),price=Number(q('#estRetainedPrice')?.value||0),reason=(q('#estAdjustmentReason')?.value||'').trim();
 if(!q('#estimationResults .estimationValueAmount')){status.textContent='Calculez d’abord l’estimation statistique.';return;}
 if(!(price>0&&price<=10000000)){status.textContent='Saisissez un montant positif valide.';return;}
 if(!reason){status.textContent='Indiquez la justification de votre décision avant de valider.';return;}
 q('#validatedPrice').value=String(price);q('#validatedReason').value=reason;
 status.textContent='Montant retenu et validé : '+fmt(price)+' — '+reason;
 renderMarketIndicators();displayAnnonces();if(roquesFound.length||found.length)loadRoques();
 q('#validatedPrice').dispatchEvent(new Event('input',{bubbles:true}));
});
for(const id of ['#surfaceHab','#type','#cadCommune','#address'])q(id)?.addEventListener('input',()=>{
 if(q('#validatedPrice'))q('#validatedPrice').value='';if(q('#validatedReason'))q('#validatedReason').value='';
 if(q('#retainedEstimateText'))q('#retainedEstimateText').textContent='Le bien a été modifié : recalculer l’estimation avant validation.';
 const result=q('#estimationResults');if(result){result.replaceChildren();result.dataset.dvfMedian='';result.dataset.dvfCount='';}
 found=[];roquesFound=[];roquesReady=false;displayRoques();displayAnnonces();
});
function safeAnnonceUrl(value){
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
}
function displayAnnonces(){
 renderMarketIndicators();
 const target=q('#annoncesResults');if(!target)return;
 const all=[...found,...manual],price=estimationReference();
 if(!all.length){target.textContent='Aucun comparable affichable.';return;}
 if(!roquesReady){target.textContent='La comparaison attend la fin de la recherche Roques. Relancez la recherche Roques si elle a échoué.';return;}
 const eligible=otherProperties(all,roquesFound);
 const surface=Number(q('#surfaceHab')?.value||0);
 const rows=price?closestAnnonces(eligible,price,surface):eligible.slice().sort((a,b)=>Math.abs((Number(a.surface)||0)-surface)-Math.abs((Number(b.surface)||0)-surface)||String(a.url).localeCompare(String(b.url))).slice(0,6);
 const selection=price?`${rows.length} autre(s) annonce(s) après retrait des doublons probables — prix les plus proches de l’estimation centrale de ${fmt(price)}.`:`${rows.length} annonce(s) provisoires ${surface>0?'par proximité de surface':'sans surface de référence'} : estimation indisponible, aucun classement par prix d’estimation.`;
 target.innerHTML=`<p class="small">${esc(selection)}</p><div class="annoncesCards">${rows.map(a=>{
  const photo=safeAnnonceUrl(a.photo),url=safeAnnonceUrl(a.url);
  return `<article class="annonceCard"><div class="annoncePhoto">${photo?`<img src="${esc(photo)}" alt="${esc(a.titre||'Photo du bien')}" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="annonceNoPhoto" ${photo?'hidden':''}>Photo non disponible</span></div><div class="annonceBody"><div class="annonceAgency">${esc(a.site||'Ajout manuel')}</div><h4>${esc(a.titre||'Bien proposé à la vente')}</h4><p class="annonceDescription">${esc(a.description||'Caractéristiques à consulter dans l’annonce.')}</p><div class="annoncePrice">${fmt(a.prix)}</div><div class="small">Prix affiché${a.surface?' · '+esc(a.surface)+' m²':''}</div>${url?`<a class="annonceLink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Voir l’annonce ↗</a>`:''}</div></article>`;
 }).join('')}</div><p class="small">Annonces proposées à la vente ; disponibilité à confirmer. Les prix affichés ne sont pas des prix de vente constatés.</p>`;
}
q('#annoncesResults')?.addEventListener('error',event=>{
 if(event.target.tagName==='IMG'){event.target.hidden=true;event.target.parentElement.querySelector('.annonceNoPhoto').hidden=false;}
},true);
// Reclasser les cartes lorsqu'une nouvelle estimation est calculée.
if(q('#estimationResults'))new MutationObserver(()=>displayAnnonces()).observe(q('#estimationResults'),{childList:true,subtree:true,characterData:true});
annoncesBtn?.addEventListener('click',async()=>{
 const raw=(q('#cadCommune')?.value||'').trim();const addr=(q('#address')?.value||'').trim();
 const commune=/^\d{5}$/.test(raw)?(raw==='34126'?'Lamalou-les-Bains':raw):raw||(/lamalou/i.test(addr)?'Lamalou-les-Bains':'');
 const typ=(q('#type')?.value||'').toLowerCase();const type_bien=(/appartement|studio/.test(typ))?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
 const surface=Number(q('#surfaceHab')?.value||0);const status=q('#annoncesStatus');
 const links=q('#annoncesLinks');
 if(links){
  const term=type_bien+' vente '+commune;
  const urls=[['Google – annonces immobilières','https://www.google.com/search?q='+encodeURIComponent(term+' site:seloger.com OR site:bienici.com OR site:leboncoin.fr')],['SeLoger – recherche','https://www.google.com/search?q='+encodeURIComponent(term+' site:seloger.com')],['Bien’ici – recherche','https://www.google.com/search?q='+encodeURIComponent(term+' site:bienici.com')],['Leboncoin – recherche','https://www.google.com/search?q='+encodeURIComponent(term+' site:leboncoin.fr')],['Agences locales','https://www.google.com/search?q='+encodeURIComponent(term+' agence immobilière')]];
  links.replaceChildren(document.createTextNode('Recherches directes (ouvrent les sites de recherche, pas des annonces vérifiées) : '));
  for(const [label,url] of urls){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;a.style.marginRight='12px';links.append(a);}
 }

 if(!commune||!type_bien){status.textContent='Renseigne la commune (nom), et le type maison/appartement. Si le cadastre contient seulement un code INSEE, saisis le nom de la commune dans l’adresse.';return;}
 if(/^\d{5}$/.test(commune)){status.textContent='Nom de commune nécessaire pour rechercher les annonces (le code INSEE seul ne suffit pas).';return;}
 annoncesBtn.disabled=true;status.textContent='Préparation de l’estimation et recherche des catalogues…';
 const controller=new AbortController();let timer;
 try{
  if(!estimationReference())await calculateEstimate();
  const roquesTask=loadRoques({calculate:false});
  timer=setTimeout(()=>controller.abort(),25000);
  const res=await fetch('/api/estimation/annonces?'+new URLSearchParams({commune,type_bien,surface}),{signal:controller.signal});const d=await res.json();if(!res.ok)throw Error(d.detail||'Erreur serveur');found=d.annonces||[];
 if(links && d.recherches_agences?.length){
  links.replaceChildren(document.createTextNode('Agences et réseaux — recherches directes (liens de recherche, annonces à vérifier) : '));
  for(const item of d.recherches_agences){
   const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.nom;a.style.marginRight='12px';links.append(a);
  }
 }
 status.textContent=(d.message||'Recherche terminée.')+(d.limites?' '+d.limites:'');displayAnnonces();await roquesTask;}
 catch(e){status.textContent=(e.name==='AbortError'?'Le catalogue ne répond pas dans le délai prévu. Utilisez les liens de recherche.':'Recherche indisponible : '+e.message);found=[];displayAnnonces();}
 finally{clearTimeout(timer);annoncesBtn.disabled=false;}
});
q('#addAnnonce')?.addEventListener('click',()=>{
 const url=q('#annonceUrl').value.trim(),price=Number(q('#annoncePrix').value),surface=Number(q('#annonceSurface').value);
 let parsed;try{parsed=new URL(url);}catch{q('#annoncesStatus').textContent='Lien invalide.';return;}
 if(!['http:','https:'].includes(parsed.protocol)||!price||!surface||price<15000||surface<12){q('#annoncesStatus').textContent='Indique un lien HTTP(S), un prix et une surface valides.';return;}
 if([...manual,...found].some(x=>x.url===url)){q('#annoncesStatus').textContent='Ce lien figure déjà dans le tableau.';return;}
 manual.push({url,prix:price,surface,prix_m2:Math.round(price/surface),site:parsed.hostname,titre:'Comparable ajouté et vérifié manuellement'});displayAnnonces();
 q('#annoncesStatus').textContent='Comparable ajouté au tableau pour cette session.';
});

function displayRoques(){
 const target=q('#roquesResults');if(!target)return;
 target.innerHTML=`<div class="annoncesCards">${roquesFound.map(a=>{
 const photo=safeAnnonceUrl(a.photo),url=safeAnnonceUrl(a.url);
  return `<article class="annonceCard"><div class="annoncePhoto">${photo?`<img src="${esc(photo)}" alt="${esc(a.titre||'Photo du bien')}" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="annonceNoPhoto" ${photo?'hidden':''}>Photo non disponible</span></div><div class="annonceBody"><div class="annonceAgency">${esc(a.site||'Ajout manuel')}</div><h4>${esc(a.titre||'Bien proposé à la vente')}</h4><p class="annonceDescription">${esc(a.description||'Caractéristiques à consulter dans l’annonce.')}</p><div class="annoncePrice">${fmt(a.prix)}</div><div class="small">Prix affiché${a.surface?' · '+esc(a.surface)+' m²':''}</div>${url?`<a class="annonceLink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Voir l’annonce ↗</a>`:''}</div></article>`;

 }).join('')}</div>`;
}
q('#roquesResults')?.addEventListener('error',event=>{
 if(event.target.tagName==='IMG'){event.target.hidden=true;event.target.parentElement.querySelector('.annonceNoPhoto').hidden=false;}
},true);
async function loadRoques(options={}){
 const status=q('#roquesStatus'),button=q('#launchRoques');if(!status||button.disabled)return;
 let price=estimationReference();
 if(!price&&options.calculate!==false){await calculateEstimate();price=estimationReference();}
 if(!price){roquesFound=[];roquesReady=true;displayRoques();displayAnnonces();status.textContent='La sélection Roques par prix attend une estimation calculable. Les autres catalogues peuvent être affichés provisoirement par surface.';return;}
 let commune=(q('#cadCommune')?.value||'').trim();
 if(!commune&&/lamalou/i.test(q('#address')?.value||''))commune='Lamalou-les-Bains';
 const type=(q('#type')?.value||'').toLowerCase(),type_bien=(/appartement|studio/.test(type))?'appartement':/maison|villa/.test(type)?'maison':'';
 if(!commune||!type_bien){roquesReady=true;status.textContent='Renseignez la commune et le type du bien.';return;}
 roquesReady=false;roquesFound=[];displayRoques();displayAnnonces();
 button.disabled=true;status.textContent='Recherche Roques : commune du bien puis communes voisines…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const r=await fetch('/api/estimation/roques?'+new URLSearchParams({commune,type_bien,prix:price,surface:Number(q('#surfaceHab')?.value||0)}),{signal:controller.signal});const d=await r.json();
  if(!r.ok)throw Error(d.detail||'Catalogue inaccessible');roquesFound=d.annonces||[];roquesReady=true;displayRoques();status.textContent=d.message;
 }catch(e){roquesFound=[];roquesReady=true;displayRoques();status.textContent=e.name==='AbortError'?'Recherche trop longue. Réessayez.':'Recherche Roques indisponible : '+e.message;}
 finally{clearTimeout(timer);button.disabled=false;displayAnnonces();}
}
q('#launchRoques')?.addEventListener('click',loadRoques);

})();
