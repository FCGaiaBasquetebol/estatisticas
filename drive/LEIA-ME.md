# Exportação automática para o Google Drive do clube

`Codigo.gs` é um Google Apps Script que corre na conta Google do clube. De 15 em 15 minutos lê os jogos
terminados do repositório privado `FCGaiaBasquetebol/fcgaia-estatisticas-dados` e cria/atualiza no Drive:

    FC Gaia · Estatísticas / <época> / <escalão> / <data> <escalão> vs <adversário> (<resultado>)   (Google Sheets: Resumo, Jogadas, Lançamentos)
    FC Gaia · Estatísticas / <época> / <escalão> / Época <época> · <escalão>                       (Totais, Médias por jogo, Jogo a jogo, Jogos)

Jogos apagados na app vão para o lixo do Drive. Se o token expirar, o script envia um email à conta do clube (uma vez por dia).

Instalação: script.google.com → Novo projeto → colar Codigo.gs → Propriedades do script: GITHUB_TOKEN (token só de leitura,
Resource owner FCGaiaBasquetebol, repositório fcgaia-estatisticas-dados, Contents: Read-only) → executar `instalar`.
Outras funções: `sincronizar` (agora), `refazerTudo` (regenera todas as folhas), `desinstalar`.
