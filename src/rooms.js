import * as THREE from 'three';

export function createRooms(scene) {
    // Helper to create a room
    const createRoom = (position, color) => {
        const wallMaterial = new THREE.MeshStandardMaterial({ color: color, side: THREE.BackSide });
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });

        // Room Box
        const roomGeometry = new THREE.BoxGeometry(20, 10, 20);
        const room = new THREE.Mesh(roomGeometry, wallMaterial);
        room.position.copy(position);
        scene.add(room);
        
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(position.x, position.y - 5, position.z);
        floor.receiveShadow = true;
        scene.add(floor);
    };

    // Create 4 interconnected rooms in a 2x2 grid
    createRoom(new THREE.Vector3(-10, 0, -10), 0xADD8E6); // Top-left (Victorian)
    createRoom(new THREE.Vector3(10, 0, -10), 0xF0E68C);  // Top-right (Egyptian)
    createRoom(new THREE.Vector3(-10, 0, 10), 0x8B4513);  // Bottom-left (Medieval)
    createRoom(new THREE.Vector3(10, 0, 10), 0x00FFFF);   // Bottom-right (Futuristic)
    
    // TODO: Create doorways between rooms
}