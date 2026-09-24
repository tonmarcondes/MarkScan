# MarkScan OMR

Aplicativo web para corrigir folhas de respostas com uma **grade regular, uma questão por linha**, usando imagens ou câmera. O processamento acontece no navegador; gabaritos, configurações e histórico são armazenados localmente.

## Executar

Na pasta do projeto:

```sh
python3 -m http.server 8080
```

Abra http://localhost:8080 em um navegador atualizado. Não abra `index.html` diretamente por `file://`: os módulos JavaScript precisam ser servidos por HTTP.

Para acessar a câmera em outro dispositivo, publique em **HTTPS**. Um endereço HTTP de rede local (por exemplo, `http://192.168.x.x:8080`) não oferece o mesmo acesso à câmera que `localhost`. Autorize a câmera quando solicitado. A câmera só é ligada ao clicar no botão. Na leitura de provas, permanece aberta entre alunos; é desligada ao fechar a câmera ou sair da página. Na fotografia de gabaritos, é desligada após capturar. Upload de imagem continua disponível quando a câmera falha.

## Configurações (engrenagem)

Clique no ícone **⚙** do cabeçalho. Todas as configurações ficam nessa janela:

- **Grade:** quantidade de questões e alternativas.
- **Área de leitura:** bolha/círculo, quadrado ou retângulo; diâmetro/largura, altura do retângulo e limiar de leitura. As dimensões são em pixels da imagem carregada. O formato define os pixels usados na correção, além do contorno exibido.
- **Identificação sobre a imagem:** cor e espessura do contorno, traço contínuo/tracejado, cor dos números, fundo, tamanho, fonte e estilo do texto. O fundo é sólido e combinações sem contraste suficiente são recusadas.
- **Ampliação:** ajustar à largura, 150%, 200% ou 300%. Em imagens ampliadas, role a área da imagem para alcançar outros pontos.
- **Pontuação:** acerto, desconto por erro, pontos em branco e nota máxima.
- **Alunos:** identificação por nome, lista pré-carregada ou sem identificação.

Clique em **Salvar configurações** para aplicar e persistir. Fechar ou pressionar Esc cancela os ajustes não salvos. A aparência vale para as imagens exibidas; a geometria e o limiar de um gabarito salvo só mudam quando ele é editado e salvo novamente.

## Cadastrar e corrigir a calibração do gabarito

1. Selecione a imagem ou clique em **Fotografar gabarito**, e informe um nome.
2. Na engrenagem, confira quantidade de questões, alternativas, formato e dimensões da área de leitura.
3. Clique no centro da primeira área (questão 1, alternativa A). **O número 1 aparece imediatamente**, acompanhado da instrução para o segundo clique.
4. Clique no centro da última área (última alternativa da última questão). A grade será preenchida com números sequenciais, da esquerda para a direita e de cima para baixo. A lista abaixo associa cada número à questão e à alternativa.
5. Se um ponto estiver errado, clique no número na imagem ou na lista, depois clique no novo centro. As **setas** ajustam um pixel; **Shift + seta** ajusta dez pixels. **Esc** cancela a seleção. **Desfazer** recupera a posição anterior.
6. **Reposicionar primeira/última** recalcula a grade a partir dos extremos e remove ajustes individuais; **Refazer grade** volta ao primeiro clique. Alterar a quantidade de questões/alternativas na engrenagem também remove os ajustes individuais.
7. Confira as áreas de leitura e as respostas detectadas. Cada contorno deve ficar dentro da marca impressa, sem incluir sua borda. Clique em **Salvar Gabarito**. Questões em branco ou ambíguas impedem o salvamento.

A imagem original, a calibração, as posições ajustadas e as respostas ficam salvas. Os números são apenas sobreposições visuais e nunca entram na leitura dos pixels. Para corrigir mais tarde, selecione o gabarito e clique em **Editar gabarito selecionado**, faça os ajustes e salve; isso atualiza o mesmo registro.

Gabaritos cadastrados antes desta versão não guardavam a imagem original: nesse caso, é necessário selecionar a imagem e cadastrá-los novamente. Para apenas corrigir provas com um gabarito salvo, use **Aplicar Gabarito**.

## Correção rápida com câmera

1. Aplique o gabarito e clique em **Abrir câmera para prova**.
2. Alinhe a folha aos contornos e números. A câmera mostra **nota e pontos ao vivo**, recalculados aproximadamente a cada 300 ms (conforme a capacidade do dispositivo).
3. Aguarde três leituras iguais e confira o resultado. “Leitura estável” significa repetição das respostas, não garantia de enquadramento correto. Uma folha em branco ou fora de posição também pode produzir leituras estáveis.
4. Informe o aluno, se configurado, e clique em **Aceitar e salvar evidência**. A nota permanece apenas como prévia até esse aceite.
5. Clique em **Próxima prova**. A câmera continua aberta; o nome digitado é limpo, ou a lista avança para o próximo aluno. Cada aceite cria um novo registro, inclusive se você selecionar novamente um aluno já corrigido.

**Congelar para conferir** mantém um quadro e permite examinar o detalhamento antes de aceitar. **Voltar à leitura ao vivo** descarta essa prévia e retoma a câmera. A nota e a imagem usam sempre o mesmo quadro, mesmo que outra folha passe pela câmera durante o salvamento.

A visualização é recortada ao centro para a proporção do gabarito (quando sua imagem está disponível). O mesmo recorte é usado na leitura e na evidência; o aplicativo não detecta automaticamente as bordas do papel nem corrige perspectiva.

