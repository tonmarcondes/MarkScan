# MarkScan OMR

Aplicativo web para criar e corrigir folhas de respostas, usando imagens ou câmera. As folhas geradas pelo aplicativo têm **quatro referências codificadas e alinhamento automático por perspectiva**. Modelos antigos sem referências mantêm a calibração manual. O processamento acontece no navegador; gabaritos, configurações e histórico são armazenados localmente.

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

## Criar gabaritos e folhas com alinhamento automático

1. Na engrenagem, defina a quantidade de questões (1–100), alternativas (2–8) e o formato: bolha, quadrado ou retângulo.
2. Clique em **Criar folha com referências**, dê um nome e informe as respostas corretas na ordem, por exemplo `A B C D A`.
3. O aplicativo gera o gabarito preenchido, cadastra as posições de leitura e aplica o modelo automaticamente. Não é necessário clicar na primeira e na última bolha.
4. Em **Imprimir / baixar folhas**, imprima a **folha do aluno**, em branco, para distribuir. O **gabarito do professor** tem as respostas preenchidas e deve ficar separado.
5. As folhas podem ser baixadas em SVG (vetorial), ou impressas em A4 pelo navegador, inclusive usando Salvar como PDF na janela de impressão. Mantenha as quatro marcas visíveis, sem recortar as margens.

As quatro referências têm códigos distintos e estão nos quatro cantos, nas mesmas posições na folha do aluno e no gabarito. O detector reconhece a orientação da página, inclusive de cabeça para baixo. Os 16 vértices das quatro marcas são usados para estimar uma transformação de perspectiva (homografia), normalizando a imagem antes de ler as respostas.

O modelo é selecionado pelo professor; referências de outra folha são rejeitadas. Os códigos são gerados aleatoriamente para cada novo modelo. **Editar gabarito selecionado** permite alterar nome e respostas de um modelo gerado mantendo suas referências e geometria; isso não altera registros de correções já aceitas. Para mudar o número de questões, alternativas ou o formato impresso, crie uma nova folha.

O criador organiza até 25 questões por bloco, usando até quatro blocos na mesma página. O tamanho das áreas de amostragem é limitado ao interior das marcas impressas. A impressão é validada pelo próprio detector antes de salvar o modelo.

## Alinhamento durante a leitura

- Mostre a folha inteira à câmera. Não é necessário coincidir manualmente a folha com uma grade fixa.
- O contorno verde acompanha a página detectada, e as áreas de leitura são projetadas sobre as respostas. A nota usa a imagem já corrigida para posição, escala, rotação e perspectiva.
- A leitura e o aceite ficam bloqueados se faltar uma marca, houver códigos repetidos/errados, a folha estiver cortada, as referências estiverem pequenas demais ou a geometria for inconsistente. Perder as referências remove a nota prévia, evitando aceitar um quadro antigo.
- **Congelar para conferir** mostra a folha endireitada. A evidência salva contém essa imagem e, abaixo, o quadro original antes da correção, além dos dados da nota.
- A mesma correção automática funciona no upload de fotos das folhas geradas.

As referências precisam estar **impressas na folha**. Desenhá-las apenas na tela sobre uma foto antiga não oferece alinhamento automático. Folhas antigas sem marcas continuam no modo manual abaixo.

## Cadastrar e corrigir a calibração manual do gabarito

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
2. Nas folhas com referências, mostre os quatro cantos. Nos modelos manuais, alinhe a folha aos contornos e números. A câmera mostra **nota e pontos ao vivo**; há um intervalo de 300 ms entre processamentos, além do tempo de detecção/leitura, que varia conforme o dispositivo.
3. Aguarde três leituras iguais e confira o resultado. “Leitura estável” significa repetição das respostas, não garantia de que a marcação do aluno esteja nítida. Nas folhas com referências, também é exigido alinhamento válido; no modo manual, uma folha fora de posição pode produzir leituras estáveis.
4. Informe o aluno, se configurado, e clique em **Aceitar e salvar evidência**. A nota permanece apenas como prévia até esse aceite.
5. Clique em **Próxima prova**. A câmera continua aberta; o nome digitado é limpo, ou a lista avança para o próximo aluno. Cada aceite cria um novo registro, inclusive se você selecionar novamente um aluno já corrigido.

