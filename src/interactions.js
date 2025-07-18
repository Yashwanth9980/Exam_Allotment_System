import * as THREE from 'three';
import { puzzleManager } from './puzzles.js';

let raycaster;
let camera;
let scene;

export function initInteractions(mainCamera, mainScene) {
    raycaster = new THREE.Raycaster();
    camera = mainCamera;
    scene = mainScene;
    window.addEventListener('click', onMouseClick);
}

function onMouseClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        // Check if the object is part of a puzzle
        if (clickedObject.userData.isPuzzle) {
            puzzleManager.interact(clickedObject.name);
        }
    }
}

export function checkInteractions() { /* Can be used for hover effects */ }