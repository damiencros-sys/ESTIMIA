(function(){
const $=id=>document.getElementById(id);
const categories=['Document opposable : PLU / PLUi / carte communale / RNU','Zonage U / AU / A / N et règlement écrit','Emplacements réservés et prescriptions','Servitudes d’utilité publique (SUP)','PPRI : inondation, débordement, ruissellement, submersion','Mouvements de terrain : glissements, éboulements, cavités','Retrait-gonflement des argiles','Séisme et radon','Feux de forêt et obligations de débroussaillement','Risques miniers et technologiques / installations industrielles','Pollution des sols, SIS et anciens sites industriels','Canalisations de transport de matières dangereuses','Protection monuments historiques, sites et patrimoine','Autres contraintes locales : accès, réseaux, assainissement, bruit'];
const checks=$('urbanChecks');if(!checks)return;
checks.innerHTML=categories.map((name,i)=>`<label class="urbanRisk"><span>${name}</span><select data-urban="${i}"><option value="">À vérifier</option><option value="non">Non concerné, vérifié</option><option value="oui">Contrainte identifiée</option><option value="na">Non applicable</option></select></label>`).join('');
const notes=$('urbanNotes');try{const saved=JSON.parse(localStorage.getItem('estimia_urbanisme_v1363')||'{}');notes.value=saved.notes||'';checks.querySelectorAll('select').forEach(s=>s.value=saved[s.dataset.urban]||'')}catch{}
function save(){try{const d={notes:notes.value};checks.querySelectorAll('select').forEach(s=>d[s.dataset.urban]=s.value);localStorage.setItem('estimia_urbanisme_v1363',JSON.stringify(d))}catch{}}
notes.addEventListener('input',save);checks.addEventListener('change',save);
$('urbanSearch')?.addEventListener('click',()=>{
const address=($('address')?.value||'').trim(),commune=($('cadCommune')?.value||'').trim();
const location=[address,commune].filter(Boolean).join(' ');
const sites=[['Géoportail de l’urbanisme — documents, zonages et servitudes','https://www.geoportail-urbanisme.gouv.fr/'],['Géorisques — risques naturels, miniers et technologiques','https://www.georisques.gouv.fr/'],['ERRIAL — état des risques par adresse/parcelle','https://errial.georisques.gouv.fr/'],['Cadastre officiel — plan et parcelles','https://www.cadastre.gouv.fr/'],['Géoportail IGN — cartes et couches officielles','https://www.geoportail.gouv.fr/']];
$('urbanSources').replaceChildren();const p=document.createElement('p');p.className='small';p.textContent='Bien à vérifier : '+(location||'adresse non renseignée')+'. Les services officiels s’ouvrent pour consultation et validation ; aucun zonage parcellaire n’est présumé.';$('urbanSources').append(p);
const ul=document.createElement('ul');for(const [name,url] of sites){const li=document.createElement('li'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=name;li.append(a);ul.append(li)}$('urbanSources').append(ul);
$('urbanStatus').textContent='Sources officielles prêtes. Vérifie le document en vigueur, les parcelles et chaque aléa avant de conclure. Aucune décote automatique.';
});
})();
