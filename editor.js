const STORAGE_KEY = "opentabs.maps.v2";
const NEXT_MAP_KEY = "opentabs.nextMapId";
const NEXT_MAP_DATA_KEY = "opentabs.nextMapData";
const NEXT_MAP_SESSION_KEY = "opentabs.nextMapSessionData";

const canvas = document.getElementById("editorGame");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  mapName: document.getElementById("mapName"),
  editorMapSize: document.getElementById("editorMapSize"),
  editorTool: document.getElementById("editorTool"),
  brushSize: document.getElementById("brushSize"),
  saveMap: document.getElementById("saveMap"),
  downloadMap: document.getElementById("downloadMap"),
  mapImport: document.getElementById("mapImport"),
  playFromEditor: document.getElementById("playFromEditor"),
  editorCameraInfo: document.getElementById("editorCameraInfo"),
  editorInfo: document.getElementById("editorInfo"),
  toast: document.getElementById("editorToast")
};

const state = {
  map: null,
  painting: false,
  lastTime: performance.now(),
  camera: { x: 0, y: 0, zoom: 2, dragging: false, dragStartX: 0, dragStartY: 0, startX: 0, startY: 0 }
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function presetBySize(sizeKey) {
  if (sizeKey === "gigantic") return { width: 1536, height: 960, players: 5 };
  if (sizeKey === "huge") return { width: 1200, height: 720, players: 4 };
  if (sizeKey === "large") return { width: 896, height: 512, players: 4 };
  if (sizeKey === "medium") return { width: 640, height: 384, players: 3 };
  return { width: 384, height: 256, players: 2 };
}

function createPlainMap(sizeKey, name = "Nuova Mappa") {
  const preset = presetBySize(sizeKey);
  const spawns = [
    { owner: "player", x: 28, y: preset.height / 2 },
    { owner: "enemy-1", x: preset.width - 28, y: preset.height / 2 }
  ];
  if (preset.players >= 3) spawns.push({ owner: "enemy-2", x: preset.width / 2, y: 34 });
  if (preset.players >= 4) spawns.push({ owner: "enemy-3", x: preset.width / 2, y: preset.height - 34 });
  if (preset.players >= 5) spawns.push({ owner: "enemy-4", x: preset.width * 0.75, y: preset.height * 0.25 });
  return { id: crypto.randomUUID(), name, sizeKey, width: preset.width, height: preset.height, players: preset.players, grass: [], waters: [], rocks: [], spawns };
}

function loadMaps() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMaps(maps) { localStorage.setItem(STORAGE_KEY, JSON.stringify(maps)); }

function setNextMap(map) {
  const data = JSON.stringify(map);
  localStorage.setItem(NEXT_MAP_KEY, map.id);
  localStorage.setItem(NEXT_MAP_DATA_KEY, data);
  sessionStorage.setItem(NEXT_MAP_SESSION_KEY, data);
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  setTimeout(() => ui.toast.classList.remove("show"), 1800);
}

function ownerColor(owner) {
  if (owner === "player") return "#e3443f";
  if (owner === "enemy-1") return "#2f88df";
  if (owner === "enemy-2") return "#9d59ff";
  if (owner === "enemy-3") return "#2dbd9f";
  if (owner === "enemy-4") return "#e8943f";
  return "#2dbd9f";
}

function screenToWorld(screenX, screenY) {
  return { x: clamp(screenX / state.camera.zoom + state.camera.x, 0, state.map.width), y: clamp(screenY / state.camera.zoom + state.camera.y, 0, state.map.height) };
}

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const screenY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return screenToWorld(screenX, screenY);
}

function brushRadius() { return Number(ui.brushSize.value); }

function removeNear(list, point, extra = 0) {
  const limit = brushRadius() + extra;
  return list.filter((item) => Math.hypot(item.x - point.x, item.y - point.y) > (item.r || 0) + limit);
}

function setSpawn(owner, point) {
  const current = state.map.spawns.find((spawn) => spawn.owner === owner);
  if (current) {
    current.x = Math.round(point.x);
    current.y = Math.round(point.y);
  } else {
    state.map.spawns.push({ owner, x: Math.round(point.x), y: Math.round(point.y) });
  }
}

