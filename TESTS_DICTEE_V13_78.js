const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'static/v13_visite.js'),'utf8'),c={};vm.createContext(c);
vm.runInContext("const clean=s=>String(s||'').replace(/[’]/g,\"'\").replace(/\\s+/g,' ').trim();const n=s=>parseFloat(String(s).replace(',','.'));const fmt=x=>Number(x).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²';",c);
function include(start,end){vm.runInContext(src.slice(src.indexOf(start),src.indexOf(end)),c)}
include('function propertyUnits(text){','function typeOf(t)');include('function sharedAnnexAreas(text){','function declaredPropertySurface(text){');include('function markers(text){','// V13.77');include('function habitableRows(rows,text){','function explicitCarrez(text){');include('function countExplicit(t,nounRx){','function heating(t){');include('function workRemiseAt(t,index,length){','function annexes(t){');include('function annexes(t){','function menu(t){');
let tests=0;function test(name,fn){try{fn();console.log('OK',name);tests++}catch(e){console.error('ECHEC',name,e.message);process.exitCode=1;tests++}}
for(const room of ['WC','toilettes','salle de bains',"salle d’eau"]){for(const val of [2,4.5,15,15.01,40])test(room+' '+val+' m²',()=>{const t=room+' de '+String(val).replace('.',',')+' m².',rows=c.surfaces(t),warnings=c.sanitarySurfaceWarnings(t);if(val>15){assert(!rows.some(r=>r.val===val));assert(warnings.length===1);assert(!c.sanitary(t).some(r=>String(r[1]).includes(String(val))))}else{assert(rows.some(r=>r.val===val));assert.equal(warnings.length,0)}})}
for(const t of ['Au RDC, 1 WC situé dans la cave. Cave et garage de 40 m² au total.','Au RDC cave et garage font 40 m² avec un WC situé dans la cave.','Garage et cave de 40 m² au total. WC au RDC situé dans la cave.','Cave et garage avec 1 WC, le tout fait 40 m².'])test('surface commune : '+t,()=>{const rows=c.surfaces(t),groups=c.sharedAnnexAreas(t);assert.equal(groups.length,1);assert.equal(rows.filter(r=>r.val===40).length,1);assert(rows.find(r=>r.val===40).cat==='Annexe');assert(!rows.some(r=>/wc/i.test(r.name)));assert.equal(c.habitableRows(rows,t).reduce((a,r)=>a+r.val,0),0);const anns=c.annexes(t);assert(anns.some(r=>/surface totale/.test(r[0])&&/40/.test(r[2])));assert(!anns.some(r=>/^(Garage|Cave)$/.test(r[0])&&/40/.test(r[2])));});
test('surfaces cave et garage distinctes',()=>{const r=c.surfaces('Cave de 20 m² et garage de 30 m². WC de 2 m².');assert(!r.some(x=>/surface totale/.test(x.name)));assert(r.some(x=>x.name==='Cave'&&x.val===20));assert(r.some(x=>x.name==='garage'&&x.val===30));assert(r.some(x=>x.name==='WC'&&x.val===2))});
test('WC situé dans la cave de 40 m²',()=>{const t='Au RDC un WC situé dans la cave de 40 m².';assert(!c.surfaces(t).some(r=>/WC/.test(r.name)));assert(c.surfaces(t).some(r=>/cave/.test(r.name)&&r.val===40));assert(/cave/.test(JSON.stringify(c.sanitary(t))))});
test('WC de 4 m² situé dans cave exclu habitable',()=>{const t='WC de 4 m² situé dans la cave.';assert.equal(c.habitableRows(c.surfaces(t),t).length,0)});
test('SDB sans surface ne prend pas cave 40',()=>{const t='Salle de bains avec baignoire. Cave de 40 m².';assert(!/40/.test(JSON.stringify(c.sanitary(t))));assert.equal(c.sanitarySurfaceWarnings(t).length,0)});
test('bain 8 et garage 40 séparés',()=>{const t='Salle de bains de 8 m². Garage de 40 m².';assert(c.surfaces(t).some(r=>r.val===8&&/bain/.test(r.name)));assert(c.surfaces(t).some(r=>r.val===40&&/garage/i.test(r.name)))});
test('aucune surface inventée au WC',()=>assert(!c.surfaces('WC au RDC situé dans la cave.').length));
for(const t of ['WC du RDC situé dans la cave, la cave et le garage font 40 m² au total.','Cave et garage avec WC de 4 m², pour un total de 40 m².'])test('contexte complexe : '+t,()=>{const r=c.surfaces(t);assert.equal(r.filter(x=>x.val===40).length,1);assert(!r.some(x=>/wc/i.test(x.name)&&x.val===40))});
test('emplacement WC après une autre phrase',()=>assert(/Situé dans la cave/.test(JSON.stringify(c.sanitary('Séjour de 30 m². WC du RDC situé dans la cave.')))));
test('WC décimal dans la cave exclu habitable',()=>{const t='Au RDC WC de 4.5 m² situé dans la cave.';assert.equal(c.habitableRows(c.surfaces(t),t).length,0)});
test('surface commune annoncée avant les annexes',()=>{const r=c.surfaces('Au RDC 40 m² au total pour la cave et le garage, avec un WC.');assert.equal(r.filter(x=>x.val===40).length,1);assert.equal(r.find(x=>x.val===40).cat,'Annexe')});
test('salle de bains reste présente sans surface valide',()=>{assert(c.sanitary('Salle de bains de 40 m².').some(r=>r[0]==='Salle de bains'&&!/40/.test(r[1])))});

