import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const loader = document.querySelector('#loader');
const loaderText = document.querySelector('#loader-text');
const loaderProgress = document.querySelector('#loader-progress');
const lightControlInputs = document.querySelectorAll('[data-light-param]');
const saturationInput = document.querySelector('#saturation');
const lightVector = document.querySelector('#light-vector');
let saturationValue = 1.0;
let saturationTarget = null;
const islandUrl = `${import.meta.env.BASE_URL}models/floatingIsland.glb`;

const buildingLinks = [
  { name: 'node_0', href: `${import.meta.env.BASE_URL}edifici/edificio-1.html`, label: 'edificio-1' },
  { name: 'node_0001', href: `${import.meta.env.BASE_URL}edifici/edificio-2.html`, label: 'edificio-2' },
  { name: 'node_0002', href: `${import.meta.env.BASE_URL}edifici/edificio-3.html`, label: 'edificio-3' },
  { name: 'node_0004', href: `${import.meta.env.BASE_URL}edifici/edificio-4.html`, label: 'edificio-4' }
];
const buildingLinkByName = new Map(buildingLinks.map((building) => [building.name, building]));
const meshToBuildingMap = new Map();
const originalColors = new Map();
const originalHSL = new Map();
const lightSettings = {
  intensity: 1.6,
  azimuth: 60,
  elevation: 53,
  ambient: 0.4
};

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0x08030d, 35, 130);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hotspotMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false
});
const hotspotGroup = new THREE.Group();
const clickableBuildings = [];
let cameraMove = null;
let islandRoot = null;
let isNavigating = false;
let pointerDown = null;
let suppressNextClick = false;
let initialCameraPosition = null;
let initialTarget = null;

scene.add(hotspotGroup);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(11.05, 7.01, -1.10);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearAlpha(0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, 2, 0);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
sunLight.position.set(10, 16, 9);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 80;
sunLight.shadow.bias = -0.001; // Help prevent shadow acne
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xa9d8ee, 0.1);
fillLight.position.set(-12, 7, -9);
scene.add(fillLight);
updateLightFromSettings();
bindLightControls();

if (saturationInput) {
  saturationInput.addEventListener('input', () => {
    saturationValue = Number(saturationInput.value);
    const output = document.querySelector('#saturation-value');
    if (output) output.textContent = saturationValue.toFixed(2);
  });
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
dracoLoader.setWorkerLimit(2);
dracoLoader.preload();

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load(
  islandUrl,
  (gltf) => {
    loaderText.textContent = 'Preparazione scena';
    
const nodeMap = new Map();
    if (gltf.userData.gltf) {
      gltf.userData.gltf.nodes.forEach((node, i) => {
        if (node.name) nodeMap.set(node.name, i);
      });
    }

    let saturationTarget = null;

    const island = gltf.scene;
    island.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (object.material && object.material.color) {
        object.material.envMapIntensity = 0.48;
        originalColors.set(object.uuid, object.material.color.clone());
        
        if (object.name === 'node_0003') {
          saturationTarget = object;
        }
      }
    });

    scene.add(island);
    frameObject(island);
    registerBuildingLinks(island);
    initialCameraPosition = camera.position.clone();
    initialTarget = controls.target.clone();
    loader.classList.add('is-hidden');
  },
  (event) => {
    if (!event.lengthComputable) {
      loaderText.textContent = 'Caricamento';
      return;
    }

    const percent = Math.round((event.loaded / event.total) * 100);
    loaderText.textContent = percent >= 100 ? 'Preparazione modello' : `Caricamento ${percent}%`;
    loaderProgress.style.transform = `scaleX(${percent / 100})`;
  },
  (error) => {
    console.error('Impossibile caricare floatingIsland.glb', error);
    loaderText.textContent = 'Errore nel caricamento del modello';
  }
);

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  object.position.sub(center);
  object.position.y += size.y * 0.04;

  const framedBox = new THREE.Box3().setFromObject(object);
  const framedCenter = framedBox.getCenter(new THREE.Vector3());
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * camera.aspect);
  const horizontalSize = Math.max(size.x, size.z);
  const distanceForHeight = size.y / (2 * Math.tan(verticalFov * 0.5));
  const distanceForWidth = horizontalSize / (2 * Math.tan(horizontalFov * 0.5));
  const cameraDistance = Math.max(distanceForHeight, distanceForWidth, maxDimension) * 1.136;

  camera.near = Math.max(maxDimension / 1000, 0.01);
  camera.far = maxDimension * 12;
  camera.updateProjectionMatrix();

  controls.target.copy(framedCenter);
  controls.minDistance = maxDimension * 0.28;
  controls.maxDistance = maxDimension * 3.2;
  controls.update();

  scene.fog.near = maxDimension * 1.2;
  scene.fog.far = maxDimension * 5.2;
}

