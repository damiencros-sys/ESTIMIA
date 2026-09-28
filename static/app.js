
const $=s=>document.querySelector(s);
let mediaRecorder=null, chunks=[], audioBlob=null, photoFiles=[];

function setStatus(id,msg){$(id).textContent=msg}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

$('#photos').addEventListener('change',e=>{
  photoFiles=[...e.target.files].slice(0,60);
  const g=$('#gallery'); g.innerHTML='';
  photoFiles.forEach(f=>{const im=document.createElement('img');im.src=URL.createObjectURL(f);im.alt=f.name;g.appendChild(im)});
  setStatus('#photoStatus',photoFiles.length?`${photoFiles.length} photo(s) prête(s) pour ce dossier.`:'');
});

$('#record').addEventListener('click',async()=>{
  if(mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); return; }
  if(!navigator.mediaDevices?.getUserMedia){
    setStatus('#recordStatus',"Le navigateur ne donne pas accès au micro. Ouvre ESTIM’IA depuis son adresse HTTPS dans Chrome.");
    return;
  }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks=[];
    const preferred=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
    mediaRecorder=new MediaRecorder(stream, preferred?{mimeType:preferred}:undefined);
    mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    mediaRecorder.onstart=()=>{$('#record').textContent='⏹️ Arrêter et transcrire';$('#record').classList.add('recording');setStatus('#recordStatus','🎙️ Enregistrement en cours… parle normalement.')};
    mediaRecorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      $('#record').textContent='🎙️ Démarrer la dictée';$('#record').classList.remove('recording');
      audioBlob=new Blob(chunks,{type:mediaRecorder.mimeType||'audio/webm'});
      $('#playback').src=URL.createObjectURL(audioBlob);$('#playback').hidden=false;
      await transcribe();
    };
    mediaRecorder.start();
  }catch(err){setStatus('#recordStatus',"Accès au micro refusé. Autorise le micro pour ce site dans Chrome puis réessaie.");}
});

async function transcribe(){
  setStatus('#recordStatus','Transcription IA en cours…');
  const fd=new FormData(); fd.append('audio',audioBlob,'visite.webm');
  try{
    const r=await fetch('/api/transcribe',{method:'POST',body:fd});
    const j=await r.json();
    if(!r.ok) throw new Error(j.detail||'Erreur');
    const old=$('#notes').value.trim();
    $('#notes').value=(old?old+'\n':'')+j.text;
    setStatus('#recordStatus','✓ Dictée transcrite. Tu peux la corriger avant analyse.');
  }catch(e){setStatus('#recordStatus','Transcription impossible : '+e.message);}
}

$('#analyse').addEventListener('click',async()=>{
  const notes=$('#notes').value.trim();
  if(!notes){setStatus('#recordStatus','Dicte ou écris d’abord tes notes.');return}
  $('#facts').innerHTML='<div class="empty">Analyse IA en cours…</div>';
  try{
    const r=await fetch('/api/structure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes,address:$('#address').value,type:$('#type').value,surface:$('#surface').value})});
    const j=await r.json(); if(!r.ok)throw new Error(j.detail||'Erreur');
    renderFacts(j);
  }catch(e){$('#facts').innerHTML=`<div class="empty">Analyse impossible : ${esc(e.message)}</div>`}
});

function renderFacts(j){
  const entries=Object.entries(j).filter(([k,v])=>v!==null&&v!==''&&!(Array.isArray(v)&&!v.length));
  $('#facts').innerHTML=entries.length?entries.map(([k,v])=>`<div class="fact"><span>${esc(k)}</span><strong>${esc(Array.isArray(v)?v.join(' · '):typeof v==='object'?JSON.stringify(v):v)}</strong></div>`).join(''):'<div class="empty">Aucune information structurée.</div>';
}

$('#save').addEventListener('click',async()=>{
  const fd=new FormData();
  fd.append('address',$('#address').value);fd.append('type',$('#type').value);fd.append('surface',$('#surface').value);
  fd.append('notes',$('#notes').value);fd.append('correction',$('#correction').value);
  photoFiles.forEach(f=>fd.append('photos',f));
  try{
    const r=await fetch('/api/save',{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw new Error(j.detail||'Erreur');
    setStatus('#saveStatus',`✓ Dossier ${j.id} enregistré (${j.photos} photo(s)).`);
  }catch(e){setStatus('#saveStatus','Enregistrement impossible : '+e.message)}
});

$('#new').addEventListener('click',()=>{if(confirm('Créer un nouveau dossier ?'))location.reload()});