for(const label of ['maison','appartement','studio','immeuble','mas','terrain de loisir','terrain à bâtir','maison de village'])for(const val of ['10 mètres virgule 35 m²','10,35 m²','10.35 m²'])test(label+' — '+val,()=>{const r=c.surfaces(label+'. Chambre '+val+'.');assert.equal(r.filter(x=>/^chambre/i.test(x.name)).length,1);assert.equal(r.find(x=>/^chambre/i.test(x.name)).val,10.35)});
for(const phrase of ['Chambre de 10 mètres virgule 35 m².','Chambre de 10 virgule 35 m².','Chambre 1 de 10,35 m².','Chambre 1 10,35 m².','Chambre numéro 1 de 10,35 m².','Chambre de 10 , 35 m².'])test(phrase,()=>assert.equal(c.surfaces(phrase)[0].val,10.35));
for(const val of [9.3,10.35,24.99,25,25.01,35,300])test('Seuil chambre '+val,()=>{const t='Chambre de '+val+' m².';if(val<=25){assert(c.surfaces(t).some(x=>x.val===val));assert.equal(c.sanitarySurfaceWarnings(t).length,0)}else{assert.equal(c.surfaces(t).length,0);assert.equal(c.sanitarySurfaceWarnings(t).length,1);assert(!c.surfaces(t).some(x=>x.val===10.35))}});
test('Deux chambres distinctes de 10 m²',()=>assert.equal(c.surfaces('Une troisième chambre de 10 m². Une chambre supplémentaire de 10 m².').filter(x=>x.val===10).length,2));
test('Chambre 12 m² sans de',()=>assert.equal(c.surfaces('Chambre 12 m².')[0].val,12));
test('Grande pièce de séjour sans seuil chambre',()=>assert.equal(c.surfaces('Séjour de 35 m².')[0].val,35));
test('Deux chambres groupées et décimales',()=>{const r=c.surfaces('Deux chambres de 10,35 et 9,30 m².');assert.equal(r.length,2);assert.equal(r.reduce((n,x)=>n+x.val,0),19.65)});
const pomes='Maison sur deux niveaux au rez-de-chaussée un séjour salon salle à manger de 23 m² au total comprenant une cheminée ouverte une cuisine de 8,5 m². À l’étage une première chambre côté gauche de 9,30 m² avec une fissure sur un angle en haut de mur un palier de 3,8 m2, une deuxième chambre face à l’escalier de 10 mètres virgule 35 m² une 3e chambre de 10 m² un WC de 1,72 m² une chambre supplémentaire de 10 m² avec un placard intégré une salle de bain de 6 mètres carrés avec deux vasques baignoire et un couloir de distribution de 3,84 m² + 2,5 m².';
test('Cas capture total étage 57,51 et total 89,01',()=>{const r=c.surfaces(pomes);const first=r.filter(x=>x.lvl==='1er étage');assert.equal(first.filter(x=>/^chambre/i.test(x.name)).length,4);assert(Math.abs(first.reduce((a,x)=>a+x.val,0)-57.51)<.001);assert(Math.abs(c.habitableRows(r,pomes).reduce((a,x)=>a+x.val,0)-89.01)<.001);assert.equal(c.sanitarySurfaceWarnings(pomes).length,0)});
test('Correction d’une chambre suspecte',()=>{const t='Chambre de 35 m². Finalement la chambre fait 10,35 m².';assert.equal(c.surfaces(t).length,1);assert.equal(c.surfaces(t)[0].val,10.35);assert.equal(c.sanitarySurfaceWarnings(t).length,0)});
test('Correction chambre numérotée sans toucher la suivante',()=>{const t='Chambre 1 de 35 m². Chambre 2 de 12 m². Finalement la chambre 1 fait 10,35 m².';const r=c.surfaces(t);assert.equal(r.length,2);assert(r.some(x=>x.val===12));assert(r.some(x=>x.val===10.35));assert.equal(c.sanitarySurfaceWarnings(t).length,0)});
console.log(tests,'tests exécutés');

