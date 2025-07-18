const LEADERBOARD_KEY = 'chronosEnigmaLeaderboard';

export function saveScore(name, score) {
    const scores = getScores();
    scores.push({ name, score });
    // Sort scores descending
    scores.sort((a, b) => b.score - a.score);
    // Keep top 10
    scores.splice(10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
}

export function getScores() {
    const scores = localStorage.getItem(LEADERBOARD_KEY);
    return scores ? JSON.parse(scores) : [];
}

// In ui.js, you would call these functions to display the leaderboard