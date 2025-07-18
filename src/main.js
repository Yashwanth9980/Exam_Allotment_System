import * as THREE from 'three';
import { setupScene } from './scene.js';
import { createRooms } from './rooms.js';
import { puzzleManager } from './puzzles.js';
import { gameTimer } from './timer.js';
import { initUI } from './ui.js';
// Note: We are not importing controls.js yet to simplify debugging.

// Main Game Class
class Game {
    constructor(canvasId) {
        // Core components
        this.sceneData = setupScene(canvasId);
        this.clock = new THREE.Clock();

        // Debugging Helper
        const axesHelper = new THREE.AxesHelper(5); // Shows X(red), Y(green), Z(blue) axes
        this.sceneData.scene.add(axesHelper);

        this.init();
        this.animate();
    }

    init() {
        createRooms(this.sceneData.scene);
        // puzzleManager.initPuzzles(this.sceneData.scene); // Can be enabled later
        initUI();
        gameTimer.start();

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.sceneData.camera.aspect = window.innerWidth / window.innerHeight;
        this.sceneData.camera.updateProjectionMatrix();
        this.sceneData.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Render the scene
        this.sceneData.renderer.render(this.sceneData.scene, this.sceneData.camera);
    }
}

// **CRITICAL FIX**: Wait for the DOM to be fully loaded before starting the game.
window.addEventListener('DOMContentLoaded', () => {
    new Game('webgl-canvas');
});