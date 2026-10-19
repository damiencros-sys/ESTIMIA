from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
import os, json, uuid, urllib.request, urllib.error, urllib.parse, mimetypes, re, math, io, csv, zipfile, sqlite3, tempfile, threading

BASE=Path(__file__).resolve().parent
DATA=BASE/"data"; DATA.mkdir(exist_ok=True)
app=FastAPI(title="ESTIM'IA V2")
app.mount("/static",StaticFiles(directory=BASE/"static"),name="static")

@app.middleware("http")
async def _no_cache_frontend(request, call_next):
    response=await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path=="/":
        response.headers["Cache-Control"]="no-store, no-cache, must-revalidate"
    return response

@app.get("/")
def home(): return FileResponse(BASE/"static"/"index.html",headers={"Cache-Control":"no-store, no-cache, must-revalidate", "Pragma":"no-cache"})


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


def _section_candidates(section:str):
    s=re.sub(r"[^A-Za-z0-9]","",(section or "").upper().strip())
    if not s:return []
    vals=[]
    if len(s)==1 and s.isalpha(): vals.append("0"+s)
    if s.isdigit(): vals.append(s.zfill(2))
    vals.append(s)
    return list(dict.fromkeys(vals))

def _fetch_parcel(code_insee:str, section:str, numero:str):
    no=re.sub(r"\D","",str(numero or "")).zfill(4)
    if not no.strip("0"): raise HTTPException(400,"Numéro de parcelle invalide.")
    had_response=False; last_error=None
    for sec in _section_candidates(section):
        for source in ("PCI",None):
            params={"code_insee":code_insee,"section":sec,"numero":no}
            if source:params["source_ign"]=source
            try:
                d=get_json("https://apicarto.ign.fr/api/cadastre/parcelle?"+urllib.parse.urlencode(params));had_response=True
                fs=d.get("features",[])
                if fs:return fs[0],sec,no
            except Exception as e:last_error=e
    if not had_response and last_error:raise last_error
    return None,(_section_candidates(section) or [section])[0],no

@app.get("/api/cadastre")
def cadastre(commune:str, section:str, numero:str):
    commune=commune.strip()
    resolved={"name":commune,"code":commune,"postcode":""} if re.fullmatch(r"\d{5}",commune) else _resolve_commune(commune)
    if not resolved or not resolved.get("code"):raise HTTPException(400,"Commune non reconnue.")
    code_insee=str(resolved["code"]);commune_name=resolved.get("name") or commune
    try:
        f,sec_api,no=_fetch_parcel(code_insee,section,numero);display_sec=re.sub(r"^0(?=[A-Z]$)","",sec_api)
        if not f:return {"found":False,"commune":commune_name,"code_insee":code_insee,"section":display_sec,"numero":no}
        return {"found":True,"commune":commune_name,"code_insee":code_insee,"section":display_sec,"numero":no,"properties":f.get("properties",{}),"geometry":f.get("geometry")}
    except HTTPException:raise
    except Exception:raise HTTPException(502,"Le service cadastral officiel est momentanément indisponible. Réessaie dans quelques secondes.")

def _parcel_feature(commune:str, section:str, numero:str):
    commune=(commune or "").strip()
    resolved={"name":commune,"code":commune,"postcode":""} if re.fullmatch(r"\d{5}",commune) else _resolve_commune(commune)
    if not resolved or not resolved.get("code"):raise HTTPException(400,"Commune non reconnue.")
    code_insee=str(resolved["code"]);commune_name=resolved.get("name") or commune
    f,sec_api,no=_fetch_parcel(code_insee,section,numero);display_sec=re.sub(r"^0(?=[A-Z]$)","",sec_api)
    return f,commune_name,code_insee,display_sec,no

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


def _multi_context_map_png(commune, refs, width=760, height=520):
    from PIL import Image, ImageDraw
    refs=[x for x in refs if x.get("section") and x.get("numero")]
    if not refs: raise HTTPException(400,"Aucune parcelle fournie.")
    features=[]; commune_name=""; code_insee=""
    for ref in refs:
        f,name,code,sec,no=_parcel_feature(commune,ref["section"],ref["numero"])
        if not f: raise HTTPException(404,f"Parcelle {sec} {int(no)} non trouvée.")
        commune_name=commune_name or name; code_insee=code_insee or code
        features.append((f,sec,no))
    all_m=[]
    for f,sec,no in features:
        for ring in _geom_rings(f.get("geometry")):
            all_m.extend(_mercator(p[0],p[1]) for p in ring if len(p)>=2)
    if not all_m: raise HTTPException(404,"Géométrie cadastrale indisponible.")
    xs=[p[0] for p in all_m]; ys=[p[1] for p in all_m]
    cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
    span=max(max(xs)-min(xs),max(ys)-min(ys),55.0)*1.55
    aspect=width/height; half_y=span/2; half_x=max(span*aspect/2,(max(xs)-min(xs))*0.65)
    half_y=max(half_y,(max(ys)-min(ys))*0.65)
    bbox=(cx-half_x,cy-half_y,cx+half_x,cy+half_y)
    layers="AMORCES_CAD,LIEUDIT,CP.CadastralParcel,SUBFISCAL,CLOTURE,DETAIL_TOPO,HYDRO,VOIE_COMMUNICATION,BU.Building,BORNE_REPERE"
    params={"service":"WMS","version":"1.3","request":"GetMap","layers":layers,"styles":"",
            "format":"image/png","crs":"EPSG:3857","bbox":",".join(f"{v:.3f}" for v in bbox),
            "width":str(width),"height":str(height),"language":"fre"}
    url=f"https://inspire.cadastre.gouv.fr/scpc/{code_insee}.wms?"+urllib.parse.urlencode(params)
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"ESTIMIA/13.36"})
        with urllib.request.urlopen(req,timeout=20) as r:
            raw=r.read(); ctype=r.headers.get("Content-Type","")
        if "image" not in ctype.lower(): raise ValueError("Réponse WMS non image")
        out=Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(502,"Le plan cadastral officiel DGFiP est momentanément indisponible.")
    draw=ImageDraw.Draw(out,"RGBA"); xmin,ymin,xmax,ymax=bbox
    def px(pt):
        x,y=_mercator(pt[0],pt[1])
        return ((x-xmin)/(xmax-xmin)*width, height-(y-ymin)/(ymax-ymin)*height)
    for idx,(f,sec,no) in enumerate(features,1):
        centers=[]
        for ring in _geom_rings(f.get("geometry")):
            poly=[px(p) for p in ring if len(p)>=2]
            if len(poly)>=3:
                draw.polygon(poly,fill=(255,35,35,62),outline=(220,0,0,255),width=4)
                centers.extend(poly)
        if centers:
            mx=sum(p[0] for p in centers)/len(centers); my=sum(p[1] for p in centers)/len(centers)
            label=f"{sec} {int(no)}"
            draw.ellipse((mx-11,my-11,mx+11,my+11),fill=(35,170,70,255),outline=(255,255,255,255),width=2)
            draw.text((mx+14,my-8),label,fill=(15,60,25,255),stroke_width=2,stroke_fill=(255,255,255,240))
    refs_label=" • ".join(f"{sec} {int(no)}" for _,sec,no in features)
    draw.rectangle((0,height-30,width,height),fill=(255,255,255,230))
    draw.text((8,height-23),f"{commune_name} — {refs_label} | Plan cadastral officiel DGFiP",fill=(20,20,20,255))
    bio=io.BytesIO(); out.save(bio,format="PNG",optimize=True); bio.seek(0)
    return bio,commune_name,code_insee

@app.get("/api/cadastre/multi-map.png")
def cadastre_multi_map(commune:str, refs:str):
    parsed=[]
    for token in refs.split(","):
        token=token.strip()
        m=re.fullmatch(r"([A-Za-z0-9]{1,3})\s*:\s*(\d{1,4})",token)
        if m: parsed.append({"section":m.group(1).upper(),"numero":m.group(2)})
    bio,_,_=_multi_context_map_png(commune,parsed)
    return StreamingResponse(bio,media_type="image/png",headers={"Cache-Control":"no-store"})

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
    surface_carrez:str=""
    sections:list=[]
    parcels:list=[]
    facts:str=""
    photos:list=[]
    generated_date:str=""
    theme_color:str=""
    estimation:dict={}
    annonces:list=[]
    roques_annonces:list=[]

def _property_color(t):
    s=(t or "").lower()
    if any(x in s for x in ["appartement","studio"]): return "2563A6"
    if "terrain" in s: return "B7791F"
    if "immeuble" in s: return "8B2F45"
    if any(x in s for x in ["local","commerce","commercial","professionnel","bureau"]): return "7651A8"
    if any(x in s for x in ["garage","parking","box"]): return "64748B"
    if any(x in s for x in ["maison","villa","pavillon"]): return "2F7D5A"
    return "49697D"


