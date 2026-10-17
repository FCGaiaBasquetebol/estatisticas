# App de Estatísticas FC Gaia: contexto para continuar noutro chat

Cola este texto no início do novo chat e anexa o ficheiro `fcgaia-estatisticas-fonte.zip`.

## O que é
- Uma app web (PWA) de estatísticas de jogo ao estilo do FIBA Live Stats, pensada para tablet e que funciona sem internet.
- Repositório próprio: `andreferraz12/fcgaia-estatisticas` (GitHub Pages, branch main, raiz) → https://andreferraz12.github.io/fcgaia-estatisticas/
- Lê as equipas, os atletas e os jogos de https://andreferraz12.github.io/Fcgaiacalendario/data/jogos.json (site principal, mesma origem github.io, sem problemas de CORS).

## Funcionalidades feitas
- **Registo do jogo:**
  - Em Novo jogo aparece uma grelha com foto, número e posição de cada atleta, e toca-se para convocar.
  - O cinco inicial escolhe-se já no ecrã do jogo, tocando ou arrastando, e o relógio só arranca com 5 em campo.
  - Substitui-se arrastando um atleta do banco para cima de outro em campo, ou ao contrário. O botão Substituir continua a existir.
  - As ações estão em duas colunas encostadas ao campo:
    - à esquerda: lance livre convertido e falhado, ressalto ofensivo e defensivo, assistência e roubo;
    - à direita: perda, desarme, falta pessoal, antidesportiva, técnica e recebida.
  - As fotos vêm de `plantel[].photo` no jogos.json e ficam guardadas pelo service worker.
  - O relógio conta os minutos, e há +/-, faltas de equipa e anular.
- **Faltas:** pessoal, antidesportiva, técnica e recebida (a recebida tem um layout próprio). Desqualificação com 5 faltas, 2 antidesportivas, 2 técnicas ou antidesportiva + técnica.
- **Mapa de lançamentos:** toca-se no campo e escolhe-se Convertido ou Falhado; os 2 ou 3 pontos são calculados automaticamente. O campo está dividido em 9 zonas coloridas:
  - Z1: garrafão
  - Z2, Z3 e Z4: meia distância
  - Z5 e Z9: cantos
  - Z6, Z7 e Z8: triplos
- **Adversário:** estatísticas e lançamentos ao nível da equipa.
- **Jogos guardados no dispositivo**, com backup em JSON e exportação Excel:
  - por jogo: folhas Estatísticas, Jogadas, Lançamentos e Jogo;
  - por época: folhas Totais, Médias por jogo, Jogo a jogo e Jogos.
- **Época · acumulado:** ficha do atleta com totais, médias por jogo, cartões de indicadores e zonas de tiro.
- **Login com utilizador e palavra-passe, com os utilizadores definidos no código** (sem Firebase, sem servidor).
  - A lista está em `utilizadores.json` (raiz do repositório fcgaia-estatisticas): nome, utilizador, perfil, escalões, ativo, sal e hash PBKDF2-SHA256 (150 000 iterações). Nunca guarda palavras-passe em claro.
  - A app lê o ficheiro publicado (guarda cópia offline) e tem também uma cópia embutida no build.
  - Há um único administrador (perfil `coordenador`). Os outros são treinadores de um ou mais escalões: Sub 14, Sub 16 e Sub 18, A e B.
  - No separador Utilizadores, só para o admin, cria-se, mudam-se escalões e palavra-passe, desativa-se ou apaga-se. Cada alteração é enviada diretamente para `utilizadores.json` (raiz do repositório fcgaia-estatisticas) no GitHub (API de conteúdos) com um token “fine-grained” só deste repositório e com permissão Contents: Read and write. O token é colado uma vez no dispositivo do admin, fica só nesse dispositivo e nunca vai para o código nem para o chat. Sem token, continua a dar para descarregar o ficheiro e carregá-lo à mão.
  - Se o ficheiro não tiver administrador, a app abre a “Configuração inicial” para o criar.
  - Mudar a palavra-passe de alguém termina as sessões abertas dessa pessoa, depois de publicado.
