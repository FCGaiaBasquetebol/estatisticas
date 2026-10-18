/**
 * FC Gaia · Estatísticas → Google Drive
 * ------------------------------------------------------------
 * Corre na conta Google do clube (script.google.com), uma vez por dia (às 3h da manhã).
 * Quando um jogo terminado é enviado na app, o tablet deixa na base de dados (GitHub, privado):
 *     export/<escalão>/<época>/jogos/<jogo>.pdf      ← ficha do jogo (o mesmo PDF da app)
 *     export/<escalão>/<época>/estatisticas.xlsx     ← estatísticas do escalão (separadores Equipa, Jogos, Atleta)
 *     export/<escalão>/<época>/info.json
 * Este script copia os PDF para a pasta do escalão e mantém lá um Google Sheets
 * "Estatisticas de Jogo_<escalão>_<época>" sempre atualizado (o mesmo ficheiro e o mesmo link).
 *
 * Instalação (uma vez) — ver LEIA-ME.md:
 *   1. Serviços (+) → Drive API → Adicionar.
 *   2. Definições do projeto (⚙) → Propriedades do script → GITHUB_TOKEN = token só de leitura
 *      (Resource owner FCGaiaBasquetebol · repositório fcgaia-estatisticas-dados · Contents: Read-only).
 *   3. Executar «verificarPastas» (confirma que encontra as 6 pastas) e depois «instalar».
 */
const CFG = {
  owner: "FCGaiaBasquetebol",
  repo: "fcgaia-estatisticas-dados",
  branch: "main",
  hora: 3,          // hora a que corre todos os dias (hora de Lisboa)
  /* escalão da app → nome da pasta no Drive. Se o nome não chegar (pastas repetidas),
     cria a propriedade PASTA_<escalão> com o ID da pasta (o código no fim do link da pasta),
     por exemplo PASTA_sub-14-masc-b = 1AbCdEf... */
  pastas: {
    "Sub-14 Masc B": "1. Sub14 B",
    "Sub-14 Masc A": "2. Sub14 A",
    "Sub-16 Masc B": "3. Sub16 B",
    "Sub-16 Masc A": "4. Sub16 A",
    "Sub-18 Masc B": "5. Sub18 B",
    "Sub-18 Masc A": "6. Sub18 A",
    "Seniores Masc": "1. Séniores",      // dentro de "3. Séniores | S23"
    "Esperanças": "2. Esperanças",       // dentro de "3. Séniores | S23"
    "Masters": "4. Masters",
  },
};

/* ===================== instalação ===================== */
function instalar() {
  if (!token_()) throw new Error("Falta a propriedade GITHUB_TOKEN (Definições do projeto → Propriedades do script).");
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sincronizar").timeBased().everyDays(1).atHour(CFG.hora).inTimezone("Europe/Lisbon").create();
  Logger.log("Instalado: corre todos os dias por volta das " + CFG.hora + "h. Para atualizar já, executa «sincronizar».");
  Logger.log(JSON.stringify(sincronizar()));
}
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log("Sincronização automática desligada.");
}
/** Mostra que pasta foi encontrada para cada escalão. */
function verificarPastas() {
  Object.keys(CFG.pastas).forEach(t => {
    const f = pasta_(t);
    Logger.log(t + " → " + (f ? f.getName() + "  " + f.getUrl() : "NÃO ENCONTRADA (" + CFG.pastas[t] + ")"));
  });
}
/** Volta a copiar tudo (PDF e folhas) na próxima sincronização. */
function refazerTudo() {
  const p = PropertiesService.getScriptProperties();
  Object.keys(p.getProperties()).filter(k => k.indexOf("st_") === 0).forEach(k => {
    const st = JSON.parse(p.getProperty(k)); st.upd = 0; Object.keys(st.pdfs || {}).forEach(id => st.pdfs[id].u = 0); p.setProperty(k, JSON.stringify(st));
  });
  sincronizar();
}

