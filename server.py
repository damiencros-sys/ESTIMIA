
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
import os, json, uuid, urllib.request, urllib.error, urllib.parse, mimetypes, re

BASE=Path(__file__).resolve().parent
DATA=BASE/"data"; DATA.mkdir(exist_ok=True)
app=FastAPI(title="ESTIM'IA V2")
app.mount("/static",StaticFiles(directory=BASE/"static"),name="static")

@app.get("/")
def home(): return FileResponse(BASE/"static"/"index.html")


def get_json(url, timeout=20):
    req=urllib.request.Request(url,headers={"User-Agent":"ESTIMIA/10"})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.loads(r.read())

@app.get("/api/geocode")
def geocode(q:str):
    """Recherche/normalisation d'adresse via le service public IGN Géoplateforme."""
    q=q.strip()
    if len(q)<3: return {"results":[]}
    url="https://data.geopf.fr/geocodage/search/?"+urllib.parse.urlencode({"q":q,"limit":6})
    try:
        data=get_json(url)
        out=[]
        for f in data.get("features",[])[:6]:
            p=f.get("properties",{})
            out.append({
                "label":p.get("label") or p.get("name") or "",
                "postcode":p.get("postcode") or "",
                "city":p.get("city") or p.get("municipality") or "",
                "citycode":p.get("citycode") or p.get("city_code") or "",
                "score":p.get("score"),
                "parcels":p.get("cad_parcelles") or p.get("parcelles") or [],
                "coordinates":(f.get("geometry") or {}).get("coordinates")
            })
        return {"results":out}
    except Exception as e:
        raise HTTPException(502,"Le service public d'adresses ne répond pas pour le moment.")


def _norm_name(s):
    import unicodedata
    s=unicodedata.normalize("NFD",s or "")
    s="".join(c for c in s if unicodedata.category(c)!="Mn").lower()
    return re.sub(r"[^a-z0-9]+"," ",s).strip()

def _resolve_commune(q):
    q=(q or "").strip()
    if re.fullmatch(r"\d{5}",q): return {"name":q,"code":q,"postcode":""}
    mcp=re.search(r"\b(\d{5})\b",q); cp=mcp.group(1) if mcp else ""
    wanted=re.sub(r"\b\d{5}\b"," ",q).strip(" ,.-")
    if cp:
        try:
            rows=get_json(f"https://apicarto.ign.fr/api/codes-postaux/communes/{cp}")
            if isinstance(rows,dict): rows=rows.get("communes") or rows.get("results") or []
            nw=_norm_name(wanted); choices=[]
            for row in rows or []:
                name=row.get("nomCommune") or row.get("nom") or row.get("libelle") or row.get("name") or ""
                code=row.get("codeCommune") or row.get("code_insee") or row.get("insee") or row.get("code") or ""
                if name and code:
                    score=4 if _norm_name(name)==nw else (2 if nw and (nw in _norm_name(name) or _norm_name(name) in nw) else 0)
                    choices.append((score,{"name":name,"code":str(code),"postcode":cp}))
            if choices:
                choices.sort(key=lambda x:x[0],reverse=True)
                if choices[0][0]>0 or len(choices)==1:return choices[0][1]
        except Exception: pass
    for query in [q,wanted]:
        if not query: continue
        try:
            u="https://data.geopf.fr/geocodage/search/?"+urllib.parse.urlencode({"q":query,"limit":10})
            fs=get_json(u).get("features",[]); nw=_norm_name(wanted or query); choices=[]
            for f in fs:
                pr=f.get("properties",{})
                code=pr.get("citycode") or pr.get("city_code") or ""
                name=pr.get("city") or pr.get("municipality") or pr.get("name") or ""
                pc=pr.get("postcode") or cp or ""
                if isinstance(name,list): name=name[0] if name else ""
                if isinstance(code,list): code=code[0] if code else ""
                if isinstance(pc,list): pc=pc[0] if pc else ""
                if not name or not code: continue
                score=4 if _norm_name(name)==nw else (2 if nw and (nw in _norm_name(name) or _norm_name(name) in nw) else 0)
                if cp and str(pc)==cp: score+=3
                choices.append((score,{"name":name,"code":str(code),"postcode":str(pc)}))
            if choices:
                choices.sort(key=lambda x:x[0],reverse=True); return choices[0][1]
        except Exception: pass
    return None

@app.get("/api/commune")
def commune_lookup(q:str):
    return {"result":_resolve_commune(q)}

