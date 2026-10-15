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
 let code=/^\d{5}$/.test(commune)?commune:null;
 if(!code && /lamalou/i.test(commune+' '+addr))code='34126';
 if(!code){status.textContent='Renseigne le code INSEE de la commune dans le champ Cadastre (ex. Lamalou-les-Bains : 34126).';return;}
 btn.disabled=true;status.textContent='Recherche des ventes réelles en cours…';
 try{
  const u='/api/estimation/dvf?'+new URLSearchParams({commune:code,type_bien,surface});
  const resp=await fetch(u);const d=await resp.json();if(!resp.ok)throw Error(d.detail||'Erreur du service');
  if(d.status!=='indicatif'){
   status.textContent=d.message||'Données insuffisantes';return;
  }
  status.textContent=`${d.nombre} ventes filtrées — valeur statistique indicative (sans ajustement qualitatif).`;
  const table=d.comparables.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.surface)} m²</td><td>${fmt(c.prix)}</td><td>${fmt(c.prix_m2)}/m²</td></tr>`).join('');
  result.innerHTML=`<div class="cols"><div><b>Fourchette basse</b><h3>${fmt(d.basse)}</h3></div><div><b>Valeur centrale</b><h3>${fmt(d.centrale)}</h3></div><div><b>Fourchette haute</b><h3>${fmt(d.haute)}</h3></div></div><p>${esc(d.avertissement)}</p><details><summary>Voir les ventes retenues</summary><div style="overflow:auto"><table><thead><tr><th>Date</th><th>Surface</th><th>Prix</th><th>Prix/m²</th></tr></thead><tbody>${table}</tbody></table></div></details><p><a href="${esc(d.source)}" target="_blank" rel="noopener">Source des transactions</a></p>`;
 }catch(e){status.textContent='Impossible de consulter les transactions : '+e.message+'. Aucun montant calculé.';}
 finally{btn.disabled=false;}
});
})();
