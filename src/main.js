import * as THREE from 'three';
import { setupScene } from './scene.js';
import { createRooms } from './rooms.js';
import { setupControls } from './controls.js'; // Import controls
import { puzzleManager } from './puzzles.js';
import { gameTimer } from './timer.js';
import { initUI } from './ui.js';

class Game {
    constructor(canvasId) {
        this.sceneData = setupScene(canvasId);
        // Pass the canvas element to the controls setup
        this.controls = setupControls(this.sceneData.camera, this.sceneData.renderer.domElement);
        this.clock = new THREE.Clock();

        this.init();
        this.animate();
    }

    init() {
        // Add the camera's container to the scene, so movement works
        this.sceneData.scene.add(this.controls.getObject());

        createRooms(this.sceneData.scene);
        puzzleManager.initPuzzles(this.sceneData.scene);
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
        
        const delta = this.clock.getDelta();
        
        // Update player controls every frame
        this.controls.update(delta); 

        this.sceneData.renderer.render(this.sceneData.scene, this.sceneData.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game('webgl-canvas');
});