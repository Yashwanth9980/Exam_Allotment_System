import * as THREE from 'three';

export function createRooms(scene) {
    // A single, simple room for testing purposes
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xADD8E6, 
        side: THREE.BackSide // Render the inside of the box
    });
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888 
    });

    // Room Box (10x10x10) centered at the origin
    const roomGeometry = new THREE.BoxGeometry(10, 10, 10);
    const room = new THREE.Mesh(roomGeometry, wallMaterial);
    room.position.set(0, 5, 0); // Position it so the floor is at y=0
    scene.add(room);
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate it to be horizontal
    floor.receiveShadow = true;
    scene.add(floor);

    // Add a test object to ensure something is in the scene
    const testCube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    testCube.position.set(0, 0.5, 0);
    testCube.castShadow = true;
    scene.add(testCube);
}