**Congelar para conferir** mantém um quadro e permite examinar o detalhamento antes de aceitar. **Voltar à leitura ao vivo** descarta essa prévia e retoma a câmera. A nota e a imagem usam sempre o mesmo quadro, mesmo que outra folha passe pela câmera durante o salvamento.

Nas folhas com referências, a câmera mostra o quadro completo e o app corrige a perspectiva pela posição dos marcadores. No modo manual, a visualização é recortada ao centro para a proporção do gabarito (quando sua imagem está disponível), sem correção de perspectiva.

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
- Imagem JPEG da prova com cabeçalho identificando aluno, nota, data e registro, além do detalhamento por questão. Os pixels vêm do quadro aceito, sem os números sobrepostos de calibração. Nas folhas alinhadas automaticamente, a imagem corrigida e o quadro original ficam juntos na evidência; os parâmetros de alinhamento também são guardados no registro.

Em **Correções aceitas**, use **Ver imagem** para consultar a evidência e **Baixar imagem** para guardar ou entregar o arquivo. A nota não é salva se o armazenamento da imagem falhar; a prévia fica disponível para tentar novamente. Registros de versões antigas, que não guardavam evidências, continuam aparecendo no histórico.

## Corrigir por arquivo

Aplique o gabarito, selecione a imagem da prova, confira o aluno e as respostas, e clique em **Aceitar e salvar evidência**. Upload usa o mesmo histórico e o mesmo processo de confirmação da câmera.

Use PNG, JPEG ou outro formato de imagem aceito pelo navegador. PDF não é aceito. Se HEIC não abrir, converta para JPEG. Imagens de arquivo são reduzidas para no máximo 1800 pixels no maior lado; a leitura ao vivo usa até 1280 pixels para manter a velocidade.

## Limitações da leitura

- A correção geométrica usa as quatro marcas codificadas dos modelos gerados. Não há reconhecimento de qualquer formato de prova, QR code ou marca arbitrária.
- A transformação corrige perspectiva de uma folha plana. Papel curvado, dobras, distorção óptica forte, reflexos, sombras e desfoque podem impedir a leitura ou reduzir a precisão. A verificação geométrica não substitui a conferência da nota.
- Modelos antigos, sem referências, exigem o mesmo formulário, enquadramento e orientação usados na calibração. A grade inicial manual tem uma questão por linha; seus pontos podem ser ajustados individualmente.
- Os blocos de questões são suportados automaticamente nas folhas geradas, cujas posições já são conhecidas. Não existe detecção automática de bolhas em um formulário arbitrário.
- O motor compara a escuridão no interior das áreas de resposta. Confira os resultados e teste com provas conhecidas e a câmera física antes de corrigir em lote.

## Offline e armazenamento

O service worker guarda os arquivos do aplicativo após o primeiro acesso bem-sucedido por localhost ou HTTPS, permitindo reabrir offline. O cache usa caminhos relativos, inclusive para instalações em subpastas. A biblioteca de detecção é incluída no próprio projeto e também fica no cache; não há CDN nem downloads externos durante a leitura.

Gabaritos (incluindo suas imagens originais), histórico e evidências usam IndexedDB, com alternativa em localStorage quando IndexedDB está indisponível. A pontuação fica em localStorage. Os dados pertencem ao navegador e à origem utilizados; mudar porta, domínio ou navegador não transfere os dados. Limpar dados do site remove os registros.

## Testes

Com o servidor na porta 8080, Node.js 18+ e Playwright disponível:

```sh
node tests/browser.cjs
node tests/review.cjs
node tests/alignment.cjs
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

## Detecção de referências e atribuição

A detecção usa uma cópia local do [js-aruco](https://github.com/jcmellado/js-aruco), fixada na revisão `2203d4b5efb601c39054a341bf04702409699383`. Os avisos originais de licença e as adaptações estão em `js/vendor/`. A transformação, a validação geométrica e a geração das folhas ficam nos módulos `Alignment.js` e `SheetBuilder.js`.

O teste de alinhamento gera fotografias sintéticas com uma transformação independente do código de produção. Cobre giros de 90°/180°/270°, perspectiva, iluminação variável, referências ausentes/duplicadas/erradas, espelhamento, 100 questões com oito alternativas nos três formatos, perda das referências ao vivo, imagem original na evidência, edição do gabarito e uso offline. Esses testes não substituem a validação com impressão e câmera física.
