import * as THREE from 'three';
import { updateMessage } from './ui.js';

class PuzzleManager {
    constructor() {
        // This object holds the state of the entire game.
        // As puzzles are solved, these values will change.
        this.gameState = {
            isMainDoorOpen: false,
            hasRedKey: false,
            codePanelSolved: false,
        };
    }

    /**
     * Creates and places all puzzle-related objects into the scene.
     * @param {THREE.Scene} scene The main Three.js scene.
     */
    initPuzzles(scene) {
        // Example Puzzle 1: A simple code panel
        const panelGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
        const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const codePanel = new THREE.Mesh(panelGeometry, panelMaterial);

        codePanel.position.set(-4, 1.5, -4.5);
        codePanel.name = 'codePanel'; // A unique name to identify the object on click
        codePanel.userData.isPuzzle = true; // A flag for the interaction system
        
        scene.add(codePanel);

        // Example Puzzle 2: A key that can be picked up
        const keyGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.1); // Placeholder shape
        const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 }); // Gold color
        const redKey = new THREE.Mesh(keyGeometry, keyMaterial);
        
        redKey.position.set(3, 1, 3);
        redKey.name = 'redKey';
        redKey.userData.isPuzzle = true;

        scene.add(redKey);
    }

    /**
     * Handles the logic when a puzzle object is clicked.
     * @param {string} objectName The 'name' of the clicked 3D object.
     */
    interact(objectName) {
        switch (objectName) {
            case 'codePanel':
                if (this.gameState.codePanelSolved) {
                    updateMessage("The panel is already active.");
                } else {
                    // Placeholder for puzzle logic
                    updateMessage("It's a panel with inactive buttons. It seems to need power.");
                }
                break;

            case 'redKey':
                if (!this.gameState.hasRedKey) {
                    this.gameState.hasRedKey = true;
                    updateMessage("You picked up a red key. What does it unlock?");
                    // TODO: Remove the key from the scene.
                }
                break;
            
            default:
                // This can be used for non-puzzle but interactive objects.
                updateMessage("It doesn't seem to do anything special.");
                break;
        }
    }

    // This method can be used for puzzles that need continuous updates.
    update(delta) {
        // e.g., an object that rotates or a timer on a puzzle
    }
}

// Create and export a single instance of the manager for the whole game.
export const puzzleManager = new PuzzleManager();