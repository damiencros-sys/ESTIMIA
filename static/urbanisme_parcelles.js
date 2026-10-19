/* ESTIM'IA V13.87 — urbanisme officiel, indépendant de l'estimation. */
(()=>{'use strict';
const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={key:'',results:[]},epoch=0,timer,active=false;
const commune=()=>($('#cadCommune')?.dataset.insee||$('#cadCommune')?.value||'').trim();
function references(){try{const refs=JSON.parse($('#cadParcelsJSON')?.value||'[]');return Array.isArray(refs)?refs.filter(p=>p.section&&p.numero).map(p=>({section:String(p.section).toUpperCase(),numero:String(Number(p.numero))})):[]}catch{return []}}
const key=()=>JSON.stringify([commune(),references()]);
const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
const link=(url,label)=>safeURL(url)?`<a href="${escape(safeURL(url))}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`:'';
const date=s=>{const d=new Date(s);return Number.isNaN(d.valueOf())?String(s||''):d.toLocaleString('fr-FR')};
function zoneText(z){return z.label+(z.description?' — '+z.description:'')+(Number.isFinite(z.part_percent)?' — env. '+(z.part_percent<.01?'< 0,01':z.part_percent.toLocaleString('fr-FR',{maximumFractionDigits:2}))+' % de la parcelle':'')}
function save(){if($('#urbanismeJSON'))$('#urbanismeJSON').value=JSON.stringify(state);$('#urbanismeJSON')?.dispatchEvent(new Event('change',{bubbles:true}));}
function display(){
 const box=$('#urbanismeResults');if(!box)return;
 if(state.key!==key()||!state.results.length){box.innerHTML='<p class="small">Ajoutez la commune et les parcelles cadastrales, puis consultez leur urbanisme.</p>';return}
 box.innerHTML=state.results.map(r=>`<article class="urbanismeParcel"><h4>Parcelle ${escape(r.section)} ${escape(r.numero)} — ${escape(r.commune||commune())}</h4><p><strong>Document / régime : ${escape(r.regime||'Non déterminé')}</strong></p><p class="small">${escape(r.message||'')}</p>${(r.documents||[]).map(d=>`<div class="urbanismeDocument">${link(d.url,d.type+' — '+(d.title||d.name))}<div class="small">${escape(d.name)} · ${escape(d.effective_status==='EN_VIGUEUR'?'En vigueur selon le GPU':d.effective_status)} · ${escape(d.legal_status==='APPROVED'?'Approuvé':d.legal_status)}${d.publication_date?' · Publié le '+escape(d.publication_date):''}</div></div>`).join('')}<p><b>Zonage de la parcelle</b></p>${r.zones?.length?'<ul>'+r.zones.map(z=>'<li>'+escape(zoneText(z))+(z.approval_date?' <span class="small">(approbation '+escape(z.approval_date.replace(/^(\d{4})(\d{2})(\d{2})$/,'$3/$2/$1'))+')</span>':'')+(z.regulation_url?' · '+link(z.regulation_url,'Règlement écrit'):z.regulation_file?' · '+escape(z.regulation_file):'')+'</li>').join('')+'</ul>':'<p class="small">'+escape(r.zoning_message||'Zonage non déterminé.')+'</p>'}<p class="small">${link(r.source_url,'Source : '+(r.source||'GPU'))}${r.consulted_at?' · Consulté le '+escape(date(r.consulted_at)):''}</p>${r.status!=='ok'?'<p class="small">Information partielle ou à vérifier.</p>':''}${r.note?'<p class="small">'+escape(r.note)+'</p>':''}</article>`).join('');
}
function invalidate(){
 if(state.key===key())return;
 epoch++;active=false;state={key:'',results:[]};if($('#urbanismeJSON'))$('#urbanismeJSON').value='';display();
 if($('#urbanismeStatus'))$('#urbanismeStatus').textContent='Parcelles ou commune modifiées : données à consulter.';
 if($('#loadUrbanisme'))$('#loadUrbanisme').disabled=false;
}
async function refresh(){
 const refs=references(),com=commune();if(!com||!refs.length){$('#urbanismeStatus').textContent='Renseignez la commune et ajoutez au moins une parcelle.';return}
 if(refs.length>20){$('#urbanismeStatus').textContent='Consultez au maximum 20 parcelles par dossier.';return}
 const task=++epoch,signature=key();active=true;$('#loadUrbanisme').disabled=true;
 state={key:signature,results:[]};display();$('#urbanismeStatus').textContent='Consultation officielle en cours…';let cursor=0;
 async function worker(){while(cursor<refs.length){const parcel=refs[cursor++],controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);let result;
 try{const response=await fetch('/api/urbanisme/parcelle?'+new URLSearchParams({commune:com,section:parcel.section,numero:parcel.numero}),{signal:controller.signal});result=await response.json();if(!response.ok)throw Error(result?.detail||'Service indisponible');if(!result||!Array.isArray(result.documents)||!Array.isArray(result.zones))throw Error('Réponse du service urbanisme inexploitable.');}
 catch(e){result={...parcel,commune:com,regime:'Non déterminé',status:'indisponible',documents:[],zones:[],message:e.name==='AbortError'?'Délai dépassé. Relancez la consultation.':String(e.message),zoning_message:'Consultation impossible : aucun zonage attribué.'}}
 finally{clearTimeout(timeout)}
 if(task!==epoch||signature!==key())return;
 state.results.push(result);state.results.sort((a,b)=>refs.findIndex(p=>p.section===a.section&&Number(p.numero)===Number(a.numero))-refs.findIndex(p=>p.section===b.section&&Number(p.numero)===Number(b.numero)));display();save();$('#urbanismeStatus').textContent=state.results.length+' / '+refs.length+' parcelle(s) consultée(s)…';
 }}
 await Promise.all([worker(),worker()]);if(task!==epoch)return;if(signature!==key()){invalidate();schedule();return;}
 active=false;$('#loadUrbanisme').disabled=false;$('#urbanismeStatus').textContent=state.results.length+' parcelle(s) consultée(s)'+(state.results.some(r=>r.status!=='ok')?' — certaines informations sont incomplètes.':'.');save();
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!active&&commune()&&references().length&&state.key!==key())refresh();},900)}
function restore(){epoch++;active=false;clearTimeout(timer);try{state=JSON.parse($('#urbanismeJSON')?.value||'null')||{key:'',results:[]};if(!Array.isArray(state.results))throw Error()}catch{state={key:'',results:[]}}if(state.key!==key())state={key:'',results:[]};display();if($('#loadUrbanisme'))$('#loadUrbanisme').disabled=false;if($('#urbanismeStatus'))$('#urbanismeStatus').textContent=state.results.length?'Consultation enregistrée restaurée — vous pouvez l’actualiser.':'';}
window.estimiaUrbanismeExport=()=>{
 if(state.key!==key())return [];
 return state.results.map(r=>({title:'Urbanisme — parcelle '+r.section+' '+r.numero+' — '+(r.commune||commune()),rows:[
 ['Document / régime',r.regime||'Non déterminé'],['Résultat',r.message||''],
 ...(r.documents||[]).flatMap(d=>[['Document publié',d.type+' — '+(d.title||d.name)],['Référence',d.name],['Statut GPU',d.effective_status==='EN_VIGUEUR'?'En vigueur selon le GPU':d.effective_status],['Source du document',d.url],...(d.publication_date?[['Publication',d.publication_date]]:[])]),
 ...(r.zones?.length?r.zones.flatMap(z=>[['Zonage',zoneText(z)],...(z.regulation_url?[['Règlement écrit',z.regulation_url]]:[])]):[['Zonage',r.zoning_message||'Non déterminé']]),
 ['Source',r.source_url||'https://www.geoportail-urbanisme.gouv.fr/'],['Consultation',date(r.consulted_at)],['Observation',r.note||'']
 ].filter(row=>row[1])}));
};
$('#loadUrbanisme')?.addEventListener('click',refresh);
document.addEventListener('change',()=>{const previous=state.key;invalidate();if(previous!==key())schedule()});
$('#cadCommune')?.addEventListener('input',()=>{delete $('#cadCommune').dataset.insee;invalidate();schedule()});
document.addEventListener('estimia:parcels-restored',restore);
restore();
})();