def _export_market_images(annonces):
    # Télécharger seulement les photos des catalogues connus et vérifier chaque redirection.
    from concurrent.futures import ThreadPoolExecutor
    from PIL import Image
    def allowed_image(url):
        parsed=urllib.parse.urlsplit(url)
        hosts=('roquesimmobilie.staticlbi.com','www.roques-immobilier.com','images.iadfrance.fr','cdn.safti.fr','photo.superimmo.com','file.bienici.com','storage.gra.cloud.ovh.net',
            'image.hestia.immo','images.playiad.com','img.netty.immo','photos.exportadapt.com','photos.ubiflow.net','yxnwgqqvrnmyhrxcaatb.supabase.co')
        host=parsed.hostname or ''
        return parsed.scheme=='https' and parsed.port in (None,443) and (host in hosts or host.endswith('.staticlbi.com'))
    class SafeRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,req,fp,code,msg,headers,newurl):
            if not allowed_image(newurl):return None
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    def load(item):
        try:
            url=str(item.get('photo','')); parsed=urllib.parse.urlsplit(url)
            if not allowed_image(url):return None
            opener=urllib.request.build_opener(SafeRedirect())
            with opener.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=8) as response:
                raw=response.read(8_000_001)
            if len(raw)>8_000_000:return None
            im=Image.open(io.BytesIO(raw));im.thumbnail((1000,750));im=im.convert('RGB')
            out=io.BytesIO();im.save(out,format='JPEG',quality=82);return out.getvalue()
        except Exception:return None
    with ThreadPoolExecutor(max_workers=4) as pool:return list(pool.map(load,annonces[:6]))

