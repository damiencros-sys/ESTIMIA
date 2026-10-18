(function(){
const $=id=>document.getElementById(id);
const categories=['Document opposable : PLU / PLUi / carte communale / RNU','Zonage U / AU / A / N et règlement écrit','Emplacements réservés et prescriptions','Servitudes d’utilité publique (SUP)','PPRI : inondation, débordement, ruissellement, submersion','Mouvements de terrain : glissements, éboulements, cavités','Retrait-gonflement des argiles','Séisme et radon','Feux de forêt et obligations de débroussaillement','Risques miniers et technologiques / installations industrielles','Pollution des sols, SIS et anciens sites industriels','Canalisations de transport de matières dangereuses','Protection monuments historiques, sites et patrimoine','Autres contraintes locales : accès, réseaux, assainissement, bruit'];
const checks=$('urbanChecks');if(!checks)return;
checks.innerHTML=categories.map((name,i)=>`<label class="urbanRisk"><span>${name}</span><select data-urban="${i}"><option value="">À vérifier</option><option value="non">Non concerné, vérifié</option><option value="oui">Contrainte identifiée</option><option value="na">Non applicable</option></select></label>`).join('');
const notes=$('urbanNotes');try{const saved=JSON.parse(localStorage.getItem('estimia_urbanisme_v1363')||'{}');notes.value=saved.notes||'';checks.querySelectorAll('select').forEach(s=>s.value=saved[s.dataset.urban]||'')}catch{}
function save(){try{const d={notes:notes.value};checks.querySelectorAll('select').forEach(s=>d[s.dataset.urban]=s.value);localStorage.setItem('estimia_urbanisme_v1363',JSON.stringify(d))}catch{}}
notes.addEventListener('input',save);checks.addEventListener('change',save);
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cadastralRefs(){
 const get=id=>($(id)?.value||'').trim();
 const sec=get('cadSection')||get('cadSectionInput');
 const no=get('cadNumero')||get('cadParcel')||get('cadNumber');
 let refs=[];
 try{const stored=JSON.parse(get('cadParcelsJSON')||'[]');if(Array.isArray(stored))refs.push(...stored.map(x=>({section:String(x.section||''),numero:String(x.numero||'')})));}catch{}
 if(sec&&no)refs.push({section:sec,numero:no});
 // Les autres champs de parcelles peuvent être conservés par le dossier.
 for(const selector of ['[data-cad-section][data-cad-number]']){
  document.querySelectorAll(selector).forEach(el=>refs.push({section:el.dataset.cadSection,numero:el.dataset.cadNumber}));
 }
 return [...new Map(refs.filter(x=>x.section&&x.numero).map(x=>[x.section.toUpperCase()+'-'+x.numero,x])).values()];
}
const official=[['Géoportail de l’urbanisme — carte et règlement','https://www.geoportail-urbanisme.gouv.fr/'],['Géorisques — risques et aléas','https://www.georisques.gouv.fr/'],['ERRIAL — état des risques','https://errial.georisques.gouv.fr/'],['Cadastre — plan officiel','https://www.cadastre.gouv.fr/']];
function showSources(){const host=$('urbanSources');host.replaceChildren();const ul=document.createElement('ul');for(const [name,url] of official){const li=document.createElement('li'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=name;li.append(a);ul.append(li)}host.append(ul)}
function properties(p){const keys=['libelle','libelong','libelle_zone','typezone','type_zone','destdomi','nomfic','nom','code','libelle_code','idurba','datappro','dateappro','urlfic','url','libelle_sup'];let entries=keys.filter(k=>p[k]!=null&&p[k]!=='').map(k=>[k,String(p[k])]);return entries.length?entries.map(([k,v])=>escapeHtml(k)+': '+escapeHtml(v.slice(0,250))).join(' · '):'Attributs disponibles dans le document officiel';}
$('urbanSearch')?.addEventListener('click',async()=>{
 showSources();const status=$('urbanStatus'),out=$('urbanResults');out.replaceChildren();
 const commune=($('cadCommune')?.value||$('city')?.value||'').trim();const refs=cadastralRefs();
 if(!commune||!refs.length){status.textContent='Recherche automatique impossible : renseigner la commune et au moins une référence cadastrale (section et numéro).';return;}
 status.textContent='Interrogation du cadastre et des couches officielles de zonage, prescriptions et servitudes…';
 try{
  const res=await fetch('/api/urbanisme/parcelles?'+new URLSearchParams({commune,refs:JSON.stringify(refs)}));
  if(!res.ok)throw Error('Service indisponible ('+res.status+')');
  const data=await res.json();let parts=[];
  for(const p of data.parcelles){
   parts.push('<div class="urbanParcel"><h4>Parcelle '+escapeHtml(p.section)+' '+escapeHtml(p.numero)+'</h4>');
   if(p.erreur){parts.push('<p>⚠ '+escapeHtml(p.erreur)+'</p></div>');continue;}
   for(const [key,label] of [['zonages','Zonage réglementaire'],['prescriptions','Prescriptions'],['servitudes','Servitudes']]){
    const layer=p.couches[key];parts.push('<h5>'+label+'</h5>');
    if(!layer||layer.etat!=='ok')parts.push('<p>⚠ Service non disponible — vérification manuelle nécessaire.</p>');
    else if(!layer.nombre)parts.push('<p>Aucun objet retourné par cette couche. Cela ne démontre pas une absence de contraintes.</p>');
    else {parts.push('<ul>');for(const x of layer.elements)parts.push('<li>'+properties(x.proprietes||{})+'</li>');parts.push('</ul>');}
   }
   if(p.centre){const lon=p.centre[0],lat=p.centre[1];const link='https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon='+encodeURIComponent(lon)+'&lat='+encodeURIComponent(lat)+'&zoom=17';parts.push('<p><a target="_blank" rel="noopener noreferrer" href="'+link+'">🗺️ Ouvrir le plan de zonage centré sur cette parcelle</a></p>');}
   parts.push('</div>');
  }
  out.innerHTML=parts.join('');status.textContent='Recherche terminée le '+data.date_consultation+'. Résultats indicatifs : vérifier le règlement opposable, les risques et les annexes.';
 }catch(e){status.textContent='Recherche automatique indisponible : '+e.message+'. Utilise les sources officielles ci-dessous.';}
});
})();
