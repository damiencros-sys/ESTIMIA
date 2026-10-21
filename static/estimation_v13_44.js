(function(){
const q=s=>document.querySelector(s);
const fmt=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const transactionDataset='https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees';
window.estimiaTransactionSourceUrl=value=>{
 try{const u=new URL(String(value||''));if(!['https:','http:'].includes(u.protocol))return '';if(u.hostname==='files.data.gouv.fr'&&u.pathname.startsWith('/geo-dvf/'))return transactionDataset;return u.href;}catch{return '';}
};
function repairTransactionLinks(){document.querySelectorAll('#estimationResults a[href]').forEach(a=>{const fixed=window.estimiaTransactionSourceUrl(a.getAttribute('href'));if(fixed)a.href=fixed;});}
document.addEventListener('estimia:estimation-restored',repairTransactionLinks);
const btn=q('#launchEstimation');if(!btn)return;

const qualityIds=['#estCondition','#estPlannedWorks','#estQualityMode','#estQualityRate','#estWorkBudget','#estOtherAdjustment','#estQualityReason','#notes','#correction'];
function qualityConfig(){
 let mode=q('#estQualityMode')?.value||'etat',budgetText=q('#estWorkBudget')?.value||'';
 const notes=String(q('#notes')?.value||'')+' '+String(q('#correction')?.value||'');
 const spoken=[...notes.matchAll(/\bbudget\s+(?:net\s+)?(?:de\s+|des\s+)?travaux\s*(?:de|:|est de|estim[ée] [àa])?\s*(\d[\d ]*(?:[.,]\d+)?)\s*(?:euros?|€)/gi)].at(-1);
 if(mode!=='aucun'&&spoken&&(!budgetText||budgetText===q('#estWorkBudget')?.dataset.dictationValue)){budgetText=spoken[1].replace(/ /g,'').replace(',','.');q('#estWorkBudget').value=budgetText;q('#estWorkBudget').dataset.dictationValue=budgetText;q('#estQualityMode').value=mode='budget';}
 const condition=q('#estCondition')?.value||'',rateText=q('#estQualityRate')?.value||'',reason=q('#estQualityReason')?.value.trim()||'';
 const defaultRate=/réhabiliter/i.test(condition)?-25:/rénover/i.test(condition)?-15:/rafraîchir/i.test(condition)?-5:0;
 const rate=rateText===''?defaultRate:Number(rateText),budget=Number(budgetText),other=Number(q('#estOtherAdjustment')?.value||0);
 if(!Number.isFinite(rate)||rate< -80||rate>30||!Number.isFinite(budget)||budget<0||!Number.isFinite(other))throw Error('Ajustements invalides : vérifier le taux et les montants saisis');
 if(mode==='budget'&&budgetText==='')throw Error('Renseignez le budget net de travaux à déduire ou choisissez la méthode par état');
 const needsReason=((mode==='etat'&&rateText!==''&&rate!==defaultRate)||other!==0)&&!reason;
 const unitStates={};if(q('#estCondition')?.dataset.qualityManual!=='true'&&rateText==='')for(const s of window.estimiaConditionSignals?.(notes)||[])if(s.type)unitStates[s.type]=s.condition;
 return {mode,condition,rate,budget,other,reason:needsReason?'Ajustement saisi par l’utilisateur — justification à compléter':reason,unitStates,works:q('#estPlannedWorks')?.value||''};
}
function adjustQuality(d,c){
 const factor=c.mode==='etat'?1+c.rate/100:1,cost=c.mode==='budget'?c.budget:0;
 const scoped=c.mode==='etat'&&d.unitBases?.length>1&&Object.keys(c.unitStates).length>0;
 const rateFor=u=>{const state=c.unitStates[u.key.split(' ')[0]]||'';return /réhabiliter/.test(state)?-25:/rénover/.test(state)?-15:/rafraîchir/.test(state)?-5:0;};
 const calc=(value,key)=>Math.round(((scoped?d.unitBases.reduce((v,x)=>v+Number(x.value[key])*(1+rateFor(x.unit)/100),0):Number(value)*factor)-cost+c.other)/1000)*1000;
 const values={centrale:calc(d.centrale,'centrale'),basse:calc(d.basse,'basse'),haute:calc(d.haute,'haute')};
 if(Object.values(values).some(x=>!Number.isFinite(x)||x<=0))throw Error('Les corrections dépassent la valeur disponible. Revoyez les comparables et les travaux ; aucun montant nul ou négatif n’est retenu');
 // Preserve exact DVF values when there is no correction.
 const changed=(scoped?d.unitBases.some(x=>rateFor(x.unit)!==0):factor!==1)||cost!==0||c.other!==0;
 const formula=scoped?'hypothèses internes provisoires par logement, non issues d’un barème officiel : '+d.unitBases.map(x=>x.unit.label+' '+(c.unitStates[x.unit.key.split(' ')[0]]||'état non précisé')+' '+rateFor(x.unit)+' %').join(' ; '):c.mode==='budget'?'budget net de travaux déduit : '+fmt(cost)+' ; aucune décote d’état ajoutée':c.mode==='aucun'?'comparables déclarés de même état : aucune correction d’état':'état '+(c.condition||'non précisé')+' : '+(c.rate>0?'+':'')+c.rate+' % (hypothèse interne, non issue d’un barème officiel)';
 const note='Base DVF avant correction : '+fmt(d.centrale)+'. Calcul en l’état : '+formula+(c.other?' ; autres ajustements '+fmt(c.other):'')+'.'+(c.reason?' Justification : '+c.reason+'.':'')+(c.works?' Travaux déclarés : '+c.works+'.':'')+' L’état des ventes DVF n’est pas documenté ; vérifier que la correction n’est pas déjà reflétée par les comparables. Aucun DPE présumé.';
 return {...d,...(changed?values:{}),avertissement:(d.avertissement||'')+' '+note,qualityNote:note,qualityChanged:changed};
}
let estimateTask=null,qualityTimer=null,pendingQuality=false;
const geometryKey=()=>JSON.stringify(['#cadCommune','#address','#type','#surfaceHab','#propertyUnitsJSON'].map(id=>q(id)?.value||''));
function calculateEstimate(options={}){
 if(estimateTask){if(options.reuseBase)pendingQuality=true;return estimateTask;}
 estimateTask=performEstimate(options.reuseBase===true).finally(()=>{estimateTask=null;if(pendingQuality){pendingQuality=false;scheduleQuality();}});return estimateTask;
}
btn.addEventListener('click',calculateEstimate);
async function performEstimate(reuseBase=false){
 if(window.estimiaFicheReady)await window.estimiaFicheReady;
 let quality;try{quality=qualityConfig()}catch(e){q('#estimationResults').dataset.calculationPending='true';q('#estimationStatus').textContent=e.message+' Le dernier résultat reste affiché comme référence ; corrigez la saisie pour actualiser.';return false;}
 const inputKey=()=>JSON.stringify(['#cadCommune','#address','#type','#surfaceHab','#propertyUnitsJSON',...qualityIds].map(id=>q(id)?.value||''));
 const startedWith=inputKey(),startedGeometry=geometryKey();
 const commune=(q('#cadCommune')?.value||'').trim();
 const addr=(q('#address')?.value||'').trim();
 const typ=(q('#type')?.value||'').toLowerCase();
 const type_bien=(/appartement|studio/.test(typ))?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
 const surface=Number(q('#surfaceHab')?.value||0);
 const status=q('#estimationStatus'),result=q('#estimationResults');let cached=null;try{if(reuseBase&&result.dataset.dvfInputKey===geometryKey())cached=JSON.parse(result.dataset.dvfBase||'null')}catch{}
 if(!reuseBase)result.replaceChildren();result.dataset.dvfMedian='';result.dataset.dvfCount='';if(q('#validatedPrice'))q('#validatedPrice').value='';
 if(!type_bien&&typ){status.textContent='Le calcul automatique DVF actuel couvre les maisons, appartements et studios. Ce type de bien ('+typ+') nécessite une analyse spécifique ; aucune estimation de logement n’est appliquée. Le dossier reste modifiable et enregistrable.';return false;}
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
  let units=[];try{units=JSON.parse(q('#propertyUnitsJSON')?.value||'[]')}catch{}
  const fetchOne=async(area,type)=>{
   const u='/api/estimation/dvf?'+new URLSearchParams({commune:code,type_bien:type,surface:area});
   const resp=await fetch(u,{signal:controller.signal}),value=await resp.json();
   if(!resp.ok)throw Error(value.detail||'Erreur du service');return value;
  };
  let d;
  if(cached){d=cached;}else if(units.length>1){
   if(units.some(u=>!Number.isFinite(u.surface)||u.surface<=0))throw Error('Précisez la surface de chaque logement dans la dictée avant de calculer l’ensemble');
   if(Math.abs(units.reduce((v,u)=>v+u.surface,0)-surface)>.02)throw Error('Le total de la fiche diffère des surfaces des logements : corrigez les surfaces annoncées puis transformez la fiche');
   const values=await Promise.all(units.map(async unit=>({unit,value:await fetchOne(unit.surface,unit.type)})));
   const missing=values.filter(x=>x.value.status!=='indicatif');
   if(missing.length)throw Error('Estimation complète indisponible pour '+missing.map(x=>x.unit.label+' : '+(x.value.message||'ventes insuffisantes')).join(' ; ')+'. Aucun total partiel retenu');
   const refs=new Map();
   for(const {unit,value} of values)for(const c of value.comparables){
    const key=c.reference||[c.date,c.surface,c.prix].join('|');
    if(!refs.has(key))refs.set(key,{...c,logements:[]});
    const ref=refs.get(key);if(!ref.logements.includes(unit.label))ref.logements.push(unit.label);
   }
   const comparables=[...refs.values()].map(c=>({...c,date:c.date+' — '+c.logements.join(' / ')}));
   const sum=key=>values.reduce((total,x)=>total+Number(x.value[key]),0);
   d={status:'indicatif',centrale:sum('centrale'),basse:sum('basse'),haute:sum('haute'),prix_m2_median:'',nombre:comparables.length,comparables,unitBases:values,
    source:values[0].value.source,periode_debut:values.map(x=>x.value.periode_debut).sort()[0],periode_fin:values.map(x=>x.value.periode_fin).sort().at(-1),
    avertissement:'Ensemble de '+units.length+' logements : somme des estimations DVF calculées séparément selon leur surface. '+values.map(x=>x.unit.label+' ('+x.unit.surface.toLocaleString('fr-FR')+' m²) : '+fmt(x.value.centrale)).join(' ; ')+'. Base avant correction d’état ; une vente en bloc peut différer de la somme des lots.'};
  }else d=await fetchOne(surface,type_bien);
  if(geometryKey()===startedGeometry&&d.status==='indicatif'){result.dataset.dvfBase=JSON.stringify(d);result.dataset.dvfInputKey=startedGeometry;}
  if(inputKey()!==startedWith){status.textContent='La fiche a changé pendant la recherche. Relancez le calcul sur les informations corrigées.';return false;}
  if(d.status!=='indicatif'){
   status.textContent=(d.message||'Données insuffisantes')+(d.diagnostic?' (Diagnostic : '+d.diagnostic+')':'');return false;
  }
  result.dataset.dvfBase=JSON.stringify(d);result.dataset.dvfInputKey=geometryKey();
  const rawDvf={centrale:d.centrale,basse:d.basse,haute:d.haute};d=adjustQuality(d,quality);result.dataset.rawDvfEstimate=JSON.stringify(rawDvf);
  q('#qualityAdjustmentStatus').textContent=d.qualityNote;
  result.dataset.unitValuation=String(units.length>1);result.dataset.dvfMedian=String(d.prix_m2_median||'');result.dataset.dvfCount=String(d.nombre||'');result.dataset.periodStart=d.periode_debut||'';result.dataset.periodEnd=d.periode_fin||'';result.dataset.originalEstimate=JSON.stringify({centrale:d.centrale,basse:d.basse,haute:d.haute});result.dataset.adjusted='false';
  if(q('#validatedPrice'))q('#validatedPrice').value='';if(q('#validatedReason'))q('#validatedReason').value='';if(q('#retainedEstimateText'))q('#retainedEstimateText').textContent='';
  status.textContent=units.length>1?`${units.length} logements calculés séparément — ${d.nombre} références affichées dédoublonnées. Valeur indicative de l’ensemble.`:`${d.nombre} ventes filtrées — base statistique DVF et corrections détaillées ci-dessous.`;
  if(d.qualityChanged)status.textContent+=' État / travaux pris en compte : voir le calcul détaillé.';
  const table=d.comparables.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.surface)} m²</td><td>${fmt(c.prix)}</td><td>${fmt(c.prix_m2)}/m²</td></tr>`).join('');
  result.innerHTML=`<div class="estimationValueMain"><div class="estimationValueLabel">${d.qualityChanged?"Estimation indicative en l’état — hypothèse à vérifier":"Estimation du bien — valeur centrale"}</div><div class="estimationValueAmount">${fmt(d.centrale)}</div><div class="small">Valeur indicative après prise en compte de l’état et des ajustements déclarés</div></div><div class="estimationRange"><div><strong>Fourchette basse</strong><div class="estimationRangeAmount">${fmt(d.basse)}</div></div><div><strong>Fourchette haute</strong><div class="estimationRangeAmount">${fmt(d.haute)}</div></div></div><p class="estimationExplanation">${esc(d.avertissement)}</p><details><summary>Voir les ventes retenues</summary><div style="overflow:auto"><table><thead><tr><th>Date</th><th>Surface</th><th>Prix</th><th>Prix/m²</th></tr></thead><tbody>${table}</tbody></table></div></details><p><a href="${esc(window.estimiaTransactionSourceUrl(d.source))}" target="_blank" rel="noopener">Source des transactions</a></p>`;
  result.dataset.calculationPending='false';return true;
 }catch(e){result.dataset.calculationPending='true';if(reuseBase&&result.querySelector('.estimationValueLabel'))result.querySelector('.estimationValueLabel').textContent='Dernier résultat conservé — ajustements à corriger';status.textContent=e.name==='AbortError'?'La recherche DVF dépasse le délai prévu. Réessayez ou utilisez l’import DVF manuel. Aucun prix n’est inventé.':'Impossible de consulter les transactions : '+e.message+'. Aucun montant calculé.';return false;}
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
 ['Prix médian des ventes DVF',result?.dataset.unitValuation==='true'?'Calcul distinct par logement — voir le détail de l’estimation':dvf?fmt(dvf)+'/m² — '+count+' ventes'+(period?' — du '+period:''):'Données insuffisantes'],
 ['Prix médian des annonces comparables',m.median?fmt(m.median)+'/m² — '+m.count+' annonces':'Échantillon insuffisant : '+m.count+' annonce(s), minimum 3'],
 ['Prix au m² de l’estimation statistique après ajustements',Number(result?.dataset.originalEstimate?JSON.parse(result.dataset.originalEstimate).centrale:central)>0&&surface>0?fmt(Number(result?.dataset.originalEstimate?JSON.parse(result.dataset.originalEstimate).centrale:central)/surface)+'/m²':'Estimation à calculer'],
 ['Prix au m² du montant retenu',retained>0&&surface>0?fmt(retained/surface)+'/m²':'Montant à définir'],
 ['Périmètre des annonces',commune+' — même type — surfaces de '+Math.round(m.minSurface)+' à '+Math.round(m.maxSurface)+' m² (±25 %)'],
 ['Date de consultation des annonces',found.length?today:'Recherche des annonces à lancer']];
 box.innerHTML='<table><tbody>'+metricRows.map(([k,v])=>'<tr><th style="text-align:left;padding:8px">'+esc(k)+'</th><td style="padding:8px">'+esc(v)+'</td></tr>').join('')+'</tbody></table><p class="small">Annonces dédoublonnées, sélectionnées sans filtre de prix. Catalogues partiels, prix demandés et non prix de vente. Aucune correction automatique de la valeur DVF.</p>';
 let advice=result?.dataset.unitValuation==='true'&&central?'Ensemble de logements : valeurs DVF calculées séparément. Le prix au m² global des annonces reste un repère ; son écart aux ventes ne corrige pas automatiquement la somme. Les corrections d’état et de travaux sont détaillées dans le calcul.':'Calculez l’estimation et recherchez les annonces pour obtenir un avis d’ajustement.';
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
 const result=q('#estimationResults');
 if(!result.dataset.originalEstimate){const read=el=>Number((el?.textContent||'').replace(/[^0-9,.-]/g,'').replace(',','.'));result.dataset.originalEstimate=JSON.stringify({centrale:read(result.querySelector('.estimationValueAmount')),basse:read(result.querySelectorAll('.estimationRangeAmount')[0]),haute:read(result.querySelectorAll('.estimationRangeAmount')[1])});}
 const original=JSON.parse(result.dataset.originalEstimate),round=n=>Math.round(n/1000)*1000;
 result.querySelector('.estimationValueAmount').textContent=fmt(price);
 result.querySelectorAll('.estimationRangeAmount')[0].textContent=fmt(Math.max(1,Math.min(price,round(price*.85))));
 result.querySelectorAll('.estimationRangeAmount')[1].textContent=fmt(Math.max(price,round(price*1.15)));
 result.querySelector('.estimationValueLabel').textContent='Estimation du bien — montant retenu';
 const subtitle=result.querySelector('.estimationValueMain .small');if(subtitle)subtitle.textContent='Montant modifié et validé — fourchettes à −15 % / +15 %, arrondies au millier';
 result.dataset.adjusted='true';
 const warning=result.querySelector('.estimationExplanation');if(warning)warning.textContent='Estimation ajustée et validée. Fourchettes indicatives à −15 % et +15 %. Justification : '+reason;
 let ref=result.querySelector('.originalEstimateReference');if(!ref){ref=document.createElement('p');ref.className='originalEstimateReference small screenOnly';result.querySelector('.estimationRange').after(ref);}
 ref.textContent='Proposition initiale ESTIM’IA : '+fmt(original.centrale)+' — basse '+fmt(original.basse)+' / haute '+fmt(original.haute)+'. Référence conservée uniquement à l’écran.';
 q('#validatedPrice').value=String(price);q('#validatedReason').value=reason;
 status.textContent='Montant retenu et validé : '+fmt(price)+' — '+reason;
 renderMarketIndicators();displayAnnonces();if(roquesFound.length||found.length)loadRoques();
 q('#validatedPrice').dispatchEvent(new Event('input',{bubbles:true}));
});
for(const id of ['#surfaceHab','#type','#cadCommune','#address','#notes','#correction','#propertyUnitsJSON'])q(id)?.addEventListener('input',()=>{
 if(q('#validatedPrice'))q('#validatedPrice').value='';if(q('#validatedReason'))q('#validatedReason').value='';
 if(q('#retainedEstimateText'))q('#retainedEstimateText').textContent='Le bien a été modifié : recalculer l’estimation avant validation.';
 if(q('#qualityAdjustmentStatus'))q('#qualityAdjustmentStatus').textContent='';
 const result=q('#estimationResults');if(result){result.replaceChildren();result.dataset.dvfMedian='';result.dataset.dvfCount='';delete result.dataset.unitValuation;delete result.dataset.originalEstimate;delete result.dataset.adjusted;delete result.dataset.dvfBase;delete result.dataset.dvfInputKey;delete result.dataset.calculationPending;}
 found=[];roquesFound=[];roquesReady=false;displayRoques();displayAnnonces();
});
function scheduleQuality(){
 clearTimeout(qualityTimer);const result=q('#estimationResults');
 if(estimateTask){pendingQuality=true;result.dataset.calculationPending='true';return;}
 if(!result.dataset.dvfBase&&!result.querySelector('.estimationValueAmount')){q('#qualityAdjustmentStatus').textContent='Les ajustements sont enregistrés. Calculez les ventes DVF pour obtenir une première estimation.';return;}
 result.dataset.calculationPending='true';q('#estimationStatus').textContent=result.dataset.dvfBase?'Actualisation des montants avec les ajustements saisis…':'Rechargement de la base DVF de cet ancien dossier pour recalculer les ajustements…';
 qualityTimer=setTimeout(async()=>{const ok=await calculateEstimate({reuseBase:true});if(ok){renderMarketIndicators();displayAnnonces();if(roquesFound.length)loadRoques({calculate:false});}},220);
}
q('#estWorkBudget')?.addEventListener('input',()=>{const value=q('#estWorkBudget').value;if(value!==''&&Number(value)>=0)q('#estQualityMode').value='budget';else if(value===''&&q('#estQualityMode').value==='budget')q('#estQualityMode').value='etat';});
q('#estQualityRate')?.addEventListener('input',()=>{if(q('#estQualityRate').value!=='')q('#estQualityMode').value='etat';});
for(const id of qualityIds.filter(id=>!['#notes','#correction'].includes(id)))q(id)?.addEventListener('input',scheduleQuality);
window.estimiaEnsureCurrentEstimate=async()=>{
 clearTimeout(qualityTimer);const result=q('#estimationResults');
 if(result.dataset.calculationPending==='true'){
  if(estimateTask)await estimateTask;
  if(result.dataset.calculationPending==='true')await calculateEstimate({reuseBase:true});
  if(result.dataset.calculationPending==='true')throw Error('Les ajustements ne permettent pas un calcul valide. Corrigez-les avant l’impression ou le téléchargement.');
 }
};
q('#estCondition')?.addEventListener('input',()=>{q('#estCondition').dataset.qualityManual='true';});
for(const id of qualityIds)q(id)?.addEventListener('change',()=>q(id).dispatchEvent(new Event('input',{bubbles:true})));
document.addEventListener('estimia:estimation-restored',()=>{if(q('#estimationResults')?.dataset.calculationPending==='true')scheduleQuality();renderMarketIndicators();if(q('#retainedEstimateText'))q('#retainedEstimateText').textContent=q('#estimationResults')?.dataset.adjusted==='true'?'Estimation modifiée restaurée : '+fmt(Number(q('#validatedPrice')?.value||0)):'';});
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
 let stale=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const r=await fetch('/api/estimation/roques?'+new URLSearchParams({commune,type_bien,prix:price,surface:Number(q('#surfaceHab')?.value||0)}),{signal:controller.signal});const d=await r.json();
  if(estimationReference()!==price||(q('#cadCommune')?.value||'').trim()!==commune){stale=true;return;}
  if(!r.ok)throw Error(d.detail||'Catalogue inaccessible');roquesFound=d.annonces||[];roquesReady=true;displayRoques();status.textContent=d.message;
 }catch(e){roquesFound=[];roquesReady=true;displayRoques();status.textContent=e.name==='AbortError'?'Recherche trop longue. Réessayez.':'Recherche Roques indisponible : '+e.message;}
 finally{clearTimeout(timer);button.disabled=false;displayAnnonces();if(stale)setTimeout(()=>loadRoques({calculate:false}),0);}
}
q('#launchRoques')?.addEventListener('click',loadRoques);

})();
