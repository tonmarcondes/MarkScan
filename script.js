document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            // Ajuste o tamanho do canvas ao tamanho da imagem
            canvas.width = img.width;
            canvas.height = img.height;

            // Desenha a imagem no canvas
            ctx.drawImage(img, 0, 0);

            // Processamento da imagem para detecção OMR
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Lógica para análise de marcações OMR
            const results = analyzeOMR(data, canvas.width, canvas.height);

            // Exibir os resultados na página
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = formatResults(results);
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

function analyzeOMR(data, width, height) {
    // Definir as coordenadas das áreas de marcação para cada questão
    const questions = [
        { x: 100, y: 100 },   // Questão 1 (posição x, posição y)
        { x: 100, y: 200 },   // Questão 2
        { x: 100, y: 300 },   // Questão 3
        { x: 100, y: 400 },   // Questão 4
        { x: 100, y: 500 },   // Questão 5
        { x: 300, y: 100 },   // Questão 6
        { x: 300, y: 200 },   // Questão 7
        { x: 300, y: 300 },   // Questão 8
        { x: 300, y: 400 },   // Questão 9
        { x: 300, y: 500 }    // Questão 10
    ];

    const questionCount = questions.length;
    const optionsCount = 4; // Número de opções por questão

    let results = {};

    for (let i = 0; i < questionCount; i++) {
        const question = questions[i];
        const questionNumber = i + 1;

        let markedOption = null;
        let highestIntensity = 0;

        // Verificar a intensidade de cor na área da marcação
        for (let j = 0; j < optionsCount; j++) {
            const intensity = calculateIntensity(data, width, question.x, question.y + (j * 40));

            if (intensity > highestIntensity) {
                highestIntensity = intensity;
                markedOption = String.fromCharCode(65 + j); // Opções A, B, C, D
            }
        }

        results[`Questão ${questionNumber}`] = markedOption;
    }

    return results;
}

function calculateIntensity(data, width, x, y) {
    // Função para calcular a intensidade de cor na posição (x, y)
    const index = (y * width + x) * 4; // Índice no array de dados (RGBA)
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    // Calcular a intensidade média da cor (monocromática)
    return (red + green + blue) / 3;
}

function formatResults(results) {
    // Formatar os resultados para exibição
    let formatted = "Resultados:\n\n";
    for (const question in results) {
        formatted += `${question}: ${results[question]}\n`;
    }
    return formatted;
}


// crie uma funcao que pega o id de qualquer elemento clicado

function getIdElementoClicado() {
    document.addEventListener('click', function(event) {
        console.log(event.target.id);
    });
}