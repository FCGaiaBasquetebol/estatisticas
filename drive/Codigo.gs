/**
 * FC Gaia · Estatísticas → Google Drive
 * ------------------------------------------------------------
 * Corre na conta Google do clube (script.google.com). De 15 em 15 minutos
 * vai buscar os jogos terminados à base de dados (GitHub, repositório privado)
 * e cria/atualiza no Drive:
 *   FC Gaia · Estatísticas / 2026-27 / Sub 16 A / 2026-10-18 Sub 16 A vs CPN (54-41)   ← um Google Sheets por jogo
 *   FC Gaia · Estatísticas / 2026-27 / Sub 16 A / Época 2026-27 · Sub 16 A             ← resumo da época, sempre atualizado
 *
 * Configuração (uma vez):
 *   1. Definições do projeto (⚙) → Propriedades do script → GITHUB_TOKEN = token só de leitura
 *      (Resource owner FCGaiaBasquetebol · repositório fcgaia-estatisticas-dados · Contents: Read-only)
 *   2. Escolher a função «instalar» e carregar em Executar. Autorizar.
 * Não é preciso mexer em mais nada.
 */
const CFG = {
  owner: "FCGaiaBasquetebol",
  repo: "fcgaia-estatisticas-dados",
  dir: "jogos",
  pasta: "FC Gaia · Estatísticas",
  minutos: 15,
  ouro: "#E2B812",
};

/* ===================== instalação ===================== */
function instalar() {
  if (!token_()) throw new Error("Falta a propriedade GITHUB_TOKEN (Definições do projeto → Propriedades do script).");
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "sincronizar").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sincronizar").timeBased().everyMinutes(CFG.minutos).create();
  const r = sincronizar();
  Logger.log("Instalado. Pasta: " + raiz_().getUrl() + " · " + JSON.stringify(r));
}
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log("Sincronização automática desligada.");
}
/** Volta a gerar todas as folhas (útil depois de mudar o formato). */
function refazerTudo() {
  const st = estado_();
  Object.keys(st.jogos).forEach(k => st.jogos[k].sha = "");
  guardarEstado_(st);
  sincronizar();
}

