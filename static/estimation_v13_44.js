(function(){
const q=s=>document.querySelector(s);
const fmt=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=q('#launchEstimation');if(!btn)return;
btn.addEventListener('click',async()=>{
 if(!window.estimiaEstimationCheck?.validate())return;
 const commune=(q('#cadCommune')?.value||'').trim();
 const addr=(q('#address')?.value||'').trim();
 const typ=(q('#type')?.value||'').toLowerCase();
 const type_bien=typ.includes('appartement')?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
 const surface=Number(q('#surfaceHab')?.value||0);
 const status=q('#estimationStatus'),result=q('#estimationResults');result.replaceChildren();
 if(!type_bien||!surface){status.textContent='Renseigne le type (maison/appartement) et la surface habitable dans la fiche.';return;}
 let code=(q('#cadCommune')?.dataset.insee||'').trim();
 if(!/^\d{5}$/.test(code))code=commune;
 if(!code && /lamalou/i.test(addr))code='34126';
 if(!code){status.textContent='Renseigne la commune dans le champ Cadastre (ex. Lamalou-les-Bains ou 34126).';return;}
 // Le serveur accepte le nom et le résout en code INSEE avant toute requête DVF.
 if((code==='34240'||/lamalou/i.test(code)) && (/lamalou/i.test(addr)||/lamalou/i.test(commune)))code='34126';
 btn.disabled=true;status.textContent='Recherche des ventes réelles en cours…';
 try{
  const u='/api/estimation/dvf?'+new URLSearchParams({commune:code,type_bien,surface});
  const resp=await fetch(u);const d=await resp.json();if(!resp.ok)throw Error(d.detail||'Erreur du service');
  if(d.status!=='indicatif'){
   status.textContent=(d.message||'Données insuffisantes')+(d.diagnostic?' (Diagnostic : '+d.diagnostic+')':'');return;
  }
  status.textContent=`${d.nombre} ventes filtrées — valeur statistique indicative (sans ajustement qualitatif).`;
  const table=d.comparables.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.surface)} m²</td><td>${fmt(c.prix)}</td><td>${fmt(c.prix_m2)}/m²</td></tr>`).join('');
  result.innerHTML=`<div class="estimationValueMain"><div class="estimationValueLabel">Estimation du bien — valeur centrale</div><div class="estimationValueAmount">${fmt(d.centrale)}</div><div class="small">Valeur statistique indicative issue des ventes DVF retenues</div></div><div class="estimationRange"><div><strong>Fourchette basse</strong><div class="estimationRangeAmount">${fmt(d.basse)}</div></div><div><strong>Fourchette haute</strong><div class="estimationRangeAmount">${fmt(d.haute)}</div></div></div><p>${esc(d.avertissement)}</p><details><summary>Voir les ventes retenues</summary><div style="overflow:auto"><table><thead><tr><th>Date</th><th>Surface</th><th>Prix</th><th>Prix/m²</th></tr></thead><tbody>${table}</tbody></table></div></details><p><a href="${esc(d.source)}" target="_blank" rel="noopener">Source des transactions</a></p>`;
 }catch(e){status.textContent='Impossible de consulter les transactions : '+e.message+'. Aucun montant calculé.';}
 finally{btn.disabled=false;}
});

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
function displayAnnonces(){
 const target=q('#annoncesResults');const surface=Number(q('#surfaceHab')?.value||0);
 const rows=[...found,...manual].filter(a=>a.prix>0&&a.surface>0&&/^https?:\/\//.test(a.url||''));
 if(!rows.length){target.textContent='Aucune annonce avec prix, surface et lien exploitable trouvée automatiquement. Les liens de recherche ci-dessous permettent de poursuivre la vérification.';return;}
 const seen=new Set();const unique=rows.filter(a=>{const key=new URL(a.url).hostname+new URL(a.url).pathname.replace(/\/$/,'');if(seen.has(key))return false;seen.add(key);return true;});
 const byArea=[...unique].sort((a,b)=>Math.abs(a.surface-surface)-Math.abs(b.surface-surface)).slice(0,6);
 const base=Number(q('#estimationResults .estimationValueAmount')?.textContent?.replace(/[^\d]/g,'')||0);
 const byPrice=base?[...unique].filter(a=>!byArea.includes(a)).sort((a,b)=>Math.abs(a.prix-base)-Math.abs(b.prix-base)).slice(0,6):[];
 const section=(name,list)=>{if(!list.length)return '';const trs=list.map(a=>`<tr><td>${esc(a.site||'Ajout manuel')}</td><td>${esc(a.titre||'Annonce')}</td><td>${fmt(a.prix)}</td><td>${esc(a.surface)} m²</td><td>${fmt(a.prix/a.surface)}/m²</td><td><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Annonce</a></td></tr>`).join('');return `<h4>${esc(name)} (${list.length})</h4><div style="overflow-x:auto"><table><thead><tr><th>Site</th><th>Bien</th><th>Prix demandé</th><th>Surface</th><th>Prix/m²</th><th>Lien</th></tr></thead><tbody>${trs}</tbody></table></div>`};
 target.innerHTML=section('Biens proches par surface',byArea)+section('Biens proches par prix',byPrice)+'<p class="small">Annonces indexées non certifiées actives. Vérifier la commune, la mitoyenneté et la disponibilité. Ces prix ne sont pas des ventes DVF.</p>';
}
annoncesBtn?.addEventListener('click',async()=>{
 const raw=(q('#cadCommune')?.value||'').trim();const addr=(q('#address')?.value||'').trim();
 const commune=/^\d{5}$/.test(raw)?(raw==='34126'?'Lamalou-les-Bains':raw):raw||(/lamalou/i.test(addr)?'Lamalou-les-Bains':'');
 const typ=(q('#type')?.value||'').toLowerCase();const type_bien=typ.includes('appartement')?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
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
 annoncesBtn.disabled=true;status.textContent='Recherche des annonces indexées…';
 try{const res=await fetch('/api/estimation/annonces?'+new URLSearchParams({commune,type_bien,surface}));const d=await res.json();if(!res.ok)throw Error(d.detail||'Erreur serveur');found=d.annonces||[];
 if(links && d.recherches_agences?.length){
  links.replaceChildren(document.createTextNode('Agences et réseaux — recherches directes (liens de recherche, annonces à vérifier) : '));
  for(const item of d.recherches_agences){
   const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.nom;a.style.marginRight='12px';links.append(a);
  }
 }
 status.textContent=d.message+(d.limites?' '+d.limites:'');displayAnnonces();}
 catch(e){status.textContent='Recherche indisponible : '+e.message;found=[];displayAnnonces();}
 finally{annoncesBtn.disabled=false;}
});
q('#addAnnonce')?.addEventListener('click',()=>{
 const url=q('#annonceUrl').value.trim(),price=Number(q('#annoncePrix').value),surface=Number(q('#annonceSurface').value);
 let parsed;try{parsed=new URL(url);}catch{q('#annoncesStatus').textContent='Lien invalide.';return;}
 if(!['http:','https:'].includes(parsed.protocol)||!price||!surface||price<15000||surface<12){q('#annoncesStatus').textContent='Indique un lien HTTP(S), un prix et une surface valides.';return;}
 if([...manual,...found].some(x=>x.url===url)){q('#annoncesStatus').textContent='Ce lien figure déjà dans le tableau.';return;}
 manual.push({url,prix:price,surface,prix_m2:Math.round(price/surface),site:parsed.hostname,titre:'Comparable ajouté et vérifié manuellement'});displayAnnonces();
 q('#annoncesStatus').textContent='Comparable ajouté au tableau pour cette session.';
});
})();