- **Base de dados dos jogos:**
  - Os jogos ficam no repositório **privado** `andreferraz12/fcgaia-estatisticas-dados`, um ficheiro por jogo em `jogos/<escalão>__<id>.json`.
  - Tudo é gravado primeiro no dispositivo. Quando há internet, a app envia o que falta e recebe os jogos dos escalões de cada pessoa:
    - ao entrar na conta;
    - quando a ligação volta;
    - de 90 em 90 segundos;
    - quando se carrega em Gravar;
    - quando se sai da app.
  - O acesso é um token fine-grained só para esse repositório (Contents: Read and write).
    - O admin cola-o uma vez em Utilizadores.
    - Fica cifrado com AES-GCM em `dk` de cada utilizador do `utilizadores.json`, com uma chave PBKDF2 derivada da palavra-passe dessa pessoa. Assim, os tablets dos treinadores também sincronizam.
    - Quem foi criado antes de a base de dados estar ligada só fica com acesso quando o admin lhe define uma nova palavra-passe.
  - Sair da conta apaga o token do dispositivo.
  - Sem base de dados ligada, os jogos ficam só no dispositivo, e passam entre tablets com Exportar/Importar cópia.
- **No jogo:**
  - O relógio é grande, com Iniciar/Parar e Período ao lado. Tocar no tempo abre a correção (±1 min, ±10 s, ±1 s, ou escrever mm:ss).
  - No topo há Gravar, que grava, envia e volta à lista, e Cancelar jogo, que apaga o jogo neste dispositivo e na base de dados.
  - Os convocados escolhem-se numa lista com foto pequena.

## Ficheiros (no zip)
- `stats_src.html`: código-fonte da app.
- `build_stats.py`: gera `estatisticas/index.html` (`python3 build_stats.py [jogos.json]`, com o argumento opcional a gerar `preview.html`). Embute `utilizadores.json` e copia-o para `estatisticas/`. O emblema é reaproveitado do index.html publicado.
- `utilizadores.json`: lista de utilizadores. Começa vazia.
- `estatisticas/`: a versão publicada, ou seja, o conteúdo da raiz do repositório fcgaia-estatisticas: index.html, sw.js (cache v6), manifest, ícones, xlsx e utilizadores.json.

## Ligação no site principal
- O `index.html` do site principal tem, no rodapé, a ligação “🔒 Área privada”, que aponta para https://andreferraz12.github.io/fcgaia-estatisticas/. Quem gerar o site principal tem de manter esta linha:
  `<p class="priv"><a href="https://andreferraz12.github.io/fcgaia-estatisticas/" rel="nofollow">🔒 Área privada</a></p>` (no fim do `<footer>`), com o CSS
  `.priv{margin-top:10px}.priv a{color:var(--gold);font-weight:700;text-decoration:none}`

## Publicar
1. Criar no GitHub o repositório público `fcgaia-estatisticas`, vazio.
2. Carregar na raiz o conteúdo da pasta `estatisticas/`.
3. Em Settings → Pages, escolher Deploy from a branch → main → / (root).
4. No repositório Fcgaiacalendario, substituir o `index.html` pelo que tem a ligação da área privada.
5. Abrir a área privada, criar o admin, ligar ao GitHub com um token fine-grained só para `fcgaia-estatisticas` (Contents: Read and write) e criar os utilizadores.

## Regras combinadas
- Nada de palavras-passe no chat nem no código.
- O `utilizadores.json` é público (está no site). Por isso só tem hashes, e as palavras-passe devem ter pelo menos 8 caracteres e não ser reutilizadas.
- Não usar o login do Swish/NBN23 para recolher dados.

## Perfis
- **Administrador** (`perfil: "coordenador"`, legado): gere utilizadores e ligações e vê todos os escalões.
- **Treinador** (`perfil: "treinador"`): regista jogos dos seus escalões.
- **Coordenador** e **Diretor** (`perfil: "consulta"`, `cargo: "Coordenador"|"Diretor"`): só consulta.
  - Não veem Novo jogo nem conseguem reabrir, apagar ou importar jogos.
  - Veem Jogos (Estatísticas/Jogadas), Época e Excel.
  - Escalões: os que forem escolhidos, ou `["*"]` para ver todos.