@app.post("/api/word")
def word_export(p:WordPayload):
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    doc=Document()
    sec=doc.sections[0]
    sec.page_width=Inches(210/25.4);sec.page_height=Inches(297/25.4)
    sec.top_margin=Inches(.45); sec.bottom_margin=Inches(.45); sec.left_margin=Inches(.55); sec.right_margin=Inches(.55)
    styles=doc.styles
    styles['Normal'].font.name='Aptos'; styles['Normal'].font.size=Pt(9.5)
    styles['Title'].font.name='Aptos Display'; styles['Title'].font.size=Pt(20); styles['Title'].font.bold=True

    def shade(cell,fill):
        tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)
    def margins(cell,top=70,start=90,bottom=70,end=90):
        tc=cell._tc.get_or_add_tcPr(); mar=tc.first_child_found_in('w:tcMar')
        if mar is None: mar=OxmlElement('w:tcMar'); tc.append(mar)
        for tag,val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
            el=OxmlElement('w:'+tag); el.set(qn('w:w'),str(val)); el.set(qn('w:type'),'dxa'); mar.append(el)
    def keep_table(table):
        for row in table.rows:
            trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:cantSplit'); trPr.append(el)
    def label_value_table(rows,widths=(2.15,4.75)):
        table=doc.add_table(rows=0,cols=2); table.alignment=WD_TABLE_ALIGNMENT.CENTER; table.style='Table Grid'
        for k,v in rows:
            if not v: continue
            cells=table.add_row().cells; cells[0].text=str(k); cells[1].text=str(v)
            cells[0].width=Inches(widths[0]); cells[1].width=Inches(widths[1])
            cells[0].vertical_alignment=cells[1].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            shade(cells[0],'EAF3F1')
            for c in cells: margins(c)
            for r in cells[0].paragraphs[0].runs: r.bold=True; r.font.size=Pt(9)
            for r in cells[1].paragraphs[0].runs: r.font.size=Pt(9)
        keep_table(table); return table
    property_color=_property_color(p.property_type)
    def heading(text):
        para=doc.add_paragraph(); para.paragraph_format.space_before=Pt(7); para.paragraph_format.space_after=Pt(3); para.paragraph_format.keep_with_next=True
        r=para.add_run(text); r.bold=True; r.font.size=Pt(11); r.font.color.rgb=RGBColor.from_string(property_color)
        return para

    title=doc.add_paragraph(); title.alignment=WD_ALIGN_PARAGRAPH.CENTER; title.paragraph_format.space_after=Pt(4)
    r=title.add_run('DOSSIER D’ESTIMATION IMMOBILIÈRE'); r.bold=True; r.font.size=Pt(18); r.font.color.rgb=RGBColor.from_string(property_color)
    sub=doc.add_paragraph(); sub.alignment=WD_ALIGN_PARAGRAPH.CENTER; sub.paragraph_format.space_after=Pt(7)
    rr=sub.add_run('ESTIM’IA — visite et estimation'); rr.italic=True; rr.font.size=Pt(9); rr.font.color.rgb=RGBColor(0x66,0x66,0x66)
    datep=doc.add_paragraph(); datep.alignment=WD_ALIGN_PARAGRAPH.CENTER; datep.paragraph_format.space_after=Pt(7)
    dr=datep.add_run('Document généré le '+(p.generated_date or datetime.now().strftime('%d/%m/%Y'))); dr.font.size=Pt(8.5); dr.font.color.rgb=RGBColor(0x66,0x66,0x66)

    heading('DOSSIER')
    meta=[('Propriétaire',p.owner),('Téléphone',p.phone),('Adresse',p.address),('Commune',p.commune),
          ('Cadastre',(' • '.join([str(x.get('section','')).upper()+' '+str(int(re.sub(r'\\D','',str(x.get('numero',''))) or '0')) for x in p.parcels if x.get('section') and x.get('numero')]) if p.parcels else (('Section '+p.section.upper()+' — Parcelle '+str(int(re.sub(r'\\D','',p.parcel) or '0'))) if p.section and p.parcel else ''))),
          ('Type',p.property_type),('Surface habitable',(p.surface+' m²') if p.surface else ''),('Surface Carrez',(p.surface_carrez+' m²') if p.surface_carrez else '')]
    label_value_table(meta)

    refs=[x for x in p.parcels if isinstance(x,dict) and x.get('section') and x.get('numero')]
    if not refs and p.section and p.parcel: refs=[{"section":p.section,"numero":p.parcel}]
    if p.commune and refs:
        try:
            if len(refs)>1:
                img,_,_=_multi_context_map_png(p.commune,refs,760,500)
            else:
                img,_,_,_,_=_context_map_png(p.commune,refs[0]["section"],refs[0]["numero"],760,500)
            heading('PLAN CADASTRAL')
            doc.add_picture(img,width=Inches(5.35)); doc.paragraphs[-1].alignment=WD_ALIGN_PARAGRAPH.CENTER
            refs_txt=' • '.join(str(x["section"]).upper()+' '+str(int(re.sub(r"\\D","",str(x["numero"])) or "0")) for x in refs)
            cap=doc.add_paragraph(f'{p.commune} — Parcelles : {refs_txt}')
            cap.alignment=WD_ALIGN_PARAGRAPH.CENTER; cap.paragraph_format.space_after=Pt(4)
            for r in cap.runs: r.font.size=Pt(8); r.font.italic=True
        except Exception as e:
            note=doc.add_paragraph('Plan cadastral temporairement indisponible lors de la génération du document.')
            note.alignment=WD_ALIGN_PARAGRAPH.CENTER
            for r in note.runs: r.font.size=Pt(8); r.font.italic=True

    if p.sections:
        heading('RELEVÉ DE VISITE')
        for secdata in p.sections:
            title=str(secdata.get('title','')).strip()
            rows=secdata.get('rows') or []
            rows=[[str(x[0]),str(x[1])] for x in rows if isinstance(x,(list,tuple)) and len(x)>=2 and str(x[1]).strip()]
            if not rows: continue
            heading(title)
            label_value_table(rows)
    elif p.facts.strip():
        heading('RELEVÉ DE VISITE')
        for line in [x.strip() for x in p.facts.splitlines() if x.strip()]:
            doc.add_paragraph(line)


    if p.estimation.get('centrale'):
        heading('ESTIMATION DU BIEN')
        label_value_table([('Valeur centrale',p.estimation.get('centrale')),('Fourchette basse',p.estimation.get('basse')),('Fourchette haute',p.estimation.get('haute'))])
        doc.add_paragraph(str(p.estimation.get('texte') or 'Valeur statistique indicative issue des ventes DVF, sans ajustement qualitatif.'))
    else:
        heading('ESTIMATION DU BIEN')
        doc.add_paragraph('Estimation non calculée dans ce dossier.')
    if p.estimation.get('reperes'):
        heading('REPERES AU METRE CARRE ET AJUSTEMENT')
        label_value_table(p.estimation['reperes'])
    if p.estimation.get('retenue'):
        heading('ESTIMATION RETENUE ET VALIDEE')
        label_value_table([('Montant retenu',p.estimation.get('retenue')),('Justification',p.estimation.get('justification'))])
    for group_title,group_items in [('ANNONCES SIMILAIRES ROQUES IMMOBILIER',p.roques_annonces[:4]),('AUTRES ANNONCES SIMILAIRES',p.annonces)]:
        if not group_items:continue
        heading(group_title)
        doc.add_paragraph('Biens proposés à la vente sélectionnés par proximité du prix central. Prix affichés et disponibilité à confirmer auprès des agences.')
        pictures=_export_market_images(group_items)
        for index,item in enumerate(group_items[:6]):
            heading(str(index+1)+'  '+str(item.get('titre','Bien proposé à la vente')))
            if pictures[index]:
                para=doc.add_paragraph();para.alignment=WD_ALIGN_PARAGRAPH.CENTER
                para.add_run().add_picture(io.BytesIO(pictures[index]),width=Inches(3.1))
                para.paragraph_format.keep_with_next=True
            else:doc.add_paragraph('Photo de cette annonce indisponible lors de l’export.')
            card_table=label_value_table([('Prix affiché',item.get('prix')),('Agence',item.get('site')),('Description',item.get('description'))])
            for row in card_table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:para.paragraph_format.keep_with_next=True
            url=str(item.get('url',''))
            if urllib.parse.urlsplit(url).scheme in ('http','https'):
                para=doc.add_paragraph('Source : ')
                link=OxmlElement('w:hyperlink');link.set(qn('r:id'),doc.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True))
                run=OxmlElement('w:r');text=OxmlElement('w:t');text.text='Consulter l’annonce';run.append(text);link.append(run);para._p.append(link)

    # Photographies ajoutées au dossier. Les contrôles de l'interface ne sont jamais exportés.
    if p.photos:
        import base64
        heading('PHOTOGRAPHIES DU BIEN')
        valid=[]
        for item in p.photos[:30]:
            try:
                data=str(item.get('data',''))
                if ',' not in data: continue
                raw=base64.b64decode(data.split(',',1)[1])
                if len(raw)>12_000_000: continue
                valid.append((item.get('name','Photo'),raw))
            except Exception:
                continue
        for i in range(0,len(valid),2):
            table=doc.add_table(rows=1,cols=2); table.alignment=WD_TABLE_ALIGNMENT.CENTER
            for j in range(2):
                cell=table.rows[0].cells[j]
                if i+j>=len(valid): continue
                name,raw=valid[i+j]
                try:
                    bio=io.BytesIO(raw)
                    pcell=cell.paragraphs[0]; pcell.alignment=WD_ALIGN_PARAGRAPH.CENTER
                    run=pcell.add_run(); run.add_picture(bio,width=Inches(3.0))
                    cap=cell.add_paragraph(str(name)); cap.alignment=WD_ALIGN_PARAGRAPH.CENTER
                    for rr in cap.runs: rr.font.size=Pt(7); rr.font.italic=True
                except Exception:
                    pass

            keep_table(table)

    # footer + page number field
    footer=sec.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
    fr=footer.add_run('ESTIM’IA  •  Dossier d’estimation  •  Page '); fr.font.size=Pt(8); fr.font.color.rgb=RGBColor(0x77,0x77,0x77)
    fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); footer._p.append(fld)

    out=io.BytesIO(); doc.save(out); out.seek(0)
    safe=re.sub(r'[^A-Za-z0-9_-]+','_',p.owner or p.address or 'bien').strip('_') or 'bien'
    return StreamingResponse(out,media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',headers={'Content-Disposition':f'attachment; filename="Dossier_estimation_{safe}.docx"'})


@app.post("/api/pdf")
def pdf_export(p:WordPayload):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, PageBreak
    import base64
    theme=colors.HexColor('#'+_property_color(p.property_type))
    out=io.BytesIO(); doc=SimpleDocTemplate(out,pagesize=A4,rightMargin=14*mm,leftMargin=14*mm,topMargin=13*mm,bottomMargin=14*mm)
    styles=getSampleStyleSheet()
    title=ParagraphStyle('TitleX',parent=styles['Title'],fontName='Helvetica-Bold',fontSize=17,leading=20,textColor=theme,alignment=TA_CENTER,spaceAfter=3*mm)
    date_style=ParagraphStyle('DateX',parent=styles['Normal'],fontSize=8,textColor=colors.HexColor('#666666'),alignment=TA_CENTER,spaceAfter=4*mm)
    h=ParagraphStyle('HX',parent=styles['Heading2'],fontName='Helvetica-Bold',fontSize=10.5,leading=13,textColor=theme,spaceBefore=4*mm,spaceAfter=2*mm)
    normal=ParagraphStyle('NX',parent=styles['Normal'],fontSize=8.5,leading=11)
    cap=ParagraphStyle('CapX',parent=normal,fontSize=7.5,textColor=colors.HexColor('#555555'),alignment=TA_CENTER)
    story=[Paragraph('DOSSIER D’ESTIMATION IMMOBILIERE',title),Paragraph('ESTIM’IA - visite et estimation',date_style),Paragraph('Document genere le '+(p.generated_date or datetime.now().strftime('%d/%m/%Y')),date_style)]
    def add_table(rows):
        data=[]
        for k,v in rows:
            if str(v).strip(): data.append([Paragraph(str(k),normal),Paragraph(str(v),normal)])
        if not data:return
        t=Table(data,colWidths=[52*mm,112*mm],repeatRows=0,hAlign='CENTER')
        t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.4,colors.HexColor('#CCD5DB')),('BACKGROUND',(0,0),(0,-1),colors.HexColor('#F2F6F5')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('TEXTCOLOR',(0,0),(0,-1),theme)]));story.append(t)
    story.append(Paragraph('DOSSIER',h))
    refs=[x for x in p.parcels if isinstance(x,dict) and x.get('section') and x.get('numero')]
    cad=' • '.join(str(x.get('section','')).upper()+' '+re.sub(r'\D','',str(x.get('numero',''))) for x in refs)
    add_table([('Proprietaire',p.owner),('Telephone',p.phone),('Adresse',p.address),('Commune',p.commune),('Cadastre',cad),('Type',p.property_type),('Surface habitable',(p.surface+' m²') if p.surface else ''),('Surface Carrez',(p.surface_carrez+' m²') if p.surface_carrez else '')])
    if p.commune and refs:
        story.append(Paragraph('PLAN CADASTRAL',h))
        try:
            img,_,_=_multi_context_map_png(p.commune,refs,760,500) if len(refs)>1 else (lambda x:(x[0],x[1],x[2]))(_context_map_png(p.commune,refs[0]['section'],refs[0]['numero'],760,500))
            story.append(RLImage(img,width=164*mm,height=108*mm));story.append(Paragraph((p.commune+' - Parcelles : '+cad),cap))
        except Exception: story.append(Paragraph('Plan cadastral temporairement indisponible lors de la generation du document.',cap))
    if p.sections:
        story.append(Paragraph('RELEVE DE VISITE',h))
        for s in p.sections:
            rows=s.get('rows') or []
            rows=[(x[0],x[1]) for x in rows if isinstance(x,(list,tuple)) and len(x)>=2 and str(x[1]).strip()]
            if rows: story.append(Paragraph(str(s.get('title') or 'Informations'),h));add_table(rows)
    from xml.sax.saxutils import escape
    def text(value):return escape(str(value or ''))
    story.append(Paragraph('ESTIMATION DU BIEN',h))
    if p.estimation.get('centrale'):
        add_table([('Valeur centrale',text(p.estimation.get('centrale'))),('Fourchette basse',text(p.estimation.get('basse'))),('Fourchette haute',text(p.estimation.get('haute')))])
        story.append(Paragraph(text(p.estimation.get('texte') or 'Valeur statistique indicative issue des ventes DVF, sans ajustement qualitatif.'),normal))
    else:story.append(Paragraph('Estimation non calculée dans ce dossier.',normal))
    if p.estimation.get('reperes'):
        story.append(Paragraph('REPERES AU METRE CARRE ET AJUSTEMENT',h))
        add_table([(text(k),text(v)) for k,v in p.estimation['reperes']])
    if p.estimation.get('retenue'):
        story.append(Paragraph('ESTIMATION RETENUE ET VALIDEE',h))
        add_table([('Montant retenu',text(p.estimation.get('retenue'))),('Justification',text(p.estimation.get('justification')))])
    for group_title,group_items in [('ANNONCES SIMILAIRES ROQUES IMMOBILIER',p.roques_annonces[:4]),('AUTRES ANNONCES SIMILAIRES',p.annonces)]:
        if not group_items:continue
        story.append(Paragraph(group_title,h))
        story.append(Paragraph('Biens proposés à la vente sélectionnés par proximité du prix central. Prix affichés et disponibilité à confirmer auprès des agences.',normal))
        pictures=_export_market_images(group_items)
        for index,item in enumerate(group_items[:6]):
            card=[Paragraph(text(str(index+1)+'  '+str(item.get('titre','Bien proposé à la vente'))),h)]
            if pictures[index]:card.append(RLImage(io.BytesIO(pictures[index]),width=105*mm,height=65*mm,kind='proportional'))
            else:card.append(Paragraph('Photo de cette annonce indisponible lors de l’export.',cap))
            card.extend([Paragraph('<b>Prix affiché : '+text(item.get('prix'))+'</b>',normal),Paragraph(text(item.get('site')),normal),Paragraph(text(item.get('description')),normal)])
            url=str(item.get('url',''))
            if urllib.parse.urlsplit(url).scheme in ('http','https'):card.append(Paragraph('<link href="'+escape(url,{'"':'&quot;'})+'" color="#0d705a">Consulter l’annonce</link>',normal))
            card.append(Spacer(1,3*mm));story.append(KeepTogether(card))
    if p.photos:
        story.append(Paragraph('PHOTOGRAPHIES DU BIEN',h)); cells=[]
        for item in p.photos[:30]:
            try:
                data=str(item.get('data','')); raw=base64.b64decode(data.split(',',1)[1]); bio=io.BytesIO(raw)
                im=RLImage(bio,width=76*mm,height=52*mm,kind='proportional'); label=Paragraph(str(item.get('name') or 'Photo'),cap)
                cells.append([im,label])
            except Exception: pass
        for i in range(0,len(cells),2):
            row=cells[i:i+2]
            while len(row)<2: row.append(['',''])
            t=Table([[row[0][0],row[1][0]],[row[0][1],row[1][1]]],colWidths=[82*mm,82*mm],hAlign='CENTER')
            t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),.35,colors.HexColor('#CCD5DB')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(0,0),(-1,-1),'CENTER'),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]));story.append(KeepTogether(t));story.append(Spacer(1,2*mm))
    def footer(canvas,docx):
        canvas.saveState();canvas.setFont('Helvetica',7);canvas.setFillColor(colors.HexColor('#777777'));canvas.drawCentredString(A4[0]/2,7*mm,f'ESTIM’IA - Dossier d’estimation - Page {docx.page}');canvas.restoreState()
    doc.build(story,onFirstPage=footer,onLaterPages=footer);out.seek(0)
    safe=re.sub(r'[^A-Za-z0-9_-]+','_',p.owner or p.address or 'bien').strip('_') or 'bien'
    return StreamingResponse(out,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="Dossier_estimation_{safe}.pdf"'})

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


# V13.50 : index DVF local provenant des archives officielles DGFiP.
_DVF_DB=DATA/'dvf_local.sqlite3'
_DVF_LOCK=threading.Lock()
_DVF_IMPORT_LIMIT=110*1024*1024

def _dvf_db():
    db=sqlite3.connect(str(_DVF_DB),timeout=30)
    db.execute('CREATE TABLE IF NOT EXISTS ventes (annee INTEGER, mutation TEXT, code TEXT, date TEXT, prix REAL, surface REAL, type TEXT, adresse TEXT, PRIMARY KEY(annee,mutation,code))')
    db.execute('CREATE INDEX IF NOT EXISTS idx_ventes_code_type ON ventes(code,type)')
    db.commit();return db

def _dvf_decimal(v):
    try:return float(str(v or '').strip().replace(' ', '').replace(',', '.'))
    except (ValueError,TypeError):return 0.0

def _dvf_ingest_stream(stream, year, target_code, db):
    # DGFiP: chaque ligne correspond à un local ou à une parcelle. Le prix est celui
    # de la mutation entière. Éviter impérativement de sommer les prix répétés.
    import collections
    sample=stream.readline().decode('utf-8-sig',errors='replace')
    delim='|' if sample.count('|')>sample.count(';') else ';'
    import itertools
    rows=csv.DictReader(itertools.chain([sample],(line.decode('utf-8-sig',errors='replace') for line in stream)),delimiter=delim)
    if not rows.fieldnames or not {'Code commune','Valeur fonciere','Type local','Surface reelle bati'}.issubset(set(rows.fieldnames)):
        raise ValueError('Colonnes du fichier DGFiP non reconnues')
    groups=collections.defaultdict(lambda:{'locals':{},'prix':0,'date':'','adresse':''})
    matched=0
    for r in rows:
        code=str(r.get('Code commune') or '').zfill(3)
        dep=str(r.get('Code departement') or '').strip()
        insee=dep.zfill(2)+code if len(dep)<=2 else dep+code
        if insee!=target_code:continue
        matched+=1
        if str(r.get('Nature mutation') or '').lower().strip()!='vente':continue
        mutation=(r.get('No disposition') or '000001').strip()+'-'+(r.get('Id mutation') or '').strip()
        if not mutation.strip('-'):continue
        g=groups[mutation];g['prix']=_dvf_decimal(r.get('Valeur fonciere'));g['date']=r.get('Date mutation') or ''
        g['adresse']=str(r.get('Adresse voie') or '')[:140]
        typ=str(r.get('Type local') or '').strip();surf=_dvf_decimal(r.get('Surface reelle bati'))
        if typ in ('Maison','Appartement') and surf>0:
            # Plusieurs parcelles peuvent répéter le même local; cette clé minimise
            # les doublons mais ne permet pas de distinguer des locaux identiques.
            # En cas d'ambiguïté, rejeter la mutation plutôt que surévaluer.
            key=(str(r.get('Identifiant local') or ''),typ,surf,str(r.get('Nombre pieces principales') or ''))
            if not key[0]:key=(typ,surf,str(r.get('Nombre pieces principales') or ''))
            g['locals'][key]=(typ,surf)
    inserted=0
    for mutation,g in groups.items():
        locals_=list(g['locals'].values())
        if len(locals_)!=1 or g['prix']<=10000:continue
        typ,surf=locals_[0]
        if not 15<=surf<=1000:continue
        db.execute('INSERT OR REPLACE INTO ventes VALUES (?,?,?,?,?,?,?,?)',(year,mutation,target_code,g['date'],g['prix'],surf,typ,g['adresse']))
        inserted+=1
    return matched,inserted

@app.post('/api/estimation/dvf/import')
async def dvf_import(file: UploadFile=File(...), commune: str=Form(...)):
    # Import manuel de l'archive annuelle DGFiP. Les données ne quittent pas Render.
    code=commune.strip()
    if not re.fullmatch(r'\d{5}',code):
        r=_resolve_commune(code)
        if not r:raise HTTPException(400,'Commune non reconnue')
        code=str(r['code'])
    if not re.fullmatch(r'\d{5}',code):raise HTTPException(400,'Code INSEE invalide')
    if not (file.filename or '').lower().endswith('.zip'):raise HTTPException(400,'Archive ZIP DGFiP requise')
    size=0
    with tempfile.NamedTemporaryFile(suffix='.zip',delete=False) as f:
        path=f.name
        try:
            while True:
                chunk=await file.read(1024*1024)
                if not chunk:break
                size+=len(chunk)
                if size>_DVF_IMPORT_LIMIT:raise HTTPException(413,'Archive supérieure à 110 Mo : importer une archive annuelle moins volumineuse ou préparer un fichier communal')
                f.write(chunk)
        except BaseException:
            os.unlink(path);raise
    try:
        with _DVF_LOCK:
            db=_dvf_db()
            try:
                with zipfile.ZipFile(path) as z:
                    members=[x for x in z.infolist() if not x.is_dir() and x.filename.lower().endswith(('.txt','.csv'))]
                    if not members:raise HTTPException(400,'Aucun fichier DVF TXT ou CSV dans le ZIP')
                    total=0;matched=0
                    for m in members:
                        if m.file_size>700*1024*1024:raise HTTPException(413,'Fichier décompressé trop volumineux')
                        yr=re.search(r'20(?:2[0-9]|1[0-9])',m.filename)
                        if not yr:yr=re.search(r'20(?:2[0-9]|1[0-9])',file.filename)
                        if not yr:raise HTTPException(400,'Année absente du nom du fichier : renommer ZIP avec année (ex. 2025)')
                        with z.open(m) as st:
                            n,k=_dvf_ingest_stream(st,int(yr.group()),code,db)
                            matched+=n;total+=k
                    db.commit()
                return {'status':'importe','code_insee':code,'lignes_commune':matched,'ventes_importees':total,'message':f'{total} mutations simples importées pour {code}. Relancer la recherche DVF.'}
            finally:db.close()
    except zipfile.BadZipFile:raise HTTPException(400,'Archive ZIP illisible')
    except ValueError as e:raise HTTPException(400,str(e))
    finally:os.unlink(path)

def _dvf_local(code,typ,surface):
    if not _DVF_DB.exists():return [],0
    db=_dvf_db()
    try:
        rows=db.execute('SELECT annee,mutation,date,prix,surface,adresse FROM ventes WHERE code=? AND type=? ORDER BY date DESC',(code,'Maison' if typ=='111' else 'Appartement')).fetchall()
    finally:db.close()
    out=[]
    for year,mutation,date,prix,bati,adresse in rows:
        if not .55<=bati/surface<=1.8:continue
        out.append({'date':date,'prix':round(prix),'surface':bati,'prix_m2':round(prix/bati),'reference':f'{year}-{mutation}','adresse':adresse})
    return out,len(rows)

# V13.47 — Recherche DVF avec sources identifiées et diagnostics sans faux résultats.
# Source 1: Cerema DVF+ (si accessible); source 2: foncierdata.fr, données DGFiP
# (couverture partielle des communes). Aucun chiffre n'est inventé.
def _dvf_num(v):
    try:return float(str(v).replace(' ', '').replace('\\u202f','').replace(',','.'))
    except (ValueError,TypeError):return 0.0

def _dvf_rows(payload):
    if isinstance(payload,list):return payload
    if not isinstance(payload,dict):return []
    for key in ('results','resultats','data','features','mutations','transactions','items'):
        v=payload.get(key)
        if isinstance(v,list):return v
        if isinstance(v,dict):
            for sub in ('results','data','items','transactions'):
                if isinstance(v.get(sub),list):return v[sub]
    return []

def _dvf_pick(d,*keys):
    for key in keys:
        if key in d and d[key] is not None:return d[key]
    return None

def _dvf_extract(payload, typ, surface):
    raw=_dvf_rows(payload)
    seen=set(); comparables=[]
    for item in raw:
        d=item.get('properties',item) if isinstance(item,dict) else {}
        if not isinstance(d,dict):continue
        nb=_dvf_num(_dvf_pick(d,'nblocmut','nb_locaux','nombre_lots_batis','nombre_locaux'))
        if nb>1:continue
        kind=str(_dvf_pick(d,'codtypbien','type_local','type_bien','type') or '').lower()
        expected='maison' if typ=='111' else 'appartement'
        if kind and not (kind==typ or expected in kind or (typ=='111' and kind=='1') or (typ=='121' and kind=='2')):continue
        prix=_dvf_num(_dvf_pick(d,'valeurfonc','valeur_fonciere','valeur','prix','prix_vente'))
        bati=_dvf_num(_dvf_pick(d,'sbati','surface_reelle_bati','surface_bati','surface','surface_habitable'))
        date=str(_dvf_pick(d,'datemut','date_mutation','date','anneemut') or '')[:10]
        nature=str(_dvf_pick(d,'libnatmut','nature_mutation') or 'Vente').lower()
        if nature and 'vente' not in nature:continue
        if prix<=10000 or not 15<=bati<=1000 or not date:continue
        if not .55<=bati/surface<=1.8:continue
        key=str(_dvf_pick(d,'idnatmut','id_mutation','idmutation','reference') or '')
        unique=key or (date,str(prix),str(bati))
        if unique in seen:continue
        seen.add(unique)
        comparables.append({'date':date,'prix':round(prix),'surface':bati,'prix_m2':round(prix/bati),'reference':key})
    comparables.sort(key=lambda x:x['date'],reverse=True)
    return comparables,len(raw)


# V13.52 : source géolocalisée publique, téléchargée par département et année.
# La disponibilité dépend du service officiel ; le programme n'invente jamais de ventes.
def _dvf_geo_year(code, year, timeout=35):
    import gzip, io
    from urllib.request import Request, urlopen
    dept=code[:2] if not code.startswith(('97','98')) else code[:3]
    url=f'https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/departements/{dept}.csv.gz'
    # Priorité au petit CSV communal : réduit drastiquement le temps et la mémoire Render.
    commune_url=f'https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/{dept}/{code}.csv'
    try:
        with urlopen(Request(commune_url,headers={'User-Agent':'ESTIMIA/13.52'}),timeout=15) as response:
            communal=response.read(8*1024*1024+1)
            if len(communal)>8*1024*1024:raise ValueError('CSV communal trop volumineux')
        data=communal
        url=commune_url
    except urllib.error.HTTPError as exc:
        if exc.code!=404:raise
        data=None
    if data is None:
        req=Request(url,headers={'User-Agent':'ESTIMIA/13.52 (DVF open data)','Accept':'application/gzip'})
        with urlopen(req,timeout=timeout) as response:
            compressed=response.read(90*1024*1024+1)
            if len(compressed)>90*1024*1024:raise ValueError('Archive départementale trop volumineuse')
        data=gzip.decompress(compressed)
        if len(data)>650*1024*1024:raise ValueError('Données décompressées trop volumineuses')
    text=io.StringIO(data.decode('utf-8-sig',errors='replace'))
    reader=csv.DictReader(text)
    if not {'id_mutation','code_commune','type_local','surface_reelle_bati','valeur_fonciere'}.issubset(reader.fieldnames or []):
        raise ValueError('Colonnes DVF géolocalisées non reconnues')
    import collections
    groups=collections.defaultdict(lambda:{'local_rows':[],'prix':0,'date':'','adresse':''})
    for r in reader:
        if str(r.get('code_commune') or '')!=code:continue
        if (r.get('nature_mutation') or '').lower().strip()!='vente':continue
        mutation=(r.get('id_mutation') or '')+'-'+(r.get('numero_disposition') or '')
        g=groups[mutation]
        g['prix']=_dvf_decimal(r.get('valeur_fonciere'))
        g['date']=r.get('date_mutation') or ''
        g['adresse']=str(r.get('adresse_nom_voie') or '')[:140]
        kind=(r.get('type_local') or '').strip()
        surf=_dvf_decimal(r.get('surface_reelle_bati'))
        if kind in ('Maison','Appartement') and surf>0:
            g['local_rows'].append((kind,surf,r.get('nombre_pieces_principales') or '',r.get('id_parcelle') or ''))
    count=0
    with _DVF_LOCK:
        db=_dvf_db()
        try:
            for mutation,g in groups.items():
                # Multiple distinct built premises are excluded; duplicated parcel rows
                # are collapsed only if identical (otherwise price allocation is unsafe).
                locals_=set(g['local_rows'])
                if len(locals_)!=1 or g['prix']<=10000:continue
                typ,surf,_,_=next(iter(locals_))
                if not 15<=surf<=1000:continue
                db.execute('INSERT OR REPLACE INTO ventes VALUES (?,?,?,?,?,?,?,?)',
                    (year,mutation,code,g['date'],g['prix'],surf,typ,g['adresse']))
                count+=1
            db.commit()
        finally:db.close()
    return count,url

@app.post('/api/estimation/dvf/actualiser')
def dvf_actualiser(commune: str, annee: int=2024):
    commune=commune.strip()
    if not re.fullmatch(r'\d{5}',commune):
        r=_resolve_commune(commune)
        if not r:raise HTTPException(400,'Commune non reconnue')
        commune=str(r['code'])
    if not 2019<=annee<=2026:raise HTTPException(400,'Année hors plage')
    try:
        count,url=_dvf_geo_year(commune,annee)
        return {'status':'ok','ventes_importees':count,'source':url,'message':f'{count} vente(s) simple(s) indexée(s) pour {commune} en {annee}.'}
    except Exception as exc:
        raise HTTPException(502,f'Téléchargement officiel impossible ({type(exc).__name__}) : {str(exc)[:150]}')
@app.get('/api/estimation/dvf')
def estimation_dvf(commune: str, type_bien: str, surface: float):
    commune=commune.strip()
    if _norm_name(commune) in ('lamalou les bains','lamalou les bains 34240','34240 lamalou les bains'):
        commune='34126'
    elif not re.fullmatch(r'\d{5}',commune):
        resolved=_resolve_commune(commune)
        if not resolved or not re.fullmatch(r'\d{5}',str(resolved.get('code',''))):
            raise HTTPException(400,'Commune non reconnue : vérifier le nom ou renseigner le code INSEE.')
        commune=str(resolved['code'])
    if not 12<=surface<=1000:raise HTTPException(400,'Surface habitable suspecte ou manquante : vérifier la fiche avant estimation')
    typ={'maison':'111','appartement':'121'}.get(type_bien.strip().lower())
    if not typ:raise HTTPException(400,'Seuls maisons et appartements sont pris en charge')
    diagnostics=[];candidates=[];source_url='';source_name=''
    local,local_count=_dvf_local(commune,typ,surface)
    if local:
        candidates=local;source_name='Données DGFiP géolocalisées';source_url='https://files.data.gouv.fr/geo-dvf/latest/'
    diagnostics.append({'source':'Cache DVF local','etat':'accessible' if local_count else 'vide','lignes':local_count,'comparables':len(local)})
    if len(candidates)<3:
        for year in (2025,2024,2023):
            try:
                count,url=_dvf_geo_year(commune,year)
                diagnostics.append({'source':f'DVF géolocalisées {year}','etat':'accessible','lignes':count})
                local,local_count=_dvf_local(commune,typ,surface)
                if len(local)>len(candidates):
                    candidates=local;source_name='Données DGFiP géolocalisées';source_url=url
                if len(candidates)>=3:break
            except urllib.error.HTTPError as exc:
                diagnostics.append({'source':f'DVF géolocalisées {year}','etat':'erreur_http','code':exc.code})
            except Exception as exc:
                diagnostics.append({'source':f'DVF géolocalisées {year}','etat':'connexion_impossible','detail':type(exc).__name__})
    if len(candidates)<3:
        any_access=any(d['etat']=='accessible' for d in diagnostics)
        return {'status':'insuffisant' if any_access else 'indisponible',
                'message':(f'{len(candidates)} vente(s) comparable(s) exploitable(s) : au moins 3 nécessaires.'
                           if any_access else 'Téléchargement des fichiers DVF départementaux impossible. Vérifier la connectivité de Render ou importer un fichier DVF.'),
                'source':source_url,'comparables':candidates[:30],'diagnostics':diagnostics,
                'diagnostic':' ; '.join(f"{d['source']}: {d['etat']}"+(f" ({d.get('code')})" if d.get('code') else '') for d in diagnostics)}
    vals=sorted(c['prix_m2'] for c in candidates)
    mid=lambda x:(x[(len(x)-1)//2]+x[len(x)//2])/2
    median=mid(vals)
    selected=[c for c in candidates if .65*median<=c['prix_m2']<=1.35*median]
    if len(selected)<3:
        return {'status':'insuffisant','message':'Prix trop dispersés : estimation automatique impossible.',
                'source':source_url,'comparables':candidates[:30],'diagnostics':diagnostics}
    m=mid(sorted(c['prix_m2'] for c in selected)); rnd=lambda x:round(x/1000)*1000
    return {'status':'indicatif','source':source_url,'source_nom':source_name,
            'comparables':selected[:30],'nombre':len(selected),'diagnostics':diagnostics,
            'periode_debut':min(str(c.get('date','')) for c in selected),'periode_fin':max(str(c.get('date','')) for c in selected),
            'prix_m2_median':round(m),'basse':rnd(m*surface*.85),
            'centrale':rnd(m*surface),'haute':rnd(m*surface*1.15),
            'avertissement':'Fourchette statistique non ajustée : état, terrain, travaux et dépendances non pris en compte. Données tierces à vérifier avant tout avis de valeur.'}

# V13.53 — Découverte d'annonces indexées. Aucune extraction de portail protégé.
# Une annonce indexée n'est pas une annonce dont la disponibilité a été vérifiée.
MARKET_DOMAINS=('seloger.com','bienici.com','leboncoin.fr','logic-immo.com',
'orpi.com','century21.fr','laforet.com','iadfrance.fr','safti.fr',
'optimhome.com','capifrance.fr','foncia.com','guy-hoquet.com',
'etreproprio.com','superimmo.com','paruvendu.fr','green-acres.fr',
'roques-immobilier.com','lamalou-immobilier.fr','groupementimmo.fr','groupement-immobilier.fr',
'immo-reseau.com','immoreseau.com','bskimmobilier.com','casagogo.fr','proprietes-privees.com',
'3gimmobilier.com','efficity.com','megagence.com','agence-immobiliere-bed arieux.fr'.replace(' ','') )

def _market_clean(s):
    import html
    return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html.unescape(s or ''))).strip()

def _market_euro(s):
    # Accept 245 000 €, 245.000 €, 245000 euros and 245k €.
    pattern=r'(?<!\d)(\d{2,3}(?:[ \u00a0\u202f.]?\d{3}){1,2}|\d{5,7}|\d{2,4}\s?k)\s*(?:€|euros?)(?!\s*/\s*mois)'
    for m in re.finditer(pattern,s,re.I):
        raw=m.group(1).lower().replace(' ','').replace('\u00a0','').replace('\u202f','')
        value=int(float(raw[:-1])*1000) if raw.endswith('k') else int(re.sub(r'\D','',raw))
        if 15000<=value<=10000000:return value
    return None

def _market_area(s):
    for m in re.finditer(r'(?<!\d)(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:m²|m2)\b',s,re.I):
        v=float(m.group(1).replace(',','.'))
        if 12<=v<=1000:return v
    return None

def _market_host(url):
    from urllib.parse import urlparse
    try:
        p=urlparse(url);host=(p.hostname or '').lower().removeprefix('www.')
        if p.scheme not in ('http','https'):return None
        return host if any(host==d or host.endswith('.'+d) for d in MARKET_DOMAINS) else None
    except ValueError:return None

def _market_parse_rss(xml, city, typ):
    import xml.etree.ElementTree as ET
    root=ET.fromstring(xml)
    entries=root.findall('.//item')
    out=[];stats={'extraits':len(entries),'domaines_non_retenus':0,'sans_type':0,'sans_commune':0,'doublons':0}
    seen=set()
    citykey=re.sub(r'[^a-z0-9]','',__import__('unicodedata').normalize('NFKD',city).encode('ascii','ignore').decode().lower())
    for item in entries:
        title=_market_clean(item.findtext('title'))
        description=_market_clean(item.findtext('description'))
        url=(item.findtext('link') or '').strip();host=_market_host(url)
        if not host:stats['domaines_non_retenus']+=1;continue
        combined=title+' '+description
        if not re.search(r'\b'+typ+r's?\b',combined,re.I):stats['sans_type']+=1;continue
        normalized=re.sub(r'[^a-z0-9]','',__import__('unicodedata').normalize('NFKD',combined).encode('ascii','ignore').decode().lower())
        # Require city or postal code in the indexed extract to prevent out-of-town listings.
        postal='34240' if citykey=='lamaloulesbains' else ''
        if citykey not in normalized and not (postal and postal in normalized):stats['sans_commune']+=1;continue
        from urllib.parse import urlsplit,urlunsplit
        parts=urlsplit(url);canonical=urlunsplit((parts.scheme,parts.netloc,parts.path.rstrip('/'),'',''))
        if canonical in seen:stats['doublons']+=1;continue
        seen.add(canonical)
        price=_market_euro(combined);area=_market_area(combined)
        out.append({'titre':title[:180],'description':description[:400],'url':url,
          'site':host,'prix':price,'surface':area,'prix_m2':round(price/area) if price and area else None,
          'fiabilite':'Extrait indexé : disponibilité, prix et caractéristiques non vérifiés'})
    return out,stats


def _market_city_key(value):
    import unicodedata
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value).encode('ascii','ignore').decode().lower())