/* ===================== sincronização ===================== */
function sincronizar() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ocupado: true };
  try {
    const lista = gh_(`contents/${CFG.dir}`);
    if (lista === null) return { vazio: true };
    const st = estado_();
    const vistos = {}, mudaram = {};
    let novos = 0, apagados = 0;
    lista.filter(f => /\.json$/.test(f.name)).forEach(f => {
      vistos[f.path] = 1;
      const ant = st.jogos[f.path];
      if (ant && ant.sha === f.sha) return;
      const g = gh_(`contents/${f.path}`, true);
      if (!g || g.status !== "fim") {           // só jogos terminados
        if (ant && ant.fileId) { lixo_(ant.fileId); mudaram[ant.equipa] = 1; }
        delete st.jogos[f.path];
        return;
      }
      const info = escreverJogo_(g, ant && ant.fileId);
      st.jogos[f.path] = { sha: f.sha, ...info };
      mudaram[info.equipa] = 1; novos++;
    });
    Object.keys(st.jogos).forEach(p => {       // apagados na app → para o lixo do Drive
      if (vistos[p]) return;
      const j = st.jogos[p]; if (j.fileId) lixo_(j.fileId);
      mudaram[j.equipa] = 1; delete st.jogos[p]; apagados++;
    });
    Object.keys(mudaram).forEach(eq => escreverEpoca_(st, eq));
    st.erroAvisado = 0;
    guardarEstado_(st);
    return { atualizados: novos, apagados };
  } catch (e) {
    avisarErro_(e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/* ===================== GitHub ===================== */
function token_() { return PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN"); }
function gh_(path, raw) {
  const r = UrlFetchApp.fetch(`https://api.github.com/repos/${CFG.owner}/${CFG.repo}/${path}`, {
    headers: { Authorization: "Bearer " + token_(), Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" },
    muteHttpExceptions: true,
  });
  const c = r.getResponseCode();
  if (c === 404) return null;
  if (c === 401 || c === 403) throw new Error("O GitHub recusou o acesso (" + c + "). O token GITHUB_TOKEN pode ter expirado.");
  if (c >= 300) throw new Error("GitHub respondeu " + c);
  return JSON.parse(r.getContentText());
}
function avisarErro_(e) {
  const st = estado_(), hoje = Utilities.formatDate(new Date(), "Europe/Lisbon", "yyyy-MM-dd");
  if (st.erroAvisado === hoje) return;
  st.erroAvisado = hoje; guardarEstado_(st);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "FC Gaia Estatísticas: a exportação para o Drive falhou",
    "A cópia automática dos jogos para o Google Drive deu erro:\n\n" + e.message +
    "\n\nSe o token expirou: cria um novo no GitHub (só leitura, repositório fcgaia-estatisticas-dados) e substitui GITHUB_TOKEN nas Propriedades do script.");
}

/* ===================== Drive ===================== */
function raiz_() { return pasta_(DriveApp.getRootFolder(), CFG.pasta); }
function pasta_(pai, nome) { const it = pai.getFoldersByName(nome); return it.hasNext() ? it.next() : pai.createFolder(nome); }
function pastaEquipa_(epoca, equipa) { return pasta_(pasta_(raiz_(), epoca), equipa); }
function lixo_(id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
function estado_() {
  const it = raiz_().getFilesByName("_estado.json");
  if (it.hasNext()) { try { const o = JSON.parse(it.next().getBlob().getDataAsString()); o.jogos = o.jogos || {}; return o; } catch (e) {} }
  return { jogos: {} };
}
function guardarEstado_(o) {
  const txt = JSON.stringify(o), it = raiz_().getFilesByName("_estado.json");
  if (it.hasNext()) it.next().setContent(txt); else raiz_().createFile("_estado.json", txt, MimeType.PLAIN_TEXT);
}
/** Cria (ou reaproveita) uma folha de cálculo dentro da pasta. */
function folha_(id, nome, pasta) {
  let ss = null;
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) { ss = SpreadsheetApp.openById(id); f.setName(nome); f.moveTo(pasta); } } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create(nome); DriveApp.getFileById(ss.getId()).moveTo(pasta); }
  return ss;
}
function aba_(ss, nome, linhas, larguras) {
  let sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  sh.clear();
  const n = Math.max(1, ...linhas.map(r => r.length));
  const dados = linhas.map(r => { const x = r.slice(); while (x.length < n) x.push(""); return x; });
  if (dados.length) sh.getRange(1, 1, dados.length, n).setValues(dados);
  sh.getRange(1, 1, 1, n).setFontWeight("bold").setBackground(CFG.ouro).setFontColor("#111111");
  sh.setFrozenRows(1);
  (larguras || []).forEach((w, i) => w && sh.setColumnWidth(i + 1, w));
  return sh;
}
function limparAbas_(ss, manter) {
  ss.getSheets().forEach(s => { if (!manter.includes(s.getName()) && ss.getSheets().length > 1) ss.deleteSheet(s); });
}

/* ===================== conteúdo: um jogo ===================== */
function escreverJogo_(g, fileId) {
  const equipa = g.teamName || g.team, epoca = epoca_(g.date);
  const nome = `${g.date} ${equipa} vs ${g.opp} (${g.us}-${g.them})`;
  const ss = folha_(fileId, nome, pastaEquipa_(epoca, equipa));
  const L = linhasJogo(g);
  const r = aba_(ss, "Resumo", L.resumo, [70, 200]);
  const bsIni = L.resumo.findIndex(x => x[0] === "Nº") + 1;
  if (bsIni > 0) {
    r.getRange(bsIni, 1, 1, L.resumo[bsIni - 1].length).setFontWeight("bold").setBackground(CFG.ouro);
    r.getRange(1, 1, bsIni - 2, 1).setFontWeight("bold");
    r.getRange(1, 1, 1, L.resumo[0].length).setBackground(null).setFontColor(null);
    const tot = L.resumo.findIndex(x => x[1] === "TOTAL") + 1;
    if (tot > 0) r.getRange(tot, 1, 1, L.resumo[tot - 1].length).setFontWeight("bold").setBackground("#FFF6CF");
  }
  aba_(ss, "Jogadas", L.jogadas, [70, 60, 160, 260, 180, 40, 70, 80]);
  aba_(ss, "Lançamentos", L.lancamentos, [70, 60, 160, 180, 40, 50, 90, 200, 60, 60]);
  limparAbas_(ss, ["Resumo", "Jogadas", "Lançamentos"]);
  ss.getSheetByName("Resumo").activate(); ss.moveActiveSheet(1);
  return {
    fileId: ss.getId(), equipa, epoca, data: g.date, adv: g.opp, us: g.us, them: g.them, comp: g.comp || "",
    atl: (g.roster || []).map(p => ({ id: p.id, n: p.num, nome: p.name, s: g.st && g.st[p.id] || null })).filter(a => a.s),
  };
}

/* ===================== conteúdo: época ===================== */
function escreverEpoca_(st, equipa) {
  const jogos = Object.values(st.jogos).filter(j => j.equipa === equipa).sort((a, b) => a.data < b.data ? -1 : 1);
  const porEpoca = {};
  jogos.forEach(j => (porEpoca[j.epoca] = porEpoca[j.epoca] || []).push(j));
  Object.keys(porEpoca).forEach(ep => {
    const lista = porEpoca[ep], pasta = pastaEquipa_(ep, equipa), nome = `Época ${ep} · ${equipa}`;
    const chave = ep + "|" + equipa; st.epocas = st.epocas || {};
    const ss = folha_(st.epocas[chave], nome, pasta); st.epocas[chave] = ss.getId();
    const E = linhasEpoca(lista);
    aba_(ss, "Totais", E.totais, [40, 200]);
    aba_(ss, "Médias por jogo", E.medias, [40, 200]);
    aba_(ss, "Jogo a jogo", E.jogoAJogo, [90, 200, 40, 200]);
    aba_(ss, "Jogos", E.jogos, [90, 200, 70, 90, 90, 200]);
    limparAbas_(ss, ["Totais", "Médias por jogo", "Jogo a jogo", "Jogos"]);
  });
}

/* ===================== cálculos (iguais aos da app) ===================== */
const LBL = { pausa: "Jogo gravado (relógio parado)", di: "Falta disruptiva", fl: "Falta flagrante", tc: "Falta técnica ao treinador", tb: "Falta técnica ao banco", "2+": "Lançamento de 2 convertido", "2-": "Lançamento de 2 falhado", "3+": "Triplo convertido", "3-": "Triplo falhado", "1+": "Lance livre convertido", "1-": "Lance livre falhado",
  or: "Ressalto ofensivo", dr: "Ressalto defensivo", ast: "Assistência", stl: "Roubo de bola", blk: "Desarme de lançamento", tov: "Perda de bola", fp: "Falta pessoal", fu: "Falta antidesportiva", ft: "Falta técnica", fd: "Falta recebida",
  o1: "Adversário: lance livre", o2: "Adversário: 2 pontos", o3: "Adversário: 3 pontos", opf: "Adversário: falta", sub: "Substituição", fimq: "Fim do período", iniq: "Início do período", fim: "Fim do jogo" };
const ZDESC = { 1: "Garrafão", 2: "Meia distância esquerda", 3: "Meia distância centro", 4: "Meia distância direita", 5: "Triplo canto esquerdo", 6: "Triplo lateral esquerda", 7: "Triplo frontal", 8: "Triplo lateral direita", 9: "Triplo canto direito" };
const BX = 750, BY = 157.5, R3 = 675, C3 = 90, YC = BY + Math.sqrt(R3 * R3 - (BX - C3) * (BX - C3)), ANG = 22.5 * Math.PI / 180;
function shotVal(x, y) { if (x < C3 || x > 1500 - C3) return 3; return Math.hypot(x - BX, y - BY) > R3 ? 3 : 2; }
function zoneN(x, y) {
  if (Math.abs(x - BX) <= 245 && y <= 580) return 1;
  if (shotVal(x, y) === 2) return x < 505 ? 2 : x > 995 ? 4 : 3;
  if (y <= YC && (x < C3 || x > 1500 - C3)) return x < BX ? 5 : 9;
  return Math.abs(Math.atan2(x - BX, y - BY)) <= ANG ? 7 : (x < BX ? 6 : 8);
}
const K = ["sec", "pts", "m2", "a2", "m3", "a3", "mf", "af", "or", "dr", "ast", "stl", "blk", "tov", "fp", "di", "fl", "ft", "pf", "fd", "pm"];
const z = s => { const o = {}; K.forEach(k => o[k] = (s && s[k]) || 0); return o; };
const eff = s => s.pts + s.or + s.dr + s.ast + s.stl + s.blk - (s.a2 - s.m2) - (s.a3 - s.m3) - (s.af - s.mf) - s.tov;
const pct = (m, a) => a ? Math.round(1000 * m / a) / 1000 : "";
const p2 = n => (n < 10 ? "0" : "") + n;
const fmtT = s => { s = Math.max(0, Math.ceil(s || 0)); return p2(Math.floor(s / 60)) + ":" + p2(s % 60); };
const num = n => /^\d+$/.test(String(n)) ? +n : (n || "");
const r1 = x => Math.round(x * 10) / 10;
function epoca_(d) { const y = +String(d).slice(0, 4), m = +String(d).slice(5, 7); const a = m >= 8 ? y : y - 1; return a + "-" + p2((a + 1) % 100); }

const CAB = ["Nº", "Atleta", "MIN", "PTS", "2PT C", "2PT T", "2PT %", "3PT C", "3PT T", "3PT %", "LL C", "LL T", "LL %", "RO", "RD", "RT", "AST", "ROU", "DL", "PER", "F. pessoais", "F. disruptivas", "F. flagrantes", "F. técnicas", "Total faltas", "F. recebidas", "+/-", "VAL"];
function linhaStat(n, nome, s, min) {
  return [n, nome, min, s.pts, s.m2, s.a2, pct(s.m2, s.a2), s.m3, s.a3, pct(s.m3, s.a3), s.mf, s.af, pct(s.mf, s.af), s.or, s.dr, s.or + s.dr, s.ast, s.stl, s.blk, s.tov, s.fp, s.di, s.fl, s.ft, s.pf, s.fd, s.pm, eff(s)];
}
function linhasJogo(g) {
  const roster = g.roster || [], byId = {}; roster.forEach(p => byId[p.id] = p);
  const t = z(); roster.forEach(p => { const s = z(g.st && g.st[p.id]); K.forEach(k => t[k] += s[k]); });
  const np = g.np || 4;
  const resumo = [
    ["Jogo", `FC Gaia ${g.us} – ${g.them} ${g.opp}`],
    ["Equipa", "FC Gaia · " + (g.teamName || g.team)],
    ["Data", g.date], ["Competição", g.comp || ""], ["Jogo n.º", g.gameNum || ""], ["Pavilhão", g.venue || ""],
    ["Local", g.home ? "Casa" : "Fora"], ["Períodos", `${np} × ${g.per || 10} min`],
    [],
    CAB,
    ...roster.map(p => { const s = z(g.st && g.st[p.id]); return linhaStat(num(p.num), p.name, s, r1(s.sec / 60)); }),
    linhaStat("", "TOTAL", t, ""),
    [],
    linhaStat("", g.opp + " (equipa)", z(g.ost), ""),
  ];
  const q = e => e.q > np ? "Prol. " + (e.q - np) : e.q;
  const jogadas = [["Período", "Tempo", "Equipa", "Jogada", "Atleta", "Nº", "FC Gaia", "Adversário"],
    ...(g.log || []).map(e => {
      const p = e.id && e.side !== "o" ? byId[e.id] : null;
      const eq = e.side === "o" || (/^o/.test(e.t) && e.t !== "or") ? g.opp : ["fimq", "iniq", "fim"].includes(e.t) ? "" : "FC Gaia";
      const jog = e.t === "sub" ? "Substituição (sai " + ((byId[e.out] || {}).name || "") + ")" : (e.side === "o" ? "Adversário: " : "") + (LBL[e.t] || e.t);
      return [q(e), fmtT(e.c), eq, jog, p ? p.name : "", p ? num(p.num) : "", e.us, e.them];
    })];
  const lancamentos = [["Período", "Tempo", "Equipa", "Atleta", "Nº", "Valor", "Resultado", "Zona", "X (m)", "Y (m)"],
    ...(g.log || []).filter(e => e.x != null).map(e => {
      const p = e.side === "o" ? {} : byId[e.id] || {}, zn = zoneN(e.x, e.y);
      return [q(e), fmtT(e.c), e.side === "o" ? g.opp : "FC Gaia", p.name || "", num(p.num), +e.t[0], e.t.slice(-1) === "+" ? "Convertido" : "Falhado", "Zona " + zn + " · " + ZDESC[zn], Math.round(e.x) / 100, Math.round(e.y) / 100];
    })];
  return { resumo, jogadas, lancamentos };
}
function linhasEpoca(jogos) {
  const A = {};
  jogos.forEach(j => j.atl.forEach(a => {
    const x = A[a.id] = A[a.id] || { n: a.n, nome: a.nome, gp: 0, s: z() };
    x.n = a.n || x.n; x.nome = a.nome || x.nome; x.gp++;
    const s = z(a.s); K.forEach(k => x.s[k] += s[k]);
  }));
  const lista = Object.values(A).sort((a, b) => b.s.pts - a.s.pts || String(a.nome).localeCompare(b.nome));
  const cab = ["Nº", "Atleta", "J"].concat(CAB.slice(2));
  const totais = [cab, ...lista.map(a => { const l = linhaStat(num(a.n), a.nome, a.s, r1(a.s.sec / 60)); l.splice(2, 0, a.gp); return l; })];
  const medias = [cab, ...lista.map(a => {
    const m = {}; K.forEach(k => m[k] = r1(a.s[k] / a.gp));
    const l = linhaStat(num(a.n), a.nome, m, r1(a.s.sec / 60 / a.gp));
    [6, 9, 12].forEach(i => l[i] = pct(a.s[["m2", "m3", "mf"][[6, 9, 12].indexOf(i)]], a.s[["a2", "a3", "af"][[6, 9, 12].indexOf(i)]]));
    l[l.length - 1] = r1(eff(a.s) / a.gp); l.splice(2, 0, a.gp); return l;
  })];
  const jogoAJogo = [["Data", "Adversário", "Nº", "Atleta", "MIN", "PTS", "2PT", "3PT", "LL", "RT", "AST", "ROU", "DL", "PER", "F", "+/-", "VAL"]];
  jogos.forEach(j => j.atl.forEach(a => { const s = z(a.s);
    jogoAJogo.push([j.data, j.adv, num(a.n), a.nome, r1(s.sec / 60), s.pts, s.m2 + "/" + s.a2, s.m3 + "/" + s.a3, s.mf + "/" + s.af, s.or + s.dr, s.ast, s.stl, s.blk, s.tov, s.pf, s.pm, eff(s)]); }));
  const tabela = [["Data", "Adversário", "FC Gaia", "Adversário", "Resultado", "Competição"],
    ...jogos.map(j => [j.data, j.adv, j.us, j.them, j.us > j.them ? "Vitória" : j.us < j.them ? "Derrota" : "Empate", j.comp])];
  const v = jogos.filter(j => j.us > j.them).length, d = jogos.filter(j => j.us < j.them).length;
  tabela.push([], ["Jogos", jogos.length], ["Vitórias", v], ["Derrotas", d],
    ["Pontos marcados (média)", jogos.length ? r1(jogos.reduce((t, j) => t + j.us, 0) / jogos.length) : 0],
    ["Pontos sofridos (média)", jogos.length ? r1(jogos.reduce((t, j) => t + j.them, 0) / jogos.length) : 0]);
  return { totais, medias, jogoAJogo, jogos: tabela };
}
if (typeof module !== "undefined") module.exports = { linhasJogo, linhasEpoca, epoca_, zoneN };