function registerBuildingLinks(island) {
  islandRoot = island;
  clickableBuildings.length = 0;
  hotspotGroup.clear();

  island.updateWorldMatrix(true, true);
  island.traverse((object) => {
    const building = buildingLinkByName.get(object.name);
    if (!building) return;

    object.traverse((child) => {
      if (child.isMesh) {
        child.userData.link = building.href;
        child.userData.focusObject = object;
        child.userData.isBuildingLink = true;
        clickableBuildings.push(child);
      }
    });
  });
}

function bindLightControls() {
  lightControlInputs.forEach((input) => {
    const param = input.dataset.lightParam;

    input.addEventListener('input', () => {
      lightSettings[param] = Number(input.value);
      updateLightFromSettings();
    });
  });
}

function updateLightFromSettings() {
  const azimuth = THREE.MathUtils.degToRad(lightSettings.azimuth);
  const elevation = THREE.MathUtils.degToRad(lightSettings.elevation);
  const distance = 24;
  const horizontalDistance = Math.cos(elevation) * distance;

  sunLight.intensity = lightSettings.intensity;
  sunLight.position.set(
    Math.sin(azimuth) * horizontalDistance,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * horizontalDistance
  );

  hemiLight.intensity = lightSettings.ambient;
  fillLight.intensity = Math.max(0.08, lightSettings.ambient * 0.28);
  fillLight.position.set(-sunLight.position.x * 0.6, 7, -sunLight.position.z * 0.6);

  lightControlInputs.forEach((input) => {
    const param = input.dataset.lightParam;
    const output = document.querySelector(`#${input.id}-value`);
    if (!output) return;

    output.textContent = formatLightValue(param, lightSettings[param]);
  });

  if (lightVector) {
    lightVector.textContent = `x ${sunLight.position.x.toFixed(1)} · y ${sunLight.position.y.toFixed(1)} · z ${sunLight.position.z.toFixed(1)}`;
  }
}

function formatLightValue(param, value) {
  if (param === 'azimuth' || param === 'elevation') {
    return `${Math.round(value)}°`;
  }

  return value.toFixed(2);
}

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getHoveredBuilding(event) {
  if (!islandRoot || clickableBuildings.length === 0) return null;

  setPointer(event);
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(clickableBuildings, false);
  return hits[0]?.object ?? null;
}

function focusBuilding(building) {
  if (isNavigating) return;
  isNavigating = true;
  controls.enabled = false;

  const focusObject = building.userData.focusObject ?? building;
  const box = new THREE.Box3().setFromObject(focusObject);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const approach = new THREE.Vector3(1.25, 0.72, 1.35).normalize();
  const distance = Math.max(size.x, size.y, size.z) * 2.6;
  const cameraTarget = center.clone().add(approach.multiplyScalar(distance));
  cameraTarget.y += size.y * 0.28;

  cameraMove = {
    startTime: performance.now(),
    duration: 1050,
    fromPosition: camera.position.clone(),
    toPosition: cameraTarget,
    fromTarget: controls.target.clone(),
    toTarget: center,
    href: building.userData.link
  };
}

function updateCameraMove() {
  if (!cameraMove) return;

  const elapsed = performance.now() - cameraMove.startTime;
  const progress = Math.min(elapsed / cameraMove.duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  camera.position.lerpVectors(cameraMove.fromPosition, cameraMove.toPosition, eased);
  controls.target.lerpVectors(cameraMove.fromTarget, cameraMove.toTarget, eased);
  controls.update();

  if (progress < 1) return;

  window.location.href = cameraMove.href;
  cameraMove = null;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);

window.addEventListener('keydown', (e) => {
  if (e.key === 'p') {
    console.log('Camera position:', camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2));
    console.log('Controls target:', controls.target.x.toFixed(2), controls.target.y.toFixed(2), controls.target.z.toFixed(2));
  }
});

window.addEventListener('focus', () => {
  if (initialCameraPosition && initialTarget && !isNavigating) {
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialTarget);
    controls.update();
  }
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (isNavigating) return;
  renderer.domElement.classList.toggle('is-clickable', Boolean(getHoveredBuilding(event)));
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown || isNavigating) return;

  const dragDistance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (dragDistance > 8) {
    suppressNextClick = true;
    return;
  }

  const building = getHoveredBuilding(event);
  if (building) {
    focusBuilding(building);
  }
});

renderer.domElement.addEventListener('click', (event) => {
  if (isNavigating) return;

  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  const building = getHoveredBuilding(event);
  if (building) {
    focusBuilding(building);
  }
});

function animate() {
  requestAnimationFrame(animate);
  updateCameraMove();
  controls.update();
  renderer.render(scene, camera);
}

animate();
