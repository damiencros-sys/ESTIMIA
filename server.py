
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
import os, json, uuid, urllib.request, urllib.error, urllib.parse, mimetypes, re, math, io

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
def geocode(q:str, postcode:str="", city:str="", citycode:str=""):
    """Vérification stricte dans le référentiel national d'adresse alimenté par les BAL.
    Une réponse située dans une autre commune n'est jamais renvoyée.
    """
    q=q.strip(); postcode=postcode.strip(); city=city.strip(); citycode=citycode.strip()
    if len(q)<3: return {"results":[]}
    params={"q":q,"limit":15}
    if postcode: params["postcode"]=postcode
    if citycode: params["citycode"]=citycode
    url="https://data.geopf.fr/geocodage/search/?"+urllib.parse.urlencode(params)
    try:
        data=get_json(url); out=[]; wanted_city=_norm_name(city)
        for f in data.get("features",[]):
            pr=f.get("properties",{}); pc=str(pr.get("postcode") or "")
            cc=str(pr.get("citycode") or pr.get("city_code") or "")
            cn=pr.get("city") or pr.get("municipality") or ""
            if isinstance(cn,list): cn=cn[0] if cn else ""
            if isinstance(pc,list): pc=pc[0] if pc else ""
            if isinstance(cc,list): cc=cc[0] if cc else ""
            # Verrou commune : aucune proposition hors commune/CP demandé.
            if citycode and cc != citycode: continue
            if postcode and pc != postcode: continue
            if wanted_city and _norm_name(str(cn)) != wanted_city: continue
            out.append({
                "label":pr.get("label") or pr.get("name") or "", "postcode":pc,
                "city":cn, "citycode":cc, "score":pr.get("score"),
                "parcels":pr.get("cad_parcelles") or pr.get("parcelles") or [],
                "coordinates":(f.get("geometry") or {}).get("coordinates")
            })
        return {"results":out}
    except Exception:
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

def _parcel_feature(commune:str, section:str, numero:str):
    commune=(commune or "").strip()
    resolved={"name":commune,"code":commune,"postcode":""} if re.fullmatch(r"\d{5}",commune) else _resolve_commune(commune)
    if not resolved or not resolved.get("code"): raise HTTPException(400,"Commune non reconnue.")
    code_insee=str(resolved["code"]); commune_name=resolved.get("name") or commune
    sec=re.sub(r"[^A-Za-z0-9]","",section.upper().strip())
    if sec.isdigit(): sec=sec.zfill(2)
    no=re.sub(r"\D","",numero).zfill(4)
    url="https://apicarto.ign.fr/api/cadastre/parcelle?"+urllib.parse.urlencode({"code_insee":code_insee,"section":sec,"numero":no})
    d=get_json(url); fs=d.get("features",[])
    if not fs:return None,commune_name,code_insee,sec,no
    return fs[0],commune_name,code_insee,sec,no

def _geom_rings(g):
    if not g:return []
    c=g.get("coordinates") or []
    if g.get("type")=="Polygon": return c
    if g.get("type")=="MultiPolygon":
        out=[]
        for poly in c: out.extend(poly)
        return out
    return []

