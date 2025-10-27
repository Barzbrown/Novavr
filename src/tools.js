import * as THREE from 'three';
import { state, addBoard, setSelectedBoard } from './state.js';

const BUTTON_WIDTH = 0.09;
const BUTTON_HEIGHT = 0.045;
const BUTTON_PADDING = 0.01;
const BUTTON_TEXTURE_WIDTH = 256;
const BUTTON_TEXTURE_HEIGHT = 128;
const BUTTON_CORNER_RADIUS = 24;

const BOARD_WIDTH = 0.8;
const BOARD_HEIGHT = 0.45;
const BOARD_TEXTURE_WIDTH = 1024;
const BOARD_TEXTURE_HEIGHT = 512;

const BUTTON_CONFIG = [
  'NEW_BOARD',
  'UPLOAD_FILE',
  'ASK_NOVA',
  'WEB_SEARCH',
  'WEB_WINDOW',
  'GEN_IMAGE',
  'TOGGLE_SKETCH',
  'LOAD_MEMORY',
  'SET_AVATAR',
];

function drawRoundedRect(context, width, height, radius) {
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
}

function createButtonCanvas(label) {
  const canvas = document.createElement('canvas');
  canvas.width = BUTTON_TEXTURE_WIDTH;
  canvas.height = BUTTON_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(20, 20, 30, 0.95)';
  drawRoundedRect(context, canvas.width, canvas.height, BUTTON_CORNER_RADIUS);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = 'bold 44px "Helvetica Neue", Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2);

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

export function buildWristMenuButtons(wristMenuGroup, labels = BUTTON_CONFIG) {
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
    if (mesh.material && mesh.material.color) {
      const highlight = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.25);
      mesh.material.color.copy(highlight);
      mesh.material.needsUpdate = true;
    }
  } else {
    mesh.scale.copy(baseScale);
    if (mesh.material && mesh.material.color) {
      mesh.material.color.copy(baseColor);
      mesh.material.needsUpdate = true;
    }
  }
}

export function clearHoverState() {
  state.wristButtons.forEach(({ id }) => setButtonHover(id, false));
}

