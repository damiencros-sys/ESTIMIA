// ESTIM'IA V6.1 — correctif d'interprétation.
// Important : ce fichier ne touche pas au moteur SpeechRecognition de app.js.
(function(){
  const baseStructure = window.localStructure;
  if(typeof baseStructure !== 'function') return;

  function correctedTerrace(raw){
    const t=String(raw||'').toLowerCase().replace(/[’]/g,"'");
    // Ex.: "terrasse 30 m², donc je me suis trompé je corrige 25 mètres carrés"
    const rx=/terrasse[^0-9]{0,20}\d+(?:[.,]\d+)?\s*(?:m2|m²|mètres?\s*carrés?)[^.!?]{0,90}?(?:pardon|non|je\s+me\s+suis\s+tromp[ée]|je\s+corrige|correction|rectification|en\s+fait|plut[oô]t)[^.!?]{0,50}?(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mètres?\s*carrés?)/i;
    const m=t.match(rx);
    return m ? m[1].replace('.',',') : null;
  }

  function detailedView(raw){
    const t=String(raw||'').toLowerCase();
    if(!/\bvue\b/.test(t)) return null;
    const parts=[];
    if(/tr[eè]s belle vue/.test(t)) parts.push('Très belle vue');
    else if(/belle vue/.test(t)) parts.push('Belle vue');
    else parts.push('Vue');
    if(/vue[^.!?]{0,55}d[ée]gag[ée]e/.test(t)) parts.push('dégagée');
    if(/vue[^.!?]{0,80}montagnes?/.test(t)) parts.push('sur les montagnes');
    else if(/vue[^.!?]{0,80}\bmer\b/.test(t)) parts.push('mer');
    if(/vue[^.!?]{0,60}panoramique/.test(t)) parts.push('panoramique');
    return [...new Set(parts)].join(' ');
  }

  function menuiseries(raw){
    const t=String(raw||'').toLowerCase();
    const p=[];
    if(/\bpvc blanc\b/.test(t)) p.push('PVC blanc');
    else if(/\bpvc\b/.test(t)) p.push('PVC');
    if(/\baluminium\b|\balu\b/.test(t)) p.push('Aluminium');
    if(/\bdouble vitrage\b/.test(t)) p.push('Double vitrage');
    return p.length ? [...new Set(p)].join(' · ') : null;
  }

  function climDetail(raw){
    const t=String(raw||'').toLowerCase();
    if(!/\bclimatisation\b|\bclim\b/.test(t)) return null;
    const z=[];
    // Accept "climatisation dans le salon et la chambre parentale".
    const after=(t.match(/(?:climatisation|clim)[^.!?]{0,120}/)||[''])[0];
    if(/\bsalon\b/.test(after)) z.push('salon');
    if(/\bchambre parentale\b/.test(after)) z.push('chambre parentale');
    if(/\bs[ée]jour\b/.test(after)) z.push('séjour');
    return z.length ? 'Oui — '+[...new Set(z)].join(' + ') : 'Oui';
  }

  window.localStructure=function(){
    const facts=baseStructure();
    const raw=(document.querySelector('#notes')?.value||'')+' '+(document.querySelector('#correction')?.value||'');

    const terrace=correctedTerrace(raw);
    if(terrace){
      facts['Terrasse']=terrace+' m²';
      if(facts['Surfaces par pièce']){
        let items=String(facts['Surfaces par pièce']).split(' · ')
          .filter(x=>!/^terrasse\s*:/i.test(x.trim()));
        items.push('terrasse : '+terrace+' m²');
        facts['Surfaces par pièce']=items.join(' · ');
      }
    }

    const v=detailedView(raw);
    if(v){
      facts['Vue']=v;
      delete facts['Éléments relevés'];
      if(facts['Atouts']){
        const kept=String(facts['Atouts']).split(' · ').filter(x=>!/^Vue/i.test(x.trim()));
        if(kept.length) facts['Atouts']=kept.join(' · '); else delete facts['Atouts'];
      }
    }

    const men=menuiseries(raw);
    if(men) facts['Menuiseries']=men;

    const clim=climDetail(raw);
    if(clim){
      facts['Climatisation']=clim;
      delete facts['Climatisation détaillée'];
    }

    return facts;
  };
})();