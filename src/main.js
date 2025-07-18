import * as THREE from 'three';
import { setupScene } from './scene.js';
import { createRooms } from './rooms.js';
import { setupControls } from './controls.js';
import { initInteractions, checkInteractions } from './interactions.js';
import { puzzleManager } from './puzzles.js';
import { gameTimer } from './timer.js';
import { initUI } from './ui.js';

class Game {
    constructor() {
        // Core components
        this.sceneData = setupScene('webgl-canvas');
        this.controls = setupControls(this.sceneData.camera, this.sceneData.renderer.domElement);
        this.clock = new THREE.Clock();

        // Game state
        this.isPaused = false;

        this.init();
        this.animate();
    }

    init() {
        createRooms(this.sceneData.scene);
        initInteractions(this.sceneData.camera, this.sceneData.scene);
        puzzleManager.initPuzzles(this.sceneData.scene);
        initUI();
        gameTimer.start();

        // Add player to the scene for collision detection if needed
        this.sceneData.scene.add(this.controls.getObject());

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.sceneData.camera.aspect = window.innerWidth / window.innerHeight;
        this.sceneData.camera.updateProjectionMatrix();
        this.sceneData.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        if (!this.isPaused) {
            this.controls.update(delta); // Update player movement
            checkInteractions(); // Check for clicks on objects
            puzzleManager.update(delta); // Update any animated puzzles
        }

        this.sceneData.renderer.render(this.sceneData.scene, this.sceneData.camera);
    }
}

// Start the game
window.game = new Game();