// V13.90 — corrections successives et logements distincts.
test('Appartement 115 corrigé à 97 et studio 17',()=>{const u=c.propertyUnits("L’appartement fait 115 m², le studio 17 m². Je corrige l’appartement fait 97 m² et le studio 17 mètres carrés.");assert.equal(u.length,2);assert.equal(u.find(x=>x.key==='appartement').surface,97);assert.equal(u.find(x=>x.key==='studio').surface,17)});
test('Couloir non écrasé par une correction de logement',()=>{const rows=c.surfaces("Je corrige l’appartement fait 97 m² et le studio 17 m² les surfaces des pièces le couloir 12,80 m² la chambre 1 12 m².");assert(rows.some(x=>x.name.toLowerCase()==='couloir'&&x.val===12.8))});
test('Surfaces avant deux salles de bains privatives',()=>{const rows=c.surfaces('Chambre 1 de 12 m² avec 5 m² de salle de bain privative. Chambre 2 de 11 m² avec 3 m² de salle de bain privative.');assert.deepEqual(Array.from(rows.filter(x=>/salle de bain/.test(x.name)),x=>x.val),[5,3])});
test('Même nom de pièces dans appartement et studio',()=>{const rows=c.surfaces('Appartement de 33 m². Studio de 19 m². Dans l’appartement : séjour de 25 m², cuisine de 8 m². Dans le studio : séjour de 15 m², cuisine de 4 m².');assert.equal(rows.reduce((v,r)=>v+r.val,0),52)});
test('Remise aux normes ne crée pas une annexe',()=>assert(!c.annexes('Travaux : remise aux normes électriques.').some(r=>r[0]==='Remise')));
console.log('Total actualisé : '+tests+' tests exécutés');

test('Transcription remise énorme électrique : pas une annexe',()=>assert(!c.annexes('Amélioration de l’isolation remise énorme électrique changement du mode de chauffage.').some(r=>r[0]==='Remise')));
test('Une vraie remise énorme de 40 m² reste une annexe',()=>assert(c.annexes('Une remise énorme de 40 m².').some(r=>r[0]==='Remise')));
console.log('Total V13.91 : '+tests+' tests exécutés');

// V13.93 — contrôles reproductibles sans dépendance ni accès réseau.
include('function owner(t){','function phone(t){');
include('function conditionSignals(text){','window.estimiaConditionSignals=');
const app93=fs.readFileSync(path.join(__dirname,'static/app.js'),'utf8');vm.runInContext(app93.slice(app93.indexOf('function normalizeElectricalPhrase(text){'),app93.indexOf('function cleanDictation(text){')),c);
for(const surname of ['TRAIZIT','POMES','Consorts CROS'])test('Nom sans prénom : '+surname,()=>{const p=c.ownerNameParts(surname);assert.equal(p.nom,surname);assert.equal(p.prenom,'')});
test('TRAIZIT suivi de l’apostrophe de l’appartement',()=>{const p=c.ownerNameParts('TRAIZIT l’');assert.equal(p.nom,'TRAIZIT');assert.equal(p.prenom,'')});
for(const name of ['MARTIN damien','COMBES Bernard','PIQUET Mireille','ROQUES Marcel','ASTRUC Sébatien'])test('Propriétaire nommé : '+name,()=>assert.equal(c.owner('Propriétaire '+name+'. Appartement de 50 m².'),name));
for(const phrase of ['remise énorme électrique','remise en norme électrique','remise aux normes électriques'])test('Normalisation électrique : '+phrase,()=>assert.equal(c.normalizeElectricalPhrase(phrase),'remise aux normes électriques'));
test('Vraie remise indépendante préservée',()=>assert.equal(c.normalizeElectricalPhrase('Une remise énorme de 40 m².'),'Une remise énorme de 40 m².'));
test('État par logement, sans état inventé au studio',()=>{const a=c.conditionSignals('Appartement de 97 m² à rénover entièrement. Studio de 17 m².');assert.equal(a.length,1);assert.equal(a[0].type,'appartement');assert.equal(a[0].condition,'À rénover')});
test('Négation de rénovation',()=>assert.equal(c.conditionSignals('Appartement qui n’est pas à rénover.').length,0));
test('Dernier état explicite conservé',()=>assert.equal(c.conditionSignals('Maison à rénover. Je corrige : maison en bon état.').at(-1).condition,'Bon état'));
const quality93=fs.readFileSync(path.join(__dirname,'static/estimation_v13_44.js'),'utf8');vm.runInContext(quality93.slice(quality93.indexOf('function adjustQuality(d,c){'),quality93.indexOf('let estimateTask=null')),c);
const base93={centrale:100000,basse:85000,haute:115000},config93={mode:'etat',condition:'À rénover',rate:-15,budget:0,other:0,reason:'',works:'',unitStates:{}};
test('Correction d’état : -15 %',()=>assert.equal(c.adjustQuality(base93,config93).centrale,85000));
test('Budget remplace la décote sans doublon',()=>assert.equal(c.adjustQuality(base93,{...config93,mode:'budget',budget:20000}).centrale,80000));
test('Plus-value explicitement chiffrée',()=>assert.equal(c.adjustQuality(base93,{...config93,mode:'budget',budget:20000,other:5000}).centrale,85000));
test('Comparables de même état : aucune correction',()=>assert.equal(c.adjustQuality(base93,{...config93,mode:'aucun'}).centrale,100000));
test('Budget supérieur à la valeur : refus sans montant négatif',()=>assert.throws(()=>c.adjustQuality(base93,{...config93,mode:'budget',budget:200000})));
console.log('Total V13.93 : '+tests+' tests exécutés');