def _market_parse_roques(page, city, typ):
    """Lire chaque carte indépendamment, sans confondre terrain et habitation."""
    import html
    rows=[];seen=set()
    citykey=_market_city_key(city)
    for block in re.findall(r'<article\b[^>]*>(.*?)</article>',page,re.S|re.I):
        links=re.findall(r'href=["\'](/vente/[^"\']+)["\']',block,re.I)
        path=next((u for u in links if re.search(r'/\d+-[^/]+/(?:maison|villa|maison-de-village|mas|propriete|appartement|studio|duplex)/\d+-',u)),None)
        if not path or path in seen:continue
        parts=path.split('/')
        if _roques_name_key(re.sub(r'^\d+-','',parts[2]).replace('-',' '))!=_roques_name_key(city):continue
        if parts[3] not in (('maison','villa','maison-de-village','mas','propriete') if typ=='maison' else ('appartement','studio','duplex')):continue
        titlematch=re.search(r'<p\b[^>]*class=["\'][^"\']*item__block--title[^"\']*["\'][^>]*>(.*?)</p>',block,re.S|re.I)
        pricematch=re.search(r'<div\b[^>]*class=["\'][^"\']*item__price[^"\']*["\'][^>]*>(.*?)</div>',block,re.S|re.I)
        if not titlematch or not pricematch:continue
        title=_market_clean(titlematch[1]);price=_market_euro(_market_clean(pricematch[1]))
        # La surface provient du titre de la carte, jamais des options terrain.
        area=_market_area(title)
        if not price or not area:continue
        if re.search(r'\b(?:vendu[e]?|sous compromis)\b',_market_clean(block),re.I):continue
        image_match=re.search(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']',block,re.I)
        photo=urllib.parse.urljoin('https://www.roques-immobilier.com',html.unescape(image_match[1])) if image_match else ''
        if not photo.startswith('https://'):photo=''
        summary_match=re.search(r'title=(["\'])Voir le bien\s+(.*?)\1',block,re.I|re.S)
        summary=_market_clean(summary_match[2]) if summary_match else title
        seen.add(path)
        rows.append({'titre':title,'description':summary[:180],'photo':photo,'commune':city,'url':'https://www.roques-immobilier.com'+html.unescape(path),
          'site':'Roques Immobilier','prix':price,'surface':area,'prix_m2':round(price/area),
          'fiabilite':'Annonce présente sur le catalogue public ; disponibilité à confirmer auprès de l’agence',
          'consulte_le':datetime.now().isoformat(timespec='seconds')})
    return rows


