/**
 * Quick Math Game Logic
 * Player solves math problems as quickly as possible
 * Server tracks timing to prevent cheating
 */

// Game configurations
const GAME_CONFIGS = {
    easy: {
        questionCount: 10,
        operations: ['+', '-'],
        range: { min: 1, max: 20 },
        timeLimit: 90,
    },
    medium: {
        questionCount: 15,
        operations: ['+', '-', '*'],
        range: { min: 1, max: 50 },
        timeLimit: 120,
    },
    hard: {
        questionCount: 20,
        operations: ['+', '-', '*', '/'],
        range: { min: 1, max: 100 },
        timeLimit: 150,
    },
    expert: {
        questionCount: 25,
        operations: ['+', '-', '*', '/'],
        range: { min: 1, max: 200 },
        timeLimit: 180,
    },
};

/**
 * Get configuration for difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {object} config
 */
function getConfig(difficulty) {
    return GAME_CONFIGS[difficulty] || GAME_CONFIGS.medium;
}

/**
 * Generate a random number within range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} random number
 */
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a single math question
 * @param {Array<string>} operations - Allowed operations
 * @param {object} range - {min, max}
 * @param {number} questionId - Question ID
 * @returns {object} { id, question, answer }
 */
function generateQuestion(operations, range, questionId) {
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1 = randomNumber(range.min, range.max);
    let num2 = randomNumber(range.min, range.max);
    let answer;

    switch (operation) {
        case '+':
            answer = num1 + num2;
            break;
        case '-':
            // Ensure non-negative result
            if (num1 < num2) [num1, num2] = [num2, num1];
            answer = num1 - num2;
            break;
        case '*':
            // Use smaller numbers for multiplication
            num1 = randomNumber(range.min, Math.min(range.max, 20));
            num2 = randomNumber(range.min, Math.min(range.max, 20));
            answer = num1 * num2;
            break;
        case '/':
            // Ensure clean division
            num2 = randomNumber(1, Math.min(range.max, 20)); // Divisor
            answer = randomNumber(1, Math.min(range.max, 20)); // Quotient
            num1 = num2 * answer; // Ensure exact division
            break;
    }

    return {
        id: questionId,
        question: `${num1} ${operation} ${num2}`,
        answer,
    };
}

/**
 * Generate all questions for the game
 * @param {string} difficulty - Difficulty level
 * @returns {Array<object>} questions array
 */
function generateQuestions(difficulty) {
    const config = getConfig(difficulty);
    const questions = [];

    for (let i = 1; i <= config.questionCount; i++) {
        const question = generateQuestion(config.operations, config.range, i);
        questions.push({
            ...question,
            userAnswer: null,
            correct: null,
            startedAt: null,
            answeredAt: null,
            score: 0,
        });
    }

    return questions;
}

/**
 * Create initial session data for new game
 * @param {string} difficulty - Difficulty level
 * @returns {object} session data
 */
function createInitialSessionData(difficulty) {
    const config = getConfig(difficulty);
    const questions = generateQuestions(difficulty);

    // Mark first question as started
    questions[0].startedAt = new Date().toISOString();

    return {
        questions,
        currentQuestionIndex: 0,
        totalScore: 0,
        config: {
            questionCount: config.questionCount,
            timeLimit: config.timeLimit,
        },
    };
}

/**
 * Process an answer to a question
 * @param {object} sessionData - Current session data
 * @param {number} questionId - Question ID
 * @param {number} answer - User's answer
 * @param {object} scoring - Scoring module
 * @returns {object} answer result
 */
function processAnswer(sessionData, questionId, answer, scoring) {
    const { questions, config } = sessionData;

    // Find question
    const questionIndex = questions.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) {
        throw new Error('Question not found');
    }

    const question = questions[questionIndex];

    if (question.userAnswer !== null) {
        throw new Error('Question already answered');
    }

    // Server-calculated time taken
    const now = new Date();
    const startedAt = new Date(question.startedAt);
    const timeTaken = (now - startedAt) / 1000; // seconds

    // Anti-cheat: flag if too fast
    let suspiciousFlag = null;
    if (timeTaken < 0.5) {
        suspiciousFlag = `Answer submitted too quickly (${timeTaken.toFixed(2)}s)`;
    }

    // Check correctness
    const correct = parseInt(answer) === question.answer;

    // Calculate score
    const questionScore = scoring.calculateQuickMathQuestionScore(correct, timeTaken);

    // Update question
    question.userAnswer = parseInt(answer);
    question.correct = correct;
    question.answeredAt = now.toISOString();
    question.score = questionScore;

    // Update total score
    sessionData.totalScore += questionScore;

    const questionsCompleted = questions.filter((q) => q.userAnswer !== null).length;
    const questionsRemaining = config.questionCount - questionsCompleted;

    // Prepare next question
    let nextQuestion = null;
    if (questionsRemaining > 0) {
        const nextIndex = questionIndex + 1;
        if (nextIndex < questions.length) {
            questions[nextIndex].startedAt = now.toISOString();
            sessionData.currentQuestionIndex = nextIndex;

            nextQuestion = {
                id: questions[nextIndex].id,
                question: questions[nextIndex].question,
                questionStartedAt: questions[nextIndex].startedAt,
            };
        }
    }

    const gameOver = questionsRemaining === 0;

    return {
        correct,
        correctAnswer: question.answer,
        questionScore,
        totalScore: sessionData.totalScore,
        questionsCompleted,
        questionsRemaining,
        nextQuestion,
        gameOver,
        suspiciousFlag, // For anti-cheat logging
    };
}

/**
 * Get current question (for resume/GET session)
 * @param {object} sessionData - Current session data
 * @returns {object} current question info
 */
function getCurrentQuestion(sessionData) {
    const { questions, currentQuestionIndex, config, totalScore } = sessionData;

    const questionsCompleted = questions.filter((q) => q.userAnswer !== null).length;
    const questionsRemaining = config.questionCount - questionsCompleted;

    // Calculate time remaining for entire game
    // Note: This is approximate, actual tracking should be session startedAt
    const timeRemaining = Math.max(0, config.timeLimit - questionsCompleted * 6); // rough estimate

    const currentQuestion = questions[currentQuestionIndex];

    return {
        totalQuestions: config.questionCount,
        questionsCompleted,
        questionsRemaining,
        totalScore,
        timeRemaining,
        currentQuestion: currentQuestion
            ? {
                id: currentQuestion.id,
                question: currentQuestion.question,
            }
            : null,
    };
}

module.exports = {
    getConfig,
    generateQuestion,
    generateQuestions,
    createInitialSessionData,
    processAnswer,
    getCurrentQuestion,
    GAME_CONFIGS,
};
