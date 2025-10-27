import * as THREE from 'three';
import { state, registerScene, registerControllers } from './state.js';
import * as input from './input.js';
import { buildWristMenuButtons } from './tools.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const clock = new THREE.Clock();

registerScene(scene);

const wristMenu = new THREE.Group();
wristMenu.name = 'wrist-menu';
scene.add(wristMenu);
state.wristMenuGroup = wristMenu;
buildWristMenuButtons(wristMenu);

const leftController = new THREE.Group();
leftController.name = 'left-controller';
scene.add(leftController);

const rightController = new THREE.Group();
rightController.name = 'right-controller';
scene.add(rightController);

registerControllers({ left: { controller: leftController }, right: { controller: rightController } });

function updateWristMenuPose() {
  const left = state.controllers.left?.controller;
  if (!left || !state.wristMenuGroup) return;

  const group = state.wristMenuGroup;
  group.position.copy(left.position);
  group.quaternion.copy(left.quaternion);
  group.translateY(0.05);
  group.translateX(0.05);
}

function renderLoop() {
  const delta = clock.getDelta();
  void delta;

  updateWristMenuPose();
  input.updateRaycast();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(renderLoop);
