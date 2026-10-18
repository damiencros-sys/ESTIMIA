(function(){
'use strict';
const q=s=>document.querySelector(s), host=q('#estCheckFields'), launch=q('#launchEstimation');if(!host||!launch)return;
const schemas={
 maison:[['configuration','Configuration de la maison','select',['','Individuelle (4 façades)','Jumelée (1 mur mitoyen)','Mitoyenne des deux côtés','Autre configuration']],['terrain','Surface du terrain (m²)','number'],['etat','État général','select',['','Bon état','À rafraîchir','À rénover','À réhabiliter']],['travaux','Travaux importants à prévoir','select',['','Non','Oui']],['occupation','Situation du bien','select',['','Libre','Occupé / loué']]],
 appartement:[['surfaceCarrez','Surface Carrez (m²)','number'],['etage','Étage du logement','number'],['copro','Situation en copropriété','select',['','Oui','Non']],['charges','Charges annuelles (€)','number'],['etat','État général','select',['','Bon état','À rafraîchir','À rénover','À réhabiliter']],['travaux','Travaux importants à prévoir','select',['','Non','Oui']],['occupation','Situation du bien','select',['','Libre','Occupé / loué']]],
 immeuble:[['lots','Nombre de logements','number'],['surfaceTotale','Surface totale habitable (m²)','number'],['occupation','Situation des logements','select',['','Tous libres','Tous loués','Occupation mixte']],['loyers','Loyers mensuels totaux (€)','number'],['etat','État général','select',['','Bon état','À rafraîchir','À rénover','À réhabiliter']],['travaux','Travaux importants à prévoir','select',['','Non','Oui']]],
 terrain:[['terrain','Surface du terrain (m²)','number'],['constructible','Constructibilité vérifiée','select',['','Constructible','Non constructible']],['acces','Accès','select',['','Accès existant','Accès à créer']],['viabilisation','Viabilisation','select',['','Viabilisé','À viabiliser']],['zonage','Zone PLU','text']],
 commercial:[['surfaceTotale','Surface utile (m²)','number'],['occupation','Occupation','select',['','Libre','Loué']],['bail','Bail commercial','select',['','Oui','Non']],['loyers','Loyer mensuel (€)','number'],['etat','État général','select',['','Bon état','À rafraîchir','À rénover','À réhabiliter']]]
};
let current='', values={},lastKey='';
function kind(){const t=(q('#type')?.value||'').toLowerCase();return t.includes('immeuble')?'immeuble':t.includes('terrain')?'terrain':t.includes('commercial')||t.includes('local')?'commercial':t.includes('appart')?'appartement':t.includes('maison')||t.includes('villa')?'maison':'';}
function key(){return 'estimia-check-61:'+(q('#address')?.value||'').trim().toLowerCase()+':'+kind();}
function load(){const k=key();if(k===lastKey)return;lastKey=k;try{values=JSON.parse(localStorage.getItem(k)||'{}')}catch{values={}}}
function save(){try{localStorage.setItem(key(),JSON.stringify(values))}catch{}}
function known(id){const source={etat:'#estCondition',occupation:'#estAvailability',terrain:'#estTerrain',surfaceCarrez:'#surfaceCarrez',charges:'#estCharges'}[id];return source?(q(source)?.value||'').trim():'';}
function prefill(id){if(values[id])return values[id];if(id==='configuration'){const raw=(q('#estPartyWall')?.value||'').toLowerCase();if(/non.mitoyen|individuelle|quatre fa.ades|4 fa.ades/.test(raw))return 'Individuelle (4 façades)';if(/jumel/.test(raw))return 'Jumelée (1 mur mitoyen)';if(/deux c.t.s|2 c.t.s/.test(raw))return 'Mitoyenne des deux côtés';return '';}const v=known(id);if(id==='occupation'){if(/libre/i.test(v))return 'Libre';if(/occup/i.test(v))return 'Occupé / loué';return '';}return v;}
function render(){load();const k=kind();if(k===current && host.children.length){for(const [id] of schemas[k]||[]){const el=host.querySelector('[data-check="'+id+'"]');if(el&&!el.value){const v=prefill(id);if(v)el.value=v;}}update();return;}current=k;host.replaceChildren();if(!k){host.textContent='Indique d’abord le type de bien (maison, appartement, immeuble, terrain ou local commercial).';update();return;}
for(const [id,title,mode,opts] of schemas[k]){const lab=document.createElement('label');lab.textContent=title+' *';const el=document.createElement(mode==='select'?'select':'input');el.dataset.check=id;if(mode==='select'){for(const opt of opts){const o=document.createElement('option');o.value=opt;o.textContent=opt||'— Sélectionner —';el.append(o);}}else{el.type=mode;if(mode==='number'){el.min='0';el.step='any';}}el.value=prefill(id);el.addEventListener('change',()=>{values[id]=el.value;save();sync(id,el.value);update()});el.addEventListener('input',()=>{values[id]=el.value;save();sync(id,el.value);update()});lab.append(el);host.append(lab);}update();}
function sync(id,value){const dest={configuration:'#estPartyWall',etat:'#estCondition',charges:'#estCharges',occupation:'#estAvailability'}[id];if(!dest)return;const el=q(dest);if(!el)return;if(id==='configuration'){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}else if(id==='etat'){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}else if(id==='charges'){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}else if(id==='occupation'){el.value=value==='Libre'?'Libre':value?'Occupé':'';el.dispatchEvent(new Event('change',{bubbles:true}));}}
function missing(){const k=kind(),surface=Number(q('#surfaceHab')?.value||0),commune=(q('#cadCommune')?.value||'').trim()||(q('#address')?.value||'').trim();const misses=[];if(!k)misses.push('type de bien');if(!commune)misses.push('commune / adresse');if(!surface||surface<=0)misses.push('surface habitable');for(const [id,title,mode] of schemas[k]||[]){const el=host.querySelector('[data-check="'+id+'"]');const v=(el?.value||'').trim();if(!v||(mode==='number'&&(!Number.isFinite(Number(v))||Number(v)<0))||(mode==='number'&&['terrain','surfaceCarrez','surfaceTotale','lots'].includes(id)&&Number(v)<=0))misses.push(title.toLowerCase());}return misses;}
function update(){const misses=missing();launch.disabled=misses.length>0;const msg=q('#estCheckStatus');if(msg)msg.textContent=misses.length?'Estimation verrouillée : '+misses.join(' ; ')+'.':'✓ Informations obligatoires renseignées. Recherche DVF autorisée (estimation statistique indicative).';}
// Recherche cadastrale automatique uniquement si la surface du terrain n'est pas déjà saisie.
let cadRequestKey='',cadRequestBusy=false;
async function fillTerrainFromCadastre(){
 if(kind()!=='maison'&&kind()!=='terrain')return;
 const el=host.querySelector('[data-check="terrain"]');if(!el||el.value||cadRequestBusy)return;
 const commune=(q('#cadCommune')?.value||'').trim();let refs=[];
 try{refs=JSON.parse(q('#cadParcelsJSON')?.value||'[]')}catch{}
 if(!commune||!Array.isArray(refs)||!refs.length)return;
 const key=commune+JSON.stringify(refs);if(key===cadRequestKey)return;
 cadRequestKey=key;cadRequestBusy=true;
 let note=q('#estCadSurfaceNote');if(!note){note=document.createElement('div');note.id='estCadSurfaceNote';note.className='small';host.append(note)}
 note.textContent='Recherche de la contenance cadastrale des parcelles…';
 try{
  const r=await fetch('/api/cadastre/surfaces?'+new URLSearchParams({commune,refs:JSON.stringify(refs)}));
  if(!r.ok)throw Error('Service cadastral indisponible');
  const data=await r.json();
  if(data.complet&&data.surface_totale_m2>0){
   note.textContent='Surface cadastrale trouvée : '+data.surface_totale_m2+' m² ('+data.parcelles.map(p=>p.section+' '+p.numero+' : '+p.surface_m2+' m²').join(' ; ')+'). À confirmer : correspond-elle au terrain vendu ?';
   const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Confirmer cette surface pour le terrain vendu';confirm.className='miniBtn';
   confirm.addEventListener('click',()=>{if(!el.value){el.value=data.surface_totale_m2;values.terrain=el.value;save();update()}confirm.remove();note.textContent+=' — Surface confirmée.'});note.append(' ',confirm);
  }else note.textContent='Contenance cadastrale non disponible pour toutes les parcelles. Vérifier les références ou renseigner la surface manuellement.';
 }catch(e){note.textContent='Recherche cadastrale indisponible. La surface peut être saisie manuellement.'}
 finally{cadRequestBusy=false}
}
q('#cadParcelsJSON')?.addEventListener('change',()=>{cadRequestKey='';fillTerrainFromCadastre()});
q('#cadCommune')?.addEventListener('change',()=>{cadRequestKey='';fillTerrainFromCadastre()});
window.estimiaEstimationCheck={validate:()=>{render();const m=missing();if(m.length){q('#estCheckStatus')?.scrollIntoView({behavior:'smooth',block:'center'});return false;}return true;},refresh:render};
for(const id of ['type','surfaceHab','cadCommune','address','estCondition','estPartyWall'])q('#'+id)?.addEventListener('change',render);
setInterval(()=>{render();fillTerrainFromCadastre()},1800);render();fillTerrainFromCadastre();
})();
