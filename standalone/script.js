import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// --- Brain Data ---
const BRAIN_REGIONS = [
    {
        id: 'frontal',
        name: 'Frontal Lobe',
        color: 0xff6b6b,
        position: [0, 0.5, 1],
        scale: [1.2, 1, 1],
        description: 'The frontal lobe is the "control center" of your brain. It is responsible for executive functions like planning, decision-making, and controlling your emotions.',
        functions: ['Decision Making', 'Personality', 'Motor Control']
    },
    {
        id: 'parietal',
        name: 'Parietal Lobe',
        color: 0x4ecdc4,
        position: [0, 0.8, -0.5],
        scale: [1.1, 0.9, 1],
        description: 'The parietal lobe processes sensory information. It helps you understand spatial orientation, movement, and the sense of touch.',
        functions: ['Spatial Awareness', 'Sensory Integration', 'Arithmetic']
    },
    {
        id: 'temporal',
        name: 'Temporal Lobe',
        color: 0x45b7d1,
        position: [1, -0.2, 0.2],
        scale: [0.6, 0.8, 1.2],
        description: 'The temporal lobes are involved in vision, memory, sensory input, language, emotion, and comprehension.',
        functions: ['Auditory Processing', 'Memory', 'Language']
    },
    {
        id: 'temporal_left',
        name: 'Temporal Lobe',
        color: 0x45b7d1,
        position: [-1, -0.2, 0.2],
        scale: [0.6, 0.8, 1.2],
        description: 'The temporal lobes are involved in vision, memory, sensory input, language, emotion, and comprehension.',
        functions: ['Auditory Processing', 'Memory', 'Language']
    },
    {
        id: 'occipital',
        name: 'Occipital Lobe',
        color: 0x96ceb4,
        position: [0, 0.2, -1.2],
        scale: [0.9, 0.8, 0.7],
        description: 'The occipital lobe is the visual processing center of the mammalian brain containing most of the anatomical region of the visual cortex.',
        functions: ['Visual Perception', 'Color Recognition', 'Motion Detection']
    },
    {
        id: 'cerebellum',
        name: 'Cerebellum',
        color: 0xffeead,
        position: [0, -0.8, -0.8],
        scale: [1, 0.6, 0.8],
        description: 'The cerebellum coordinates voluntary movements such as posture, balance, coordination, and speech.',
        functions: ['Coordination', 'Balance', 'Fine Motor Skills']
    },
    {
        id: 'brainstem',
        name: 'Brainstem',
        color: 0xff9f43,
        position: [0, -1.2, -0.2],
        scale: [0.4, 1, 0.4],
        description: 'The brainstem controls fundamental life-sustaining functions like breathing, heart rate, and blood pressure.',
        functions: ['Heart Rate', 'Breathing', 'Sleep Cycles']
    }
];

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// --- Brain Model ---
const meshes = [];
const brainGroup = new THREE.Group();

BRAIN_REGIONS.forEach(region => {
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const material = new THREE.MeshPhongMaterial({
        color: region.color,
        transparent: true,
        opacity: 0.7,
        shininess: 30
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...region.position);
    mesh.scale.set(...region.scale);
    mesh.userData = region;
    
    brainGroup.add(mesh);
    meshes.push(mesh);
});

scene.add(brainGroup);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoPanel = document.getElementById('info-panel');

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
}

function onClick() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
        const region = intersects[0].object.userData;
        showInfo(region);
    } else {
        hideInfo();
    }
}

function showInfo(region) {
    document.getElementById('region-name').innerText = region.name;
    document.getElementById('region-desc').innerText = region.description;
    
    const list = document.getElementById('region-functions');
    list.innerHTML = '';
    region.functions.forEach(f => {
        const li = document.createElement('li');
        li.innerText = f;
        list.appendChild(li);
    });
    
    infoPanel.classList.remove('hidden');
}

function hideInfo() {
    infoPanel.classList.add('hidden');
}

document.getElementById('close-btn').addEventListener('click', hideInfo);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    // Smooth transitions for meshes
    meshes.forEach(mesh => {
        const isHovered = false; // Simplified for standalone
        const targetOpacity = infoPanel.classList.contains('hidden') ? 0.7 : 0.4;
        mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.1;
    });

    controls.update();
    renderer.render(scene, camera);
}

animate();

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