def _market_parse_public(page, city, typ, source):
    import html
    bases={'IAD':'https://www.iadfrance.fr','SAFTI':'https://www.safti.fr','Superimmo':'https://www.superimmo.com'}
    out=[];seen=set();citykey=_market_city_key(city)
    for block in re.findall(r'<article\b[^>]*>(.*?)</article>',page,re.S|re.I):
        plain=_market_clean(block)
        if re.search(r'\b(?:sous compromis|sous offre|vendu[e]?)\b',plain[:400],re.I):continue
        hrefs=[html.unescape(m[1]) for m in re.findall(r'href=(["\'])(.*?)\1',block,re.S|re.I)]
        if source=='IAD':path=next((u for u in hrefs if re.match(r'/annonce/[^/]+/r\d+$',u)),None)
        elif source=='SAFTI':path=next((u for u in hrefs if re.match(r'/annonces/achat/[^/]+/[^/]+/\d+$',u)),None)
        else:path=next((u for u in hrefs if u.startswith('/annonces/achat-')),None)
        if not path or path in seen:continue
        # Filtrer la commune dans le chemin de l'annonce, pas seulement le descriptif.
        if citykey not in _market_city_key(path):continue
        if not re.search(r'/(?:annonce/)?(?:achat-)?'+typ+r'[-/]',path,re.I) and not (source=='SAFTI' and '/'+typ+'/' in path):continue
        heading=re.search(r'<h[23]\b[^>]*>(.*?)</h[23]>',block,re.S|re.I)
        title=_market_clean(heading[1]) if heading else ''
        if source=='Superimmo':title=title.split('Ter.')[0].strip(' •')
        # L'habitation est la première surface dans la carte, avant le terrain.
        area=_market_area(title) or _market_area(plain)
        price_block=re.search(r'<b\b[^>]*class=["\'][^"\']*font-rubik[^>]*>(.*?)</b>',block,re.S|re.I) if source=='Superimmo' else None
        price=_market_euro(_market_clean(price_block[1]) if price_block else plain)
        if not area or not price:continue
        photos=[]
        for tag in re.findall(r'<img\b[^>]*>',block,re.S|re.I):
            src=re.search(r'\bsrc=(["\'])(.*?)\1',tag,re.S|re.I)
            if not src:continue
            image=html.unescape(src[2]);alt=re.search(r'\balt=(["\'])(.*?)\1',tag,re.S|re.I)
            if source=='IAD' and 'images.iadfrance.fr/property/' in image:photos.append(image)
            if source=='SAFTI' and 'cdn.safti.fr/bien-photo/' in image:photos.append(image)
            if source=='Superimmo' and 'photo.superimmo.com/' in image and alt and re.search(r'maison|appartement|villa',html.unescape(alt[2]),re.I):photos.append(image)
        agency=source
        if source=='Superimmo':
            names=[_market_clean(x) for x in re.findall(r'<a\b[^>]*href=["\']/agence/[^>]*>(.*?)</a>',block,re.S|re.I)]
            name=next((x for x in names if x),'')
            if name:agency=name[:100]+' via Superimmo'
            desc=re.search(r'<p\b[^>]*class=["\'][^"\']*js-desc-truncate[^>]*>(.*?)</p>',block,re.S|re.I)
            description=_market_clean(desc[1])[:180] if desc else title
        else:description=title+' — '+city+' — '+str(area).rstrip('0').rstrip('.')+' m²'
        seen.add(path)
        out.append({'titre':title,'description':description,'site':agency,'source_recherche':source,
          'url':bases[source]+path,'photo':photos[0] if photos else '', 'commune':city,
          'prix':price,'surface':area,'prix_m2':round(price/area),'consulte_le':datetime.now().isoformat(timespec='seconds'),
          'fiabilite':'Annonce du catalogue public ; disponibilité à confirmer'})
    return out


