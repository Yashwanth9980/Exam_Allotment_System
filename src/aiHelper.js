import { puzzleManager } from './puzzles.js';
import { updateMessage } from './ui.js';

class AIHelper {
    constructor() {
        this.hintCooldown = 60; // seconds
        this.lastHintTime = -Infinity;
    }

    requestHint() {
        const now = Date.now() / 1000;
        if (now - this.lastHintTime < this.hintCooldown) {
            updateMessage(`You can request another hint in ${Math.ceil(this.hintCooldown - (now - this.lastHintTime))} seconds.`);
            return;
        }

        this.lastHintTime = now;
        const hint = this.getRelevantHint();
        updateMessage(`HINT: ${hint}`);
    }

    getRelevantHint() {
        const state = puzzleManager.gameState;

        // Branching dialogue based on game state
        if (!state.hasEgyptianKey) {
            return "The symbols in the Egyptian room seem to match the panel in the Victorian study. Have you noted their order?";
        }
        if (!state.isFuturisticDoorOpen) {
            const code = puzzleManager.gameState.medievalCode; // The AI "knows" the generated code
            return `The numbers on the medieval tapestries... I believe they form the code '${code}'. Have you found the terminal to use it?`;
        }
        if (state.hasEgyptianKey && state.isFuturisticDoorOpen) {
            return "The main altar requires items from all eras. You seem to be missing something from the Medieval period.";
        }

        return "I'm not sure what to look for next. Keep exploring!";
    }
}

export const aiHelper = new AIHelper();

// In ui.js, the hint button should call aiHelper.requestHint()
document.getElementById('hint-button').addEventListener('click', () => {
    aiHelper.requestHint();
});