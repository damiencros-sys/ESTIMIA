// ESTIM'IA V7 — moteur d'interprétation métier.
// Le moteur de dictée de app.js reste intact.
(function(){
const $=s=>document.querySelector(s);
const norm=s=>String(s||'').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set(a.filter(Boolean))];

function last(rx,t){ let r=new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'),m,z=null; while((m=r.exec(t))) z=m; return z; }
function correctionText(raw){
 let t=norm(raw);
 const mark="(?:pardon|non(?:\\s+pardon)?|je\\s+me\\s+suis\\s+tromp[ée](?:\\s+je\\s+corrige)?|je\\s+corrige|correction|rectification|en\\s+fait|finalement|plut[oô]t|c[' ]est\\s+pas)";
 t=t.replace(new RegExp("(?:\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)\\s+chambres?[^.!?]{0,55}?"+mark+"[^.!?]{0,30}?(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)(?:\\s+chambres?)?","gi"),"$1 chambres");
 t=t.replace(new RegExp("(terrasse|garage|cave|balcon|jardin|terrain|séjour|sejour|salon|cuisine|chambre\\s*\\d*)\\s*(?:de|fait|mesure)?\\s*\\d+(?:[.,]\\d+)?\\s*(?:m2|m²|mètres? carrés?)[^.!?]{0,75}?"+mark+"[^.!?]{0,35}?(\\d+(?:[.,]\\d+)?)\\s*(?:m2|m²|mètres? carrés?)","gi"),"$1 $2 m²");
 return t;
}
function add(o,k,v){ if(v!==undefined&&v!==null&&String(v).trim()!=='') o[k]=v; }
function has(t,r){return r.test(t)}

function interpret(raw){
 const t=correctionText(raw), f={};

 // Type / distribution
 let m=last(/\b(studio|t1|t2|t3|t4|t5|appartement|maison(?: de village)?|villa|immeuble|terrain|local commercial|garage)\b/gi,t);
 if(m) add(f,'Type de bien',m[1].toUpperCase().replace('APPARTEMENT','Appartement').replace('MAISON','Maison'));
 m=last(/\b(\d+)\s*pi[eè]ces?\b/gi,t); if(m)add(f,'Pièces',m[1]);
 m=last(/\b(\d+)\s*chambres?\b/gi,t); if(m)add(f,'Chambres',m[1]);
 if(has(t,/\bplain[- ]pied\b/)) add(f,'Configuration','Plain-pied');
 if(has(t,/\bduplex\b/)) add(f,'Configuration','Duplex');
 if(has(t,/\btriplex\b/)) add(f,'Configuration','Triplex');
 if(has(t,/\btraversant\b/)) add(f,'Distribution','Traversant');
 if(has(t,/\bsuite parentale\b/)) add(f,'Suite parentale','Oui');
 if(has(t,/\bdressing\b/)) add(f,'Dressing','Oui');
 if(has(t,/\bmezzanine\b/)) add(f,'Mezzanine','Oui');

 // Surfaces
 m=last(/(?:surface(?: habitable| carrez)?|loi carrez)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres? carrés?)/gi,t);
 if(!m) m=last(/\b(?:appartement|maison|villa)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/gi,t);
 if(m)add(f,'Surface habitable / Carrez',m[1].replace('.',',')+' m²');
 const rooms=[];
 const rr=/\b(chambre\s*(?:\d+|un|une|deux|trois)?|séjour|sejour|salon|cuisine|bureau|cellier|buanderie|garage|terrasse|balcon|cave|salle d[' ]eau|salle de bains?)\s*(?:fait|mesure|de)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres? carrés?)/gi;
 for(const x of t.matchAll(rr)) rooms.push(`${x[1]} : ${x[2].replace('.',',')} m²`);
 if(rooms.length)add(f,'Surfaces par pièce',uniq(rooms).join(' · '));

 // Cuisine
 const cuis=[];
 if(has(t,/cuisine[^.!?]{0,35}(?:ouverte|américaine|americaine)/)) cuis.push('Ouverte / américaine');
 if(has(t,/cuisine[^.!?]{0,35}(?:fermée|fermee|indépendante|independante)/)) cuis.push('Fermée / indépendante');
 if(has(t,/cuisine[^.!?]{0,35}semi[- ]ouverte/)) cuis.push('Semi-ouverte');
 if(has(t,/cuisine[^.!?]{0,35}aménagée|cuisine aménagée/)) cuis.push('Aménagée');
 if(has(t,/cuisine[^.!?]{0,35}équipée|cuisine équipée/)) cuis.push('Équipée');
 if(has(t,/îlot central|ilot central/)) cuis.push('Îlot central');
 if(has(t,/cuisine d[' ]été/)) cuis.push("Cuisine d'été");
 if(cuis.length)add(f,'Cuisine',uniq(cuis).join(' · '));
 const elec=[];
 [['Plaque induction',/plaque[^.!?]{0,15}induction/],['Plaque vitrocéramique',/vitrocéramique/],['Plaque gaz',/plaque[^.!?]{0,15}gaz/],
 ['Hotte',/\bhotte\b/],['Four',/\bfour\b/],['Micro-ondes',/micro[- ]ondes/],['Lave-vaisselle',/lave[- ]vaisselle/],
 ['Réfrigérateur',/réfrigérateur|frigo/],['Congélateur',/congélateur/],['Cave à vin',/cave à vin/]].forEach(([n,r])=>{if(has(t,r))elec.push(n)});
 if(elec.length)add(f,'Électroménager',elec.join(' · '));

 // Sanitaires
 const san=[];
 [['Salle de bains',/salle de bains?/],["Salle d’eau",/salle d[' ]eau/],["Douche à l’italienne",/douche à l[' ]italienne/],
 ['Baignoire',/\bbaignoire\b/],['Double vasque',/double vasque/],['WC suspendu',/wc suspendu/],['WC séparé',/wc[^.!?]{0,20}s[ée]par[ée]/],
 ['Sèche-serviettes',/s[eè]che[- ]serviettes/],['VMC',/\bvmc\b/]].forEach(([n,r])=>{if(has(t,r))san.push(n)});
 if(san.length)add(f,'Sanitaires',san.join(' · '));

 // Menuiseries / shutters
 const men=[];
 if(has(t,/\bpvc blanc\b/))men.push('PVC blanc'); else if(has(t,/\bpvc\b/))men.push('PVC');
 if(has(t,/\baluminium\b|\balu\b/))men.push('Aluminium');
 if(has(t,/\bmenuiseries? bois\b|\bfen[eê]tres? bois\b/))men.push('Bois');
 if(has(t,/\bdouble vitrage\b/))men.push('Double vitrage');
 if(has(t,/\btriple vitrage\b/))men.push('Triple vitrage');
 if(has(t,/oscillo[- ]battant/))men.push('Oscillo-battant');
 if(men.length)add(f,'Menuiseries',uniq(men).join(' · '));
 const vol=[];
 if(has(t,/volets? roulants?[^.!?]{0,25}électriques?/))vol.push('Volets roulants électriques');
 else if(has(t,/volets? roulants?/))vol.push('Volets roulants');
 if(has(t,/volets? battants?/))vol.push('Volets battants');
 if(has(t,/persiennes?/))vol.push('Persiennes');
 if(has(t,/moustiquaires?/))vol.push('Moustiquaires');
 if(vol.length)add(f,'Fermetures',vol.join(' · '));

 // Heating / cooling / hot water
 const heat=[];
 [['Pompe à chaleur air-air',/pompe à chaleur[^.!?]{0,25}air[- ]air|pac air[- ]air/],['Pompe à chaleur air-eau',/pompe à chaleur[^.!?]{0,25}air[- ]eau|pac air[- ]eau/],
 ['Chaudière gaz',/chaudi[eè]re[^.!?]{0,20}gaz/],['Chaudière fioul',/chaudi[eè]re[^.!?]{0,20}fioul/],
 ['Convecteurs électriques',/convecteurs?[^.!?]{0,20}électriques?/],['Radiateurs à inertie',/radiateurs?[^.!?]{0,20}inertie/],
 ['Plancher chauffant',/plancher chauffant/],['Poêle à bois',/po[eê]le[^.!?]{0,15}bois/],['Poêle à granulés',/po[eê]le[^.!?]{0,15}granul/],
 ['Insert',/\binsert\b/],['Cheminée ouverte',/chemin[ée]e[^.!?]{0,20}ouverte/]].forEach(([n,r])=>{if(has(t,r))heat.push(n)});
 if(heat.length)add(f,'Chauffage',heat.join(' · '));
 if(has(t,/climatisation|\bclim\b/)){
   const z=[]; const a=(t.match(/(?:climatisation|\bclim\b)[^.!?]{0,130}/)||[''])[0];
   if(/\bsalon\b/.test(a))z.push('salon'); if(/\bs[ée]jour\b/.test(a))z.push('séjour'); if(/chambre parentale/.test(a))z.push('chambre parentale');
   add(f,'Climatisation',z.length?'Oui — '+uniq(z).join(' + '):'Oui');
 }
 const ecs=[];
 if(has(t,/ballon thermodynamique/))ecs.push('Ballon thermodynamique');
 if(has(t,/cumulus|ballon[^.!?]{0,15}électrique/))ecs.push('Ballon électrique');
 if(has(t,/eau chaude[^.!?]{0,30}chaudi[eè]re/))ecs.push('Par chaudière');
 if(ecs.length)add(f,'Eau chaude',ecs.join(' · '));

 // Meters / networks
 const meters=[];
 if(has(t,/compteur[^.!?]{0,25}(?:électrique|electricite|électricité)[^.!?]{0,25}individuel|linky[^.!?]{0,20}individuel/))meters.push('Électricité : compteur individuel');
 if(has(t,/compteur[^.!?]{0,25}(?:eau)[^.!?]{0,25}individuel/))meters.push('Eau : compteur individuel');
 if(has(t,/compteur[^.!?]{0,25}(?:eau)[^.!?]{0,25}divisionnaire|sous[- ]compteur[^.!?]{0,20}eau/))meters.push('Eau : divisionnaire');
 if(has(t,/pas de compteur[^.!?]{0,20}divisionnaire/))meters.push('Pas de compteur divisionnaire');
 if(has(t,/compteur[^.!?]{0,25}gaz[^.!?]{0,25}individuel/))meters.push('Gaz : compteur individuel');
 if(meters.length)add(f,'Compteurs',meters.join(' · '));
 const networks=[];
 if(has(t,/tout[- ]à[- ]l[' ]égout|tout à l[' ]égout/))networks.push("Tout-à-l’égout");
 if(has(t,/fosse septique/))networks.push('Fosse septique');
 if(has(t,/micro[- ]station/))networks.push('Microstation');
 if(has(t,/\bfibre\b/))networks.push('Fibre');
 if(networks.length)add(f,'Réseaux',networks.join(' · '));

 // Electrical condition
 const el=[];
 if(has(t,/électricit[ée][^.!?]{0,35}(?:vieillissante|ancienne|vétuste)/))el.push('Installation vieillissante / ancienne');
 if(has(t,/tableau électrique[^.!?]{0,35}(?:à reprendre|ancien|vieillissant|fusibles)/))el.push('Tableau électrique à reprendre / contrôler');
 if(has(t,/électricit[ée][^.!?]{0,35}à reprendre/))el.push('Installation à reprendre');
 if(has(t,/prises?[^.!?]{0,20}sans terre/))el.push('Prise(s) sans terre signalée(s)');
 if(el.length)add(f,'Électricité — état',el.join(' · '));

 // Defects / disorders with location
 const defects=[];
 const locations=[
 ['façade',/fa[cç]ade/],['terrasse',/terrasse/],['mur de clôture',/mur de cl[oô]ture/],['mur de soutènement',/mur de sout[eè]nement/],
 ['carrelage',/carrelage/],['plafond',/plafond/],['mur intérieur',/mur(?:s)? intérieur/],['sol',/\bsol\b/],['dalle',/\bdalle\b/],
 ['balcon',/balcon/],['piscine',/piscine/]
 ];
 for(const [loc,lr] of locations){
   const segRx=new RegExp(`[^.!?]{0,55}${lr.source}[^.!?]{0,70}`,'gi');
   for(const sm of t.matchAll(segRx)){
     const seg=sm[0];
     if(/fissure|microfissure|lézarde|lezarde|faïençage|faiencage/.test(seg)){
       let kind=/microfissure/.test(seg)?'microfissure':/lézarde|lezarde/.test(seg)?'lézarde signalée':'fissure visible';
       let q=/importante|grosse|large/.test(seg)?' — importance signalée : forte':/fine|petite/.test(seg)?' — fine/petite':'';
       defects.push(`${loc} : ${kind}${q}`);
     }
     if(/cass[ée]|fissur[ée]|décoll[ée]|decoll[ée]|affaiss/.test(seg) && /carrelage|dalle|terrasse|sol/.test(seg)) defects.push(`${loc} : revêtement/dalle dégradé(e)`);
   }
 }
 // moisture
 const hum=[];
 [['Trace d’humidité',/trace[s]? d[' ]humidit[ée]/],['Auréole',/aur[ée]ole/],['Moisissure',/moisissure/],['Salpêtre',/salp[eê]tre/],
 ['Infiltration',/infiltration/],['Remontée capillaire',/remont[ée]e[s]? capillaire/],['Odeur d’humidité',/odeur[^.!?]{0,15}humidit[ée]/]].forEach(([n,r])=>{if(has(t,r))hum.push(n)});
 if(hum.length)defects.push(...hum);
 if(defects.length)add(f,'Désordres constatés',uniq(defects).join(' · '));

 // General condition / works
 const states=[];
 [['Très bon état',/tr[eè]s bon [ée]tat/],['Bon état',/\bbon [ée]tat\b/],["État d’usage",/[ée]tat d[' ]usage/],
 ['Rafraîchissement à prévoir',/rafra[iî]chissement[^.!?]{0,20}(?:à prévoir|nécessaire)/],
 ['Rénovation complète',/r[ée]novation compl[eè]te|enti[eè]rement à r[ée]nover/],['Mauvais état',/mauvais [ée]tat/]].forEach(([n,r])=>{if(has(t,r))states.push(n)});
 if(states.length)add(f,'État général',states.join(' · '));
 const works=[];
 const wr=[['Cuisine',/cuisine[^.!?]{0,35}(?:à refaire|à remplacer|à rénover|vieillissante)/],
 ['Salle d’eau / bains',/(?:salle d[' ]eau|salle de bains?)[^.!?]{0,35}(?:à refaire|à rénover|vieillissante)/],
 ['Peintures',/peintures?[^.!?]{0,30}(?:à refaire|à reprendre)/],['Électricité',/électricit[ée][^.!?]{0,35}à reprendre/],
 ['Toiture',/toiture[^.!?]{0,35}(?:à refaire|à reprendre|à réviser)/],['Façade',/fa[cç]ade[^.!?]{0,35}(?:à refaire|à reprendre|ravalement)/]];
 wr.forEach(([n,r])=>{if(has(t,r))works.push(n)});
 if(works.length)add(f,'Travaux identifiés',uniq(works).join(' · '));

 // Exterior / annexes
 const ext=[];
 [['Balcon',/\bbalcon\b/],['Terrasse',/\bterrasse\b/],['Jardin',/\bjardin\b/],['Cour',/\bcour\b/],['Loggia',/\bloggia\b/],
 ['Piscine',/\bpiscine\b/],['Pergola',/\bpergola\b/],['Cuisine d’été',/cuisine d[' ]été/],['Terrain clôturé',/terrain[^.!?]{0,25}cl[oô]tur[ée]/],
 ['Terrain en pente',/terrain[^.!?]{0,25}(?:en pente|pentu)/]].forEach(([n,r])=>{if(has(t,r))ext.push(n)});
 if(ext.length)add(f,'Extérieurs',ext.join(' · '));
 const ann=[];
 [['Garage',/\bgarage\b/],['Cave',/\bcave\b/],['Cellier',/\bcellier\b/],['Buanderie',/\bbuanderie\b/],['Grenier',/\bgrenier\b/],
 ['Dépendance',/d[ée]pendance/],['Carport',/\bcarport\b/],['Atelier',/\batelier\b/],['Abri jardin',/abri[^.!?]{0,15}jardin/]].forEach(([n,r])=>{if(has(t,r))ann.push(n)});
 if(ann.length)add(f,'Annexes',ann.join(' · '));

 // View / positives / nuisances
 if(/\bvue\b/.test(t)){
   const v=[];
   if(/tr[eè]s belle vue/.test(t))v.push('Très belle vue'); else if(/belle vue/.test(t))v.push('Belle vue'); else v.push('Vue');
   if(/vue[^.!?]{0,60}d[ée]gag[ée]e/.test(t))v.push('dégagée');
   if(/vue[^.!?]{0,90}montagnes?/.test(t))v.push('sur les montagnes');
   if(/vue[^.!?]{0,90}\bmer\b/.test(t))v.push('mer');
   if(/vue[^.!?]{0,60}panoramique/.test(t))v.push('panoramique');
   add(f,'Vue',uniq(v).join(' '));
 }
 const plus=[];
 if(has(t,/\blumineu(?:x|se)\b/))plus.push('Lumineux');
 if(has(t,/\bcalme\b/))plus.push('Calme');
 if(has(t,/sans vis[- ]à[- ]vis/))plus.push('Sans vis-à-vis');
 if(has(t,/pierre apparente/))plus.push('Pierre apparente');
 if(has(t,/\bcheminée\b/))plus.push('Cheminée');
 if(plus.length)add(f,'Atouts',plus.join(' · '));
 const nuis=[];
 if(has(t,/route[^.!?]{0,35}(?:bruyante|passante)|bruit[^.!?]{0,25}route/))nuis.push('Nuisance routière');
 if(has(t,/voie ferr[ée]e|train/))nuis.push('Voie ferrée / train mentionné');
 if(has(t,/vis[- ]à[- ]vis/)&&!has(t,/sans vis[- ]à[- ]vis/))nuis.push('Vis-à-vis');
 if(has(t,/stationnement[^.!?]{0,25}difficile/))nuis.push('Stationnement difficile');
 if(nuis.length)add(f,'Nuisances / points faibles',nuis.join(' · '));

 // Diagnostics
 const diag=[];
 m=last(/\bdpe\s*([a-g])\b/gi,t); if(m)diag.push('DPE '+m[1].toUpperCase());
 m=last(/\bges\s*([a-g])\b/gi,t); if(m)diag.push('GES '+m[1].toUpperCase());
 if(has(t,/diagnostic[^.!?]{0,35}(?:sans anomalie|ras|aucun probl[eè]me)/))diag.push('Diagnostics : pas d’anomalie signalée dans la dictée');
 if(diag.length)add(f,'Diagnostics',diag.join(' · '));

 // Condominium / finances
 const cop=[];
 if(has(t,/\bcopropri[ée]t[ée]\b/))cop.push('Copropriété mentionnée');
 if(has(t,/syndic[^.!?]{0,20}b[ée]n[ée]vole/))cop.push('Syndic bénévole');
 if(has(t,/syndic[^.!?]{0,20}professionnel/))cop.push('Syndic professionnel');
 if(has(t,/travaux[^.!?]{0,25}vot[ée]s/))cop.push('Travaux votés');
 if(cop.length)add(f,'Copropriété',cop.join(' · '));
 m=last(/taxe fonci[eè]re[^0-9]{0,25}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/gi,t); if(m)add(f,'Taxe foncière',m[1].replace('.',',')+' €');
 m=last(/charges?[^0-9]{0,25}(\d+(?:[.,]\d+)?)\s*(?:€|euros?)(?:\s*\/?\s*(mois|an|annuel|mensuel))?/gi,t);
 if(m)add(f,'Charges',m[1].replace('.',',')+' €'+(m[2]?' / '+m[2]:' — périodicité à confirmer'));

 // Source / uncertainty
 const verify=[];
 const vr=[['Assainissement',/assainissement[^.!?]{0,50}(?:pas v[ée]rifi[ée]|non v[ée]rifi[ée]|je ne l[' ]ai pas v[ée]rifi[ée]|à v[ée]rifier|inconnu)/],
 ['Toiture',/toiture[^.!?]{0,50}(?:à v[ée]rifier|je ne sais pas|inconnue)/],['Urbanisme',/(?:plu|urbanisme|constructibilit[ée])[^.!?]{0,55}(?:à v[ée]rifier|je ne sais pas|propriétaire pense)/],
 ['Surface',/surface[^.!?]{0,45}(?:à confirmer|à v[ée]rifier)/]];
 vr.forEach(([n,r])=>{if(has(t,r))verify.push(n)});
 if(verify.length)add(f,'À vérifier',verify.join(' · '));
 const src=[];
 if(has(t,/(?:propriétaire|vendeur)[^.!?]{0,30}(?:me dit|indique|précise|déclare|pense)/))src.push('Déclaration propriétaire/vendeur présente dans la dictée');
 if(has(t,/\bj[' ]ai mesur[ée]\b|\bmesur[ée] au laser\b/))src.push('Mesure agent mentionnée');
 if(src.length)add(f,'Provenance / prudence',src.join(' · '));

 return f;
}

function render(facts){
 const box=$('#facts'); if(!box)return;
 const order=['Type de bien','Surface habitable / Carrez','Pièces','Chambres','Configuration','Distribution','Surfaces par pièce','Cuisine','Électroménager','Sanitaires',
 'Menuiseries','Fermetures','Chauffage','Climatisation','Eau chaude','Compteurs','Réseaux','Électricité — état','État général','Désordres constatés','Travaux identifiés',
 'Extérieurs','Annexes','Vue','Atouts','Nuisances / points faibles','Diagnostics','Copropriété','Taxe foncière','Charges','À vérifier','Provenance / prudence'];
 const rows=[];
 for(const k of order) if(facts[k]) rows.push([k,facts[k]]);
 rows.push(['Notes de visite',$('#notes')?.value||'']);
 box.innerHTML=rows.map(([k,v])=>`<div class="fact"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('');
}

document.addEventListener('DOMContentLoaded',()=>{
 const btn=$('#analyse');
 if(!btn)return;
 // Capture phase: our professional parser owns the final rendering, while microphone stays untouched.
 btn.addEventListener('click',()=>{
   setTimeout(()=>{
     const raw=($('#notes')?.value||'')+' '+($('#correction')?.value||'');
     render(interpret(raw));
   },0);
 },true);
});
})();