def _market_bienici_url(typ):
    filters={'filterType':'buy','propertyType':['house' if typ=='maison' else 'flat'],
        'zoneIdsByTypes':{'zoneIds':['-164612']},'onTheMarket':[True],
        'size':100,'from':0,'sortBy':'price','sortOrder':'asc'}
    return 'https://www.bienici.com/realEstateAds.json?'+urllib.parse.urlencode({'filters':json.dumps(filters)})


def _market_parse_bienici(content,city,typ):
    data=json.loads(content);out=[];seen=set()
    for ad in data.get('realEstateAds',[]):
        if _market_city_key(str(ad.get('city','')))!=_market_city_key(city):continue
        if ad.get('propertyType')!=('house' if typ=='maison' else 'flat'):continue
        if ad.get('isSold') or ad.get('isUnderOffer') or ad.get('onTheMarket') is False:continue
        try:price=float(ad.get('price') or 0);area=float(ad.get('surfaceArea') or 0)
        except (ValueError,TypeError):continue
        if not 15000<=price<=10000000 or not 12<=area<=1000:continue
        ref=str(ad.get('id') or '')
        if not ref or ref in seen:continue
        seen.add(ref)
        photo=next((str(p.get('url','')) for p in ad.get('photos',[]) if isinstance(p,dict) and str(p.get('url','')).startswith('https://file.bienici.com/')),'')
        description=_market_clean(str(ad.get('description','')))
        # Arrêter le descriptif à une limite de mot pour garder des cartes courtes.
        if len(description)>180:description=description[:177].rsplit(' ',1)[0]+'…'
        title=_market_clean(str(ad.get('title') or 'Bien proposé à la vente'))
        title+=' — '+str(area).removesuffix('.0')+' m²'
        if ad.get('roomsQuantity'):title+=' — '+str(ad['roomsQuantity'])+' pièces'
        out.append({'titre':title,'description':description,'prix':round(price),'surface':area,
            'prix_m2':round(price/area),'site':'Bien’ici','source_recherche':'Bien’ici','commune':city,
            'photo':photo,'url':'https://www.bienici.com/annonce/'+urllib.parse.quote(ref,safe=''),
            'consulte_le':datetime.now().isoformat(timespec='seconds'),
            'fiabilite':'Annonce du catalogue public ; disponibilité à confirmer'})
    return out

