import * as THREE from 'three';
import { state, setSelectedBoard, setHoverTarget } from './state.js';
import * as tools from './tools.js';
import * as sketch from './sketch.js';

const RAY_LENGTH = 2;
const RAY_THICKNESS = 0.003;
const TRIGGER_THRESHOLD = 0.2;

const raycaster = new THREE.Raycaster();
const forward = new THREE.Vector3(0, 0, -1);
const tempDirection = new THREE.Vector3();
const tempTipPosition = new THREE.Vector3();

let previousTriggerPressed = false;
let hoveredButtonId = null;

function ensureRightRay(scene) {
  if (state.ray.mesh) {
    return;
  }

  const geometry = new THREE.CylinderGeometry(RAY_THICKNESS, RAY_THICKNESS, RAY_LENGTH, 16, 1, true);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'right-controller-ray';
  scene.add(mesh);
  state.ray.mesh = mesh;
}

function getRightController() {
  return state.controllers.right?.controller || state.controllers.right || null;
}

function getRightGamepad() {
  const right = state.controllers.right;
  if (!right) return null;
  if (right.inputSource && right.inputSource.gamepad) {
    return right.inputSource.gamepad;
  }
  if (right.gamepad) {
    return right.gamepad;
  }
  return null;
}

function updateRightRayTransform(rightController) {
  if (!state.ray.mesh || !rightController) return;

  state.ray.mesh.position.copy(rightController.position);
  state.ray.mesh.quaternion.copy(rightController.quaternion);
  state.ray.mesh.updateMatrixWorld(true);
  state.ray.mesh.translateZ(-RAY_LENGTH / 2);
}

function computeIntersections(rightController) {
  if (!rightController) {
    setHoverTarget(null);
    tools.clearHoverState();
    hoveredButtonId = null;
    return null;
  }

  tempDirection.copy(forward).applyQuaternion(rightController.quaternion).normalize();
  raycaster.set(rightController.position, tempDirection);

  const boardMeshes = state.boards
    .map((board) => board?.mesh || board)
    .filter((mesh) => mesh instanceof THREE.Object3D);
  const buttonMeshes = state.wristButtons.map((entry) => entry.mesh);

  const intersections = raycaster.intersectObjects([...boardMeshes, ...buttonMeshes], false);
  if (!intersections.length) {
    if (hoveredButtonId) {
      tools.setButtonHover(hoveredButtonId, false);
      hoveredButtonId = null;
    }
    setHoverTarget(null);
    return null;
  }

  const { object } = intersections[0];
  const buttonEntry = state.wristButtons.find((entry) => entry.mesh === object);
  if (buttonEntry) {
    if (hoveredButtonId !== buttonEntry.id) {
      if (hoveredButtonId) {
        tools.setButtonHover(hoveredButtonId, false);
      }
      hoveredButtonId = buttonEntry.id;
      tools.setButtonHover(buttonEntry.id, true);
    }
    const target = { type: 'button', id: buttonEntry.id };
    setHoverTarget(target);
    return target;
  }

  if (hoveredButtonId) {
    tools.setButtonHover(hoveredButtonId, false);
    hoveredButtonId = null;
  }

  const boardEntry = state.boards.find((entry) => entry.mesh === object || entry === object);
  if (boardEntry) {
    const target = { type: 'board', boardRef: boardEntry };
    setHoverTarget(target);
    return target;
  }

  setHoverTarget(null);
  return null;
}

function isTriggerPressed(gamepad) {
  if (!gamepad || !gamepad.buttons?.length) return false;
  const button = gamepad.buttons[0];
  return (button.value ?? button.pressed ? 1 : 0) > TRIGGER_THRESHOLD;
}

function handleTriggerInteraction(rightController, hoverTarget) {
  const gamepad = getRightGamepad();
  const pressed = isTriggerPressed(gamepad);

  if (state.sketchMode) {
    if (pressed) {
      tempDirection.copy(forward).applyQuaternion(rightController.quaternion).normalize();
      tempTipPosition.copy(rightController.position).addScaledVector(tempDirection, RAY_LENGTH);
      sketch.extendStroke(tempTipPosition);
    } else if (previousTriggerPressed) {
      sketch.endStroke();
    }
  } else if (pressed && !previousTriggerPressed && hoverTarget) {
    if (hoverTarget.type === 'button') {
      tools.handleToolClick(hoverTarget.id);
    } else if (hoverTarget.type === 'board') {
      setSelectedBoard(hoverTarget.boardRef);
    }
  }

  previousTriggerPressed = pressed;
}

export function updateRaycast() {
  if (!state.scene) return;

  ensureRightRay(state.scene);

  const rightController = getRightController();
  updateRightRayTransform(rightController);
  const hoverTarget = computeIntersections(rightController);
  handleTriggerInteraction(rightController, hoverTarget);
}
