
const fs=require('fs'),vm=require('vm');let s=fs.readFileSync('static/v13_visite.js','utf8'),a=s.indexOf('function markers(text){'),b=s.indexOf('\nfunction surfaces(text)',a),ctx={};vm.createContext(ctx);vm.runInContext(s.slice(a,b)+';this.markers=markers',ctx);
const cases=[
["Au rez-de-chaussée séjour 30 m². À l'étage chambre 12 m².",["Rez-de-chaussée","1er étage"]],
["RDC cuisine 10 m². A l étage chambre 1 12 m².",["Rez-de-chaussée","1er étage"]],
["Rez de chaussée séjour. Étage : chambre. À l'autre étage bureau.",["Rez-de-chaussée","1er étage","2e étage"]],
["RDC séjour. Au premier étage chambre. Au deuxième étage bureau.",["Rez-de-chaussée","1er étage","2e étage"]],
["RDC séjour. À l'étage chambre. On monte encore d'un étage, bureau.",["Rez-de-chaussée","1er étage","2e étage"]]
];let ok=true;for(const [t,w] of cases){const g=ctx.markers(t).map(x=>x.name),p=JSON.stringify(g)===JSON.stringify(w);console.log(p?'OK':'FAIL',g);if(!p)ok=false}process.exit(ok?0:1);