@app.get("/api/cadastre/plan")
def cadastre_plan(commune:str, section:str, numero:str):
    try:
        f,name,code,sec,no=_parcel_feature(commune,section,numero)
        if not f: raise HTTPException(404,"Parcelle non trouvée.")
        rings=_geom_rings(f.get("geometry")); pts=[p for ring in rings for p in ring if isinstance(p,list) and len(p)>=2]
        if not pts: raise HTTPException(404,"Géométrie cadastrale indisponible.")
        xs=[float(p[0]) for p in pts]; ys=[float(p[1]) for p in pts]
        xmin,xmax=min(xs),max(xs); ymin,ymax=min(ys),max(ys); dx=max(xmax-xmin,1e-9); dy=max(ymax-ymin,1e-9)
        W,H,P=900,520,45; scale=min((W-2*P)/dx,(H-2*P)/dy)
        def xy(p): return f"{P+(float(p[0])-xmin)*scale:.1f},{H-P-(float(p[1])-ymin)*scale:.1f}"
        paths=["M "+" L ".join(xy(p) for p in ring)+" Z" for ring in rings if len(ring)>=3]
        label=f"{name} - Section {sec} - Parcelle {int(no)}"; path_data=" ".join(paths)
        svg=("<svg xmlns='http://www.w3.org/2000/svg' width='900' height='520' viewBox='0 0 900 520'>"
             "<rect width='100%' height='100%' fill='white'/>"
             f"<text x='45' y='28' font-family='Arial,sans-serif' font-size='18' font-weight='700'>{label}</text>"
             f"<path d='{path_data}' fill='#f4f4f4' stroke='#222' stroke-width='3'/>"
             "<text x='45' y='505' font-family='Arial,sans-serif' font-size='12'>Contour cadastral officiel IGN - representation indicative</text></svg>")
        return Response(content=svg,media_type="image/svg+xml",headers={"Cache-Control":"no-store"})
    except HTTPException: raise
    except Exception: raise HTTPException(502,"Impossible de générer le plan cadastral pour le moment.")

def _lonlat_points(geometry):
    rings=_geom_rings(geometry)
    return [(float(p[0]),float(p[1])) for ring in rings for p in ring if isinstance(p,list) and len(p)>=2]

def _tile_xy(lon,lat,z):
    lat=max(min(lat,85.05112878),-85.05112878)
    n=2**z
    x=(lon+180.0)/360.0*n
    y=(1.0-math.asinh(math.tan(math.radians(lat)))/math.pi)/2.0*n
    return x,y

def _mercator(lon,lat):
    lat=max(min(float(lat),85.05112878),-85.05112878); lon=float(lon)
    R=6378137.0
    return R*math.radians(lon), R*math.log(math.tan(math.pi/4+math.radians(lat)/2))

def _context_map_png(commune,section,numero,width=760,height=520):
    from PIL import Image, ImageDraw
    f,name,code,sec,no=_parcel_feature(commune,section,numero)
    if not f: raise HTTPException(404,"Parcelle non trouvée.")
    geom=f.get("geometry"); rings=_geom_rings(geom)
    mpts=[_mercator(p[0],p[1]) for ring in rings for p in ring if len(p)>=2]
    if not mpts: raise HTTPException(404,"Géométrie cadastrale indisponible.")
    xs=[p[0] for p in mpts]; ys=[p[1] for p in mpts]
    cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
    span=max(max(xs)-min(xs),max(ys)-min(ys),55.0)*5.0
    # Emprise contextuelle, avec correction du ratio de l'image.
    aspect=width/height
    half_y=span/2; half_x=half_y*aspect
    bbox=(cx-half_x,cy-half_y,cx+half_x,cy+half_y)
    layers="AMORCES_CAD,LIEUDIT,CP.CadastralParcel,SUBFISCAL,CLOTURE,DETAIL_TOPO,HYDRO,VOIE_COMMUNICATION,BU.Building,BORNE_REPERE"
    params={"service":"WMS","version":"1.3","request":"GetMap","layers":layers,"styles":"",
            "format":"image/png","crs":"EPSG:3857","bbox":",".join(f"{v:.3f}" for v in bbox),
            "width":str(width),"height":str(height),"language":"fre"}
    url=f"https://inspire.cadastre.gouv.fr/scpc/{code}.wms?"+urllib.parse.urlencode(params)
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"ESTIMIA/13.8"})
        with urllib.request.urlopen(req,timeout=20) as r:
            raw=r.read(); ctype=r.headers.get("Content-Type","")
        if "image" not in ctype.lower(): raise ValueError("Réponse WMS non image")
        out=Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(502,"Le plan cadastral officiel DGFiP est momentanément indisponible.")
    draw=ImageDraw.Draw(out,"RGBA")
    xmin,ymin,xmax,ymax=bbox
    def px(pt):
        x,y=_mercator(pt[0],pt[1])
        return ((x-xmin)/(xmax-xmin)*width, height-(y-ymin)/(ymax-ymin)*height)
    for ring in rings:
        poly=[px(p) for p in ring if len(p)>=2]
        if len(poly)>=3: draw.polygon(poly,fill=(255,35,35,55),outline=(235,0,0,255),width=4)
    mx=(cx-xmin)/(xmax-xmin)*width; my=height-(cy-ymin)/(ymax-ymin)*height
    draw.ellipse((mx-10,my-10,mx+10,my+10),fill=(35,190,70,255),outline=(255,255,255,255),width=3)
    draw.rectangle((0,height-28,width,height),fill=(255,255,255,225))
    draw.text((8,height-22),f"{name} - Section {sec} - Parcelle {int(no)} | Plan cadastral officiel DGFiP",fill=(20,20,20,255))
    bio=io.BytesIO(); out.save(bio,format="PNG",optimize=True); bio.seek(0)
    return bio,name,code,sec,no

