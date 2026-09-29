// ESTIM'IA V9 — enrichissement exhaustif du dossier de visite.
// Ne modifie pas le moteur de dictée. Travaille uniquement sur le texte déjà retranscrit.
(function(){
const $=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const U=a=>[...new Set(a.filter(Boolean))];
const N=s=>String(s||'').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ').trim();
function yes(t,r){return r.test(t)}
function vals(t,defs){return defs.filter(x=>x[1].test(t)).map(x=>x[0])}
function section(title,icon,rows){
 const r=rows.filter(x=>x[1]);
 if(!r.length)return '';
 return `<section class="proGroup"><h3>${icon} ${title}</h3>${r.map(x=>`<div class="proRow"><span>${E(x[0])}</span><strong>${E(x[1])}</strong></div>`).join('')}</section>`;
}
function area(t,label,rx){
 const m=t.match(rx); return m?`${label} : ${m[1].replace('.',',')} m²`:null;
}
function build(){
 const raw=($('#notes')?.value||'')+' '+($('#correction')?.value||'');
 const t=N(raw);
 let html='<div class="proGrid">';

 // Identification / construction / configuration
 let type=(t.match(/\b(maison de village|maison|villa|appartement|immeuble|studio|terrain|local commercial)\b/)||[])[1]||'';
 let levels='';
 if(/deux niveaux|2 niveaux|sur deux niveaux|rez[- ]de[- ]chauss[ée]e[^.!?]{0,100}(?:premier|1er) [ée]tage/.test(t)) levels='2 niveaux';
 else if(/trois niveaux|3 niveaux/.test(t)) levels='3 niveaux';
 else if(/(?:premier|1er) [ée]tage/.test(t)&&/rez[- ]de[- ]chauss[ée]e|rdc/.test(t)) levels='Rez-de-chaussée + 1er étage';
 let mito='';
 if(/non mitoyenne|sans mitoyennet[ée]/.test(t)) mito='Non mitoyen';
 else if(/mitoyenne?[^.!?]{0,20}(?:deux|2|des deux|de chaque) c[oô]t[ée]s/.test(t)) mito='Mitoyen des deux côtés';
 else if(/\bmitoyenne?\b/.test(t)) mito='Mitoyen / mitoyenneté mentionnée';
 let year=(t.match(/(?:construite?|construction|ann[ée]e de construction)[^0-9]{0,20}((?:18|19|20)\d{2})/)||[])[1]||'';
 let exposure=(t.match(/(?:expos[ée]e?|exposition|orient[ée]e?|orientation)[^a-z]{0,5}(nord[- ]est|nord[- ]ouest|sud[- ]est|sud[- ]ouest|nord|sud|est|ouest)/)||[])[1]||'';
 html+=section('Bien & construction','🏠',[
  ['Type de bien',type],['Organisation',levels],['Mitoyenneté',mito],['Année de construction',year],['Exposition',exposure.toUpperCase()]
 ]);

 // Levels and room-by-room detail
 const roomRows=[];
 const roomrx=/\b(chambre(?:\s+(?:\d+|un|une|deux|trois|quatre))?|séjour|salon|cuisine|bureau|cellier|buanderie|garage|terrasse|balcon|cave|salle d[' ]eau|salle de bains?|wc)\s*(?:fait|mesure|de|d[' ]une surface de)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres? carrés?)/gi;
 for(const m of t.matchAll(roomrx)) roomRows.push([m[1],m[2].replace('.',',')+' m²']);
 const nbch=(t.match(/\b(\d+)\s+chambres?\b/)||[])[1]||'';
 let pieces=(t.match(/\b(\d+)\s+pi[eè]ces?\b/)||[])[1]||'';
 html+=section('Distribution & surfaces','📐',[
  ['Nombre de pièces',pieces],['Nombre de chambres',nbch],
  ...roomRows
 ]);

 // Level-specific phrases retained as text snippets
 const levelInfo=[];
 for(const rx of [/(?:rez[- ]de[- ]chauss[ée]e|rdc)[^.!?]{0,180}/g,/(?:au |le )?(?:premier|1er) [ée]tage[^.!?]{0,180}/g,/(?:deuxi[eè]me|2e|2ème) [ée]tage[^.!?]{0,180}/g]){
   for(const m of t.matchAll(rx)) levelInfo.push(m[0].trim());
 }
 if(levelInfo.length) html+=section('Répartition par niveau','🪜',levelInfo.map((v,i)=>[`Niveau ${i+1}`,v]));

 // Kitchen / appliances
 const kitchen=vals(t,[
 ['Ouverte',/cuisine[^.!?]{0,30}ouverte/],['Américaine',/cuisine[^.!?]{0,30}am[ée]ricaine/],
 ['Fermée / indépendante',/cuisine[^.!?]{0,30}(?:ferm[ée]e|ind[ée]pendante)/],['Semi-ouverte',/cuisine[^.!?]{0,30}semi[- ]ouverte/],
 ['Aménagée',/cuisine[^.!?]{0,30}am[ée]nag[ée]e/],['Équipée',/cuisine[^.!?]{0,30}[ée]quip[ée]e/],['Îlot central',/[iî]lot central/],
 ["Cuisine d'été",/cuisine d[' ]été/]
 ]);
 const appliances=vals(t,[
 ['Plaque induction',/plaque[^.!?]{0,20}induction/],['Plaque vitrocéramique',/vitroc[ée]ramique/],['Plaque gaz',/plaque[^.!?]{0,20}gaz/],
 ['Four',/\bfour\b/],['Hotte',/\bhotte\b/],['Lave-vaisselle',/lave[- ]vaisselle/],['Réfrigérateur',/r[ée]frig[ée]rateur|\bfrigo\b/],
 ['Congélateur',/cong[ée]lateur/],['Micro-ondes',/micro[- ]ondes/],['Cave à vin',/cave à vin/]
 ]);
 html+=section('Cuisine','🍽️',[['Configuration',kitchen.join(' · ')],['Électroménager',appliances.join(' · ')]]);

 // Sanitary
 const sanitary=vals(t,[
 ["Salle d'eau",/salle d[' ]eau/],['Salle de bains',/salle de bains?/],["Douche à l'italienne",/douche à l[' ]italienne/],
 ['Douche',/\bdouche\b/],['Baignoire',/\bbaignoire\b/],['Simple vasque',/simple vasque/],['Double vasque',/double vasque/],
 ['WC séparé',/wc[^.!?]{0,20}s[ée]par[ée]/],['WC suspendu',/wc suspendu/],['Sèche-serviettes',/s[eè]che[- ]serviettes/],['VMC',/\bvmc\b/]
 ]);
 html+=section('Sanitaires','🚿',[['Équipements',sanitary.join(' · ')]]);

 // Windows and shutters
 const windows=vals(t,[
 ['PVC blanc',/\bpvc blanc\b/],['PVC',/\bpvc\b/],['Aluminium',/\baluminium\b|\balu\b/],['Bois',/(?:menuiserie|fen[eê]tre)[^.!?]{0,20}bois/],
 ['Double vitrage',/double vitrage/],['Triple vitrage',/triple vitrage/],['Simple vitrage',/simple vitrage/],['Oscillo-battant',/oscillo[- ]battant/],
 ['Baie coulissante',/baie[^.!?]{0,15}coulissante/]
 ]);
 const shutters=vals(t,[
 ['Volets roulants électriques',/volets? roulants?[^.!?]{0,25}[ée]lectriques?/],['Volets roulants manuels',/volets? roulants?[^.!?]{0,25}manuels?/],
 ['Volets battants',/volets? battants?/],['Persiennes',/persiennes?/],['Moustiquaires',/moustiquaires?/],['Stores',/\bstores?\b/]
 ]);
 html+=section('Menuiseries & fermetures','🪟',[['Menuiseries',U(windows).join(' · ')],['Fermetures',U(shutters).join(' · ')]]);

 // Heating, AC, ECS
 const heating=vals(t,[
 ['Chaudière gaz',/chaudi[eè]re[^.!?]{0,25}gaz/],['Chaudière fioul',/chaudi[eè]re[^.!?]{0,25}fioul/],
 ['PAC air-air',/(?:pac|pompe à chaleur)[^.!?]{0,25}air[- ]air/],['PAC air-eau',/(?:pac|pompe à chaleur)[^.!?]{0,25}air[- ]eau/],
 ['Convecteurs électriques',/convecteurs?[^.!?]{0,25}[ée]lectriques?/],['Radiateurs électriques',/radiateurs?[^.!?]{0,25}[ée]lectriques?/],
 ['Radiateurs à inertie',/radiateurs?[^.!?]{0,25}inertie/],['Plancher chauffant',/plancher chauffant/],
 ['Poêle à bois',/po[eê]le[^.!?]{0,15}bois/],['Poêle à granulés',/po[eê]le[^.!?]{0,15}granul/],['Insert',/\binsert\b/],['Cheminée ouverte',/chemin[ée]e[^.!?]{0,20}ouverte/]
 ]);
 let ac='';
 if(/climatisation|\bclim\b/.test(t)){
   const z=[]; const a=(t.match(/(?:climatisation|\bclim\b)[^.!?]{0,160}/)||[''])[0];
   ['salon','séjour','chambre parentale','chambre 1','chambre 2','chambre 3'].forEach(x=>{if(a.includes(x))z.push(x)});
   ac=z.length?'Oui — '+z.join(' + '):'Oui';
 }
 const hotwater=vals(t,[['Cumulus électrique',/cumulus|ballon[^.!?]{0,20}[ée]lectrique/],['Ballon thermodynamique',/ballon thermodynamique/],['Par chaudière',/eau chaude[^.!?]{0,30}chaudi[eè]re/]]);
 html+=section('Chauffage & confort','🔥',[['Chauffage',heating.join(' · ')],['Climatisation',ac],['Eau chaude',hotwater.join(' · ')]]);

 // Meters and networks
 const meters=[];
 if(/linky/.test(t))meters.push('Compteur Linky mentionné');
 if(/compteur[^.!?]{0,30}[ée]lectri[^.!?]{0,30}individuel/.test(t))meters.push('Électricité : compteur individuel');
 if(/compteur[^.!?]{0,30}eau[^.!?]{0,30}individuel/.test(t))meters.push('Eau : compteur individuel');
 if(/compteur[^.!?]{0,30}eau[^.!?]{0,30}divisionnaire|sous[- ]compteur[^.!?]{0,30}eau/.test(t))meters.push('Eau : compteur divisionnaire');
 if(/pas de compteur[^.!?]{0,30}divisionnaire/.test(t))meters.push('Absence de compteur divisionnaire signalée');
 if(/compteur[^.!?]{0,30}gaz[^.!?]{0,30}individuel/.test(t))meters.push('Gaz : compteur individuel');
 const networks=vals(t,[["Tout-à-l'égout",/tout[- ]à[- ]l[' ]égout|tout à l[' ]égout/],['Fosse septique',/fosse septique/],['Microstation',/micro[- ]station/],['Fibre',/\bfibre\b/],['Gaz de ville',/gaz de ville/]]);
 html+=section('Réseaux & compteurs','⚡',[['Comptage',U(meters).join(' · ')],['Réseaux',networks.join(' · ')]]);

 // Electricity / plumbing states
 const elec=vals(t,[
 ['Installation vieillissante',/[ée]lectricit[ée][^.!?]{0,40}(?:vieillissante|ancienne|v[ée]tuste)/],
 ['Installation à reprendre',/[ée]lectricit[ée][^.!?]{0,40}[àa] reprendre/],['Tableau électrique ancien',/tableau [ée]lectrique[^.!?]{0,35}(?:ancien|vieillissant|fusibles)/],
 ['Tableau électrique à reprendre',/tableau [ée]lectrique[^.!?]{0,35}[àa] reprendre/],['Prise(s) sans terre',/prises?[^.!?]{0,25}sans terre/]
 ]);
 const plumbing=vals(t,[['Plomberie à reprendre',/plomberie[^.!?]{0,35}[àa] reprendre/],['Plomberie vieillissante',/plomberie[^.!?]{0,35}(?:ancienne|vieillissante)/]]);
 html+=section('Installations techniques — état','🛠️',[['Électricité',elec.join(' · ')],['Plomberie',plumbing.join(' · ')]]);

 // Defects with context snippets
 const disorders=[];
 const drx=/(?:[^.!?]{0,70})(fissure|microfissure|lézarde|faïençage|humidit[ée]|aur[ée]ole|moisissure|salp[eê]tre|infiltration|remont[ée]e capillaire|carrelage cass[ée]|carrelage fissur[ée]|affaissement)(?:[^.!?]{0,90})/gi;
 for(const m of t.matchAll(drx)) disorders.push(m[0].trim());
 html+=section('Désordres constatés','⚠️',disorders.slice(0,12).map((v,i)=>[`Observation ${i+1}`,v]));

 // Roof / facade / structure
 const structure=vals(t,[
 ['Charpente traditionnelle',/charpente[^.!?]{0,25}traditionnelle/],['Fermettes',/\bfermettes\b/],['Tuiles canal',/tuiles? canal/],
 ['Tuiles mécaniques',/tuiles? m[ée]caniques/],['Toit-terrasse',/toit[- ]terrasse/],['Pierre',/murs?[^.!?]{0,20}pierre|construction[^.!?]{0,20}pierre/],
 ['Parpaing',/\bparpaing\b/],['Brique',/\bbrique\b/]
 ]);
 const roofstate=vals(t,[['Toiture refaite',/toiture[^.!?]{0,40}refaite/],['Toiture révisée',/toiture[^.!?]{0,40}r[ée]vis[ée]e/],['Toiture à reprendre',/toiture[^.!?]{0,40}[àa] reprendre/]]);
 html+=section('Structure, toiture & façade','🏗️',[['Construction',structure.join(' · ')],['Toiture — état',roofstate.join(' · ')]]);

 // Exterior / annexes
 const exterior=vals(t,[['Terrasse',/\bterrasse\b/],['Balcon',/\bbalcon\b/],['Jardin',/\bjardin\b/],['Cour',/\bcour\b/],['Loggia',/\bloggia\b/],['Piscine',/\bpiscine\b/],['Pergola',/\bpergola\b/],['Terrain clôturé',/terrain[^.!?]{0,30}cl[oô]tur[ée]/],['Terrain en pente',/terrain[^.!?]{0,30}(?:en pente|pentu)/]]);
 const annex=vals(t,[['Garage',/\bgarage\b/],['Cave',/\bcave\b/],['Cellier',/\bcellier\b/],['Buanderie',/\bbuanderie\b/],['Grenier',/\bgrenier\b/],['Dépendance',/d[ée]pendance/],['Atelier',/\batelier\b/],['Carport',/\bcarport\b/],['Abri de jardin',/abri[^.!?]{0,15}jardin/]]);
 html+=section('Extérieurs & annexes','🌳',[['Extérieurs',exterior.join(' · ')],['Annexes',annex.join(' · ')]]);

 // View / nuisance
 let view='';
 const vm=t.match(/[^.!?]{0,25}\bvue\b[^.!?]{0,100}/); if(vm)view=vm[0].trim();
 const nuis=vals(t,[['Nuisance routière',/route[^.!?]{0,40}(?:bruyante|passante)|bruit[^.!?]{0,30}route/],['Voie ferrée / train',/voie ferr[ée]e|\btrain\b/],['Vis-à-vis',/vis[- ]à[- ]vis/],['Stationnement difficile',/stationnement[^.!?]{0,30}difficile/]]);
 html+=section('Environnement','👁️',[['Vue / environnement',view],['Nuisances',nuis.join(' · ')]]);

 // Diagnostics / finance
 let dpe=(t.match(/\bdpe\s*([a-g])\b/)||[])[1]||'', ges=(t.match(/\bges\s*([a-g])\b/)||[])[1]||'';
 let tf=(t.match(/taxe fonci[eè]re[^0-9]{0,25}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/)||[])[1]||'';
 let charges=(t.match(/charges?[^0-9]{0,25}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/)||[])[1]||'';
 html+=section('Diagnostics, copropriété & finances','📄',[
  ['DPE',dpe.toUpperCase()],['GES',ges.toUpperCase()],['Taxe foncière',tf?tf+' €':''],['Charges',charges?charges+' €':''],
  ['Copropriété',/\bcopropri[ée]t[ée]\b/.test(t)?'Mentionnée':'']
 ]);

 // To verify
 const verify=[];
 [['Assainissement',/assainissement[^.!?]{0,55}(?:pas v[ée]rifi[ée]|non v[ée]rifi[ée]|[àa] v[ée]rifier|je ne l[' ]ai pas v[ée]rifi[ée])/],
 ['Toiture',/toiture[^.!?]{0,55}(?:[àa] v[ée]rifier|je ne sais pas|inconnue)/],
 ['Urbanisme / PLU',/(?:urbanisme|plu|constructibilit[ée])[^.!?]{0,60}(?:[àa] v[ée]rifier|je ne sais pas|propri[ée]taire pense)/],
 ['Surface',/surface[^.!?]{0,50}(?:[àa] confirmer|[àa] v[ée]rifier)/]].forEach(([n,r])=>{if(r.test(t))verify.push(n)});
 html+=section('Contrôles & informations à vérifier','🔎',[['À vérifier',verify.join(' · ')]]);

 html+='</div>';
 html+=`<details class="rawNotes"><summary>📝 Voir la dictée originale complète</summary><div>${E($('#notes')?.value||'')}</div></details>`;
 return html;
}

document.addEventListener('DOMContentLoaded',()=>{
 const b=$('#analyse');
 if(b)b.addEventListener('click',()=>setTimeout(()=>{const box=$('#facts');if(box)box.innerHTML=build()},80),false);
});
})();