## Alunos, notas e evidências

Na engrenagem, escolha **Sem identificação**, **Digitar nome** (padrão) ou **Selecionar de uma lista**. No modo configurado com identificação, o aceite exige um nome ou aluno selecionado.

A lista pode ser colada ou carregada de um arquivo `.txt`, com um aluno por linha:

```text
Ana Silva
2026002;Bruno Souza
```

Para nomes iguais, use matrículas diferentes. O carregamento da lista só é confirmado ao salvar as configurações. Você também pode definir a nota máxima (padrão 10); a nota é a pontuação obtida dividida pela pontuação máxima, multiplicada por esse valor. Descontos podem produzir nota negativa.

Ao aceitar, são salvos juntos:

- Aluno/matrícula, gabarito, respostas lidas, respostas corretas e regras usadas.
- Pontos, nota, horário da captura e do aceite.
- Imagem JPEG da prova com cabeçalho identificando aluno, nota, data e registro, além do detalhamento por questão. Os pixels da prova vêm do quadro aceito, sem os números sobrepostos de calibração.

Em **Correções aceitas**, use **Ver imagem** para consultar a evidência e **Baixar imagem** para guardar ou entregar o arquivo. A nota não é salva se o armazenamento da imagem falhar; a prévia fica disponível para tentar novamente. Registros de versões antigas, que não guardavam evidências, continuam aparecendo no histórico.

## Corrigir por arquivo

Aplique o gabarito, selecione a imagem da prova, confira o aluno e as respostas, e clique em **Aceitar e salvar evidência**. Upload usa o mesmo histórico e o mesmo processo de confirmação da câmera.

Use PNG, JPEG ou outro formato de imagem aceito pelo navegador. PDF não é aceito. Se HEIC não abrir, converta para JPEG. Imagens de arquivo são reduzidas para no máximo 1800 pixels no maior lado; a leitura ao vivo usa até 1280 pixels para manter a velocidade.

## Limitações da leitura

- **Não há detecção automática de bolhas nem alinhamento por perspectiva.** A versão anterior usava uma grade fixa e respostas simuladas, apesar da descrição no README.
- As provas precisam usar o mesmo formulário, proporção, enquadramento e orientação do gabarito. Diferenças de resolução são compensadas pelas coordenadas proporcionais; deslocamento, rotação, recortes diferentes e perspectiva não são compensados.
- O layout deve ter uma única grade regular, com alternativas da esquerda para a direita e questões de cima para baixo. Múltiplos blocos/colunas de questões não são suportados.
- O motor compara a escuridão no interior de cada bolha. Sombras, marcas fracas ou calibração incorreta podem gerar erros. Confira sempre as respostas e teste com provas conhecidas antes de usar em lote.
- A grade inicial é regular; posições individuais podem ser corrigidas manualmente. A calibração deve ser conferida visualmente antes de salvar.

## Offline e armazenamento

O service worker guarda os arquivos do aplicativo após o primeiro acesso bem-sucedido por localhost ou HTTPS, permitindo reabrir offline. O cache usa caminhos relativos, inclusive para instalações em subpastas. Não há dependências externas no aplicativo.

Gabaritos (incluindo suas imagens originais), histórico e evidências usam IndexedDB, com alternativa em localStorage quando IndexedDB está indisponível. A pontuação fica em localStorage. Os dados pertencem ao navegador e à origem utilizados; mudar porta, domínio ou navegador não transfere os dados. Limpar dados do site remove os registros.

## Testes

Com o servidor na porta 8080, Node.js 18+ e Playwright disponível:

```sh
node tests/browser.cjs
node tests/review.cjs
```

O teste usa Chrome instalado e câmera simulada. Cobre cadastro por upload, calibração, configurações, formatos de leitura, contraste, reposicionamento, desfazer, teclado, edição após recarga, tela móvel/ampliação, respostas reais (incluindo A, branco e múltipla), histórico, persistência após recarga, captura/liberação da câmera, imagem inválida, permissão negada, uso offline e alternativa localStorage. Não valida a câmera física nem a precisão em fotos reais.

## GitHub Pages

O aplicativo é estático e pode ser publicado no GitHub Pages, sem backend ou chaves de API. Use a branch `main`, pasta raiz, como origem de publicação. O arquivo `.nojekyll` permite servir os arquivos diretamente.

- Repositório: https://github.com/tonmarcondes/MarkScan
- Endereço do projeto: https://tonmarcondes.github.io/MarkScan/
- Os caminhos de módulos e cache são relativos, incluindo funcionamento na subpasta `/MarkScan/`.
- A câmera requer permissão do navegador; o endereço publicado usa HTTPS.
- Alunos, notas, fotos e gabaritos permanecem no navegador. Publicar o código não publica esses dados.
- `localhost` e GitHub Pages são origens diferentes: os dados cadastrados localmente não aparecem automaticamente no endereço publicado. Limpar dados do navegador remove as evidências; baixe as imagens que precisar conservar.

Os testes também aceitam `MARKSCAN_URL` para validar a publicação, usando dados fictícios em um navegador isolado. O teste de revisão cobre nota ao vivo, identificação obrigatória, importação de lista, evidência do quadro exato, prevenção de duplo aceite, congelamento, falha/repetição de salvamento, transação atômica, histórico após recarga/offline e download. A câmera física e a precisão em fotos reais precisam ser verificadas no dispositivo de uso.