/* ===================== sincronização ===================== */
function sincronizar() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ocupado: true };
  const res = { escaloes: 0, pdf: 0, folhas: 0, apagados: 0, semPasta: [] };
  try {
    const esc = gh_("contents/export");
    if (!esc) return { vazio: true };
    esc.filter(d => d.type === "dir").forEach(d => {
      (gh_("contents/" + d.path) || []).filter(e => e.type === "dir").forEach(e => {
        const info = JSON.parse(raw_(e.path + "/info.json").getDataAsString("UTF-8"));
        const key = "st_" + d.name + "_" + e.name, P = PropertiesService.getScriptProperties();
        const st = JSON.parse(P.getProperty(key) || "{}"); st.pdfs = st.pdfs || {};
        if (st.upd && st.upd >= info.upd) return;
        const pasta = pasta_(info.team);
        if (!pasta) { res.semPasta.push(info.team); return; }
        res.escaloes++;
        // PDF de cada jogo
        const ids = {};
        (info.pdfs || []).forEach(p => {
          ids[p.id] = 1;
          const cur = st.pdfs[p.id];
          if (cur && cur.n === p.n && cur.u >= p.u && existe_(cur.f)) return;
          const blob = raw_(e.path + "/jogos/" + p.n).setName(p.n).setContentType("application/pdf");
          if (cur && cur.f) lixo_(cur.f);
          const f = pasta.createFile(blob);
          st.pdfs[p.id] = { n: p.n, u: p.u, f: f.getId() };
          res.pdf++;
        });
        Object.keys(st.pdfs).forEach(id => { if (!ids[id]) { lixo_(st.pdfs[id].f); delete st.pdfs[id]; res.apagados++; } });
        // Google Sheets do escalão
        if (info.jogos) {
          const xb = raw_(e.path + "/estatisticas.xlsx").setContentType(MimeType.MICROSOFT_EXCEL);
          st.folha = folha_(st.folha, info.ficheiro, xb, pasta);
          ligacoes_(st.folha);
          res.folhas++;
        }
        st.upd = info.upd;
        P.setProperty(key, JSON.stringify(st));
      });
    });
    PropertiesService.getScriptProperties().deleteProperty("erro_aviso");
    return res;
  } catch (e) {
    avisarErro_(e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/* Atualiza o Google Sheets mantendo o mesmo ficheiro (e o mesmo link). */
function folha_(id, nome, blob, pasta) {
  const conv = { name: nome, mimeType: MimeType.GOOGLE_SHEETS };
  if (id && existe_(id)) {
    try { Drive.Files.update(conv, id, blob); return id; }
    catch (e) { Logger.log("Não deu para atualizar no mesmo ficheiro (" + e.message + "): vai ser criado outro."); lixo_(id); }
  }
  const it = pasta.getFilesByName(nome);
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
    try { Drive.Files.update(conv, f.getId(), blob); return f.getId(); } catch (e) { f.setTrashed(true); }
  }
  const novo = Drive.Files.create({ name: nome, mimeType: MimeType.GOOGLE_SHEETS, parents: [pasta.getId()] }, blob);
  return novo.id;
}

/* Botões de navegação: no Google Sheets as ligações entre separadores usam o número (gid) de cada separador. */
function ligacoes_(id) {
  try {
    const ss = SpreadsheetApp.openById(id), g = n => { const s = ss.getSheetByName(n); return s ? s.getSheetId() : null; };
    [["Equipa", "F4", "Jogos", "Escolher jogos ›"], ["Equipa", "P4", "Atleta", "Atletas: jogo a jogo ›"],
     ["Jogos", "E4", "Equipa", "‹ Voltar ao ecrã principal"], ["Atleta", "U4", "Equipa", "‹ Voltar ao ecrã principal"]].forEach(([de, cel, para, txt]) => {
      const s = ss.getSheetByName(de), gid = g(para);
      if (s && gid !== null) s.getRange(cel).setFormula('=HYPERLINK("#gid=' + gid + '","' + txt + '")');
    });
  } catch (e) { Logger.log("Ligações: " + e.message); }
}

/* ===================== auxiliares ===================== */
function token_() { return PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN"); }
function url_(path) { return "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo + "/" + path.split("/").map(encodeURIComponent).join("/").replace(/^contents%2F|^contents\//, "contents/") + "?ref=" + CFG.branch; }
function gh_(path) {
  const r = UrlFetchApp.fetch(url_(path), { headers: { Authorization: "Bearer " + token_(), Accept: "application/vnd.github+json" }, muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return null;
  if (r.getResponseCode() !== 200) throw new Error("GitHub " + r.getResponseCode() + " em " + path + ": " + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}
function raw_(path) {
  const r = UrlFetchApp.fetch(url_("contents/" + path), { headers: { Authorization: "Bearer " + token_(), Accept: "application/vnd.github.raw" }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("GitHub " + r.getResponseCode() + " ao ler " + path);
  return r.getBlob();
}
function pasta_(team) {
  const slug = String(team).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = PropertiesService.getScriptProperties().getProperty("PASTA_" + slug);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const nome = CFG.pastas[team];
  if (!nome) return null;
  const it = DriveApp.searchFolders('title = "' + nome.replace(/"/g, '\\"') + '" and trashed = false');
  return it.hasNext() ? it.next() : null;
}
function existe_(id) { try { return !DriveApp.getFileById(id).isTrashed(); } catch (e) { return false; } }
function lixo_(id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
function avisarErro_(e) {
  const P = PropertiesService.getScriptProperties(), hoje = new Date().toISOString().slice(0, 10);
  if (P.getProperty("erro_aviso") === hoje) return;
  P.setProperty("erro_aviso", hoje);
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "FC Gaia · Estatísticas: a cópia para o Drive falhou",
      "A cópia automática para o Drive falhou:\n\n" + e.message +
      "\n\nSe falar em 401/403, o token GITHUB_TOKEN expirou ou perdeu acesso: cria um novo e troca-o nas Propriedades do script.");
  } catch (x) {}
}
