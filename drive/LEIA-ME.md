# Cópia automática para o Google Drive do clube

O que acontece:
1. Na app, quando um jogo terminado é enviado (ou corrigido/apagado), o tablet deixa na base de dados privada
   `export/<escalão>/<época>/` o **PDF do jogo** e o **Excel do escalão**.
2. `Codigo.gs` corre na conta Google do clube de 15 em 15 minutos e, para cada escalão com pasta:
   - copia os PDF para a pasta do escalão (ex.: `1. Sub14 B`), com o nome `2026-10-17_F1 J01_Jogo 562_FC Gaia Sub14 B x FIDES_CN1.pdf`;
   - mantém na mesma pasta o Google Sheets **`Estatisticas de Jogo_Sub14 B_2026/2027`** (sempre o mesmo ficheiro e o mesmo link);
   - jogos apagados na app: o PDF vai para o lixo do Drive.

Pastas (em `CFG.pastas`): 1. Sub14 B · 2. Sub14 A · 3. Sub16 B · 4. Sub16 A · 5. Sub18 B · 6. Sub18 A.
Os outros escalões ficam na base de dados mas não são copiados (basta juntar a pasta em `CFG.pastas`).

## Instalação (uma vez, na conta Google do clube)
1. script.google.com → **Novo projeto** → nome "FC Gaia · Drive" → apaga o conteúdo e cola `Codigo.gs`.
2. À esquerda, **Serviços (+)** → **Drive API** → Adicionar.
3. **Definições do projeto (⚙)** → **Propriedades do script** → `GITHUB_TOKEN` = token só de leitura
   (github.com → Settings → Developer settings → Fine-grained tokens → Resource owner **FCGaiaBasquetebol** →
   Only select repositories: **fcgaia-estatisticas-dados** → Permissions: **Contents: Read-only**).
4. Escolhe a função **verificarPastas** → Executar → autoriza. No registo tem de aparecer cada escalão com a sua pasta.
   Se alguma não for encontrada: abre a pasta no Drive, copia o código do fim do link e cria a propriedade
   `PASTA_sub-14-masc-b` (ou o escalão em causa) com esse código.
5. Escolhe **instalar** → Executar. A partir daí corre sozinho.

A conta do clube tem de poder **editar** as 6 pastas. Se o token expirar, chega um email (uma vez por dia).
Outras funções: `sincronizar` (agora), `refazerTudo` (volta a copiar tudo), `desinstalar`.