@app.get('/api/estimation/annonces')
def annonces_marche(commune: str, type_bien: str, surface: float = 0):
    city=commune.strip()[:80];typ=type_bien.lower().strip()
    if not re.fullmatch(r"[A-Za-zÀ-ÿ0-9 '’\-]{2,80}",city):raise HTTPException(400,'Commune non valide')
    if typ not in ('maison','appartement'):raise HTTPException(400,'Type de bien non pris en charge')
    if not 0<=surface<=20000:raise HTTPException(400,'Surface non valide')
    domains=[('Roques Immobilier','roques-immobilier.com'),('IAD','iadfrance.fr'),('SAFTI','safti.fr'),
      ('SeLoger','seloger.com'),('Leboncoin','leboncoin.fr'),('Bien’ici','bienici.com'),('Agences locales','')]
    links=[{'nom':name,'url':'https://www.google.com/search?'+urllib.parse.urlencode({'q':
        (f'site:{domain} ' if domain else '')+f'"{city}" {typ} vente'})} for name,domain in domains]
    rows=[];diag=[]
    if _market_city_key(city)=='lamaloulesbains':
        from concurrent.futures import ThreadPoolExecutor
        sources=[('Roques Immobilier','https://www.roques-immobilier.com/vente/4-lamalou-les-bains/1'),
          ('IAD','https://www.iadfrance.fr/annonces/lamalou-les-bains-34240/vente/'+typ),
          ('SAFTI','https://www.safti.fr/annonces/achat/'+typ+'/lamalou-les-bains-34240'),
          ('Superimmo','https://www.superimmo.com/achat/'+typ+'/languedoc-roussillon/herault/lamalou-les-bains-34240'),
          ('Bien’ici',_market_bienici_url(typ))]
        def load_source(entry):
            name,url=entry
            try:
                req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html'})
                with urllib.request.urlopen(req,timeout=12) as response:page=response.read(2500000).decode('utf-8',errors='replace')
                found=(_market_parse_bienici(page,city,typ) if name=='Bien’ici' else
                    _market_parse_roques(page,city,typ) if name=='Roques Immobilier' else _market_parse_public(page,city,typ,name))
                return found,{'source':name,'etat':'accessible','retenus':len(found)}
            except Exception as exc:return [],{'source':name,'etat':'indisponible','detail':type(exc).__name__}
        with ThreadPoolExecutor(max_workers=5) as pool:
            for found,diagnostic in pool.map(load_source,sources):rows.extend(found);diag.append(diagnostic)
        # Conserver une seule occurrence des mêmes prix et surface dans la commune.
        # Il s'agit de doublons probables, l'identité précise du bien reste à vérifier.
        unique={}
        for row in rows:
            key=(row['prix'],row['surface'])
            if key not in unique:unique[key]=row
        rows=list(unique.values())
    else:diag.append({'source':'Catalogues directs','etat':'commune_non_couverte'})
    if surface:rows.sort(key=lambda row:abs(row['surface']-surface))
    message=(f'{len(rows)} annonce(s) de {typ} repérée(s) à {city} sur {sum(d.get("retenus",0)>0 for d in diag)} source(s), après retrait des doublons probables.' if rows else
        'Aucune annonce récupérée automatiquement. Les liens ci-dessous restent disponibles pour rechercher et ajouter des comparables.')
    return {'status':'resultats' if rows else 'aucun_resultat','annonces':rows,'recherches_agences':links,
        'message':message,'diagnostics':diag,
        'limites':'Catalogues consultés à Lamalou-les-Bains : Roques Immobilier, IAD, SAFTI, Superimmo et Bien’ici. Résultats non exhaustifs ; autres communes par liens. Doublons résiduels possibles. Prix affichés, disponibilité à confirmer ; aucune intégration automatique au calcul DVF.'}


