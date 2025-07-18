import { updateTimerDisplay, updateScoreDisplay } from './ui.js';

class GameTimer {
    constructor() {
        this.totalTime = 2 * 60 * 60; // 2 hours in seconds
        this.currentTime = this.totalTime;
        this.score = this.totalTime; // Initial score
        this.penaltyThreshold = 30 * 60; // 30 minutes
        this.interval = null;
    }

    start() {
        this.interval = setInterval(() => {
            this.currentTime--;
            if (this.totalTime - this.currentTime > this.penaltyThreshold) {
                this.score--; // Deduct 1 point per second after 30 mins
            }
            
            updateTimerDisplay(this.currentTime);
            updateScoreDisplay(this.score);

            if (this.currentTime <= 0) {
                this.stop();
                // Trigger game over logic
            }
        }, 1000);
    }

    stop() {
        clearInterval(this.interval);
    }
    
    getFinalScore() {
        return this.score;
    }
}

export const gameTimer = new GameTimer();