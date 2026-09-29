
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

@app.get("/api/cadastre")
def cadastre(commune:str, section:str, numero:str):
    """Recherche directe d'une parcelle cadastrale. Le code INSEE est préférable."""
    commune=commune.strip()
    code_insee=commune if re.fullmatch(r"\d{5}",commune) else ""
    if not code_insee:
        # Résout d'abord le nom de commune avec le géocodeur public.
        try:
            u="https://data.geopf.fr/geocodage/search/?"+urllib.parse.urlencode({"q":commune,"type":"municipality","limit":1})
            d=get_json(u)
            fs=d.get("features",[])
            if fs:
                pr=fs[0].get("properties",{})
                code_insee=pr.get("citycode") or pr.get("city_code") or ""
        except Exception:
            pass
    if not code_insee:
        raise HTTPException(400,"Commune non reconnue : indique le nom exact ou le code INSEE.")
    sec=section.upper().strip()
    no=re.sub(r"\D","",numero).zfill(4)
    url="https://apicarto.ign.fr/api/cadastre/parcelle?"+urllib.parse.urlencode({"code_insee":code_insee,"section":sec,"numero":no})
    try:
        d=get_json(url)
        fs=d.get("features",[])
        if not fs: return {"found":False,"code_insee":code_insee}
        pr=fs[0].get("properties",{})
        return {"found":True,"code_insee":code_insee,"section":sec,"numero":no,
                "label":f"{code_insee} section {sec} parcelle {int(no)}",
                "properties":pr}
    except Exception:
        raise HTTPException(502,"Le service cadastral public ne répond pas pour le moment.")



def api_key():
    k=os.getenv("OPENAI_API_KEY")
    if not k: raise HTTPException(503,"La clé OPENAI_API_KEY n'est pas encore configurée sur le serveur.")
    return k

def multipart_request(url, fields, files, headers):
    boundary="----ESTIMIA"+uuid.uuid4().hex
    body=bytearray()
    for name,value in fields.items():
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    for name,filename,content,ctype in files:
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\nContent-Type: {ctype}\r\n\r\n".encode())
        body.extend(content); body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())
    h={**headers,"Content-Type":f"multipart/form-data; boundary={boundary}"}
    req=urllib.request.Request(url,data=bytes(body),headers=h,method="POST")
    with urllib.request.urlopen(req,timeout=120) as r: return json.loads(r.read())

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
