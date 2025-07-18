// This function will be called by timer.js
export function updateTimerDisplay(seconds) {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        timerElement.textContent = `${h}:${m}:${s}`;
    }
}

export function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`;
    }
}

export function updateMessage(message) {
    const messageElement = document.getElementById('message-box');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

// This function just needs to be called once
export function initUI() {
    updateMessage("Find a way out.");
}