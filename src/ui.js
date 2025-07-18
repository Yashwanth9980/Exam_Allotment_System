/**
 * Updates the message box with a new string of text.
 * @param {string} message The text to display.
 */
export function updateMessage(message) {
    const messageElement = document.getElementById('message-box');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

/**
 * Updates the timer display on the screen.
 * @param {number} seconds The total remaining seconds.
 */
export function updateTimerDisplay(seconds) {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        timerElement.textContent = `${h}:${m}:${s}`;
    }
}

/**
 * Updates the score display on the screen.
 * @param {number} score The current score.
 */
export function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`;
    }
}

/**
 * Initializes the UI with a starting message.
 */
export function initUI() {
    updateMessage("The room is sealed. There must be a way to open the main door.");
}