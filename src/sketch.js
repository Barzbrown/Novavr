import * as THREE from 'three';

const workingStroke = {
  points: [],
};

export function extendStroke(position) {
  if (!position) return;
  workingStroke.points.push(position.clone ? position.clone() : new THREE.Vector3().copy(position));
}

export function endStroke() {
  workingStroke.points.length = 0;
}