## Ajuda e instalação
- **Botão "?" no topo:** abre o guia rápido com 8 passos. As imagens estão em `ajuda/1-8.jpg`, tiradas da própria app e guardadas para funcionar offline.
- **Aviso "Instala a app neste tablet":** só aparece em ecrãs táteis e se a app ainda não estiver instalada.
  - Pode ser dispensado por 14 dias.
  - No Chrome/Android/Edge aparece o botão Instalar; no iPad aparecem as instruções do Safari.

## Faltas e desqualificação (FIBA 2026/27)
- Tipos: pessoal (`fp`), disruptiva (`di`), flagrante (`fl`), técnica (`ft`) e recebida (`fd`). A `fu` (antidesportiva) só existe em jogos antigos.
- Desqualificação com 5 faltas, 2 técnicas, 2 flagrantes, ou 1 técnica + 1 flagrante. A disruptiva não conta.
- Técnicas ao treinador ou banco (`tc`/`tb`): não contam para as faltas de equipa. O treinador é desqualificado com 2 técnicas suas, ou 3 no total.

## Jogadas, revisão e correções
- A estatística é recalculada a partir de `log` (`rebuild()`). Cada jogada guarda `on`, os 5 em campo, para o +/-.
- **Separador Jogadas:** "Editar" muda a equipa, o atleta e o tipo de jogada, ou apaga a jogada.
- **Terminar jogo → Gravar:** abre a revisão (`G.review`). A tabela de Atletas fica editável e as correções guardam-se em `G.adj` como diferenças.
- **Gravar jogo:** fecha o jogo.
- **Jogos terminados:** botão "Corrigir estatística".

## Mapa de lançamentos da época
- **Época:** pontos por jogo, FC Gaia contra adversário, em linhas.
- **Ficha do atleta:** pontos por jogo, em barras, com a média.

## v17 (out 2026)
- Menu: Novo jogo | Estatísticas | Utilizadores (o separador "Jogos" desapareceu; a lista de jogos está no fundo de Estatísticas).
- Estatísticas: barra de filtros única (Escalão, Jogos — janela com escolha múltipla, Mostrar — equipa/atleta/adversários, Totais/Médias, Excel). O mapa de lançamentos segue o "Mostrar".
- Novo jogo: "jogo de outra data" abre uma janela (Próximos / Já jogados / Outro jogo); jogos por terminar aparecem no topo com Continuar.
- Seniores, Esperanças e Masters escolhem-se por utilizador (lista ESC). OPEN_TEAMS está vazio.
- v18: separador Plantel (marcar convocados, ✎ editar nome/número, + Adicionar jogador, "Convocar → escolher jogo"). Convocados, números, nomes e última equipa ficam guardados por equipa (localStorage `fcgaia-stats-conv`) e vêm predefinidos em Novo jogo. Número grande com a foto em marca de água.
- v19: página Início (vista por defeito após login): jogo por terminar, botões grandes (Novo jogo, Plantel, Estatísticas, Utilizadores, Ajuda) e próximos jogos com "Preparar".
- v20: indicador de sincronização só aparece quando há algo a resolver (jogos por enviar / sem acesso). Ao gravar: "A enviar estatísticas…" → "✓ Estatísticas enviadas"; sem internet: "Jogo gravado no tablet… liga o Wi-Fi"; quando a rede volta: "✓ N jogos enviados". Cópia de segurança só para o administrador.
- Out 2026: mudança para a organização GitHub FCGaiaBasquetebol (calendário em fcgaiabasquetebol.github.io, app em /estatisticas, dados em FCGaiaBasquetebol/fcgaia-estatisticas-dados). Botão "Trocar token" na base de dados; ao ligar um token diferente, os outros utilizadores ficam "Sem acesso" até nova palavra-passe.
- Chave do clube: o token da base de dados vai cifrado em utilizadores.json (campo tk) com uma chave aleatória; cada utilizador guarda essa chave cifrada com a sua palavra-passe (dk). Trocar o token (ex.: expirou) já não obriga a novas palavras-passe.
- Perfis: Estatístico (perfil "treinador", regista jogos) e Visualização (perfil "consulta", cargo Treinador/Coordenador/Diretor). Administrador vê sempre o estado da nuvem no topo.