@app.get("/api/cadastre/map.png")
def cadastre_context_map(commune:str, section:str, numero:str):
    bio,_,_,_,_=_context_map_png(commune,section,numero)
    return StreamingResponse(bio,media_type="image/png",headers={"Cache-Control":"no-store"})

class WordPayload(BaseModel):
    owner:str=""
    phone:str=""
    address:str=""
    commune:str=""
    section:str=""
    parcel:str=""
    property_type:str=""
    surface:str=""
    facts:str=""

@app.post("/api/word")
def word_export(p:WordPayload):
    from docx import Document
    from docx.shared import Inches, Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    doc=Document()
    sec=doc.sections[0]; sec.top_margin=Inches(.55);sec.bottom_margin=Inches(.55);sec.left_margin=Inches(.65);sec.right_margin=Inches(.65)
    h=doc.add_heading("FICHE DE VISITE IMMOBILIÈRE",0); h.alignment=WD_ALIGN_PARAGRAPH.CENTER
    table=doc.add_table(rows=0,cols=2); table.alignment=WD_TABLE_ALIGNMENT.CENTER
    meta=[("Propriétaire",p.owner),("Téléphone",p.phone),("Adresse",p.address),("Commune",p.commune),
          ("Section",p.section),("Parcelle",p.parcel),("Type",p.property_type),("Surface annoncée",(p.surface+" m²") if p.surface else "")]
    for k,v in meta:
        if v:
            cells=table.add_row().cells; cells[0].text=k; cells[1].text=v
    if p.commune and p.section and p.parcel:
        try:
            img,_,_,_,_=_context_map_png(p.commune,p.section,p.parcel,760,500)
            doc.add_heading("Plan cadastral",level=1)
            doc.add_picture(img,width=Inches(6.7))
            cap=doc.paragraphs[-1]; cap.alignment=WD_ALIGN_PARAGRAPH.CENTER
            q=doc.add_paragraph(f"Section {p.section.upper()} — Parcelle {int(re.sub(r'\\D','',p.parcel) or '0')}")
            q.alignment=WD_ALIGN_PARAGRAPH.CENTER
        except Exception:
            doc.add_paragraph("Plan cadastral indisponible au moment de l’export.")
    if p.facts.strip():
        doc.add_heading("Fiche de visite",level=1)
        for line in [x.strip() for x in p.facts.splitlines() if x.strip()]:
            doc.add_paragraph(line)
    out=io.BytesIO(); doc.save(out); out.seek(0)
    safe=re.sub(r"[^A-Za-z0-9_-]+","_",p.owner or p.address or "bien").strip("_") or "bien"
    return StreamingResponse(out,media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition":f'attachment; filename="Fiche_visite_{safe}.docx"'})

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
