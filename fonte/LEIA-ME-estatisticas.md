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
- **Jogos só no dispositivo:** passam entre tablets com Exportar/Importar cópia. Na importação, fica a versão mais recente de cada jogo.

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
