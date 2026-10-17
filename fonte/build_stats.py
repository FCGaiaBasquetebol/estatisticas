"""Gera estatisticas/index.html a partir de stats_src.html.
Uso: python3 build_stats.py [jogos.json para pré-visualização]
- Corre dentro de fonte/ e escreve ../index.html (raiz do repositório).
- Embute ../utilizadores.json (a lista publicada) como cópia de reserva; nunca o altera.
- O emblema é reaproveitado do index.html publicado."""
import json,re,os,sys,shutil
H=os.path.dirname(os.path.abspath(__file__))
P=lambda *a:os.path.join(H,*a)
s=open(P('stats_src.html'),encoding='utf-8').read()
pub=open(P('..','index.html'),encoding='utf-8').read()
crest=re.search(r'const CREST=("[^"]+")',pub).group(1)
s=s.replace('/*CREST*/""',crest)
users=open(P('..','utilizadores.json'),encoding='utf-8').read().strip()
uj=json.loads(users);assert isinstance(uj.get('utilizadores'),list)
for u in uj['utilizadores']:assert 'pw' not in u and 'password' not in u,'utilizadores.json não pode ter palavras-passe em claro'
s=s.replace('/*USERS*/null',json.dumps(uj,ensure_ascii=False,separators=(',',':')))
if len(sys.argv)>1:
    d=json.load(open(sys.argv[1],encoding='utf-8'))
    prev=s.replace('/*DATA*/null',json.dumps({"plantel":d.get("plantel",{}),"games":d.get("games",[])},ensure_ascii=False))
    open(P('preview.html'),'w',encoding='utf-8').write(prev)
import datetime
r=s.replace('/*DATA*/null','null').replace('/*VER*/""',json.dumps(datetime.datetime.now().strftime('%d/%m %H:%M')))
r=r.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>','<script src="xlsx.full.min.js"></script>')
r=r.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="noindex,nofollow">\n<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#000000"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">')
r=r.replace('&&!window.__REMOTE_CAL)return fetch','&&false)return fetch')
r=r.replace('boot();\n</script>','boot();\nif("serviceWorker" in navigator&&location.protocol.startsWith("http")){let had=!!navigator.serviceWorker.controller,done=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!had){had=true;return}if(done||(G&&G.running))return;done=true;if(G)store();location.reload()});navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(r=>{r.update();setInterval(()=>r.update(),600000)}).catch(()=>{})}\n</script>')
assert 'serviceWorker' in r and 'xlsx.full.min.js"></script>' in r and 'fcgaiabasquetebol.github.io/data/jogos.json' in r and 'firebase' not in r.lower()
open(P('..','index.html'),'w',encoding='utf-8').write(r)
for f in ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js','firestore.rules']:
    if os.path.exists(P('..',f)):os.remove(P('..',f))
print("ok")