function speakReply(text) {
  if (!text) return;
  if (typeof window !== 'undefined') {
    if (typeof window.speakReply === 'function') {
      try {
        window.speakReply(text);
        return;
      } catch (error) {
        console.error('speakReply callback failed', error);
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }
}

function openExternalBrowser(url) {
  if (!url) return;
  if (typeof window !== 'undefined') {
    if (typeof window.openExternalBrowser === 'function') {
      window.openExternalBrowser(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }
}

function createBoardCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = BOARD_TEXTURE_WIDTH;
  canvas.height = BOARD_TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  return { canvas, context };
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const words = text.split(/\s+/);
  let line = '';
  let cursorY = y;
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) {
    context.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawBoard(board) {
  const { canvas, context } = board;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#16161d';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#3b3b52';
  context.fillRect(0, 0, canvas.width, 96);

  context.fillStyle = '#ffffff';
  context.font = 'bold 56px "Helvetica Neue", Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(board.title || board.type || 'BOARD', 48, 50);

  context.font = '400 40px "Helvetica Neue", Arial, sans-serif';
  context.textBaseline = 'top';
  const textTop = 120;
  const textLeft = 48;
  const textWidth = canvas.width - 96;
  wrapText(context, board.text || '', textLeft, textTop, textWidth, 48);

  if (board.image && board.image.complete) {
    const imageWidth = canvas.width * 0.4;
    const imageHeight = canvas.height * 0.5;
    const imageX = canvas.width - imageWidth - 48;
    const imageY = canvas.height - imageHeight - 48;
    context.drawImage(board.image, imageX, imageY, imageWidth, imageHeight);
  }

  board.texture.needsUpdate = true;
}

function loadBoardImage(board, url) {
  if (!url) return;
  if (board.image && board.image.src === url) {
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    board.image = image;
    drawBoard(board);
  };
  image.onerror = (error) => {
    console.error('Failed to load board image', error);
  };
  image.src = url;
}

function createBoard(options = {}) {
  const {
    title = 'BOARD',
    text = '',
    type = 'text',
    imageUrl = null,
  } = options;

  const { canvas, context } = createBoardCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const geometry = new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT);
  const mesh = new THREE.Mesh(geometry, material);

  const board = {
    id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    text,
    type,
    imageUrl,
    mesh,
    canvas,
    context,
    texture,
    image: null,
  };

  mesh.name = board.id;
  mesh.userData.board = board;

  drawBoard(board);
  if (imageUrl) {
    loadBoardImage(board, imageUrl);
  }

  return board;
}

const forwardVector = new THREE.Vector3(0, 0, -1);

function getSpawnBasis() {
  if (state.controllers?.right?.controller) {
    return state.controllers.right.controller;
  }
  if (state.controllers?.left?.controller) {
    return state.controllers.left.controller;
  }
  return null;
}

function placeBoard(mesh, explicitPosition, explicitQuaternion) {
  if (explicitPosition) {
    mesh.position.copy(explicitPosition);
  }
  if (explicitQuaternion) {
    mesh.quaternion.copy(explicitQuaternion);
  }

  if (!explicitPosition || !explicitQuaternion) {
    const basis = getSpawnBasis();
    if (basis) {
      const spawnDirection = forwardVector.clone().applyQuaternion(basis.quaternion).normalize();
      const position = basis.position.clone().addScaledVector(spawnDirection, 1.2);
      mesh.position.copy(position);
      const lookTarget = basis.position.clone();
      mesh.lookAt(lookTarget);
    } else if (!explicitPosition) {
      mesh.position.set(0, 1.4, -1.5);
      mesh.lookAt(new THREE.Vector3(0, 1.4, 0));
    }
  }
}

function spawnBoard(options = {}) {
  if (!state.scene) {
    console.warn('Cannot spawn board without an active scene');
    return null;
  }

  const board = createBoard(options);
  placeBoard(board.mesh, options.position, options.quaternion);
  state.scene.add(board.mesh);
  addBoard(board);
  setSelectedBoard(board);
  return board;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

let uploadInputBound = false;
let avatarInputBound = false;

async function handleUploadChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const data = await fetchJson('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const summary = data?.summary || data?.text || '';
    const preview = data?.previewUrl || data?.preview || data?.imageUrl || null;
    const title = data?.title || file.name || 'Uploaded File';

    spawnBoard({
      title,
      text: summary,
      imageUrl: preview,
      type: 'upload',
    });
  } catch (error) {
    console.error('File upload failed', error);
    spawnBoard({
      title: 'UPLOAD FAILED',
      text: error.message || 'Unable to upload file.',
      type: 'error',
    });
  } finally {
    event.target.value = '';
  }
}

function ensureUploadInput() {
  if (typeof document === 'undefined') return null;
  const input = document.getElementById('fileInput');
  if (!input) {
    console.warn('Upload input with id "fileInput" not found');
    return null;
  }
  if (!uploadInputBound) {
    input.addEventListener('change', handleUploadChange);
    uploadInputBound = true;
  }
  return input;
}

async function handleAskNova() {
  const board = state.selectedBoard;
  if (!board) {
    console.warn('ASK_NOVA requires a selected board');
    return;
  }

  try {
    const prompt = board.text || '';
    const data = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const reply = data?.reply || data?.text || data?.answer || '';
    board.text = `${board.text ? `${board.text}\n` : ''}Nova: ${reply}`.trim();
    drawBoard(board);
    speakReply(reply);
  } catch (error) {
    console.error('ASK_NOVA failed', error);
    board.text = `${board.text}\n[ASK_NOVA failed: ${error.message}]`;
    drawBoard(board);
  }
}

async function handleWebSearch() {
  if (typeof window === 'undefined') return;
  const query = window.prompt('Enter search query for Nova Web Search:');
  if (!query) return;

  try {
    const data = await fetchJson('/api/web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    spawnBoard({
      title: data?.title || `Search: ${query}`,
      text: data?.summary || data?.text || '',
      imageUrl: data?.screenshot || data?.imageUrl || null,
      type: 'web',
    });
  } catch (error) {
    console.error('WEB_SEARCH failed', error);
    spawnBoard({
      title: 'WEB SEARCH ERROR',
      text: error.message || 'Search failed.',
      type: 'error',
    });
  }
}

async function handleWebWindow() {
  if (typeof window === 'undefined') return;
  const url = window.prompt('Enter URL to open in Nova Web Window:');
  if (!url) return;

  try {
    const data = await fetchJson('/api/web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    spawnBoard({
      title: data?.title || url,
      text: data?.summary || data?.text || '',
      imageUrl: data?.screenshot || data?.imageUrl || null,
      type: 'web',
    });

    openExternalBrowser(url);
  } catch (error) {
    console.error('WEB_WINDOW failed', error);
    spawnBoard({
      title: 'WEB WINDOW ERROR',
      text: error.message || 'Unable to open URL.',
      type: 'error',
    });
  }
}

async function handleGenImage() {
  if (typeof window === 'undefined') return;
  const prompt = window.prompt('Describe the image Nova should generate:');
  if (!prompt) return;

  try {
    const data = await fetchJson('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const imageUrl = data?.imageUrl || data?.url || data?.result;
    spawnBoard({
      title: data?.title || 'Generated Image',
      text: prompt,
      imageUrl,
      type: 'image',
    });
  } catch (error) {
    console.error('GEN_IMAGE failed', error);
    spawnBoard({
      title: 'IMAGE GENERATION ERROR',
      text: error.message || 'Unable to generate image.',
      type: 'error',
    });
  }
}

async function handleLoadMemory() {
  try {
    const data = await fetchJson('/api/memory', { method: 'GET' });
    const memories = Array.isArray(data) ? data : data?.memories || [];
    if (!memories.length) {
      spawnBoard({
        title: 'NO MEMORY FOUND',
        text: 'Nova has no stored memories yet.',
        type: 'memory',
      });
      return;
    }

    const radius = 1.5;
    const basePosition = getSpawnBasis();
    memories.forEach((memory, index) => {
      const fraction = memories.length > 1 ? index / (memories.length - 1) : 0.5;
      const angle = THREE.MathUtils.lerp(-Math.PI / 3, Math.PI / 3, fraction);
      const position = new THREE.Vector3(
        Math.sin(angle) * radius,
        1.4,
        -Math.cos(angle) * radius
      );

      if (basePosition) {
        position.add(basePosition.position);
      }

      const board = spawnBoard({
        title: memory?.title || `Memory ${index + 1}`,
        text: memory?.summary || memory?.text || JSON.stringify(memory ?? {}),
        type: 'memory',
        position,
      });

      if (board?.mesh && basePosition) {
        board.mesh.lookAt(basePosition.position);
      }
    });
  } catch (error) {
    console.error('LOAD_MEMORY failed', error);
    spawnBoard({
      title: 'MEMORY ERROR',
      text: error.message || 'Unable to load memories.',
      type: 'error',
    });
  }
}

function applyAvatarTexture(dataUrl) {
  if (!dataUrl || typeof window === 'undefined') return;

  let handled = false;
  if (window.NovaAvatar && window.NovaAvatar.material?.map) {
    const texture = window.NovaAvatar.material.map;
    const image = new Image();
    image.onload = () => {
      texture.image = image;
      texture.needsUpdate = true;
    };
    image.src = dataUrl;
    handled = true;
  }

  if (!handled && typeof window.setNovaAvatarTexture === 'function') {
    window.setNovaAvatarTexture(dataUrl);
    handled = true;
  }

  if (!handled) {
    window.dispatchEvent(new CustomEvent('nova-avatar-update', { detail: { dataUrl } }));
  }
}

function ensureAvatarInput() {
  if (typeof document === 'undefined') return null;
  const input = document.getElementById('avatarInput');
  if (!input) {
    console.warn('Avatar input with id "avatarInput" not found');
    return null;
  }
  if (!avatarInputBound) {
    input.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        applyAvatarTexture(reader.result);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    });
    avatarInputBound = true;
  }
  return input;
}

const TOOL_HANDLERS = {
  NEW_BOARD: () => {
    spawnBoard({ title: 'New Board', text: '', type: 'text' });
  },
  UPLOAD_FILE: () => {
    const input = ensureUploadInput();
    if (input) {
      input.click();
    }
  },
  ASK_NOVA: () => handleAskNova(),
  WEB_SEARCH: () => handleWebSearch(),
  WEB_WINDOW: () => handleWebWindow(),
  GEN_IMAGE: () => handleGenImage(),
  TOGGLE_SKETCH: () => {
    state.sketchMode = !state.sketchMode;
    console.log(`Sketch mode: ${state.sketchMode ? 'ENABLED' : 'DISABLED'}`);
  },
  LOAD_MEMORY: () => handleLoadMemory(),
  SET_AVATAR: () => {
    const input = ensureAvatarInput();
    if (input) {
      input.click();
    }
  },
};

export function handleToolClick(id) {
  const handler = TOOL_HANDLERS[id];
  if (!handler) {
    console.warn(`No handler registered for tool ${id}`);
    return;
  }

  try {
    const result = handler();
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`Tool handler for ${id} failed`, error);
      });
    }
  } catch (error) {
    console.error(`Tool handler for ${id} threw`, error);
  }
}
