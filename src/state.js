import * as THREE from 'three';

export const state = {
  scene: null,
  wristMenuGroup: null,
  wristButtons: [],
  boards: [],
  hoverTarget: null,
  sketchMode: false,
  selectedBoard: null,
  controllers: {
    left: null,
    right: null,
  },
  ray: {
    mesh: null,
  },
};

export function registerScene(scene) {
  state.scene = scene;
}

export function registerControllers({ left, right }) {
  state.controllers.left = left;
  state.controllers.right = right;
}

export function addBoard(board) {
  if (!board) return;
  state.boards.push(board);
}

export function removeBoard(board) {
  state.boards = state.boards.filter((entry) => entry !== board);
}

export function setSelectedBoard(board) {
  state.selectedBoard = board;
}

export function setHoverTarget(target) {
  state.hoverTarget = target;
}
