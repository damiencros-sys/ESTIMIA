// Audit reproductible. Execution : node TESTS_SURFACES_V13_76.js
// Les echecs sont des anomalies connues, pas une validation de la version.
const fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'static/v13_visite.js'),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext("const clean=s=>String(s||'').replace(/[’]/g,\"'\").replace(/\\s+/g,' ').trim();const n=s=>parseFloat(String(s).replace(',','.'));",ctx);
vm.runInContext(source.slice(source.indexOf('function sharedAnnexAreas(text){'),source.indexOf('function surfaces(text,includeSuspicious=false){')),ctx);
for(const [start,end]of [['function markers(text){','function surfaces(text,includeSuspicious=false){'],['function surfaces(text,includeSuspicious=false){','function declaredPropertySurface(text){'],['function habitableRows(rows,text){','function explicitCarrez(text){']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);
const tests=[['Chambre 12 m².',12],['Chambre de 12 m².',12],['Chambre 1 de 12 m².',12],['Séjour 30 m². Cuisine 10 m². Chambre 12 m².',52],['Chambre de 12,45 m².',12.45],['Deux chambres de 12 et 9 m².',21],['Couloir de 3,84 m² + 2,5 m².',6.34],['Séjour de 30 m². Finalement le séjour fait 28 m².',28],['Séjour de 300 m².',300],['Séjour de 30 m². Garage de 20 m². Cave de 8 m². Terrasse de 15 m².',30],['Séjour de 30 mètres carrés.',30],['Garage de 30 m² avec mezzanine de 15 m².',0]];
let failures=0;for(const[notes,expected]of tests){const rows=ctx.surfaces(notes),actual=ctx.habitableRows(rows,notes).reduce((n,r)=>n+r.val,0),pass=Math.abs(actual-expected)<.001;if(!pass)failures++;console.log(pass?'OK':'ECHEC',notes,'attendu',expected,'obtenu',actual)}console.log(tests.length,'tests,',failures,'echecs');process.exitCode=failures?1:0;