@app.get("/api/cadastre")
def cadastre(commune:str, section:str, numero:str):
    commune=commune.strip()
    resolved={"name":commune,"code":commune,"postcode":""} if re.fullmatch(r"\d{5}",commune) else _resolve_commune(commune)
    if not resolved or not resolved.get("code"): raise HTTPException(400,"Commune non reconnue.")
    code_insee=str(resolved["code"]); commune_name=resolved.get("name") or commune
    sec=re.sub(r"[^A-Za-z0-9]","",section.upper().strip())
    if not sec: raise HTTPException(400,"Section cadastrale manquante.")
    if sec.isdigit(): sec=sec.zfill(2)
    no=re.sub(r"\D","",numero).zfill(4)
    if not no.strip("0"): raise HTTPException(400,"Numéro de parcelle invalide.")
    url="https://apicarto.ign.fr/api/cadastre/parcelle?"+urllib.parse.urlencode({"code_insee":code_insee,"section":sec,"numero":no})
    try:
        d=get_json(url); fs=d.get("features",[])
        if not fs:return {"found":False,"commune":commune_name,"code_insee":code_insee,"section":sec,"numero":no}
        return {"found":True,"commune":commune_name,"code_insee":code_insee,"section":sec,"numero":no,
                "properties":fs[0].get("properties",{}),"geometry":fs[0].get("geometry")}
    except Exception:
        raise HTTPException(502,"Le service cadastral IGN ne répond pas pour le moment.")

@app.post("/api/transcribe")
async def transcribe(audio: UploadFile=File(...)):
    content=await audio.read()
    if not content: raise HTTPException(400,"Enregistrement audio vide.")
    ctype=audio.content_type or "audio/webm"
    try:
        result=multipart_request(
            "https://api.openai.com/v1/audio/transcriptions",
            {"model":"gpt-transcribe","language":"fr"},
            [("file",audio.filename or "visite.webm",content,ctype)],
            {"Authorization":f"Bearer {api_key()}"}
        )
        return {"text":result.get("text","")}
    except urllib.error.HTTPError as e:
        detail=e.read().decode(errors="ignore")
        raise HTTPException(e.code,detail[:800])
    except Exception as e: raise HTTPException(500,str(e))

class StructReq(BaseModel):
    notes:str
    address:str=""
    type:str=""
    surface:str=""

@app.post("/api/structure")
def structure(req:StructReq):
    prompt=f"""Tu es ESTIM'IA, assistant d'un agent immobilier français.
Transforme les notes de visite en JSON factuel. N'invente rien.
Conserve les incertitudes avec la mention "à confirmer".
Adresse: {req.address}
Type déclaré: {req.type}
Surface déclarée: {req.surface}
Notes:
{req.notes}

Retourne UNIQUEMENT un objet JSON avec, quand disponible:
type_retenu, surface_m2, pieces, chambres, surfaces_chambres, etage_niveau,
exposition, terrasse_balcon, parking_garage, cave_annexes, etat_general,
travaux_rafraichissement, chauffage, climatisation, menuiseries, volets,
dpe, diagnostics, acces, vue, cuisine, salle_eau_sdb, wc, points_valorisants,
points_a_pondérer, questions_a_confirmer."""
    payload=json.dumps({
        "model":"gpt-5.6-luna",
        "input":prompt,
        "text":{"format":{"type":"json_object"}}
    }).encode()
    request=urllib.request.Request("https://api.openai.com/v1/responses",data=payload,headers={
        "Authorization":f"Bearer {api_key()}","Content-Type":"application/json"
    },method="POST")
    try:
        with urllib.request.urlopen(request,timeout=120) as r: data=json.loads(r.read())
        text=""
        for item in data.get("output",[]):
            for c in item.get("content",[]):
                if c.get("type")=="output_text": text+=c.get("text","")
        return json.loads(text)
    except urllib.error.HTTPError as e:
        raise HTTPException(e.code,e.read().decode(errors="ignore")[:800])
    except Exception as e: raise HTTPException(500,str(e))

@app.post("/api/save")
async def save(address:str=Form(""),type:str=Form(""),surface:str=Form(""),notes:str=Form(""),correction:str=Form(""),
               owner:str=Form(""),owner_phone:str=Form(""),cad_commune:str=Form(""),cad_section:str=Form(""),cad_parcel:str=Form(""),
               photos:list[UploadFile]=File(default=[])):
    did="EST-"+uuid.uuid4().hex[:8].upper()
    folder=DATA/did; folder.mkdir()
    meta={"id":did,"owner":owner,"owner_phone":owner_phone,"address":address,"type":type,"surface":surface,
          "cadastre":{"commune":cad_commune,"section":cad_section,"parcel":cad_parcel},
          "notes":notes,"correction":correction}
    saved=0
    for i,p in enumerate(photos[:60],1):
        raw=await p.read()
        ext=Path(p.filename or "").suffix.lower() or ".jpg"
        (folder/f"{i:02d}{ext}").write_bytes(raw); saved+=1
    (folder/"dossier.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf-8")
    return {"id":did,"photos":saved}