function applyBrush(point) {
  const tool = ui.editorTool.value;
  if (tool === "water") {
    state.map.waters.push({ x: Math.round(point.x), y: Math.round(point.y), r: brushRadius() });
    state.map.rocks = removeNear(state.map.rocks, point, 2);
  } else if (tool === "rock") {
    state.map.rocks.push({ x: Math.round(point.x), y: Math.round(point.y), r: Math.max(2, Math.round(brushRadius() * 0.7)) });
    state.map.waters = removeNear(state.map.waters, point, 2);
  } else if (tool === "grass") {
    state.map.waters = removeNear(state.map.waters, point, 1);
    state.map.rocks = removeNear(state.map.rocks, point, 1);
  } else if (tool === "erase") {
    state.map.waters = removeNear(state.map.waters, point, 3);
    state.map.rocks = removeNear(state.map.rocks, point, 3);
  } else if (tool === "spawn-player") {
    setSpawn("player", point);
  } else if (tool === "spawn-enemy-1") {
    setSpawn("enemy-1", point);
  } else if (tool === "spawn-enemy-2") {
    setSpawn("enemy-2", point);
  } else if (tool === "spawn-enemy-3") {
    setSpawn("enemy-3", point);
  }
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);
  ctx.fillStyle = "#2a9d3e";
  ctx.fillRect(0, 0, state.map.width, state.map.height);
  ctx.fillStyle = "rgba(49, 101, 180, 0.8)";
  for (const water of state.map.waters) {
    ctx.beginPath();
    ctx.arc(water.x, water.y, water.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const rock of state.map.rocks) {
    ctx.fillStyle = "#696a61";
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a3a28d";
    ctx.fillRect(rock.x - 1, rock.y - 1, 2, 2);
  }
  for (const spawn of state.map.spawns) {
    ctx.fillStyle = ownerColor(spawn.owner);
    ctx.fillRect(spawn.x - 5, spawn.y - 5, 10, 10);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(spawn.x - 5.5, spawn.y - 5.5, 11, 11);
  }
  ctx.restore();
}

function saveCurrentMap() {
  state.map.name = ui.mapName.value.trim() || "Nuova Mappa";
  const maps = loadMaps();
  const existingIndex = maps.findIndex((map) => map.id === state.map.id);
  if (existingIndex >= 0) maps[existingIndex] = structuredClone(state.map);
  else maps.push(structuredClone(state.map));
  saveMaps(maps);
  showToast(`Mappa ${state.map.name} salvata.`);
}

function downloadCurrentMap() {
  state.map.name = ui.mapName.value.trim() || "Nuova Mappa";
  const blob = new Blob([JSON.stringify(state.map, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.map.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetEditorMap() {
  state.map = createPlainMap(ui.editorMapSize.value, ui.mapName.value.trim() || "Nuova Mappa");
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.zoom = state.map.sizeKey === "small" ? 2.2 : state.map.sizeKey === "medium" ? 1.45 : 1.05;
  drawMap();
}

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    const rect = canvas.getBoundingClientRect();
    state.camera.dragging = true;
    state.camera.dragStartX = event.clientX - rect.left;
    state.camera.dragStartY = event.clientY - rect.top;
    state.camera.startX = state.camera.x;
    state.camera.startY = state.camera.y;
    return;
  }
  if (event.button !== 0) return;
  state.painting = true;
  applyBrush(pointerPos(event));
  drawMap();
});

canvas.addEventListener("mousemove", (event) => {
  if (state.camera.dragging) {
    const rect = canvas.getBoundingClientRect();
    const dx = ((event.clientX - rect.left) - state.camera.dragStartX) / state.camera.zoom;
    const dy = ((event.clientY - rect.top) - state.camera.dragStartY) / state.camera.zoom;
    state.camera.x = clamp(state.camera.startX - dx, 0, Math.max(0, state.map.width - canvas.width / state.camera.zoom));
    state.camera.y = clamp(state.camera.startY - dy, 0, Math.max(0, state.map.height - canvas.height / state.camera.zoom));
    drawMap();
    return;
  }
  if (!state.painting) return;
  applyBrush(pointerPos(event));
  drawMap();
});

window.addEventListener("mouseup", () => {
  state.painting = false;
  state.camera.dragging = false;
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const pointerBefore = pointerPos(event);
  state.camera.zoom = clamp(state.camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.7, 4);
  const screenX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const screenY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  state.camera.x = clamp(pointerBefore.x - screenX / state.camera.zoom, 0, Math.max(0, state.map.width - canvas.width / state.camera.zoom));
  state.camera.y = clamp(pointerBefore.y - screenY / state.camera.zoom, 0, Math.max(0, state.map.height - canvas.height / state.camera.zoom));
  drawMap();
});

ui.editorMapSize.addEventListener("change", () => resetEditorMap());
ui.mapName.addEventListener("input", () => { state.map.name = ui.mapName.value; });
ui.saveMap.addEventListener("click", () => saveCurrentMap());
ui.downloadMap.addEventListener("click", () => downloadCurrentMap());
ui.playFromEditor.addEventListener("click", () => {
  saveCurrentMap();
  setNextMap(state.map);
  window.location.assign("play.html");
});
ui.mapImport.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  state.map = JSON.parse(text);
  if (!state.map.id) state.map.id = crypto.randomUUID();
  ui.mapName.value = state.map.name;
  ui.editorMapSize.value = state.map.sizeKey;
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.zoom = state.map.sizeKey === "small" ? 2.2 : state.map.sizeKey === "medium" ? 1.45 : 1.05;
  drawMap();
  showToast(`Mappa ${state.map.name} importata.`);
});

function frame() {
  ui.editorCameraInfo.textContent = `Zoom ${state.camera.zoom.toFixed(2)}x - X ${Math.round(state.camera.x)} Y ${Math.round(state.camera.y)}`;
  ui.editorInfo.textContent = `Pennello ${brushRadius()} - strumento ${ui.editorTool.value}`;
  requestAnimationFrame(frame);
}

resetEditorMap();
requestAnimationFrame(frame);
