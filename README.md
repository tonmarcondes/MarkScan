# OMR Scanner PWA

Sistema Progressive Web App para leitura óptica de marcação (OMR) destinado à correção automática de provas objetivas através de comparação com gabaritos de referência.

## ✨ Funcionalidades Principais

- **Totalmente configurável pelo usuário**: Você define o modelo (gabarito) e as regras de pontuação
- **Funciona offline**: PWA com service worker para uso em qualquer ambiente
- **Privacidade absoluta**: Todo processamento ocorre localmente no dispositivo
- **Interface responsiva**: Funciona em smartphones, tablets e desktops
- **Nenhuma dependência externa**: Código puro JavaScript sem bibliotecas pesadas

## 📱 Como Usar

### 1. Acesso Inicial
Acesse o sistema através de qualquer navegador moderno (Chrome, Firefox, Safari, Edge) em:
```
https://seu-dominio.com
```
 ou simplesmente abra `index.html` em seu navegador para uso local.

### 2. Registro do Gabarito (Modelo)
**Este é o passo mais importante - você define o modelo de correção**

1. Clique em "Selecionar imagem do gabarito"
2. Escolha uma imagem clara do gabarito de referência (prova com todas as respostas corretas marcadas)
3. O sistema detectará automaticamente as posições das bolhas de resposta
4. Dê um nome descritivo para este gabarito (ex: "Matemática_1ºBimestre_2026")
5. Clique em "Salvar Gabarito"

> ⚠️ **Importante**: O gabarito de referência deve ser uma imagem nítida onde:
> - As bolhas de resposta estejam visíveis e bem definidas
> - O formato da prova esteja alinhado (não inclinado excessivamente)
> - Iluminação uniforme (evitar sombras fortes)

### 3. Configuração de Pontuação
Defina como as respostas serão avaliada:

1. Acesse o menu de configurações (ícone de engrenagem)
2. Ajuste os valores:
   - **Acerto**: Pontos ganhos por resposta correta (padrão: 1)
   - **Erro**: Pontos perdidos por resposta incorreta (padrão: 0)
   - **Em branco**: Pontos para questões não respondidas (padrão: 0)
3. Salve as configurações

### 4. Correção de Provas
Agora você pode corrigir provas de alunos:

1. Certifique-se de que o gabarito correto está selecionado na lista de modelos
2. Clique em "Selecionar imagem da prova"
3. Escolha a foto da prova do aluno para correção
4. Aguarde o processamento (aparecerá um indicador de carregamento)
5. Visualize o resultado:
   - Número de acertos
   - Nota percentage
   - Detalhamento por questão (resposta do aluno vs gabarito)

### 5. Histórico e Reutilização
- Todos os gabaritos registrados são salvos localmente no seu dispositivo
- Você pode alternar entre diferentes gabaritos salvo a qualquer momento
- As configurações de pontuação também são preservadas entre sessões

## ⚙️ Configurações Avançadas

O sistema permite ajustes finos no processo de detecção (acessíveis através do menu "Configurações Avançadas"):

| Parâmetro | Descrição | Valor Padrão |
|-----------|-----------|--------------|
| Limiar de Binarização | Sensibilidade para detectar marcações (0-255) | 128 |
| Tamanho Mínimo da Bolha | Área mínima considerada como bolha válida | 10px |
| Tamanho Máximo da Bolha | Área máxima considerada como bolha válida | 40px |
| Espaçamento entre Opções | Distância esperada entre alternativas | 45px |
| Opções por Questão | Número de alternativas por questão (A,B,C,D...) | 4 |

> 💡 **Dica**: Ajuste estes parâmetros apenas se tiver dificuldades na detecção automática. Valores extremos podem causar falsos positivos/negativos.

## 🔧 Requisitos Técnicos

- **Navegadores suportados**: Chrome 55+, Firefox 50+, Safari 10.1+, Edge 79+
- **Permissões necessárias**: Acesso à câmera (para captura direta) e armazenamento local
- **Funciona offline**: Sim, após o primeiro carregamento
- **Armazenamento utilizado**: IndexedDB (via wrapper na módulo Storage)
- **Tamanho do aplicativo**: <500KB (excluding assets)

## 🛡️ Privacidade e Segurança

- **Nenhum dado deixa seu dispositivo**: Todo processamento de imagem ocorre localmente
- **Nenhum coletor de analytics**: Não enviamos informações para servidores externos
- **Armazenamento local**: Gabaritos e configurações são salvos apenas no seu navegador
- **Pode ser usado 100% offline**: Perfeito para salas de aula sem internet

## 📝 Notas de Uso

1. **Qualidade da imagem afeta resultados**: Fotos borradas, com baixa iluminação ou distorção perspectiva podem reduzir a precisão
2. **Formato de bolha recomendado**: Circular ou ovalada com preenchimento sólido
3. **Marcação clara**: Use caneta preta ou lápis 2B para melhor contraste
4. **Prova alinhada**: Tente manter a prova o mais reta possível ao fotografar
5. **Teste prévio**: Sempre faça um teste com uma prova conhecida antes de corrigir em lote

## 🐛 Solução de Problemas

| Problema | Possível Causa | Solução |
|----------|----------------|---------|
| Não detecta marcações | Limiar muito alto/baixo | Ajuste "Limiar de Binarização" nas configurações avançadas |
| Marcações falsas | Ruído na imagem | Aumente o "Tamanho Mínimo da Bolha" |
| Sistema travando | Imagem muito grande | Reduza a resolução da foto antes de upload |
| Gabarito não salvo | Limite de armazenamento excedido | Limpe dados do site nas configurações do navegador |
| Câmera não funcionando | Permissão negada | Conceda acesso à câmera quando solicitado pelo navegador |

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE) - sinta-se livre para usar, modificar e distribuir conforme necessário.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para questões, sugestões ou relatos de bugs, por favor abra uma issue no repositório GitHub oficial.

---

**Último lembrete importante**: Você, como professor ou educador, é o responsável por:
1. Selecionar o gabarito de referência correto
2. Definir as regras de pontuação adequadas para sua avaliação
3. Determinar o momento apropriado para realizar a leitura das provas dos alunos

Este sistema é uma ferramenta de apoio - o julgamento pedagógico permanece sempre com você.