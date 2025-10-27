import * as THREE from 'three';
import { state } from './state.js';

const BUTTON_WIDTH = 0.09;
const BUTTON_HEIGHT = 0.045;
const BUTTON_PADDING = 0.01;
const BUTTON_TEXTURE_WIDTH = 256;
const BUTTON_TEXTURE_HEIGHT = 128;
const BUTTON_LABELS = [
  'NEW_BOARD',
  'ASK_NOVA',
  'SUMMARIZE',
  'CLEAR',
];

function createButtonCanvas(label) {
  const canvas = document.createElement('canvas');
  canvas.width = BUTTON_TEXTURE_WIDTH;
  canvas.height = BUTTON_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(20, 20, 25, 0.95)';
  const radius = 24;
  const { width, height } = canvas;
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(width - radius, 0);
  context.quadraticCurveTo(width, 0, width, radius);
  context.lineTo(width, height - radius);
  context.quadraticCurveTo(width, height, width - radius, height);
  context.lineTo(radius, height);
  context.quadraticCurveTo(0, height, 0, height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.fill();

  context.font = 'bold 48px "Helvetica Neue", Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.fillText(label, width / 2, height / 2);

  return canvas;
}

function createButtonMesh(id) {
  const canvas = createButtonCanvas(id);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    color: 0xffffff,
  });

  const geometry = new THREE.PlaneGeometry(BUTTON_WIDTH, BUTTON_HEIGHT);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `wrist-button-${id.toLowerCase()}`;
  mesh.userData.id = id;
  mesh.userData.baseScale = mesh.scale.clone();
  mesh.userData.baseColor = material.color.clone();
  return mesh;
}

export function buildWristMenuButtons(wristMenuGroup, labels = BUTTON_LABELS) {
  if (!wristMenuGroup) {
    throw new Error('Wrist menu group is required to build wrist buttons');
  }

  state.wristButtons.forEach(({ mesh }) => {
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  });
  state.wristButtons = [];

  const totalWidth = labels.length * BUTTON_WIDTH + (labels.length - 1) * BUTTON_PADDING;
  let cursor = -totalWidth / 2 + BUTTON_WIDTH / 2;

  labels.forEach((id) => {
    const mesh = createButtonMesh(id);
    mesh.position.set(cursor, 0, 0);
    cursor += BUTTON_WIDTH + BUTTON_PADDING;
    wristMenuGroup.add(mesh);
    state.wristButtons.push({ mesh, id });
  });
}

export function setButtonHover(id, hovered) {
  const entry = state.wristButtons.find((button) => button.id === id);
  if (!entry) return;

  const { mesh } = entry;
  const baseScale = mesh.userData.baseScale || new THREE.Vector3(1, 1, 1);
  const baseColor = mesh.userData.baseColor || new THREE.Color(0xffffff);

  if (hovered) {
    mesh.scale.copy(baseScale).multiplyScalar(1.1);
    if (mesh.material && mesh.material.map) {
      mesh.material.color = baseColor.clone().multiplyScalar(1.1).clampScalar(0, 1);
      mesh.material.needsUpdate = true;
    }
  } else {
    mesh.scale.copy(baseScale);
    if (mesh.material && mesh.material.map) {
      mesh.material.color.copy(baseColor);
      mesh.material.needsUpdate = true;
    }
  }
}

export function clearHoverState() {
  state.wristButtons.forEach(({ id }) => setButtonHover(id, false));
}

export function handleToolClick(id) {
  console.log(`Tool clicked: ${id}`);
}
