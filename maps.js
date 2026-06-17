const STORAGE_KEY = "opentabs.maps.v2";
const NEXT_MAP_KEY = "opentabs.nextMapId";
const NEXT_MAP_DATA_KEY = "opentabs.nextMapData";
const NEXT_MAP_SESSION_KEY = "opentabs.nextMapSessionData";

const ui = {
  mapList: document.getElementById("mapList"),
  mapImport: document.getElementById("mapImport"),
  startSelectedMap: document.getElementById("startSelectedMap")
};

const state = {
  selectedMapId: null
};

function presetBySize(sizeKey) {
  if (sizeKey === "gigantic") return { width: 1536, height: 960, players: 5 };
  if (sizeKey === "huge") return { width: 1200, height: 720, players: 4 };
  if (sizeKey === "large") return { width: 896, height: 512, players: 4 };
  if (sizeKey === "medium") return { width: 640, height: 384, players: 3 };
  return { width: 384, height: 256, players: 2 };
}

function createPlainMap(sizeKey, name) {
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

function defaultMaps() {
  return [
    createPlainMap("small", "Pianura Piccola"),
    createPlainMap("medium", "Pianura Media"),
    createPlainMap("large", "Pianura Grande"),
    createPlainMap("huge", "Pianura Enorme"),
    createPlainMap("gigantic", "Pianura Gigantesca")
  ];
}

function loadMaps() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const maps = defaultMaps();
    saveMaps(maps);
    return maps;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  const maps = defaultMaps();
  saveMaps(maps);
  return maps;
}

function saveMaps(maps) { localStorage.setItem(STORAGE_KEY, JSON.stringify(maps)); }

function stableMapId(map) {
  return `${map.name || "Mappa"}-${map.sizeKey || "custom"}-${map.width}x${map.height}-${map.players || map.spawns?.length || 2}`.replace(/\s+/g, "-").toLowerCase();
}

function ensureUniqueMapIds(maps) {
  const seen = new Set();
  let changed = false;
  for (const map of maps) {
    if (!map.id || seen.has(map.id)) {
      map.id = crypto.randomUUID ? crypto.randomUUID() : stableMapId(map);
      changed = true;
    }
    seen.add(map.id);
  }
  if (changed) saveMaps(maps);
  return maps;
}

function setNextMap(map) {
  const data = JSON.stringify(map);
  localStorage.setItem(NEXT_MAP_KEY, map.id);
  localStorage.setItem(NEXT_MAP_DATA_KEY, data);
  sessionStorage.setItem(NEXT_MAP_SESSION_KEY, data);
}

function renderMapList() {
  const maps = ensureUniqueMapIds(loadMaps());
  if (!state.selectedMapId && maps[0]) state.selectedMapId = maps[0].id;
  ui.mapList.innerHTML = "";
  for (const map of maps) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-entry${state.selectedMapId === map.id ? " active" : ""}`;
    button.innerHTML = `<strong>${map.name}</strong><small>${map.width}x${map.height} - ${map.players} giocatori</small>`;
    button.addEventListener("click", () => {
      state.selectedMapId = map.id;
      renderMapList();
    });
    ui.mapList.appendChild(button);
  }
}

ui.startSelectedMap.addEventListener("click", () => {
  if (!state.selectedMapId) return;
  const map = ensureUniqueMapIds(loadMaps()).find((entry) => entry.id === state.selectedMapId);
  if (!map) return;
  setNextMap(map);
  window.location.assign("play.html");
});

ui.mapImport.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  if (!imported.id) imported.id = crypto.randomUUID();
  const maps = loadMaps();
  maps.push(imported);
  saveMaps(maps);
  state.selectedMapId = imported.id;
  renderMapList();
});

renderMapList();
