// Funcionamento offline da página de estatísticas
const CACHE = "fcgaia-estatisticas-v48";
const CORE = ["./", "./index.html", "./xlsx.full.min.js", "./jspdf.umd.min.js", "./jspdf.plugin.autotable.min.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./utilizadores.json", "./ajuda/1.jpg", "./ajuda/2.jpg", "./ajuda/3.jpg", "./ajuda/4.jpg", "./ajuda/5.jpg", "./ajuda/6.jpg", "./ajuda/7.jpg", "./ajuda/8.jpg", "./ajuda/9.jpg", "https://andreferraz12.github.io/Fcgaiacalendario/data/jogos.json", "https://fcgaiabasquetebol.github.io/data/jogos.json"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("fcgaia-estatisticas") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isData = ["https://andreferraz12.github.io/Fcgaiacalendario/data/jogos.json", "https://fcgaiabasquetebol.github.io/data/jogos.json"].includes(url.href.split("?")[0]) || url.pathname.endsWith("/utilizadores.json");
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const isPhoto = url.hostname === "sav2.fpb.pt";
  const inScope = url.origin === location.origin && (url.pathname.startsWith(new URL("./", self.registration.scope).pathname) || isData);
  if (!inScope && !isFont && !isPhoto) return;
  if (isPhoto) {
    // fotos dos atletas: da cache se já houver, para funcionarem sem internet no pavilhão
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
    return;
  }
  if (isData) {
    // dados: tenta a rede, senão usa a última cópia
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(url.origin + url.pathname, cp)); return r; })
      .catch(() => caches.match(url.origin + url.pathname)));
    return;
  }
  // a página: tenta sempre a versão nova (até 4 s); sem rede, usa a guardada
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname === new URL("./", self.registration.scope).pathname) {
    e.respondWith(Promise.race([
      fetch(req, { cache: "no-store" }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); } return r; }),
      new Promise((_, rej) => setTimeout(rej, 4000))
    ]).catch(() => caches.match("./index.html").then(h => h || caches.match(req, { ignoreSearch: true }))));
    return;
  }
  // resto: responde logo da cache e atualiza em segundo plano
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
