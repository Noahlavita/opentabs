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

function cloneDefaultDuelMap() {
  if (typeof structuredClone === "function") return structuredClone(DEFAULT_DUEL_MAP);
  return JSON.parse(JSON.stringify(DEFAULT_DUEL_MAP));
}

function defaultMaps() {
  return [cloneDefaultDuelMap()];
}

function loadMaps() {
  return defaultMaps();
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

if (ui.mapImport) {
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
}

renderMapList();
