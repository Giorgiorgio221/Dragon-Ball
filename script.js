// Audio Context Setup (Web Audio API for zero dependencies)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'tick') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'timeout') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// Game Variables
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft = 15;
let isAnswered = false;

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const UI = {
    startBtn: document.getElementById('start-btn'),
    highScore: document.getElementById('high-score'),
    
    questionCounter: document.getElementById('question-counter'),
    scoreDisplay: document.getElementById('score-display'),
    difficultyDisplay: document.getElementById('difficulty-display'),
    timerBar: document.getElementById('timer-bar'),
    categoryBadge: document.getElementById('category-badge'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    optionBtns: document.querySelectorAll('.option-btn'),
    
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackExplanation: document.getElementById('feedback-explanation'),
    nextBtn: document.getElementById('next-btn'),
    
    finalScore: document.getElementById('final-score'),
    rankTitle: document.getElementById('rank-title'),
    rankDesc: document.getElementById('rank-desc'),
    restartBtn: document.getElementById('restart-btn')
};

// Initialize App
function init() {
    const savedScore = localStorage.getItem('dbq_highscore') || 0;
    UI.highScore.textContent = savedScore;
    
    UI.startBtn.addEventListener('click', startGame);
    UI.optionBtns.forEach(btn => btn.addEventListener('click', handleAnswer));
    UI.nextBtn.addEventListener('click', loadNextQuestion);
    UI.restartBtn.addEventListener('click', resetGame);
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startGame() {
    // Permissão de áudio no click
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    score = 0;
    currentQuestionIndex = 0;
    UI.scoreDisplay.textContent = score;
    showScreen('game');
    loadQuestion();
}

function loadQuestion() {
    isAnswered = false;
    timeLeft = 15;
    UI.feedbackContainer.classList.add('hidden');
    UI.timerBar.style.width = '100%';
    UI.timerBar.className = 'timer-bar'; // reset colors
    
    const q = dbQuestions[currentQuestionIndex];
    
    UI.questionCounter.textContent = `${currentQuestionIndex + 1}/${dbQuestions.length}`;
    UI.categoryBadge.textContent = q.category;
    UI.questionText.textContent = q.question;
    
    // Configurar Dificuldade
    UI.difficultyDisplay.textContent = q.difficulty;
    UI.difficultyDisplay.className = 'value';
    if(q.difficulty === 'Fácil') UI.difficultyDisplay.classList.add('diff-easy');
    if(q.difficulty === 'Médio') UI.difficultyDisplay.classList.add('diff-medium');
    if(q.difficulty === 'Difícil') UI.difficultyDisplay.classList.add('diff-hard');

    // Configurar Alternativas
    UI.optionBtns.forEach((btn, index) => {
        btn.textContent = q.options[index];
        btn.disabled = false;
        btn.className = 'option-btn'; // reset classes
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        const percentage = (timeLeft / 15) * 100;
        UI.timerBar.style.width = `${percentage}%`;

        if (timeLeft <= 5 && timeLeft > 4.9) UI.timerBar.classList.add('warning');
        if (timeLeft <= 3 && timeLeft > 2.9) {
            UI.timerBar.classList.add('danger');
            playSound('tick');
        }
        if (timeLeft <= 2 && timeLeft > 1.9) playSound('tick');
        if (timeLeft <= 1 && timeLeft > 0.9) playSound('tick');

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeOut();
        }
    }, 100);
}

function handleAnswer(e) {
    if (isAnswered) return;
    clearInterval(timer);
    isAnswered = true;
    
    const selectedBtn = e.target;
    const selectedIndex = parseInt(selectedBtn.getAttribute('data-index'));
    const q = dbQuestions[currentQuestionIndex];
    
    UI.optionBtns.forEach(btn => btn.disabled = true);
    
    if (selectedIndex === q.answer) {
        // Correto
        playSound('correct');
        selectedBtn.classList.add('correct');
        addScore(q.difficulty);
        showFeedback(true, q.explanation);
    } else {
        // Errado
        playSound('wrong');
        selectedBtn.classList.add('wrong');
        UI.optionBtns[q.answer].classList.add('correct'); // Mostrar a correta
        showFeedback(false, q.explanation);
    }
}

function handleTimeOut() {
    isAnswered = true;
    playSound('timeout');
    const q = dbQuestions[currentQuestionIndex];
    
    UI.optionBtns.forEach(btn => btn.disabled = true);
    UI.optionBtns[q.answer].classList.add('correct');
    showFeedback(false, "O tempo acabou! " + q.explanation);
}

function addScore(difficulty) {
    if (difficulty === 'Fácil') score += 10;
    if (difficulty === 'Médio') score += 20;
    if (difficulty === 'Difícil') score += 30;
    UI.scoreDisplay.textContent = score;
}

function showFeedback(isCorrect, explanation) {
    UI.feedbackContainer.classList.remove('hidden', 'success', 'error');
    if (isCorrect) {
        UI.feedbackContainer.classList.add('success');
        UI.feedbackTitle.textContent = "Correto!";
    } else {
        UI.feedbackContainer.classList.add('error');
        UI.feedbackTitle.textContent = "Incorreto!";
    }
    UI.feedbackExplanation.textContent = explanation;
}

function loadNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < dbQuestions.length) {
        loadQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    showScreen('result');
    UI.finalScore.textContent = score;
    
    // Save High Score
    const savedScore = parseInt(localStorage.getItem('dbq_highscore')) || 0;
    if (score > savedScore) {
        localStorage.setItem('dbq_highscore', score);
    }

    // Calcular Classificação
    // Pontuação máxima possível: 40*10 + 40*20 + 40*30 = 400 + 800 + 1200 = 2400
    const maxScore = 2400;
    const percentage = (score / maxScore) * 100;

    if (percentage >= 95) {
        UI.rankTitle.textContent = "Anjo Supremo";
        UI.rankTitle.style.color = "#E0E0E0";
        UI.rankDesc.textContent = "Seu conhecimento transcende os universos! Você domina o Instinto Superior do conhecimento.";
    } else if (percentage >= 80) {
        UI.rankTitle.textContent = "Nível Deus";
        UI.rankTitle.style.color = "#FF1744";
        UI.rankDesc.textContent = "Incrível! Você possui um ki divino quando o assunto é Dragon Ball.";
    } else if (percentage >= 50) {
        UI.rankTitle.textContent = "Elite Saiyajin";
        UI.rankTitle.style.color = "#FFD700";
        UI.rankDesc.textContent = "Muito bom! Você é um guerreiro de elite digno do orgulho da raça Saiyajin.";
    } else if (percentage >= 20) {
        UI.rankTitle.textContent = "Guerreiro Z";
        UI.rankTitle.style.color = "#FF9800";
        UI.rankDesc.textContent = "Bom começo! Você conhece os perigos, mas ainda precisa treinar na Sala do Tempo.";
    } else {
        UI.rankTitle.textContent = "Iniciante";
        UI.rankTitle.style.color = "#4CAF50";
        UI.rankDesc.textContent = "Parece que você precisa maratonar a série novamente. Vá treinar com o Mestre Kame!";
    }
}

function resetGame() {
    showScreen('start');
    const savedScore = localStorage.getItem('dbq_highscore') || 0;
    UI.highScore.textContent = savedScore;
}

// Iniciar
window.onload = init;
