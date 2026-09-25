# Manual de uso do MarkScan

Aplicativo estático para criar modelos de correção, mapear folhas e corrigir provas no navegador. Imagens, configurações, alunos, notas e evidências ficam no dispositivo. Não há backend de processamento.

- Aplicativo: https://tonmarcondes.github.io/MarkScan/
- Repositório: https://github.com/tonmarcondes/MarkScan
- Versão no cabeçalho, ajuda pelo ícone **?** e histórico pelo botão **Histórico**.

[Voltar ao README](../README.md)

## Guia visual

O manual dentro do botão **?** mostra os mesmos ícones usados nos controles. Veja também a [legenda de ícones](../README.md#ícones-de-câmera-e-conferência).

![Modelo pronto para distribuição](images/modelo.png)

![Conferência com nota e comparação de enquadramento](images/conferencia.png)

Após fotografar uma folha com referências, o app enquadra e corrige a perspectiva automaticamente. A nota aparece acima da comparação: a imagem original mostra os cantos detectados e a imagem corrigida permanece limpa. Os pontos são indicadores, não alças para arrastar. Rotação, diferença relativa entre bordas opostas e desvio dos ângulos em relação a 90° explicam a geometria; não indicam a confiança da nota. Para corrigir um enquadramento inadequado, repita a fotografia.

![Histórico das correções aceitas](images/historico.png)

**Histórico** reúne somente correções aceitas neste navegador, não todas as ações ou prévias descartadas.

## Fluxo por aprovação

O app mostra somente a etapa atual:

1. **Preparar o modelo:** selecionar um existente, criar uma folha ou importar uma imagem/PDF.
2. **Conferir o modelo:** visualizar as versões preenchida e em branco; clicar em **Aprovar modelo e corrigir provas**.
3. **Fotografar ou importar a prova:** tocar na imagem da câmera ou carregar um arquivo.
4. **Conferir a correção:** examinar a fotografia corrigida, a nota, os pontos e o aluno.
5. **Aceitar e salvar evidência:** registrar a nota e a imagem; depois usar **Próxima prova**.

Selecionar um modelo já o ativa, sem botão adicional de aplicação. A aprovação da prévia libera a etapa de correção. O último modelo é restaurado ao abrir, mas a etapa de conferência continua disponível antes de começar. Voltar ao modelo fecha a câmera e descarta a prévia não aceita. Excluir um modelo não apaga notas nem evidências do histórico.

## Configurações

Todos os ajustes ficam na engrenagem. Campos válidos são salvos automaticamente ao alterar e sair do campo; seletores são salvos imediatamente. **Salvar configurações** também valida e fecha a janela. Campos inválidos não substituem os últimos valores válidos. Falhas de armazenamento são informadas.

- Questões (1–100), alternativas (2–8), formato de leitura: círculo, quadrado ou retângulo.
- Dimensões e limiar das áreas de amostragem. Elas devem ficar dentro das respostas impressas.
- Cores, fonte, tamanho, contraste e ampliação dos números usados **somente no mapeamento**.
- Espessura das referências: **5 px no mínimo**, 8 px como padrão novo, ou 10 px.
- Pontuação por acerto, desconto por erro, pontos em branco e nota máxima.
- Aluno por nome, lista ou sem identificação.

A lista aceita um nome por linha ou `matrícula;nome`, colada ou carregada de `.txt`. A aparência do editor pode mudar sem alterar modelos salvos; a geometria de um modelo só muda ao editar e salvar. Dados pertencem ao navegador e à origem: localhost e GitHub Pages não compartilham armazenamento.

## Criar uma folha

1. Configure questões, alternativas e formato na engrenagem.
2. Use **Criar folha com referências**, informe nome e respostas na ordem (`A B C D ...`).
3. O app gera e valida o modelo, com todas as posições cadastradas automaticamente.
4. Confira **Ver gabarito preenchido** e **Ver gabarito em branco**.
5. Imprima ou compartilhe a versão em branco para os alunos. Guarde a preenchida para o professor.
6. Aprove o modelo para ir à correção.

Até 25 questões são organizadas por bloco, com até quatro blocos por folha. O próprio detector valida as referências e as respostas antes de cadastrar a folha.

## Importar imagem ou PDF e mapear somente a área necessária

1. Selecione PNG, JPEG, WebP, outro formato de imagem aceito pelo navegador ou **PDF**. Também é possível fotografar: abra a câmera e **toque na imagem**, sem botão de captura.
2. No PDF, escolha a página. O limite de arquivo é 50 MB. PDFs protegidos por senha devem ser desbloqueados antes de importar.
3. Use a página inteira ou toque em dois cantos para selecionar um recorte. Inclua todas as respostas desejadas e espaço para as referências. Clique em **Aprovar imagem e continuar**.
4. Configure a grade. Clique no centro da primeira alternativa da primeira questão e no centro da última alternativa da última questão.
5. Confira os números. Clique em um número e depois no novo centro para corrigir um ponto. Setas movem um pixel; Shift + seta move dez; Esc encerra a seleção. Há desfazer e reposicionamento dos extremos.
6. Informe as respostas corretas no campo do editor ou deixe vazio para detectar os preenchimentos da imagem. Depois clique em **Aprovar mapeamento e continuar**.
7. Em **Posicionar referências**, clique em espaços brancos nos cantos superior esquerdo, superior direito, inferior direito e inferior esquerdo, nesta ordem. Os blocos precisam ficar dentro da imagem, sem cobrir conteúdo. Para corrigir, reinicie o posicionamento. Remover referências permite salvar um modelo manual.
8. Aprove e salve. Confira as prévias preenchida e em branco antes de imprimir ou compartilhar.

Para modelos importados, **as versões para distribuição são recriadas apenas com as posições e formatos mapeados**. Enunciados, grafismos e preenchimentos da imagem original não são copiados. Assim a versão em branco não revela respostas da imagem importada. A imagem original continua salva no modelo para edição. Use as novas versões distribuídas para manter a mesma geometria.

## Referências e orientação

Os novos modelos usam quatro retângulos pretos sólidos com comprimentos diferentes. A espessura mínima de criação é 5 pixels na imagem; 8 pixels é o padrão recomendado. Os comprimentos são 3, 5, 7 e 9 vezes a espessura, em sentido horário a partir do canto superior esquerdo.

Os 16 vértices validam a geometria e estimam uma transformação de perspectiva para uma folha plana. O app reconhece rotação, inclusive a folha invertida. Os quatro blocos precisam estar nítidos; na captura, a espessura deve ocupar ao menos 3 pixels. Aproxime a câmera e melhore a luz se as marcas estiverem pequenas. Maior espessura ajuda em folhas inteiras e fotos distantes.

Blocos sólidos **não identificam qual modelo foi usado**: confira o modelo selecionado. Modelos anteriores com referências codificadas continuam usando os códigos originais; os antigos sem referências exigem o mesmo enquadramento e orientação da calibração. Modelos antigos já impressos não são alterados silenciosamente. Para mudar as referências, crie/reimprima uma folha atualizada.

Referências precisam estar nas cópias físicas. Apenas acrescentá-las à tela não transforma provas antigas sem marcas em folhas alinháveis automaticamente. Recortes de provas já impressas devem preservar os quatro blocos existentes.

## Fotografar, conferir e salvar

- Na câmera, espere a imagem abrir e **toque nela para fotografar**. Enter ou espaço também funcionam quando a imagem tem foco.
- A captura usa a resolução disponível, limitada a 2400 pixels no maior lado. Não reutiliza uma prévia reduzida de leitura contínua.
- O app processa o quadro fotografado e mostra a imagem corrigida **sem números ou contornos sobrepostos**. A nota e o detalhamento ficam separados da imagem.
- Se o alinhamento falhar, a fotografia e a mensagem ficam disponíveis; o aceite permanece bloqueado. Use **Fotografar novamente**. Não há fallback silencioso para coordenadas manuais em um modelo com referências.
- Confira o aluno e clique em **Aceitar e salvar evidência**. Antes disso, a nota é apenas uma prévia.
- A imagem e a nota usam o mesmo quadro. Mudar a folha diante da câmera após a captura não altera a evidência.
- A câmera pode permanecer aberta entre alunos. **Próxima prova** limpa o nome ou avança na lista e volta à captura.
- Arquivos de prova usam o mesmo fluxo de aprovação. PDF também permite escolher página e recortar antes da leitura.

Nota, aluno, respostas, regras e evidência JPEG são salvos em uma única operação. Em folhas alinhadas, a evidência contém a imagem corrigida e o quadro original, além de nome, data, nota e detalhamento. Uma falha de armazenamento mantém a prévia para tentar novamente. O histórico é acessível sem selecionar um modelo.

## Compartilhar, ver e imprimir

Há ações separadas e adjacentes para **Compartilhar gabarito** e **Compartilhar em branco**, além das duas prévias. Os arquivos PNG são preparados antes do clique. Quando o navegador aceita compartilhamento de arquivos, o app abre a folha nativa de compartilhamento; caso contrário, baixa o PNG correspondente. Cancelar o compartilhamento nativo não baixa outro arquivo automaticamente.

Em **Imprimir ou baixar**, há impressão e download de cada versão. A impressão usa SVG em uma página A4, permitindo também Salvar como PDF na janela do navegador. Preserve proporções, margens e os quatro blocos.

## Executar, publicar e usar offline

```sh
python3 -m http.server 8080
```

Abra http://localhost:8080. Módulos ES precisam de HTTP; não abra `index.html` como arquivo local. Em outros dispositivos, câmera exige HTTPS e permissão do navegador. O site publicado usa HTTPS.

O projeto funciona no GitHub Pages, branch `main`, pasta raiz, com caminhos relativos e `.nojekyll`. Não há chaves de API. Service worker guarda os arquivos do app e do leitor PDF após o primeiro carregamento completo, permitindo uso offline. O leitor PDF.js, worker, fontes, mapas de caracteres e WASM são locais, sem CDN durante o uso.

Gabaritos e histórico usam IndexedDB, com alternativa localStorage; configurações usam localStorage. Limpar os dados do site remove os registros. Baixe as evidências que precisar guardar fora do navegador.

## Limitações

- A transformação corrige perspectiva de papel plano; não corrige curvatura, dobras ou distorção óptica forte.
- Sombras, desfoque, reflexos e marcas pequenas podem impedir a leitura. É necessário validar com provas conhecidas e a câmera física antes de corrigir em lote.
- A leitura usa escuridão nas áreas mapeadas, não reconhecimento de qualquer formulário. O mapeamento manual começa com uma questão por linha; os pontos podem ser ajustados individualmente.
- Importação de imagem é limitada a 1800 pixels; páginas PDF são renderizadas até 2400 pixels. HEIC depende do navegador: converta se não abrir.
- A interface exclusiva para celular e splash screen continuam como etapa futura. O compartilhamento já usa a capacidade disponível em cada navegador.

## Testes

Com Node 18+, Playwright/Chrome e servidor na porta 8080:

```sh
node tests/browser.cjs
node tests/review.cjs
node tests/alignment.cjs
MARKSCAN_CODED=1 node tests/alignment.cjs
node tests/workflow.cjs
node tests/documents.cjs
```

`MARKSCAN_URL` permite executar contra o site publicado. Os testes usam dados fictícios, imagens sintéticas, PDF de duas páginas e câmera simulada. Cobrem calibração, configurações, aprovação por etapas, PDF/recorte, compartilhamento nativo simulado e fallback, variantes branca/preenchida, captura por toque, pixels da revisão sem sobreposição, evidências atômicas, falhas/repetição, edição/exclusão, recarga e offline. O alinhamento é testado com rotações e transformações de perspectiva independentes do código de produção. Não substituem testes de impressão e câmera física.

## Bibliotecas e arquitetura

JavaScript com módulos ES, HTML e CSS, sem framework de interface. `App` conecta os módulos; `Template`/`Storage` cuidam dos dados; `Scanner`/`Alignment`/`SolidReferences` processam; `DocumentImport` cuida de páginas e recortes; `ExamReview` coordena captura, conferência e aceite.

- [PDF.js](https://mozilla.github.io/pdf.js/examples/), versão 6.3.289 da distribuição oficial `pdfjs-dist`, Apache-2.0. Arquivos sem modificação em `js/vendor/pdfjs/`.
- [js-aruco](https://github.com/jcmellado/js-aruco), revisão `2203d4b5efb601c39054a341bf04702409699383`. Avisos e adaptações em `js/vendor/`. Mantém o detector codificado legado e utilitários de contornos.

## Câmera e conferência

A câmera ocupa a tela e a borda verde indica o recorte exato da fotografia. Toque na imagem para capturar. O ícone de grade alterna os contornos; o alvo acompanha as referências a cada 500 ms, sem calcular ou salvar notas durante a prévia. Sem referências, a grade é fixa e exige o mesmo enquadramento do modelo. A preferência de mostrar grade fica salva. A captura refaz o alinhamento sobre a fotografia original. Foco contínuo é solicitado quando suportado pelo dispositivo.

Os controles de câmera e conferência usam ícones com nomes acessíveis e dicas. Após verificar, ✓ aceita e salva; → inicia a próxima prova; o ícone de saída finaliza. A evidência permanece no histórico, onde o ícone de download exporta um JPEG. Os campos numéricos indicam teclado numérico ou decimal no celular.
