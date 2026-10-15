(function(){
const q=s=>document.querySelector(s);
const fmt=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=q('#launchEstimation');if(!btn)return;
btn.addEventListener('click',async()=>{
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
  result.innerHTML=`<div class="cols"><div><b>Fourchette basse</b><h3>${fmt(d.basse)}</h3></div><div><b>Valeur centrale</b><h3>${fmt(d.centrale)}</h3></div><div><b>Fourchette haute</b><h3>${fmt(d.haute)}</h3></div></div><p>${esc(d.avertissement)}</p><details><summary>Voir les ventes retenues</summary><div style="overflow:auto"><table><thead><tr><th>Date</th><th>Surface</th><th>Prix</th><th>Prix/m²</th></tr></thead><tbody>${table}</tbody></table></div></details><p><a href="${esc(d.source)}" target="_blank" rel="noopener">Source des transactions</a></p>`;
 }catch(e){status.textContent='Impossible de consulter les transactions : '+e.message+'. Aucun montant calculé.';}
 finally{btn.disabled=false;}
});

const annoncesBtn=q('#launchAnnonces');
const manual=[];let found=[];
function displayAnnonces(){
 const rows=[...found,...manual];const target=q('#annoncesResults');
 if(!rows.length){target.textContent='Aucun comparable affichable.';return;}
 const table=rows.map((a,i)=>`<tr><td>${esc(a.site||'Ajout manuel')}</td><td>${esc(a.titre||'Annonce vérifiée par utilisateur')}</td><td>${a.prix?fmt(a.prix):'Non communiqué'}</td><td>${a.surface?esc(a.surface)+' m²':'Non communiquée'}</td><td>${a.prix_m2?fmt(a.prix_m2)+'/m²':'—'}</td><td><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Voir</a></td></tr>`).join('');
 target.innerHTML=`<div style="overflow-x:auto"><table><thead><tr><th>Site</th><th>Annonce</th><th>Prix affiché</th><th>Surface</th><th>Prix/m² demandé</th><th>Source</th></tr></thead><tbody>${table}</tbody></table></div><p class="small">${rows.length} annonce(s) — sources à vérifier. Doublons éventuels entre sites non certifiés. Ces prix ne sont pas intégrés automatiquement au calcul DVF.</p>`;
}
annoncesBtn?.addEventListener('click',async()=>{
 const raw=(q('#cadCommune')?.value||'').trim();const addr=(q('#address')?.value||'').trim();
 const commune=/^\d{5}$/.test(raw)?(raw==='34126'?'Lamalou-les-Bains':raw):raw||(/lamalou/i.test(addr)?'Lamalou-les-Bains':'');
 const typ=(q('#type')?.value||'').toLowerCase();const type_bien=typ.includes('appartement')?'appartement':typ.includes('maison')||typ.includes('villa')?'maison':'';
 const surface=Number(q('#surfaceHab')?.value||0);const status=q('#annoncesStatus');
 if(!commune||!type_bien){status.textContent='Renseigne la commune (nom), et le type maison/appartement. Si le cadastre contient seulement un code INSEE, saisis le nom de la commune dans l’adresse.';return;}
 if(/^\d{5}$/.test(commune)){status.textContent='Nom de commune nécessaire pour rechercher les annonces (le code INSEE seul ne suffit pas).';return;}
 annoncesBtn.disabled=true;status.textContent='Recherche des annonces indexées…';
 try{const res=await fetch('/api/estimation/annonces?'+new URLSearchParams({commune,type_bien,surface}));const d=await res.json();if(!res.ok)throw Error(d.detail||'Erreur serveur');found=d.annonces||[];status.textContent=d.message+(d.limites?' '+d.limites:'');displayAnnonces();}
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
