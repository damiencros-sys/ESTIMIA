(function(){
const $=id=>document.getElementById(id);
const host=$('urbanChecks');if(!host)return;
const categories=[
['Document d’urbanisme opposable','GPU : zonages ; type et opposabilité du document à confirmer dans le règlement'],
['Zonage et règlement écrit','GPU : zones intersectant la parcelle ; règlement écrit à consulter'],
['Prescriptions et emplacements réservés','GPU : prescriptions surfaciques ; autres prescriptions à contrôler'],
['Servitudes d’utilité publique','GPU : servitudes surfaciques ; annexes à contrôler'],
['Inondation et ruissellement','Géorisques / PPR : contrôle complémentaire nécessaire'],
['Mouvements de terrain et cavités','Géorisques / PPR : contrôle complémentaire nécessaire'],
['Retrait-gonflement des argiles','Géorisques : contrôle complémentaire nécessaire'],
['Séisme et radon','Géorisques : contrôle complémentaire nécessaire'],
['Feux de forêt et débroussaillement','Géorisques / préfecture : contrôle complémentaire nécessaire'],
['Risques miniers et technologiques','Géorisques : contrôle complémentaire nécessaire'],
['Pollution des sols et SIS','Géorisques : contrôle complémentaire nécessaire'],
['Canalisations de matières dangereuses','Géorisques / SUP : contrôle complémentaire nécessaire'],
['Patrimoine et monuments historiques','GPU / atlas des patrimoines : contrôle complémentaire nécessaire'],
['Autres contraintes locales','Règlement écrit et annexes : contrôle complémentaire nécessaire']];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notes=$('urbanNotes');
const sources=[['Géoportail de l’urbanisme — règlement et plans','https://www.geoportail-urbanisme.gouv.fr/'],['Géorisques — risques naturels et technologiques','https://www.georisques.gouv.fr/'],['ERRIAL — état des risques','https://errial.georisques.gouv.fr/'],['Cadastre — plan officiel','https://www.cadastre.gouv.fr/']];
$('urbanSources').innerHTML='<p class="small">Sources officielles : '+sources.map(([n,u])=>'<a href="'+u+'" target="_blank" rel="noopener">'+esc(n)+'</a>').join(' · ')+'</p>';
try{notes.value=JSON.parse(localStorage.getItem('estimia_urbanisme_v1363')||'{}').notes||''}catch{}
notes?.addEventListener('input',()=>{try{localStorage.setItem('estimia_urbanisme_v1363',JSON.stringify({notes:notes.value}))}catch{}});
function refs(){const r=[];try{const a=JSON.parse($('cadParcelsJSON')?.value||'[]');if(Array.isArray(a))for(const x of a)r.push({section:String(x.section||''),numero:String(x.numero||'')})}catch{}
const sec=$('cadSection')?.value||'',num=$('cadParcel')?.value||'';if(sec&&num)r.push({section:sec,numero:num});return [...new Map(r.filter(x=>x.section&&x.numero).map(x=>[x.section.toUpperCase()+'-'+x.numero,x])).values()];}
function coords(g){if(!g)return [];if(g.type==='Polygon')return g.coordinates.flat();if(g.type==='MultiPolygon')return g.coordinates.flat(2);return []}
function svgMap(p){const all=[{g:p.geometry,kind:'parcel'}];for(const k of ['zonages','prescriptions','servitudes'])for(const x of p.couches[k]?.elements||[])if(x.geometry)all.push({g:x.geometry,kind:k});const pts=all.flatMap(x=>coords(x.g)).filter(x=>Array.isArray(x)&&x.length>1&&Number.isFinite(x[0])&&Number.isFinite(x[1]));if(!pts.length)return '<p>Plan indisponible : géométrie absente.</p>';
let xs=pts.map(x=>x[0]),ys=pts.map(x=>x[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);const dx=Math.max(maxx-minx,0.00015),dy=Math.max(maxy-miny,0.00015);minx-=dx*.08;maxx+=dx*.08;miny-=dy*.08;maxy+=dy*.08;
const project=pt=>[((pt[0]-minx)/(maxx-minx)*660+20).toFixed(1),((maxy-pt[1])/(maxy-miny)*340+20).toFixed(1)];
function rings(g){if(!g)return [];return g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[]}
let paths='';for(const o of all){const col={parcel:'#e13d39',zonages:'#2377c8',prescriptions:'#d18519',servitudes:'#9657b6'}[o.kind];for(const ring of rings(o.g)){if(!ring.length)continue;const d=ring.map((pt,i)=>(i?'L':'M')+project(pt).join(' ')).join(' ')+' Z';paths+='<path d="'+d+'" stroke="'+col+'" stroke-width="'+(o.kind==='parcel'?3:1.8)+'" fill="'+col+'" fill-opacity="'+(o.kind==='parcel'?.12:.10)+'"/>';}}
return '<div class="urbanMap"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" role="img" aria-label="Schéma des contours cadastraux et zonages récupérés">'+paths+'</svg><div class="small">Rouge : parcelle · Bleu : zonage · Orange : prescription · Violet : servitude. Schéma géométrique indicatif, non plan réglementaire opposable.</div></div>';}
function label(p,k){const prop=p||{};const s=[prop.libelong,prop.libelle,prop.nom,prop.typezone,prop.nomfic].filter(Boolean);return [...new Set(s)].map(esc).join(' — ')||'Objet cartographique sans libellé';}
function layerText(layer,k){if(!layer||layer.etat!=='ok')return 'Service indisponible : impossible de conclure.';if(!layer.nombre)return 'Aucun objet renvoyé par cette couche ; absence de contrainte non démontrée.';const list=layer.elements.map(x=>label(x.proprietes,k));return [...new Set(list)].join(' ; ')+(layer.tronque?' (résultats partiels)':'');}
function status(k,p){const L=p.couches||{};if(k===0)return L.zonages?.etat==='ok'?'Zonage récupéré ; vérifier le type de document et son caractère opposable.':'Document non déterminé automatiquement.';
if(k===1)return layerText(L.zonages,'zonages');if(k===2)return layerText(L.prescriptions,'prescriptions');if(k===3)return layerText(L.servitudes,'servitudes');return 'Non vérifié automatiquement — '+categories[k][1]+'.';}
let running=false,lastKey='',lastSuccess='';
async function run(force=false){const city=($('cadCommune')?.value||'').trim(),r=refs(),key=city+'|'+JSON.stringify(r);if(!city||!r.length){$('urbanStatus').textContent='En attente de la commune et des références cadastrales.';return}if(running||(!force&&key===lastSuccess))return;
running=true;lastKey=key;$('urbanStatus').textContent='Recherche automatique en cours pour '+r.length+' parcelle(s)…';
try{const response=await fetch('/api/urbanisme/parcelles?'+new URLSearchParams({commune:city,refs:JSON.stringify(r)}));if(!response.ok)throw Error('Erreur '+response.status);const data=await response.json();const pieces=[];
for(const p of data.parcelles){pieces.push('<section class="urbanParcel"><h3>Parcelle '+esc(p.section)+' '+esc(p.numero)+'</h3>');if(p.erreur){pieces.push('<p>⚠ '+esc(p.erreur)+'</p></section>');continue}
pieces.push(svgMap(p));if(p.centre){const [lon,lat]=p.centre;pieces.push('<p><a target="_blank" rel="noopener" href="https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon='+encodeURIComponent(lon)+'&lat='+encodeURIComponent(lat)+'&zoom=17">Ouvrir le plan officiel et le règlement</a></p>')}
pieces.push('<div class="urbanAutoRows">');categories.forEach(([name],i)=>{const text=status(i,p),kind=i<4?'cartographique':'non-verifie';pieces.push('<div class="urbanAutoRow"><strong>'+esc(name)+'</strong><span class="'+kind+'">'+text+'</span></div>')});pieces.push('</div></section>')}
$('urbanResults').innerHTML=pieces.join('');host.innerHTML='<p class="small">Les 14 catégories figurent désormais dans chaque fiche parcellaire ci-dessus. Aucun choix manuel requis. Les contrôles indisponibles sont explicitement indiqués.</p>';
$('urbanStatus').textContent='Recherche parcellaire effectuée le '+esc(data.date_consultation)+'. Les risques non interrogés restent à vérifier : cette analyse ne vaut pas certificat d’urbanisme ni état des risques.';lastSuccess=key;
}catch(e){$('urbanStatus').textContent='Recherche impossible : '+e.message+'. Aucune conclusion réglementaire ne peut être tirée.'}finally{running=false}}
$('urbanSearch')?.addEventListener('click',()=>run(true));
// Les champs sont parfois mis à jour par la dictée sans événement change : détecter leur nouvelle valeur.
setInterval(()=>{const key=($('cadCommune')?.value||'')+'|'+JSON.stringify(refs());if(key!==lastKey&&key.split('|')[0]&&refs().length){lastKey=key;run(false)}},1800);
for(const id of ['cadCommune','cadSection','cadParcel','cadParcelsJSON'])$(id)?.addEventListener('change',()=>run(false));
setTimeout(()=>run(false),1000);
})();