_ROQUES_GEO_CACHE={}
def _roques_name_key(name):
    text=re.sub(r'\bst\b','saint',name.lower())
    text=re.sub(r'\bste\b','sainte',text)
    return _market_city_key(text)


def _roques_discovery():
    import time
    from concurrent.futures import ThreadPoolExecutor
    if _ROQUES_GEO_CACHE.get('expires',0)>time.monotonic():return _ROQUES_GEO_CACHE['data']
    urls=['https://www.roques-immobilier.com/sitemap.xml']+[
        'https://geo.api.gouv.fr/departements/'+dept+'/communes?fields=nom,code,centre&format=json' for dept in ('34','12','81')]
    def load(url):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=10) as r:return r.read(3000000).decode('utf-8')
        except Exception:return ''
    with ThreadPoolExecutor(max_workers=4) as pool:pages=list(pool.map(load,urls))
    if not pages[0]:raise HTTPException(503,'Catalogue des communes Roques indisponible')
    towns=sorted(set(re.findall(r'/vente/(\d+-[^/<]+)/',pages[0])))
    geo=[]
    for page in pages[1:]:
        try:geo.extend(json.loads(page) if page else [])
        except ValueError:pass
    if not geo:raise HTTPException(503,'Coordonnées des communes indisponibles')
    data=(towns,geo);_ROQUES_GEO_CACHE.update(data=data,expires=time.monotonic()+900);return data


def _roques_distance(a,b):
    lon1,lat1,lon2,lat2=map(math.radians,[a[0],a[1],b[0],b[1]])
    d=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371*2*math.asin(min(1,math.sqrt(d)))


@app.get('/api/estimation/roques')
def roques_similaires(commune:str,type_bien:str,prix:float=0,surface:float=0):
    if type_bien not in ('maison','appartement') or not 0<prix<=10000000:raise HTTPException(400,'Calculer l’estimation et préciser le type de bien')
    if not 0<=surface<=20000:raise HTTPException(400,'Surface non valide')
    towns,geo=_roques_discovery()
    target=next((x for x in geo if str(x.get('code'))==commune.strip() or _roques_name_key(x.get('nom',''))==_roques_name_key(commune)),None)
    if not target or not target.get('centre'):raise HTTPException(400,'Commune non reconnue pour la recherche de proximité')
    center=target['centre']['coordinates'];catalog=[]
    for slug in towns:
        name=re.sub(r'^\d+-','',slug).replace('-',' ')
        town=next((x for x in geo if _roques_name_key(x.get('nom',''))==_roques_name_key(name)),None)
        if not town or not town.get('centre'):continue
        distance=_roques_distance(center,town['centre']['coordinates'])
        if distance<=20 or town['code']==target['code']:catalog.append((0 if town['code']==target['code'] else distance,town,slug))
    catalog.sort(key=lambda x:(x[0],x[1]['nom']));rows=[];seen=set();diagnostics=[]
    for distance,town,slug in catalog:
        if len(rows)>=4:break
        url='https://www.roques-immobilier.com/vente/'+slug+'/1'
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=10) as r:page=r.read(2500000).decode('utf-8',errors='replace')
            found=_market_parse_roques(page,town['nom'],type_bien)
            # En cas de pagination, consulter les pages suivantes si le premier
            # lot ne suffit pas à compléter les quatre places restantes.
            pages=sorted(set(int(x) for x in re.findall(r'/vente/'+re.escape(slug)+r'/(\d+)(?:[?"\'])',page)))
            for number in pages:
                if number<=1 or number>5:continue
                try:
                    with urllib.request.urlopen('https://www.roques-immobilier.com/vente/'+slug+'/'+str(number),timeout=10) as r:extra=r.read(2500000).decode('utf-8',errors='replace')
                    found.extend(_market_parse_roques(extra,town['nom'],type_bien))
                except Exception:diagnostics.append({'commune':town['nom'],'etat':'page_indisponible'})
            found.sort(key=lambda x:(abs(x['prix']-prix),abs(x['surface']-surface)))
            for row in found:
                if row['url'] in seen:continue
                seen.add(row['url']);row['distance_km']=round(distance,1)
                row['description']=town['nom']+(' — même commune' if distance==0 else ' — à '+str(round(distance,1))+' km à vol d’oiseau')+' · '+row['description']
                rows.append(row)
                if len(rows)>=4:break
            diagnostics.append({'commune':town['nom'],'distance_km':round(distance,1),'etat':'accessible','retenus':len(found)})
        except Exception:diagnostics.append({'commune':town['nom'],'etat':'indisponible'})
    return {'annonces':rows,'diagnostics':diagnostics,'commune':target['nom'],
        'message':str(len(rows))+' annonce(s) Roques sélectionnée(s). Commune du bien prioritaire, puis communes par distance croissante dans un rayon de 20 km. Prix le plus proche dans chaque commune. Distances à vol d’oiseau entre centres des communes.'}


class EmailDraftPayload(BaseModel):
    document_base64:str
    kind:str
    filename:str='Dossier_estimation'
    subject:str='Dossier d’estimation immobilière'
    body:str='Bonjour,\n\nVous trouverez en pièce jointe le dossier d’estimation immobilière.\n\nCordialement.'


def _email_draft_bytes(p):
    import base64
    import binascii
    from email.message import EmailMessage
    from email.policy import SMTP
    from email.utils import make_msgid,formatdate
    if p.kind not in ('pdf','word'):raise HTTPException(400,'Format non pris en charge')
    if len(p.document_base64)>35_000_000:raise HTTPException(413,'Document trop volumineux pour préparer le mail')
    try:raw=base64.b64decode(p.document_base64,validate=True)
    except (ValueError,binascii.Error):raise HTTPException(400,'Document encodé non valide')
    if not raw or len(raw)>25_000_000:raise HTTPException(413,'Document vide ou trop volumineux')
    if (p.kind=='pdf' and not raw.startswith(b'%PDF')) or (p.kind=='word' and not raw.startswith(b'PK')):raise HTTPException(400,'Le document ne correspond pas au format demandé')
    extension='pdf' if p.kind=='pdf' else 'docx'
    name=re.sub(r'[^\w. -]','_',p.filename,flags=re.UNICODE).strip(' .')[:140] or 'Dossier_estimation'
    if not name.lower().endswith('.'+extension):name+='.'+extension
    subject=re.sub(r'[\r\n]+',' ',p.subject).strip()[:240] or 'Dossier d’estimation immobilière'
    msg=EmailMessage(policy=SMTP);msg['Subject']=subject;msg['X-Unsent']='1'
    msg['Date']=formatdate(localtime=True);msg['Message-ID']=make_msgid(domain='estimia.local')
    msg.set_content(p.body[:20000],charset='utf-8')
    subtype='pdf' if p.kind=='pdf' else 'vnd.openxmlformats-officedocument.wordprocessingml.document'
    msg.add_attachment(raw,maintype='application',subtype=subtype,filename=name)
    return msg.as_bytes()


@app.post('/api/email/draft')
def email_draft(p:EmailDraftPayload):
    raw=_email_draft_bytes(p)
    return StreamingResponse(io.BytesIO(raw),media_type='message/rfc822',headers={
        'Content-Disposition':'attachment; filename="Email_dossier_estimation.eml"','Cache-Control':'no-store'})
