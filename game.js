const STORAGE_KEY = "opentabs.maps.v2";
const NEXT_MAP_KEY = "opentabs.nextMapId";
const NEXT_MAP_DATA_KEY = "opentabs.nextMapData";
const NEXT_MAP_SESSION_KEY = "opentabs.nextMapSessionData";
const SCALE = 5;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const bottomHud = document.querySelector(".bottom-hud");

const ui = {
  money: document.getElementById("money"),
  wood: document.getElementById("wood"),
  stone: document.getElementById("stone"),
  population: document.getElementById("population"),
  income: document.getElementById("income"),
  castleHp: document.getElementById("castleHp"),
  selectionName: document.getElementById("selectionName"),
  selectionStats: document.getElementById("selectionStats"),
  cameraInfo: document.getElementById("cameraInfo"),
  speedButton: document.getElementById("speedButton"),
  toast: document.getElementById("toast"),
  minerLimit: document.getElementById("minerLimit"),
  mineLimit: document.getElementById("mineLimit"),
  formationBtn: document.getElementById("formationBtn"),
  costSoldier: document.getElementById("costSoldier"),
  costArcher: document.getElementById("costArcher"),
  costMiner: document.getElementById("costMiner"),
  costTank: document.getElementById("costTank"),
  costTower: document.getElementById("costTower"),
  costMine: document.getElementById("costMine"),
  costBarracks: document.getElementById("costBarracks"),
  costCannon: document.getElementById("costCannon"),
  costWall: document.getElementById("costWall"),
  costBridge: document.getElementById("costBridge"),
  costFabbro: document.getElementById("costFabbro"),
  costShell: document.getElementById("costShell"),
  costHeavyShell: document.getElementById("costHeavyShell"),
  buySoldier: document.getElementById("buySoldier"),
  buyArcher: document.getElementById("buyArcher"),
  buyMiner: document.getElementById("buyMiner"),
  buyTank: document.getElementById("buyTank"),
  buyShell: document.getElementById("buyShell"),
  buyHeavyShell: document.getElementById("buyHeavyShell"),
  buildTower: document.getElementById("buildTower"),
  buildMine: document.getElementById("buildMine"),
  buildBarracks: document.getElementById("buildBarracks"),
  buildCannon: document.getElementById("buildCannon"),
  buildWall: document.getElementById("buildWall"),
  buildBridge: document.getElementById("buildBridge"),
  buildFabbro: document.getElementById("buildFabbro"),
  upgradeCastle: document.getElementById("upgradeCastle"),
  castleUpgradeCost: document.getElementById("castleUpgradeCost")
};

const unitTypes = {
  soldier: { name: "Soldati", cost: 300, hp: 9, speed: 18, range: 8, damage: 1.45, color: "#e8e0cc", hotkey: "1" },
  archer: { name: "Arcieri", cost: 420, hp: 6, speed: 16, range: 43, damage: 1.05, color: "#f0d56f", hotkey: "2" },
  miner: { name: "Minatori", cost: 220, hp: 5, speed: 14, range: 5, damage: 0.18, color: "#c6c0ad", hotkey: "3" },
  tank: { name: "Tankoni", cost: 550, hp: 28, speed: 8, range: 7, damage: 0.55, color: "#8a8a8a", hotkey: "7" }
};

const structureTypes = {
  castle: { name: "Castello", cost: 0, hp: 900 * SCALE, w: 18, h: 24, range: 48, damage: 15, income: 0, pop: 0 },
  tower: { name: "Torre", cost: 620, hp: 220 * SCALE, w: 8, h: 10, range: 42, damage: 18, income: 0, pop: 0, hotkey: "t" },
  mine: { name: "Miniera", cost: 430, hp: 145 * SCALE, w: 12, h: 9, range: 0, damage: 0, income: 4.5 * SCALE, pop: 0, hotkey: "m" },
  barracks: { name: "Caserma", cost: 600, hp: 190 * SCALE, w: 14, h: 10, range: 0, damage: 0, income: 0, pop: 20 * SCALE, hotkey: "b" },
  cannon: { name: "Cannone", cost: 760, hp: 170 * SCALE, w: 10, h: 8, range: 0, damage: 0, income: 0, pop: 0, hotkey: "c" },
  wall: { name: "Muro", cost: 280, hp: 1, w: 6, h: 12, range: 0, damage: 0, income: 0, pop: 0, hotkey: "v", segmentHp: 125 * SCALE, maxSpan: 88, joinRange: 94, cannonDamageMultiplier: 2.4 },
  bridge: { name: "Ponte", cost: 350, costWood: 80, hp: 1, w: 6, h: 12, range: 0, damage: 0, income: 0, pop: 0, hotkey: "g", segmentHp: 180 * SCALE, maxSpan: 110, joinRange: 116, cannonDamageMultiplier: 1.8 },
  fabbro: { name: "Fabbro", cost: 700, costStone: 60, hp: 200 * SCALE, w: 12, h: 10, range: 0, damage: 0, income: 0, pop: 0, hotkey: "f" },
};

const artilleryTypes = {
  shell: { name: "Colpo standard", cost: 1350, radius: 15, damage: 180, hotkey: "4" },
  heavyShell: { name: "Colpo pesante", cost: 2850, radius: 24, damage: 320, hotkey: "5" }
};

const CANNON_ARTILLERY_COOLDOWN_BASE = 16;
const CANNON_ARTILLERY_COOLDOWN_STEP = 2;
const CANNON_ARTILLERY_COOLDOWN_MIN = 5;
const ARTILLERY_PROJECTILE_SPEED = 1.85;

const state = {
  currentMap: null,
  money: 1600,
  wood: 200,
  stone: 100,
  income: 0,
  popCap: 350,
  castleLevel: 1,
  selectedId: null,
  placement: null,
  selectedArtillery: null,
  formation: "normal",
  units: [],
  structures: [],
  projectiles: [],
  floaters: [],
  explosions: [],
  nextUnitId: 1,
  nextStructureId: 1,
  lastTime: performance.now(),
  gameTime: 0,
  aiPlayers: [],
  lastPointerWorld: null,
  messageUntil: 0,
  gameSpeed: 1,
  camera: { x: 0, y: 0, zoom: 2, dragging: false, dragStartX: 0, dragStartY: 0, startX: 0, startY: 0 }
};

const GAME_SPEEDS = [0.5, 1, 2, 5];

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function snapToGrid(value) { return Math.round(value); }
function rectCenter(s) { return (s.type === "wallSegment" || s.type === "bridgeSegment") ? { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 } : { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function distSq(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy; }
function itemPoint(item) { return item.members ? { x: item.x, y: item.y } : rectCenter(item); }
function lineLength(line) { return Math.hypot(line.x2 - line.x1, line.y2 - line.y1); }
function unitCount(unit) { return unit.members ? unit.members.length : 0; }
function currentPop(owner = "player") { return state.units.filter((u) => u.owner === owner).reduce((sum, unit) => sum + unitCount(unit), 0); }
function mapWidth() { return state.currentMap?.width || 384; }
function mapHeight() { return state.currentMap?.height || 256; }
function structureHpPercent(s) { return s ? clamp(s.hp / s.maxHp, 0, 1) : 0; }
function segmentHpPercent(segment) { return segment ? clamp(segment.hp / segment.maxHp, 0, 1) : 0; }
function projectPointOnSegment(point, segment) {
  const ax = segment.x1;
  const ay = segment.y1;
  const bx = segment.x2;
  const by = segment.y2;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - ax) * dx + (point.y - ay) * dy) / lenSq, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t, t };
}
function boardHeight() {
  const hudHeight = bottomHud ? Math.ceil(bottomHud.getBoundingClientRect().height) : 0;
  const shellStyles = getComputedStyle(document.body);
  const borderCompensation = Math.ceil(parseFloat(shellStyles.borderTopWidth || 0) + parseFloat(shellStyles.borderBottomWidth || 0));
  return Math.max(220, window.innerHeight - hudHeight - borderCompensation - 2);
}
function syncCanvasSize() {
  const nextWidth = Math.max(640, Math.floor(window.innerWidth));
  const nextHeight = Math.max(220, Math.floor(boardHeight()));
  if (canvas.width === nextWidth && canvas.height === nextHeight) return;
  canvas.width = nextWidth;
  canvas.height = nextHeight;
}
function minCameraZoom() {
  if (!state.currentMap) return 0.7;
  return Math.max(canvas.width / mapWidth(), canvas.height / mapHeight());
}
function minerCap() { return state.castleLevel * 20; }
function mineCap() { return state.castleLevel; }
function currentMinerPop(owner = "player") { return state.units.filter((u) => u.owner === owner && u.type === "miner").reduce((sum, unit) => sum + unitCount(unit), 0); }
function currentMineCount(owner = "player") { return state.structures.filter((s) => s.owner === owner && s.type === "mine").reduce((sum, structure) => sum + (structure.level || 1), 0); }
function castleUpgradeCost() { return Math.floor(1000 * Math.pow(1.7, state.castleLevel - 1)); }
function playerCannons() { return state.structures.filter((s) => s.owner === "player" && s.type === "cannon"); }
function cannonArtilleryCooldown(structure) {
  const level = structure?.level || 1;
  return Math.max(CANNON_ARTILLERY_COOLDOWN_MIN, CANNON_ARTILLERY_COOLDOWN_BASE - (level - 1) * CANNON_ARTILLERY_COOLDOWN_STEP);
}
function bestReadyArtilleryCannon(owner, targetPoint) {
  const readyCannons = state.structures.filter((s) => s.owner === owner && s.type === "cannon" && s.cooldown <= 0);
  if (!readyCannons.length) return null;
  return readyCannons
    .map((entry) => ({ entry, d: Math.hypot(rectCenter(entry).x - targetPoint.x, rectCenter(entry).y - targetPoint.y) }))
    .sort((a, b) => a.d - b.d)[0]?.entry || null;
}
function shortestArtilleryCooldown(owner) {
  return state.structures
    .filter((s) => s.owner === owner && s.type === "cannon")
    .reduce((best, cannon) => Math.min(best, Math.max(0, cannon.cooldown || 0)), Infinity);
}
function cannonCooldownPercent(structure) {
  const total = cannonArtilleryCooldown(structure);
  if (total <= 0) return 0;
  return clamp(Math.max(0, structure.cooldown || 0) / total, 0, 1);
}
function artilleryFlightProgress(projectile) {
  const flightTime = projectile.artillery ? (projectile.flightTime || ARTILLERY_PROJECTILE_SPEED) : (1 / 4.5);
  return clamp(projectile.age / flightTime, 0, 1);
}
function projectileDrawPoint(projectile) {
  const t = artilleryFlightProgress(projectile);
  const x = projectile.x + (projectile.tx - projectile.x) * t;
  const baseY = projectile.y + (projectile.ty - projectile.y) * t;
  if (!projectile.artillery) return { x, y: baseY, t };
  const distance = Math.hypot(projectile.tx - projectile.x, projectile.ty - projectile.y);
  const arcHeight = Math.max(8, Math.min(34, distance * 0.12));
  const y = baseY - Math.sin(t * Math.PI) * arcHeight;
  return { x, y, t };
}

const PERF = {
  unitGridSize: 10,
  unitGrid: new Map(),
  wallSegments: [],
  bridgeSegments: [],
  blockingSegments: [],
  ownerCache: new Map(),
  frameIndex: 0
};

function clearPerfCaches() {
  PERF.unitGrid.clear();
  PERF.wallSegments = [];
  PERF.bridgeSegments = [];
  PERF.blockingSegments = [];
  PERF.ownerCache.clear();
}

function gridKey(x, y) {
  return `${Math.floor(x / PERF.unitGridSize)},${Math.floor(y / PERF.unitGridSize)}`;
}

function rebuildPerfCaches() {
  PERF.frameIndex++;
  PERF.unitGrid.clear();
  PERF.wallSegments = [];
  PERF.bridgeSegments = [];
  for (const structure of state.structures) {
    if (structure.type === "wallSegment") PERF.wallSegments.push(structure);
    else if (structure.type === "bridgeSegment") PERF.bridgeSegments.push(structure);
  }
  PERF.blockingSegments = PERF.wallSegments.concat(PERF.bridgeSegments);
  for (const unit of state.units) {
    for (const member of unit.members) {
      const key = gridKey(member.x, member.y);
      let bucket = PERF.unitGrid.get(key);
      if (!bucket) {
        bucket = [];
        PERF.unitGrid.set(key, bucket);
      }
      bucket.push({ unit, member });
    }
  }
}

function nearbyUnitMembers(x, y, radius) {
  const cells = Math.ceil(radius / PERF.unitGridSize);
  const gx = Math.floor(x / PERF.unitGridSize);
  const gy = Math.floor(y / PERF.unitGridSize);
  const result = [];
  for (let oy = -cells; oy <= cells; oy++) {
    for (let ox = -cells; ox <= cells; ox++) {
      const bucket = PERF.unitGrid.get(`${gx + ox},${gy + oy}`);
      if (bucket) result.push(...bucket);
    }
  }
  return result;
}

function ownerModifiers(owner) {
  let cached = PERF.ownerCache.get(owner);
  if (cached) return cached;
  cached = { fabbro: fabbroBonus(owner), formation: formationModifier(owner) };
  PERF.ownerCache.set(owner, cached);
  return cached;
}

function defaultMaps() {
  if (typeof structuredClone === "function") return [structuredClone(DEFAULT_DUEL_MAP)];
  return [JSON.parse(JSON.stringify(DEFAULT_DUEL_MAP))];
}

function isPlayableMap(map) {
  return Boolean(map?.width && map?.height && Array.isArray(map?.spawns) && map.spawns.some((spawn) => spawn.owner === "player") && map.spawns.some((spawn) => spawn.owner !== "player"));
}

function fallbackMap() {
  if (typeof structuredClone === "function") return structuredClone(DEFAULT_DUEL_MAP);
  return JSON.parse(JSON.stringify(DEFAULT_DUEL_MAP));
}

function mapFromStorage() {
  const mapId = localStorage.getItem(NEXT_MAP_KEY);
  const candidates = [sessionStorage.getItem(NEXT_MAP_SESSION_KEY), localStorage.getItem(NEXT_MAP_DATA_KEY)].filter(Boolean);
  for (const directData of candidates) {
    try {
      const parsed = JSON.parse(directData);
      if (isPlayableMap(parsed) && (!mapId || !parsed.id || parsed.id === mapId)) return normalizeMap(parsed);
    } catch {}
  }
  const maps = defaultMaps();
  const found = maps.find((map) => map.id === mapId);
  if (found) return normalizeMap(found);
  const fallbackFromDirectData = candidates.map((directData) => {
    try { return JSON.parse(directData); } catch { return null; }
  }).find(isPlayableMap);
  if (fallbackFromDirectData) return normalizeMap(fallbackFromDirectData);
  return fallbackMap();
}

function inferSizeKey(map) {
  if (map.sizeKey) return map.sizeKey;
  if (map.width >= 1400 || map.height >= 900) return "gigantic";
  if (map.width >= 1100 || map.height >= 700) return "huge";
  if (map.width >= 800 || map.height >= 480) return "large";
  if (map.width >= 560 || map.height >= 340) return "medium";
  return "small";
}

function normalizeMap(map) {
  const normalized = structuredClone(map);
  normalized.sizeKey = inferSizeKey(normalized);
  normalized.grass = Array.isArray(normalized.grass) ? normalized.grass : [];
  normalized.waters = Array.isArray(normalized.waters) ? normalized.waters : [];
  normalized.rocks = Array.isArray(normalized.rocks) ? normalized.rocks : [];
  normalized.spawns = Array.isArray(normalized.spawns) ? normalized.spawns : fallbackMap().spawns;
  normalized.spawns = normalized.spawns.filter((spawn) => spawn?.owner && Number.isFinite(spawn.x) && Number.isFinite(spawn.y));
  if (!normalized.spawns.some((spawn) => spawn.owner === "player")) normalized.spawns.unshift({ owner: "player", x: 28, y: normalized.height / 2 });
  if (!normalized.spawns.some((spawn) => spawn.owner !== "player")) normalized.spawns.push({ owner: "enemy-1", x: normalized.width - 28, y: normalized.height / 2 });
  normalized.players = Math.max(2, normalized.players || normalized.spawns.length);
  return normalized;
}

function nearestRock(point) {
  let best = null;
  let bestD = Infinity;
  for (const rock of state.currentMap.rocks) {
    const d = Math.hypot(rock.x - point.x, rock.y - point.y);
    if (d < bestD) { bestD = d; best = rock; }
  }
  return best;
}

function nearestRockDistance(x, y) {
  let bestD = Infinity;
  for (const rock of state.currentMap.rocks) {
    const dx = rock.x - x;
    const dy = rock.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) bestD = d;
  }
  return Math.sqrt(bestD);
}

function isOnBridge(x, y) {
  const point = { x, y };
  for (const s of state.structures) {
    if (s.type === "bridge" && structureBlocksPoint(s, point, 2.2)) return true;
    if (s.type === "bridgeSegment" && pointSegmentDistance(point, s) <= 3.8) return true;
  }
  return false;
}

function terrainSpeed(x, y) {
  for (const water of state.currentMap.waters) {
    const dx = water.x - x;
    const dy = water.y - y;
    if (dx * dx + dy * dy <= water.r * water.r) {
      if (isOnBridge(x, y)) return 0.9;
      return 0; // Cannot cross water without bridge
    }
  }
  return 1;
}

function canTraverse(x, y) {
  for (const water of state.currentMap.waters) {
    const dx = water.x - x;
    const dy = water.y - y;
    if (dx * dx + dy * dy <= water.r * water.r) return isOnBridge(x, y);
  }
  return true;
}

function isNearBridge(x, y, tolerance = 4.2) {
  const point = { x, y };
  for (const s of state.structures) {
    if (s.type === "bridgeSegment" && pointSegmentDistance(point, s) <= tolerance) return true;
  }
  return false;
}

function nearestBridgeProjection(point, tolerance = 12, bridgeId = null) {
  let best = null;
  let bestD = Infinity;
  for (const bridge of state.structures.filter((s) => s.type === "bridgeSegment" && (!bridgeId || s.id === bridgeId))) {
    const projected = projectPointOnSegment(point, bridge);
    const d = Math.hypot(point.x - projected.x, point.y - projected.y);
    if (d <= tolerance && d < bestD) { bestD = d; best = { ...projected, bridge, d }; }
  }
  return best;
}

function lineCrossesWater(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(2, Math.ceil(distance / 5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (isInsideWater(x, y) && !isOnBridge(x, y)) return true;
  }
  return false;
}

function nearestUsableBridgePoint(from, to, owner = null) {
  let best = null;
  let bestScore = Infinity;
  for (const bridge of state.structures.filter((s) => s.type === "bridgeSegment")) {
    const a = { x: bridge.x1, y: bridge.y1 };
    const b = { x: bridge.x2, y: bridge.y2 };
    if (!bridgePathTouchesWater({ x: bridge.x1, y: bridge.y1 }, { x: bridge.x2, y: bridge.y2 })) continue;
    if (isInsideWater(a.x, a.y) || isInsideWater(b.x, b.y)) continue;
    const toProjection = projectPointOnSegment(to, bridge);
    const routeA = { entry: a, exit: b };
    const routeB = { entry: b, exit: a };
    for (const route of [routeA, routeB]) {
      if (lineCrossesWater(from, route.entry)) continue;
      if (lineCrossesWater(route.exit, to)) continue;
      const score = Math.hypot(from.x - route.entry.x, from.y - route.entry.y) + Math.hypot(route.entry.x - route.exit.x, route.entry.y - route.exit.y) + Math.hypot(route.exit.x - to.x, route.exit.y - to.y) * 0.65;
      if (score < bestScore) { bestScore = score; best = { entry: route.entry, exit: route.exit, bridgeId: bridge.id }; }
    }
  }
  return best;
}

function bridgeSegmentCoversWater(water, bridge) {
  if (!bridge || bridge.type !== "bridgeSegment") return false;
  const center = { x: (bridge.x1 + bridge.x2) / 2, y: (bridge.y1 + bridge.y2) / 2 };
  if (Math.hypot(center.x - water.x, center.y - water.y) > water.r + 16) return false;
  const crosses = bridgePathTouchesWater({ x: bridge.x1, y: bridge.y1 }, { x: bridge.x2, y: bridge.y2 });
  const endpointsOutside = !isInsideWater(bridge.x1, bridge.y1) && !isInsideWater(bridge.x2, bridge.y2);
  return crosses && endpointsOutside;
}

function fabbroBonus(owner) {
  const fabbros = state.structures.filter((s) => s.owner === owner && s.type === "fabbro");
  if (!fabbros.length) return { damage: 1, hp: 1 };
  const totalLevel = fabbros.reduce((sum, s) => sum + (s.level || 1), 0);
  return { damage: 1 + totalLevel * 0.12, hp: 1 + totalLevel * 0.08 };
}

function formationModifier(owner) {
  const ai = owner === "player" ? null : state.aiPlayers.find((entry) => entry.owner === owner);
  const formation = owner === "player" ? state.formation : (ai?.formation || "normal");
  if (formation === "defensive") return { speed: 0.7, damage: 0.85, hp: 1.3 };
  if (formation === "offensive") return { speed: 1.15, damage: 1.25, hp: 0.8 };
  return { speed: 1, damage: 1, hp: 1 };
}

function ownerFormation(owner) {
  if (owner === "player") return state.formation;
  return state.aiPlayers.find((entry) => entry.owner === owner)?.formation || "normal";
}

function applyOwnerFormation(owner) {
  clearPerfCaches();
  for (const unit of state.units.filter((entry) => entry.owner === owner && entry.type !== "miner")) assignFormation(unit);
}

function setOwnerFormation(owner, formation) {
  if (owner === "player") state.formation = formation;
  else {
    const ai = state.aiPlayers.find((entry) => entry.owner === owner);
    if (ai) ai.formation = formation;
  }
  applyOwnerFormation(owner);
}

function toggleFormation() {
  if (state.formation === "normal") state.formation = "defensive";
  else if (state.formation === "defensive") state.formation = "offensive";
  else state.formation = "normal";
  setOwnerFormation("player", state.formation);
  if (ui.formationBtn) ui.formationBtn.textContent = `Formazione: ${state.formation === "normal" ? "Normale" : state.formation === "defensive" ? "Difensiva" : "Offensiva"}`;
}


function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  state.messageUntil = performance.now() + 1800;
}

function ownerColor(owner) {
  if (owner === "player") return "#e3443f";
  if (owner === "enemy-1") return "#2f88df";
  if (owner === "enemy-2") return "#9d59ff";
  if (owner === "enemy-3") return "#2dbd9f";
  if (owner === "enemy-4") return "#e8943f";
  return "#2dbd9f";
}

function ownerDark(owner) {
  if (owner === "player") return "#721e1e";
  if (owner === "enemy-1") return "#174b87";
  if (owner === "enemy-2") return "#52258e";
  if (owner === "enemy-3") return "#146457";
  if (owner === "enemy-4") return "#8a4f1a";
  return "#146457";
}

function structureStats(structure) {
  if (structure.type === "wallSegment" || structure.type === "bridgeSegment") return { hpMax: structure.maxHp, range: 0, damage: 0, income: 0, pop: 0, cooldown: 0 };
  const base = structureTypes[structure.type];
  const level = structure.level || 1;
  return {
    hpMax: Math.round(base.hp * level),
    range: structure.type === "tower" ? Math.min(base.range + (level - 1) * 8, 80) : base.range,
    damage: base.damage * (1 + (level - 1) * 0.7),
    income: base.income * level,
    pop: base.pop * level,
    cooldown: structure.type === "tower" ? Math.max(0.28, 0.82 / (1 + (level - 1) * 0.35)) : 0.82
  };
}

function resetGame(mapData) {
  state.currentMap = JSON.parse(JSON.stringify(mapData));
  clearPerfCaches();
  state.money = 1600;
  state.wood = 200;
  state.stone = 100;
  state.income = 0;
  state.popCap = 350;
  state.castleLevel = 1;
  state.selectedId = null;
  state.placement = null;
  state.selectedArtillery = null;
  state.formation = "normal";
  state.units = [];
  state.structures = [];
  state.projectiles = [];
  state.floaters = [];
  state.explosions = [];
  state.nextUnitId = 1;
  state.nextStructureId = 1;
  state.aiPlayers = [];
  state.lastTime = performance.now();
  state.gameTime = 0;
  state.camera.x = 0;
  state.camera.y = 0;
  const defaultZoom = mapData.sizeKey === "small" ? 2.2 : mapData.sizeKey === "medium" ? 1.45 : mapData.sizeKey === "large" ? 1.05 : mapData.sizeKey === "huge" ? 0.85 : 0.65;
  state.camera.zoom = Math.max(defaultZoom, minCameraZoom());
}

function spawnStructure(type, owner, x, y) {
  const spec = structureTypes[type];
  const structure = { id: `s${state.nextStructureId++}`, type, owner, x: Math.round(x - spec.w / 2), y: Math.round(y - spec.h / 2), w: spec.w, h: spec.h, hp: spec.hp, maxHp: spec.hp, cooldown: 0, level: 1, wallLinks: [], wallSegmentIds: [] };
  const stats = structureStats(structure);
  structure.hp = stats.hpMax;
  structure.maxHp = stats.hpMax;
  state.structures.push(structure);
  if (owner === "player" && type === "barracks") state.popCap += stats.pop;
  return structure;
}

function formationOffsets(count, formation = "normal") {
  // Rigid square swarm: stable slots prevent blob shape flicker/vibration.
  const spacing = 1;
  const width = Math.ceil(Math.sqrt(count));
  const height = Math.ceil(count / width);
  const slots = [];
  for (let i = 0; i < count; i++) {
    const gx = i % width;
    const gy = Math.floor(i / width);
    const x = (gx - (width - 1) / 2) * spacing;
    const y = (gy - (height - 1) / 2) * spacing;
    slots.push({ x, y });
  }
  return slots;
}

function assignFormation(unit) {
  const slots = formationOffsets(unitCount(unit), "normal");
  const scale = unit.type === "miner" ? 1 : unit.type === "soldier" ? 1 : 1;
  unit.members.forEach((member, index) => {
    member.slotIndex = index;
    member.baseOx = (slots[index]?.x || 0) * scale;
    member.baseOy = (slots[index]?.y || 0) * scale;
    member.ox = member.baseOx;
    member.oy = member.baseOy;
  });
}

function formationWorldOffset(unit, member, anchor) {
  const ox = member.baseOx ?? member.ox ?? 0;
  const oy = member.baseOy ?? member.oy ?? 0;
  // Stable world-space offsets prevent the compact blob from rotating/spiraling.
  return { x: ox, y: oy };
}

function bridgeSegmentById(id) {
  return id ? state.structures.find((structure) => structure.id === id && structure.type === "bridgeSegment") : null;
}

function bridgeFormationWorldOffset(unit, member, bridge) {
  const count = unitCount(unit);
  const columns = Math.min(5, Math.ceil(count / 2));
  const rows = Math.ceil(count / columns);
  const index = member.slotIndex ?? unit.members.indexOf(member);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const along = (col - (columns - 1) / 2) * 1.15;
  const across = (row - (rows - 1) / 2) * 0.8;
  const dx = bridge.x2 - bridge.x1;
  const dy = bridge.y2 - bridge.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x: ux * along - uy * across,
    y: uy * along + ux * across
  };
}

function nearestBridgeLanePoint(point, tolerance = 12, bridgeId = null, halfWidth = 1.45) {
  let best = null;
  let bestD = Infinity;
  for (const bridge of state.structures.filter((s) => s.type === "bridgeSegment" && (!bridgeId || s.id === bridgeId))) {
    const projected = projectPointOnSegment(point, bridge);
    const dx = point.x - projected.x;
    const dy = point.y - projected.y;
    const d = Math.hypot(dx, dy);
    if (d > tolerance || d >= bestD) continue;
    const scale = d > halfWidth ? halfWidth / d : 1;
    bestD = d;
    best = { x: projected.x + dx * scale, y: projected.y + dy * scale, t: projected.t, bridge, d };
  }
  return best;
}

function shouldSnapToBridgeLane(point, lane) {
  if (!lane) return false;
  if (isInsideWater(point.x, point.y)) return true;
  return lane.t > 0.02 && lane.t < 0.98;
}

function updateUnitCenter(unit) {
  const count = unitCount(unit);
  if (!count) return;
  unit.x = unit.members.reduce((sum, m) => sum + m.x, 0) / count;
  unit.y = unit.members.reduce((sum, m) => sum + m.y, 0) / count;
}

function clearUnitPath(unit) {
  unit.pathTargetX = null;
  unit.pathTargetY = null;
  unit.pathMidX = null;
  unit.pathMidY = null;
  unit.pathExitX = null;
  unit.pathExitY = null;
  unit.pathBridgeId = null;
  unit.pathStage = null;
  unit.navFrame = -1;
}

function rememberUnitNavigation(unit, finalTarget, navTarget) {
  unit.navFrame = PERF.frameIndex;
  unit.navFinalX = finalTarget.x;
  unit.navFinalY = finalTarget.y;
  unit.navX = navTarget.x;
  unit.navY = navTarget.y;
  return navTarget;
}

function moveUnitTo(unit, x, y, attackTargetId = null) {
  const nextTargetX = clamp(x, 3, mapWidth() - 3);
  const nextTargetY = clamp(y, 3, mapHeight() - 3);
  const sameOrder = unit.attackTargetId === attackTargetId && Math.hypot((unit.targetX ?? nextTargetX) - nextTargetX, (unit.targetY ?? nextTargetY) - nextTargetY) < 0.8;
  unit.targetX = nextTargetX;
  unit.targetY = nextTargetY;
  unit.attackTargetId = attackTargetId;
  if (sameOrder) return;
  clearUnitPath(unit);
  const dx = unit.targetX - unit.x;
  const dy = unit.targetY - unit.y;
  const len = Math.hypot(dx, dy);
  if (len > 0.5) { unit.facingX = dx / len; unit.facingY = dy / len; }
}

function unitNavigationTarget(unit, finalTarget) {
  const direct = { x: finalTarget.x, y: finalTarget.y };
  if (unit.navFrame === PERF.frameIndex && Math.hypot((unit.navFinalX ?? Infinity) - direct.x, (unit.navFinalY ?? Infinity) - direct.y) < 0.5) {
    return { x: unit.navX, y: unit.navY };
  }
  if (unit.pathStage === "entry" && unit.pathTargetX !== null && unit.pathTargetY !== null) {
    const entry = { x: unit.pathTargetX, y: unit.pathTargetY };
    const distToEntry = Math.hypot(unit.x - entry.x, unit.y - entry.y);
    if (distToEntry > 6 && !isNearBridge(unit.x, unit.y, 5.5)) return rememberUnitNavigation(unit, direct, entry);
    unit.pathStage = unit.pathMidX !== null && unit.pathMidY !== null ? "mid" : "crossing";
  }
  if (unit.pathStage === "mid" && unit.pathMidX !== null && unit.pathMidY !== null) {
    const mid = { x: unit.pathMidX, y: unit.pathMidY };
    const distToMid = Math.hypot(unit.x - mid.x, unit.y - mid.y);
    if (distToMid > 4) return rememberUnitNavigation(unit, direct, mid);
    unit.pathStage = "crossing";
  }
  if (unit.pathStage === "crossing" && unit.pathExitX !== null && unit.pathExitY !== null) {
    const exit = { x: unit.pathExitX, y: unit.pathExitY };
    const distToExit = Math.hypot(unit.x - exit.x, unit.y - exit.y);
    // Keep heading to exit until we're close enough and out of water
    if (distToExit > 6 || (isInsideWater(unit.x, unit.y) && isNearBridge(unit.x, unit.y, 6))) return rememberUnitNavigation(unit, direct, exit);
    clearUnitPath(unit);
    return rememberUnitNavigation(unit, direct, direct);
  }
  if (unit.pathStage === "exit" && unit.pathExitX !== null && unit.pathExitY !== null) {
    const exit = { x: unit.pathExitX, y: unit.pathExitY };
    if (Math.hypot(unit.x - exit.x, unit.y - exit.y) > 6 || isInsideWater(unit.x, unit.y)) return rememberUnitNavigation(unit, direct, exit);
    clearUnitPath(unit);
    return rememberUnitNavigation(unit, direct, direct);
  }
  // Already on a bridge or past water - go direct
  if (unit.pathStage) {
    clearUnitPath(unit);
  }
  if (!lineCrossesWater({ x: unit.x, y: unit.y }, direct)) return rememberUnitNavigation(unit, direct, direct);
  const route = nearestUsableBridgePoint({ x: unit.x, y: unit.y }, direct, unit.owner);
  if (!route) return rememberUnitNavigation(unit, direct, direct);
  const bridgeDx = route.exit.x - route.entry.x;
  const bridgeDy = route.exit.y - route.entry.y;
  const bridgeLen = Math.hypot(bridgeDx, bridgeDy) || 1;
  const exitClearance = 9;
  const clearedExit = {
    x: clamp(route.exit.x + (bridgeDx / bridgeLen) * exitClearance, 3, mapWidth() - 3),
    y: clamp(route.exit.y + (bridgeDy / bridgeLen) * exitClearance, 3, mapHeight() - 3)
  };
  unit.pathTargetX = route.entry.x;
  unit.pathTargetY = route.entry.y;
  unit.pathMidX = route.mid?.x ?? null;
  unit.pathMidY = route.mid?.y ?? null;
  unit.pathExitX = route.mid ? route.exit.x : (canTraverse(clearedExit.x, clearedExit.y) ? clearedExit.x : route.exit.x);
  unit.pathExitY = route.mid ? route.exit.y : (canTraverse(clearedExit.x, clearedExit.y) ? clearedExit.y : route.exit.y);
  unit.pathBridgeId = route.bridgeId || null;
  unit.pathStage = "entry";
  return rememberUnitNavigation(unit, direct, route.entry);
}

function retargetMinerUnit(unit) {
  const rock = nearestRock(unit);
  if (rock) moveUnitTo(unit, rock.x, rock.y, null);
}

function spawnUnit(type, owner, x, y) {
  const spec = unitTypes[type];
  const slots = formationOffsets(10, type === "miner" ? "normal" : ownerFormation(owner));
  const members = slots.map((slot, i) => ({ id: `${state.nextUnitId}-${i}`, slotIndex: i, x: x + slot.x, y: y + slot.y, hp: spec.hp, maxHp: spec.hp, cooldown: Math.random() * 0.35, ox: slot.x, oy: slot.y, baseOx: slot.x, baseOy: slot.y, minePulse: Math.random() * 1.2 }));
  const unit = { id: `u${state.nextUnitId++}`, type, owner, members, x, y, targetX: x, targetY: y, attackTargetId: null, facingX: 1, facingY: 0, pathStage: null, pathTargetX: null, pathTargetY: null, pathExitX: null, pathExitY: null };
  updateUnitCenter(unit);
  state.units.push(unit);
  if (type === "miner") retargetMinerUnit(unit);
  return unit;
}

function selectedItem() { return state.units.find((u) => u.id === state.selectedId) || state.structures.find((s) => s.id === state.selectedId) || null; }
function findById(id) { return state.units.find((u) => u.id === id) || state.structures.find((s) => s.id === id) || null; }
function aliveHostiles(owner) { return [...state.units.filter((u) => u.owner !== owner), ...state.structures.filter((s) => s.owner !== owner && s.type !== "wall" && s.type !== "wallSegment" && s.type !== "bridgeSegment")]; }

function hoveredItem() {
  if (!state.lastPointerWorld) return null;
  const point = state.lastPointerWorld;
  let bestUnit = null;
  let bestUnitD = 7;
  for (const unit of state.units) {
    for (const member of unit.members) {
      const dx = member.x - point.x;
      const dy = member.y - point.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestUnitD) { bestUnitD = d; bestUnit = unit; }
    }
  }
  if (bestUnit) return bestUnit;
  let bestStructure = null;
  for (const structure of state.structures) {
    if (structure.type === "wallSegment") {
      if (structureBlocksPoint(structure, point, 1.2)) { if (!bestStructure || bestStructure.type !== "wallSegment") continue; bestStructure = structure; }
    } else if (point.x >= structure.x - 2 && point.x <= structure.x + structure.w + 2 && point.y >= structure.y - 2 && point.y <= structure.y + structure.h + 2) {
      bestStructure = structure;
    }
  }
  return bestStructure;
}

function itemCostText(item) {
  if (!item) return "";
  if (item.members) {
    const spec = unitTypes[item.type];
    const limit = item.type === "miner" ? ` - limite ${currentMinerPop(item.owner)}/${minerCap()}` : ` - pop ${unitCount(item)}`;
    return `Costo ${spec.cost} oro per 10${limit}`;
  }
  if (item.type === "wallSegment") return `Creato da colonne muro - HP ${Math.ceil(item.hp)}/${item.maxHp}`;
  if (item.type === "bridgeSegment") return `Campata ponte - HP ${Math.ceil(item.hp)}/${item.maxHp}`;
  const spec = structureTypes[item.type];
  if (!spec) return "";
  const limit = item.type === "mine" ? ` - limite ${currentMineCount(item.owner)}/${mineCap()}` : item.type === "barracks" ? ` - +${spec.pop} pop` : item.type === "wall" ? ` - ancora muro, senza HP (${wallConnectionCount(item)}/2 collegamenti)` : item.type === "bridge" ? ` - ancora ponte, senza HP (${bridgeConnectionCount(item)}/2 collegamenti)` : "";
  return `Costo ${spec.cost} oro${limit}`;
}

function cycleGameSpeed() {
  const index = GAME_SPEEDS.indexOf(state.gameSpeed);
  state.gameSpeed = GAME_SPEEDS[(index + 1) % GAME_SPEEDS.length];
  if (ui.speedButton) ui.speedButton.textContent = `Velocità ${String(state.gameSpeed).replace(".", ",")}x`;
}

function playerSpawnPoint(type) {
  const barracks = state.structures.filter((s) => s.owner === "player" && s.type === "barracks").sort((a, b) => b.x - a.x)[0];
  const castle = state.structures.find((s) => s.id === "castle-player");
  if (barracks && type !== "miner") return { x: barracks.x + barracks.w + 8, y: barracks.y + barracks.h / 2 };
  if (castle) return { x: castle.x + castle.w + 6, y: castle.y + castle.h / 2 };
  return { x: 20, y: mapHeight() / 2 };
}

function buyUnit(type) {
  const spec = unitTypes[type];
  if (state.money < spec.cost) return showToast("Oro insufficiente.");
  if (currentPop("player") + 10 > state.popCap) return showToast("Popolazione piena.");
  if (type === "miner" && currentMinerPop("player") + 10 > minerCap()) return showToast("Limite minatori raggiunto per il livello castello.");
  const point = playerSpawnPoint(type);
  state.money -= spec.cost;
  const unit = spawnUnit(type, "player", point.x, point.y);
  state.selectedId = unit.id;
  state.placement = null;
  state.selectedArtillery = null;
}

function setPlacement(type) {
  if (type === "mine" && currentMineCount("player") >= mineCap()) {
    showToast("Limite miniere raggiunto.");
    state.placement = null;
    return;
  }
  state.selectedArtillery = null;
  state.placement = state.placement === type ? null : type;
}

function selectArtillery(type) {
  state.placement = null;
  state.selectedArtillery = state.selectedArtillery === type ? null : type;
}

function isInsideWater(x, y) {
  for (const water of state.currentMap.waters) {
    const dx = water.x - x;
    const dy = water.y - y;
    if (dx * dx + dy * dy <= water.r * water.r) return true;
  }
  return false;
}

function isNearWater(x, y, margin = 14) {
  for (const water of state.currentMap.waters) {
    const dx = water.x - x;
    const dy = water.y - y;
    const limit = water.r + margin;
    if (dx * dx + dy * dy <= limit * limit) return true;
  }
  return false;
}

function structureCollision(type, x, y, owner) {
  const spec = structureTypes[type];
  return state.structures.find((s) => {
    if ((s.type === "wallSegment" || s.type === "bridgeSegment") && pointSegmentDistance({ x, y }, s) < Math.max(spec.w, spec.h) * 0.5 + 4) return true;
    if (s.w === undefined || s.h === undefined) return false;
    return Math.abs(rectCenter(s).x - x) < (s.w + spec.w) / 2 + 4 && Math.abs(rectCenter(s).y - y) < (s.h + spec.h) / 2 + 4 && (s.owner !== owner || s.type !== type);
  }) || null;
}

function overlappingOwnedStructure(type, x, y, owner = "player") {
  const spec = structureTypes[type];
  return state.structures.find((s) => s.owner === owner && s.type === type && s.w !== undefined && s.h !== undefined && Math.abs(rectCenter(s).x - x) < (s.w + spec.w) / 2 + 4 && Math.abs(rectCenter(s).y - y) < (s.h + spec.h) / 2 + 4) || null;
}

function sameSideLimit(owner, x, y) {
  if (owner === "player") return x < state.currentMap.width * 0.42;
  const spawn = state.currentMap.spawns.find((s) => s.owner === owner);
  return spawn ? Math.hypot(spawn.x - x, spawn.y - y) < Math.min(state.currentMap.width, state.currentMap.height) * 0.45 : false;
}

function ownedWallColumns(owner) {
  return state.structures.filter((s) => s.owner === owner && s.type === "wall");
}

function ownedBridgeColumns(owner) {
  return state.structures.filter((s) => s.owner === owner && s.type === "bridge");
}

function bridgeConnectionCount(column) {
  return Array.isArray(column?.bridgeSegmentIds) ? column.bridgeSegmentIds.filter((segmentId) => state.structures.some((s) => s.id === segmentId && s.type === "bridgeSegment")).length : 0;
}

function bridgeSegmentExists(aId, bId) {
  return state.structures.some((entry) => entry.type === "bridgeSegment" && entry.sourceIds?.includes(aId) && entry.sourceIds?.includes(bId));
}

function bridgeColumnsNear(x, y, owner = "player") {
  const joinRange = structureTypes.bridge.joinRange;
  return ownedBridgeColumns(owner)
    .map((structure) => ({ structure, d: Math.hypot(rectCenter(structure).x - x, rectCenter(structure).y - y) }))
    .filter((entry) => entry.d > 0.1 && entry.d <= joinRange)
    .sort((a, b) => a.d - b.d);
}

function bridgePathTouchesWater(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(2, Math.ceil(distance / 5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (isInsideWater(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return true;
  }
  return false;
}

function waterAtPoint(x, y, margin = 0) {
  return state.currentMap.waters.find((water) => {
    const dx = x - water.x;
    const dy = y - water.y;
    const limit = water.r + margin;
    return dx * dx + dy * dy <= limit * limit;
  }) || null;
}

function nearestWaterToSegment(from, to) {
  return state.currentMap.waters
    .map((water) => ({ water, d: pointSegmentDistance({ x: water.x, y: water.y }, { x1: from.x, y1: from.y, x2: to.x, y2: to.y }) }))
    .filter((entry) => entry.d <= entry.water.r + 12)
    .sort((a, b) => a.d - b.d)[0]?.water || null;
}

function bridgeAutoPlan(x, y, owner = "player") {
  const water = waterAtPoint(x, y, 18);
  if (!water) return null;
  const hoverDx = x - water.x;
  const hoverDy = y - water.y;
  const hoverLen = Math.hypot(hoverDx, hoverDy) || 1;
  const radial = { x: hoverDx / hoverLen, y: hoverDy / hoverLen };
  const preferredAxis = Math.abs(radial.x) >= Math.abs(radial.y) ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const axes = [preferredAxis, { x: radial.x, y: radial.y }, Math.abs(radial.x) >= Math.abs(radial.y) ? { x: 0, y: 1 } : { x: 1, y: 0 }];
  const shoreInset = 7;
  const shoreOutset = 9;
  const spec = structureTypes.bridge;
  for (const axis of axes) {
    const ux = axis.x;
    const uy = axis.y;
    const from = { x: Math.round(water.x - ux * (water.r + shoreOutset)), y: Math.round(water.y - uy * (water.r + shoreOutset)) };
    const to = { x: Math.round(water.x + ux * (water.r + shoreOutset)), y: Math.round(water.y + uy * (water.r + shoreOutset)) };
    const center = { x: Math.round((from.x + to.x) / 2), y: Math.round((from.y + to.y) / 2) };
    if (isInsideWater(from.x, from.y) || isInsideWater(to.x, to.y)) continue;
    if (state.structures.some((structure) => bridgeSegmentCoversWater(water, structure))) continue;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < 12 || distance > spec.maxSpan) continue;
    if (!bridgePathTouchesWater({ x: water.x - ux * (water.r - shoreInset), y: water.y - uy * (water.r - shoreInset) }, { x: water.x + ux * (water.r - shoreInset), y: water.y + uy * (water.r - shoreInset) })) continue;
    const left = Math.min(from.x, to.x, center.x) - spec.w / 2;
    const top = Math.min(from.y, to.y, center.y) - spec.h / 2;
    const right = Math.max(from.x, to.x, center.x) + spec.w / 2;
    const bottom = Math.max(from.y, to.y, center.y) + spec.h / 2;
    if (left < 2 || top < 2 || right > mapWidth() - 2 || bottom > mapHeight() - 2) continue;
    const endpointClear = [from, to].every((point) => !state.structures.some((structure) => {
      if (structure.type === "bridgeSegment") return pointSegmentDistance(point, structure) < 5;
      if (structure.type === "wallSegment") return pointSegmentDistance(point, structure) < 5;
      if (structure.type === "bridge" || structure.w === undefined || structure.h === undefined) return false;
      return point.x >= structure.x - 4 && point.x <= structure.x + structure.w + 4 && point.y >= structure.y - 4 && point.y <= structure.y + structure.h + 4;
    }));
    if (!endpointClear) continue;
    return { from, to, center, owner, water };
  }
  return null;
}

function bridgePlanForPath(from, to, owner = "player") {
  const water = nearestWaterToSegment(from, to);
  if (!water) return null;
  if (state.structures.some((structure) => bridgeSegmentCoversWater(water, structure))) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const hover = { x: water.x + (dx / len) * 6, y: water.y + (dy / len) * 6 };
  return bridgeAutoPlan(hover.x, hover.y, owner) || bridgeAutoPlan(water.x + water.r * 0.7, water.y, owner) || bridgeAutoPlan(water.x, water.y + water.r * 0.7, owner);
}

function wallConnectionCount(column) {
  return Array.isArray(column?.wallSegmentIds) ? column.wallSegmentIds.filter((segmentId) => state.structures.some((s) => s.id === segmentId && s.type === "wallSegment")).length : 0;
}

function wallSegmentExists(aId, bId) {
  return state.structures.some((entry) => entry.type === "wallSegment" && entry.sourceIds?.includes(aId) && entry.sourceIds?.includes(bId));
}

function wallSegmentWouldCrossExisting(from, to, fromId, toId) {
  const a1 = { x: from.x, y: from.y };
  const a2 = { x: to.x, y: to.y };
  return state.structures.some((segment) => {
    if (segment.type !== "wallSegment") return false;
    if (segment.sourceIds?.includes(fromId) || segment.sourceIds?.includes(toId)) return false;
    return segmentsIntersect(a1, a2, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
  });
}

function validWallLinkTargets(x, y, owner = "player", fromStructure = null) {
  const fromId = fromStructure?.id || null;
  const fromConnectionCount = fromStructure ? wallConnectionCount(fromStructure) : 0;
  const openSlots = Math.max(0, 2 - fromConnectionCount);
  if (!openSlots) return [];
  const isAiPerimeter = fromStructure && fromStructure.aiPerimeterIndex !== undefined && fromStructure.aiPerimeterTotal > 0;
  let candidates = wallColumnsNear("wall", x, y, owner)
    .filter(({ structure }) => structure.id !== fromId)
    .filter(({ structure }) => {
      if (!fromStructure || fromStructure.aiPerimeterIndex === undefined || structure.aiPerimeterIndex === undefined || fromStructure.aiPerimeterTotal !== structure.aiPerimeterTotal) return true;
      const total = fromStructure.aiPerimeterTotal || 0;
      const delta = Math.abs(fromStructure.aiPerimeterIndex - structure.aiPerimeterIndex);
      const wrappedDelta = Math.min(delta, total - delta);
      return total > 0 && wrappedDelta === 1;
    })
    .filter(({ structure }) => wallConnectionCount(structure) < 2)
    .filter(({ structure }) => !fromId || !wallSegmentExists(fromId, structure.id))
    .filter(({ structure }) => !wallSegmentWouldCrossExisting({ x, y }, rectCenter(structure), fromId, structure.id));
  // For AI perimeter walls, sort by perimeter adjacency (closest index first) instead of distance
  if (isAiPerimeter) {
    const total = fromStructure.aiPerimeterTotal;
    candidates = candidates
      .filter(({ structure }) => structure.aiPerimeterIndex !== undefined && structure.aiPerimeterTotal === total)
      .sort((a, b) => {
        const deltaA = Math.min(Math.abs(fromStructure.aiPerimeterIndex - a.structure.aiPerimeterIndex), total - Math.abs(fromStructure.aiPerimeterIndex - a.structure.aiPerimeterIndex));
        const deltaB = Math.min(Math.abs(fromStructure.aiPerimeterIndex - b.structure.aiPerimeterIndex), total - Math.abs(fromStructure.aiPerimeterIndex - b.structure.aiPerimeterIndex));
        return deltaA - deltaB;
      });
  }
  return candidates.slice(0, openSlots);
}

function wallColumnsNear(type, x, y, owner = "player") {
  if (type !== "wall") return [];
  const joinRange = structureTypes.wall.joinRange;
  return ownedWallColumns(owner)
    .map((structure) => ({ structure, d: Math.hypot(rectCenter(structure).x - x, rectCenter(structure).y - y) }))
    .filter((entry) => entry.d > 0.1 && entry.d <= joinRange)
    .sort((a, b) => a.d - b.d);
}

function wallPreviewSegments(x, y, owner = "player") {
  return validWallLinkTargets(x, y, owner)
    .map(({ structure }) => {
      const center = rectCenter(structure);
      return createWallSegmentData({ x, y }, center, owner, null, structure.id, true);
    })
    .filter(Boolean);
}

function validBridgeLinkTargets(x, y, owner = "player", fromStructure = null) {
  const fromId = fromStructure?.id || null;
  const fromConnectionCount = fromStructure ? bridgeConnectionCount(fromStructure) : 0;
  const openSlots = Math.max(0, 2 - fromConnectionCount);
  if (!openSlots) return [];
  return bridgeColumnsNear(x, y, owner)
    .filter(({ structure }) => structure.id !== fromId)
    .filter(({ structure }) => bridgeConnectionCount(structure) < 2)
    .filter(({ structure }) => !fromId || !bridgeSegmentExists(fromId, structure.id))
    .slice(0, openSlots);
}

function bridgePreviewSegments(x, y, owner = "player") {
  const autoPlan = bridgeAutoPlan(x, y, owner);
  if (autoPlan) return [createBridgeSegmentData(autoPlan.from, autoPlan.to, owner, null, null, true)].filter(Boolean);
  return validBridgeLinkTargets(x, y, owner)
    .map(({ structure }) => {
      const center = rectCenter(structure);
      return createBridgeSegmentData({ x, y }, center, owner, null, structure.id, true);
    })
    .filter(Boolean);
}

function createBridgeSegmentData(from, to, owner, fromId, toId, preview = false) {
  const spec = structureTypes.bridge;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 8 || distance > spec.maxSpan) return null;
  if (!bridgePathTouchesWater(from, to)) return null;
  const endpointBudget = spec.segmentHp / 2;
  return { id: preview ? `preview-bridge-${fromId || "new"}-${toId || "target"}` : `bs${state.nextStructureId++}`, type: "bridgeSegment", owner, x1: from.x, y1: from.y, x2: to.x, y2: to.y, hp: endpointBudget * [fromId, toId].filter(Boolean).length, maxHp: endpointBudget * [fromId, toId].filter(Boolean).length, endpointBudget, sourceIds: [fromId, toId].filter(Boolean), preview };
}

function createWallSegmentData(from, to, owner, fromId, toId, preview = false) {
  const spec = structureTypes.wall;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 8 || distance > spec.maxSpan) return null;
  const endpointBudget = spec.segmentHp / 2;
  return {
    id: preview ? `preview-${fromId || "new"}-${toId || "target"}` : `ws${state.nextStructureId++}`,
    type: "wallSegment",
    owner,
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    hp: endpointBudget * [fromId, toId].filter(Boolean).length,
    maxHp: endpointBudget * [fromId, toId].filter(Boolean).length,
    endpointBudget,
    sourceIds: [fromId, toId].filter(Boolean),
    preview
  };
}

function pointSegmentDistance(point, segment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lenSq, 0, 1);
  const px = segment.x1 + dx * t;
  const py = segment.y1 + dy * t;
  return Math.hypot(point.x - px, point.y - py);
}

function ccw(a, b, c) {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a1, a2, b1, b2) {
  return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2);
}

function projectileWallHit(projectile) {
  const start = { x: projectile.x, y: projectile.y };
  const end = { x: projectile.tx, y: projectile.ty };
  let best = null;
  let bestD = Infinity;
  for (const segment of state.structures) {
    if (segment.type !== "wallSegment" || segment.owner === projectile.owner) continue;
    if (!segmentsIntersect(start, end, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 })) continue;
    const d = pointSegmentDistance(start, segment);
    if (d < bestD) { bestD = d; best = segment; }
  }
  return best;
}

function attackBlockingWall(owner, from, to) {
  let best = null;
  let bestD = Infinity;
  for (const structure of PERF.blockingSegments) {
    if (structure.type !== "wallSegment" || structure.owner === owner) continue;
    if (!segmentsIntersect(from, to, { x: structure.x1, y: structure.y1 }, { x: structure.x2, y: structure.y2 })) continue;
    const d = pointSegmentDistance(from, structure);
    if (d < bestD) { bestD = d; best = structure; }
  }
  return best;
}

function attackBlockedByWall(owner, from, to) {
  for (const structure of PERF.blockingSegments) {
    if (structure.type !== "wallSegment" || structure.owner === owner) continue;
    if (segmentsIntersect(from, to, { x: structure.x1, y: structure.y1 }, { x: structure.x2, y: structure.y2 })) return true;
  }
  return false;
}

function structureBlocksPoint(structure, point, padding = 0) {
  if (structure.type === "wallSegment" || structure.type === "bridgeSegment") return pointSegmentDistance(point, structure) <= 2.8 + padding;
  return point.x >= structure.x - padding && point.x <= structure.x + structure.w + padding && point.y >= structure.y - padding && point.y <= structure.y + structure.h + padding;
}

function movementBlockedByWalls(unit, nextPoint) {
  for (const structure of PERF.wallSegments) {
    if (structure.type !== "wallSegment" || structure.owner === unit.owner) continue;
    if (pointSegmentDistance(nextPoint, structure) <= 3.3) return true;
  }
  return false;
}

function linkWallSegmentToColumns(segment) {
  for (const sourceId of segment.sourceIds) {
    const column = state.structures.find((structure) => structure.id === sourceId);
    if (!column) continue;
    column.wallSegmentIds = Array.isArray(column.wallSegmentIds) ? column.wallSegmentIds : [];
    column.wallLinks = Array.isArray(column.wallLinks) ? column.wallLinks : [];
    if (!column.wallSegmentIds.includes(segment.id)) column.wallSegmentIds.push(segment.id);
    for (const otherId of segment.sourceIds) {
      if (otherId && otherId !== sourceId && !column.wallLinks.includes(otherId)) column.wallLinks.push(otherId);
    }
  }
}

function spawnWallSegment(fromStructure, toStructure) {
  const segment = createWallSegmentData(rectCenter(fromStructure), rectCenter(toStructure), fromStructure.owner, fromStructure.id, toStructure.id, false);
  if (!segment) return null;
  state.structures.push(segment);
  linkWallSegmentToColumns(segment);
  return segment;
}

function recalculateWallSegmentsForColumn(column) {
  if (!column || column.type !== "wall") return;
  const segments = state.structures.filter((structure) => structure.type === "wallSegment" && structure.sourceIds?.includes(column.id));
  if (!segments.length) return;
  const budget = (structureTypes.wall.segmentHp * (column.level || 1)) / segments.length;
  for (const segment of segments) {
    const otherBudget = segment.sourceIds
      .filter((id) => id !== column.id)
      .map((id) => {
        const otherColumn = state.structures.find((structure) => structure.id === id && structure.type === "wall");
        const otherSegments = state.structures.filter((structure) => structure.type === "wallSegment" && structure.sourceIds?.includes(id));
        return otherColumn && otherSegments.length ? (structureTypes.wall.segmentHp * (otherColumn.level || 1)) / otherSegments.length : 0;
      })
      .reduce((sum, value) => sum + value, 0);
    const percent = segmentHpPercent(segment);
    segment.maxHp = budget + otherBudget;
    segment.hp = Math.max(1, segment.maxHp * percent);
  }
}

function recalculateWallNetworkHpFor(segment) {
  for (const sourceId of segment.sourceIds || []) {
    const column = state.structures.find((structure) => structure.id === sourceId && structure.type === "wall");
    recalculateWallSegmentsForColumn(column);
  }
}

function rebuildWallNetworkFor(structure) {
  if (!structure || structure.type !== "wall") return;
  const center = rectCenter(structure);
  const nearby = validWallLinkTargets(center.x, center.y, structure.owner, structure).map((entry) => entry.structure);
  for (const other of nearby) {
    if (wallConnectionCount(structure) >= 2 || wallConnectionCount(other) >= 2) continue;
    if (!wallSegmentExists(structure.id, other.id)) {
      const segment = spawnWallSegment(structure, other);
      if (segment) recalculateWallNetworkHpFor(segment);
    }
  }
}

function linkBridgeSegmentToColumns(segment) {
  for (const sourceId of segment.sourceIds) {
    const column = state.structures.find((structure) => structure.id === sourceId);
    if (!column) continue;
    column.bridgeSegmentIds = Array.isArray(column.bridgeSegmentIds) ? column.bridgeSegmentIds : [];
    column.bridgeLinks = Array.isArray(column.bridgeLinks) ? column.bridgeLinks : [];
    if (!column.bridgeSegmentIds.includes(segment.id)) column.bridgeSegmentIds.push(segment.id);
    for (const otherId of segment.sourceIds) {
      if (otherId && otherId !== sourceId && !column.bridgeLinks.includes(otherId)) column.bridgeLinks.push(otherId);
    }
  }
}

function spawnBridgeSegment(fromStructure, toStructure) {
  const segment = createBridgeSegmentData(rectCenter(fromStructure), rectCenter(toStructure), fromStructure.owner, fromStructure.id, toStructure.id, false);
  if (!segment) return null;
  state.structures.push(segment);
  linkBridgeSegmentToColumns(segment);
  return segment;
}

function rebuildBridgeNetworkFor(structure) {
  if (!structure || structure.type !== "bridge") return;
  const center = rectCenter(structure);
  const nearby = validBridgeLinkTargets(center.x, center.y, structure.owner, structure).map((entry) => entry.structure);
  for (const other of nearby) {
    if (bridgeConnectionCount(structure) >= 2 || bridgeConnectionCount(other) >= 2) continue;
    if (!bridgeSegmentExists(structure.id, other.id)) spawnBridgeSegment(structure, other);
  }
}

function removeWallSegment(segmentId) {
  const segment = state.structures.find((structure) => structure.id === segmentId && structure.type === "wallSegment");
  if (!segment) return;
  const sourceIds = [...(segment.sourceIds || [])];
  state.structures = state.structures.filter((structure) => structure.id !== segmentId);
  for (const column of state.structures.filter((structure) => structure.type === "wall")) {
    column.wallSegmentIds = (column.wallSegmentIds || []).filter((id) => id !== segmentId);
    if (segment.sourceIds?.includes(column.id)) {
      column.wallLinks = (column.wallLinks || []).filter((id) => !segment.sourceIds.includes(id));
    }
  }
  for (const sourceId of sourceIds) recalculateWallSegmentsForColumn(state.structures.find((structure) => structure.id === sourceId && structure.type === "wall"));
}

function destroyWallColumn(column) {
  if (!column || column.type !== "wall") return;
  for (const segmentId of [...(column.wallSegmentIds || [])]) removeWallSegment(segmentId);
  state.structures = state.structures.filter((structure) => structure.id !== column.id);
  if (state.selectedId === column.id) state.selectedId = null;
}

function removeBridgeSegment(segmentId) {
  const segment = state.structures.find((structure) => structure.id === segmentId && structure.type === "bridgeSegment");
  if (!segment) return;
  state.structures = state.structures.filter((structure) => structure.id !== segmentId);
  for (const column of state.structures.filter((structure) => structure.type === "bridge")) {
    column.bridgeSegmentIds = (column.bridgeSegmentIds || []).filter((id) => id !== segmentId);
    if (segment.sourceIds?.includes(column.id)) column.bridgeLinks = (column.bridgeLinks || []).filter((id) => !segment.sourceIds.includes(id));
  }
}

function destroyBridgeColumn(column) {
  if (!column || column.type !== "bridge") return;
  for (const segmentId of [...(column.bridgeSegmentIds || [])]) removeBridgeSegment(segmentId);
  state.structures = state.structures.filter((structure) => structure.id !== column.id);
  if (state.selectedId === column.id) state.selectedId = null;
}

function canPlace(type, x, y, owner = "player") {
  const spec = structureTypes[type];
  const left = x - spec.w / 2;
  const top = y - spec.h / 2;
  if (left < 2 || top < 2 || left + spec.w > mapWidth() - 2 || top + spec.h > mapHeight() - 2) return false;
  if (type !== "bridge" && !sameSideLimit(owner, x, y)) return false;
  // Bridges can be anchored on water banks or shallow water; other structures cannot be on water.
  if (type === "bridge") {
    return !!bridgeAutoPlan(x, y, owner);
  } else {
    if (isInsideWater(x, y)) return false;
  }
  if (type === "mine" && nearestRockDistance(x, y) > 20) return false;
  if (type === "mine" && owner === "player" && currentMineCount(owner) >= mineCap() && !overlappingOwnedStructure(type, x, y, owner)) return false;
  return !structureCollision(type, x, y, owner);
}

function upgradeStructure(structure) {
  const before = structureStats(structure);
  structure.level += 1;
  const after = structureStats(structure);
  structure.maxHp = after.hpMax;
  structure.hp = after.hpMax;
  if (structure.owner === "player" && structure.type === "barracks") state.popCap += after.pop - before.pop;
  if (structure.type === "wall") recalculateWallSegmentsForColumn(structure);
}

function placeStructure(type, x, y, owner = "player", options = {}) {
  x = snapToGrid(x);
  y = snapToGrid(y);
  const spec = structureTypes[type];
  const bank = owner === "player" ? state : state.aiPlayers.find((entry) => entry.owner === owner);
  if (!bank || bank.money < spec.cost) return false;
  const bridgePlan = type === "bridge" ? (options.bridgePlan || bridgeAutoPlan(x, y, owner)) : null;
  if (spec.costWood && (bank.wood || 0) < spec.costWood) { if (owner === "player") showToast("Legno insufficiente."); return false; }
  if (spec.costStone && (bank.stone || 0) < spec.costStone) { if (owner === "player") showToast("Pietra insufficiente."); return false; }
  if (type === "bridge") {
    if (!bridgePlan) return false;
    bank.money -= spec.cost;
    if (spec.costWood) bank.wood -= spec.costWood;
    if (spec.costStone) bank.stone -= spec.costStone;
    const segment = createBridgeSegmentData(bridgePlan.from, bridgePlan.to, owner, null, null, false);
    if (!segment) return false;
    segment.hp = spec.segmentHp;
    segment.maxHp = spec.segmentHp;
    segment.x = bridgePlan.center.x - spec.w / 2;
    segment.y = bridgePlan.center.y - spec.h / 2;
    segment.w = spec.w;
    segment.h = spec.h;
    state.structures.push(segment);
    if (owner === "player") state.selectedId = segment.id;
    state.placement = null;
    return true;
  }
  const existing = overlappingOwnedStructure(type, x, y, owner);
  if (existing) {
    bank.money -= spec.cost;
    if (spec.costWood) bank.wood -= spec.costWood;
    if (spec.costStone) bank.stone -= spec.costStone;
    upgradeStructure(existing);
    if (owner === "player") state.selectedId = existing.id;
    state.placement = null;
    return true;
  }
  if (!canPlace(type, x, y, owner)) {
    if (owner === "player" && type === "mine" && currentMineCount(owner) >= mineCap()) showToast("Limite miniere raggiunto.");
    return false;
  }
  bank.money -= spec.cost;
  if (spec.costWood) bank.wood -= spec.costWood;
  if (spec.costStone) bank.stone -= spec.costStone;
  const structure = spawnStructure(type, owner, x, y);
  if (options.aiPerimeterIndex !== undefined) structure.aiPerimeterIndex = options.aiPerimeterIndex;
  if (options.aiPerimeterTotal !== undefined) structure.aiPerimeterTotal = options.aiPerimeterTotal;
  if (type === "wall") rebuildWallNetworkFor(structure);
  if (type === "bridge") rebuildBridgeNetworkFor(structure);
  if (owner === "player") state.selectedId = structure.id;
  state.placement = null;
  return true;
}

function upgradeCastle() {
  const cost = castleUpgradeCost();
  if (state.money < cost) return showToast("Oro insufficiente per potenziare il castello.");
  state.money -= cost;
  state.castleLevel += 1;
  state.popCap += 80;
  const castle = state.structures.find((s) => s.id === "castle-player");
  if (castle) {
    castle.level += 1;
    const stats = structureStats(castle);
    castle.maxHp = stats.hpMax;
    castle.hp = stats.hpMax;
  }
}

function fireArtillery(type, targetPoint) {
  const ammo = artilleryTypes[type];
  if (!ammo) return;
  const cannons = playerCannons();
  if (!cannons.length) return showToast("Serve almeno un cannone.");
  if (state.money < ammo.cost) return showToast("Oro insufficiente per l'artiglieria.");
  const cannon = bestReadyArtilleryCannon("player", targetPoint);
  if (!cannon) {
    const nextReadyIn = shortestArtilleryCooldown("player");
    return showToast(Number.isFinite(nextReadyIn) ? `Cannoni in ricarica: pronti tra ${nextReadyIn.toFixed(1)}s.` : "Cannoni in ricarica.");
  }
  state.money -= ammo.cost;
  const origin = rectCenter(cannon);
  const projectile = { x: origin.x, y: origin.y, tx: targetPoint.x, ty: targetPoint.y, age: 0, artillery: true, artilleryType: type, radius: ammo.radius, damage: ammo.damage, owner: cannon.owner, flightTime: ARTILLERY_PROJECTILE_SPEED };
  const wallHit = projectileWallHit(projectile);
  if (wallHit) {
    const hitX = (wallHit.x1 + wallHit.x2) / 2;
    const hitY = (wallHit.y1 + wallHit.y2) / 2;
    projectile.tx = hitX;
    projectile.ty = hitY;
    projectile.blockedByWallId = wallHit.id;
  }
  state.projectiles.push(projectile);
  cannon.cooldown = cannonArtilleryCooldown(cannon);
  state.selectedArtillery = null;
}

function createArtilleryProjectile(cannon, type, targetPoint) {
  const ammo = artilleryTypes[type];
  const origin = rectCenter(cannon);
  const projectile = { x: origin.x, y: origin.y, tx: targetPoint.x, ty: targetPoint.y, age: 0, artillery: true, artilleryType: type, radius: ammo.radius, damage: ammo.damage, owner: cannon.owner, flightTime: ARTILLERY_PROJECTILE_SPEED };
  const wallHit = projectileWallHit(projectile);
  if (wallHit) {
    projectile.tx = (wallHit.x1 + wallHit.x2) / 2;
    projectile.ty = (wallHit.y1 + wallHit.y2) / 2;
    projectile.blockedByWallId = wallHit.id;
  }
  return projectile;
}

function applyExplosion(projectile) {
  const center = { x: projectile.tx, y: projectile.ty };
  state.explosions.push({ x: center.x, y: center.y, r: projectile.radius, age: 0 });
  const falloffRadius = Math.max(1, projectile.radius);
  const structureDamageMultiplier = projectile.artilleryType === "heavyShell" ? 4.4 : 2;
  const blockedWallDamageMultiplier = projectile.artilleryType === "heavyShell" ? 3.1 : 1.3;
  const damageAtDistance = (distance) => {
    if (distance > falloffRadius) return 0;
    const t = distance / falloffRadius;
    return projectile.damage * (1 - 0.75 * t);
  };
  if (projectile.blockedByWallId) {
    const blockedWall = state.structures.find((structure) => structure.id === projectile.blockedByWallId);
    if (blockedWall) damageItem(blockedWall, damageAtDistance(0) * blockedWallDamageMultiplier, center);
  }
  for (const unit of [...state.units]) {
    for (const member of [...unit.members]) {
      if (projectile.blockedByWallId && attackBlockedByWall(projectile.owner || null, center, { x: member.x, y: member.y })) continue;
      const distance = Math.hypot(member.x - center.x, member.y - center.y);
      const damage = damageAtDistance(distance);
      if (damage > 0) member.hp -= damage;
    }
    unit.members = unit.members.filter((member) => member.hp > 0);
    if (!unitCount(unit)) state.units = state.units.filter((u) => u.id !== unit.id);
    else updateUnitCenter(unit);
  }
  for (const structure of [...state.structures]) {
    if (structure.type === "castle") continue;
    if (projectile.blockedByWallId && structure.id !== projectile.blockedByWallId && structure.type !== "wallSegment" && Math.hypot(rectCenter(structure).x - center.x, rectCenter(structure).y - center.y) > projectile.radius * 0.65) continue;
    if (projectile.blockedByWallId && structure.id !== projectile.blockedByWallId && attackBlockedByWall(projectile.owner || null, center, rectCenter(structure))) continue;
    const distance = Math.hypot(rectCenter(structure).x - center.x, rectCenter(structure).y - center.y);
    const structureDamage = damageAtDistance(distance);
    if (structureDamage > 0) damageItem(structure, structureDamage * structureDamageMultiplier, center);
  }
}

function mergeUnits(primary, secondary) {
  if (!primary?.members || !secondary?.members) return false;
  if (primary.owner !== secondary.owner || primary.type !== secondary.type || primary.id === secondary.id) return false;
  primary.members.push(...secondary.members);
  assignFormation(primary);
  updateUnitCenter(primary);
  if (primary.type === "miner") retargetMinerUnit(primary);
  state.units = state.units.filter((unit) => unit.id !== secondary.id);
  if (primary.owner === "player") state.selectedId = primary.id;
  return true;
}

let _mergeCounter = 0;
function mergeNearbyUnits() {
  _mergeCounter++;
  if (_mergeCounter % 15 !== 0) return; // Only check every 15 frames
  for (let i = 0; i < state.units.length; i++) {
    const primary = state.units[i];
    if (!primary) continue;
    for (let j = i + 1; j < state.units.length; j++) {
      const secondary = state.units[j];
      if (!secondary) continue;
      if (primary.owner !== secondary.owner || primary.type !== secondary.type) continue;
      // Quick center distance check before expensive member iteration
      const cdx = primary.x - secondary.x;
      const cdy = primary.y - secondary.y;
      if (cdx > 14 || cdx < -14 || cdy > 14 || cdy < -14) continue;
      let touching = false;
      for (const member of primary.members) {
        for (const otherMember of secondary.members) {
          const dx = member.x - otherMember.x;
          const dy = member.y - otherMember.y;
          if (dx * dx + dy * dy <= 1.1025) { touching = true; break; }
        }
        if (touching) break;
      }
      if (touching) {
        mergeUnits(primary, secondary);
        j--; // secondary was removed, recheck this index
      }
    }
  }
}

function screenToWorld(screenX, screenY) { return { x: clamp(screenX / state.camera.zoom + state.camera.x, 0, mapWidth()), y: clamp(screenY / state.camera.zoom + state.camera.y, 0, mapHeight()) }; }

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const screenY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return screenToWorld(screenX, screenY);
}

function selectableAt(x, y) {
  const ownUnits = state.units.filter((u) => u.owner === "player").map((u) => ({ item: u, d: Math.min(...u.members.map((m) => Math.hypot(m.x - x, m.y - y))) })).filter((hit) => hit.d < 8).sort((a, b) => a.d - b.d);
  if (ownUnits[0]) return ownUnits[0].item;
  return state.structures.find((s) => s.owner === "player" && x >= s.x - 2 && x <= s.x + s.w + 2 && y >= s.y - 2 && y <= s.y + s.h + 2) || null;
}

function hostileAt(x, y) {
  const enemyUnit = state.units.filter((u) => u.owner !== "player").map((u) => ({ item: u, d: Math.min(...u.members.map((m) => Math.hypot(m.x - x, m.y - y))) })).filter((hit) => hit.d < 9).sort((a, b) => a.d - b.d)[0];
  if (enemyUnit) return enemyUnit.item;
  return state.structures.find((s) => s.owner !== "player" && x >= s.x - 2 && x <= s.x + s.w + 2 && y >= s.y - 2 && y <= s.y + s.h + 2) || null;
}

function closestMember(unit, point) {
  let best = null;
  let bestD = Infinity;
  for (const member of unit.members) {
    const dx = member.x - point.x;
    const dy = member.y - point.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = member; }
  }
  return best;
}
function distanceToItemFromPoint(item, point) {
  if (item.members) {
    let bestDSq = Infinity;
    for (const member of item.members) {
      const dx = member.x - point.x;
      const dy = member.y - point.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDSq) bestDSq = dSq;
    }
    return Math.sqrt(bestDSq);
  }
  if (item.type === "wallSegment" || item.type === "bridgeSegment") return pointSegmentDistance(point, item);
  const c = rectCenter(item);
  return Math.hypot(c.x - point.x, c.y - point.y);
}
function nearestHostile(owner, point, maxRange) {
  let best = null;
  let bestDSq = (maxRange + 1) * (maxRange + 1);
  for (const entry of nearbyUnitMembers(point.x, point.y, maxRange + 2)) {
    const u = entry.unit;
    if (u.owner === owner) continue;
    const dx = entry.member.x - point.x;
    const dy = entry.member.y - point.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDSq) { bestDSq = dSq; best = u; }
  }
  for (const s of state.structures) {
    if (s.owner === owner || s.type === "wall" || s.type === "wallSegment" || s.type === "bridgeSegment") continue;
    const c = rectCenter(s);
    const dSq = distSq(c, point);
    if (dSq < bestDSq) { bestDSq = dSq; best = s; }
  }
  return best;
}
function closestHostileUnit(owner, point, maxRange) {
  let best = null;
  let bestDSq = (maxRange + 1) * (maxRange + 1);
  for (const entry of nearbyUnitMembers(point.x, point.y, maxRange + 2)) {
    const u = entry.unit;
    if (u.owner === owner) continue;
    const dx = entry.member.x - point.x;
    const dy = entry.member.y - point.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDSq) { bestDSq = dSq; best = u; }
  }
  return best;
}

function damageItem(item, amount, hitPoint = null) {
  if (!item) return;
  if (item.members) {
    const point = hitPoint || itemPoint(item);
    const member = closestMember(item, point);
    if (!member) return;
    member.hp -= amount;
    if (member.hp <= 0) {
      item.members = item.members.filter((m) => m !== member);
      assignFormation(item);
      updateUnitCenter(item);
    }
    if (!unitCount(item)) {
      state.units = state.units.filter((u) => u.id !== item.id);
      if (state.selectedId === item.id) state.selectedId = null;
    }
    return;
  }
  item.hp -= amount;
  if (item.hp <= 0) {
    if (item.type === "wallSegment" || item.type === "bridgeSegment") {
      const sourceId = item.sourceIds?.length ? item.sourceIds[Math.floor(Math.random() * item.sourceIds.length)] : null;
      if (item.type === "wallSegment") {
        removeWallSegment(item.id);
        if (sourceId) destroyWallColumn(state.structures.find((structure) => structure.id === sourceId && structure.type === "wall"));
      } else {
        removeBridgeSegment(item.id);
        if (sourceId) destroyBridgeColumn(state.structures.find((structure) => structure.id === sourceId && structure.type === "bridge"));
      }
      return;
    }
    if (item.type === "wall" || item.type === "bridge") {
      return;
    }
    state.structures = state.structures.filter((s) => s.id !== item.id);
    if (state.selectedId === item.id) state.selectedId = null;
    if (item.owner === "player" && item.type === "barracks") state.popCap = Math.max(200, state.popCap - structureStats(item).pop);
  }
}

function sameUnitSeparation(unit, member) {
  let sx = 0;
  let sy = 0;
  for (const otherMember of unit.members) {
    if (otherMember === member) continue;
    const dx = member.x - otherMember.x;
    const dy = member.y - otherMember.y;
    const dSq = dx * dx + dy * dy;
    if (dSq <= 0.0004 || dSq >= 1.0201) continue; // avoid random direction jitter on overlapping pixels, then 1.01^2
    const d = Math.sqrt(dSq) || 0.001;
    const push = (1.01 - d) / 1.01;
    sx += (dx / d) * push * 0.85;
    sy += (dy / d) * push * 0.85;
  }
  return { x: sx, y: sy };
}

function separationVector(unit, member) {
  let sx = 0;
  let sy = 0;
  for (const entry of nearbyUnitMembers(member.x, member.y, 12)) {
    const other = entry.unit;
    if (other === unit) continue;
    const minGap = other.owner === unit.owner ? 1.45 : 1.15;
    const otherMember = entry.member;
    const dx = member.x - otherMember.x;
    const dy = member.y - otherMember.y;
    const dSq = dx * dx + dy * dy;
    if (dSq <= 0.0004 || dSq >= minGap * minGap) continue;
    const d = Math.sqrt(dSq) || 0.001;
    const push = (minGap - d) / minGap;
    sx += (dx / d) * push;
    sy += (dy / d) * push;
  }
  return { x: sx, y: sy };
}

function updateMiner(unit, member, dt) {
  const rockDistance = nearestRockDistance(member.x, member.y);
  if (rockDistance > 18) return;
  const gain = 1.8 * dt;
  if (unit.owner === "player") state.money += gain;
  else {
    const ai = state.aiPlayers.find((entry) => entry.owner === unit.owner);
    if (ai) ai.money += gain;
  }
  member.minePulse -= dt;
  if (member.minePulse <= 0) {
    state.floaters.push({ x: member.x, y: member.y - 4, text: "+", age: 0 });
    member.minePulse = 0.75 + Math.random() * 0.35;
  }
}

function updateUnits(dt) {
  const graceActive = state.gameTime < 20;
  for (const unit of [...state.units]) {
    const spec = unitTypes[unit.type];
    if (unit.type === "miner" && !unit.attackTargetId) retargetMinerUnit(unit);
    const modifiers = ownerModifiers(unit.owner);
    for (const member of [...unit.members]) {
      let target = unit.attackTargetId ? findById(unit.attackTargetId) : null;
      const blockingEnemy = closestHostileUnit(unit.owner, member, unit.type === "archer" ? spec.range : 9);
      if (blockingEnemy) target = blockingEnemy;
      if (!target || target.owner === unit.owner) target = nearestHostile(unit.owner, member, unit.type === "miner" ? 6 : spec.range + 5);
      if (unit.type === "miner") {
        const rock = nearestRock(member);
        if (rock && (!target || distanceToItemFromPoint(target, member) > Math.hypot(member.x - rock.x, member.y - rock.y))) {
          target = null;
          moveUnitTo(unit, rock.x, rock.y, null);
        }
      }
      const attackRange = spec.range + (target?.members ? 1 : 3);
      let targetDistance = target ? distanceToItemFromPoint(target, member) : Infinity;
      const targetPoint = target ? (target.members ? itemPoint(target) : rectCenter(target)) : null;
      const blockingWall = targetPoint ? attackBlockingWall(unit.owner, { x: member.x, y: member.y }, targetPoint) : null;
      if (blockingWall && distanceToItemFromPoint(blockingWall, member) <= attackRange + 2) {
        target = blockingWall;
        targetDistance = distanceToItemFromPoint(target, member);
      }
      const effectiveTargetPoint = target ? (target.members ? itemPoint(target) : rectCenter(target)) : null;
      const hasWallLineBlock = effectiveTargetPoint ? attackBlockedByWall(unit.owner, { x: member.x, y: member.y }, effectiveTargetPoint) && target?.type !== "wallSegment" : false;
      if (target && spec.damage > 0 && targetDistance <= attackRange && !hasWallLineBlock) {
        member.cooldown -= dt;
        if (member.cooldown <= 0) {
          damageItem(target, spec.damage * modifiers.fabbro.damage * modifiers.formation.damage, { x: member.x, y: member.y });
          member.cooldown = unit.type === "archer" ? 0.72 : 0.45;
          if (unit.type === "archer") {
            const projectile = { x: member.x, y: member.y, tx: effectiveTargetPoint.x, ty: effectiveTargetPoint.y, age: 0, owner: unit.owner, directHitId: target.id };
            const wallHit = projectileWallHit(projectile);
            if (wallHit) {
              projectile.tx = (wallHit.x1 + wallHit.x2) / 2;
              projectile.ty = (wallHit.y1 + wallHit.y2) / 2;
              projectile.blockedByWallId = wallHit.id;
            }
            state.projectiles.push(projectile);
          }
        }
      } else {
        const finalAnchor = target ? itemPoint(target) : { x: unit.targetX, y: unit.targetY };
        const navAnchor = unitNavigationTarget(unit, finalAnchor);
        const anchorDx = navAnchor.x - unit.x;
        const anchorDy = navAnchor.y - unit.y;
        const anchorDist = Math.hypot(anchorDx, anchorDy);
        if (anchorDist > 0.4) { unit.facingX = anchorDx / anchorDist; unit.facingY = anchorDy / anchorDist; }
        const bridgeMove = unit.pathStage === "entry" || unit.pathStage === "mid" || unit.pathStage === "crossing";
        const bridgeFormation = bridgeMove && unit.pathStage !== "entry";
        const bridgeSegment = bridgeFormation ? bridgeSegmentById(unit.pathBridgeId) : null;
        const offset = bridgeSegment ? bridgeFormationWorldOffset(unit, member, bridgeSegment) : formationWorldOffset(unit, member, navAnchor);
        const unitAtAnchor = Math.hypot(unit.x - navAnchor.x, unit.y - navAnchor.y) <= 0.7;
        const idleAtTarget = !target && !unit.pathStage && unitAtAnchor;
        const desiredAnchor = idleAtTarget ? { x: unit.targetX, y: unit.targetY } : navAnchor;
        let desired = { x: clamp(desiredAnchor.x + offset.x, 3, mapWidth() - 3), y: clamp(desiredAnchor.y + offset.y, 3, mapHeight() - 3) };
        if (bridgeSegment) {
          const bridgeLane = nearestBridgeLanePoint(desired, 18, unit.pathBridgeId);
          if (shouldSnapToBridgeLane(desired, bridgeLane)) desired = { x: bridgeLane.x, y: bridgeLane.y };
        }
        const dx = desired.x - member.x;
        const dy = desired.y - member.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.12) {
          const moving = !idleAtTarget;
          const localSep = moving && distance > 0.35 ? sameUnitSeparation(unit, member) : { x: 0, y: 0 };
          const sep = moving && distance > 0.35 ? separationVector(unit, member) : { x: 0, y: 0 };
          const vx = dx * (moving ? 1.55 : 0.82) + sep.x * 0.18 + localSep.x * 0.22;
          const vy = dy * (moving ? 1.55 : 0.82) + sep.y * 0.18 + localSep.y * 0.22;
          const vd = Math.hypot(vx, vy) || 1;
          const blockedByEnemy = blockingEnemy && distanceToItemFromPoint(blockingEnemy, member) < 4.5;
          const rescueFromWater = isInsideWater(member.x, member.y) && isNearBridge(member.x, member.y, 4.8);
          const terrain = terrainSpeed(member.x, member.y) || ((bridgeMove || rescueFromWater) && isNearBridge(member.x, member.y, 4.2) ? 0.75 : 0);
          const speed = spec.speed * modifiers.formation.speed * terrain * dt * (blockedByEnemy ? 0.42 : 1) * (moving ? 1 : 0.55);
          const nextPoint = { x: clamp(member.x + (vx / vd) * Math.min(speed, distance), 3, mapWidth() - 3), y: clamp(member.y + (vy / vd) * Math.min(speed, distance), 3, mapHeight() - 3) };
          const bridgeNext = bridgeSegment ? nearestBridgeLanePoint(nextPoint, 18, unit.pathBridgeId) : null;
          const correctedNextPoint = shouldSnapToBridgeLane(nextPoint, bridgeNext) ? { x: bridgeNext.x, y: bridgeNext.y } : nextPoint;
          const traversable = canTraverse(correctedNextPoint.x, correctedNextPoint.y) || ((bridgeMove || rescueFromWater) && isNearBridge(correctedNextPoint.x, correctedNextPoint.y, 4.2));
          if (!movementBlockedByWalls(unit, nextPoint) && traversable) {
            member.x = correctedNextPoint.x;
            member.y = correctedNextPoint.y;
          }
        } else if (unitAtAnchor && !target && distance <= 0.12) {
          member.x = desired.x;
          member.y = desired.y;
        }
      }
      if (unit.type === "miner") updateMiner(unit, member, dt);
    }
    unit.members = unit.members.filter((member) => member.hp > 0);
    if (!unitCount(unit)) state.units = state.units.filter((u) => u !== unit);
    else updateUnitCenter(unit);
  }
}

function updateStructures(dt) {
  for (const structure of state.structures) {
    structure.cooldown = Math.max(0, (structure.cooldown || 0) - dt);
    const stats = structureStats(structure);
    if (structure.type === "mine") {
      const gain = stats.income * dt;
      if (structure.owner === "player") state.money += gain;
      else {
        const ai = state.aiPlayers.find((entry) => entry.owner === structure.owner);
        if (ai) ai.money += gain;
      }
    }
    if (!stats.range) continue;
    if (structure.cooldown > 0) continue; // Skip target search if can't fire yet
    const center = rectCenter(structure);
    const range = stats.range;
    // Find nearest hostile without allocating arrays
    let target = null;
    let targetD = range + 1;
    for (const u of state.units) {
      if (u.owner === structure.owner) continue;
      const d = dist(center, itemPoint(u));
      if (d < targetD) { targetD = d; target = u; }
    }
    for (const s of state.structures) {
      if (s === structure || s.owner === structure.owner || s.type === "wall" || s.type === "wallSegment" || s.type === "bridgeSegment") continue;
      const d = dist(center, itemPoint(s));
      if (d < targetD) { targetD = d; target = s; }
    }
    if (target && !attackBlockedByWall(structure.owner, center, itemPoint(target))) {
      const point = itemPoint(target);
      const wallDamageBoost = target.type === "wallSegment" ? structureTypes.wall.cannonDamageMultiplier : 1;
      damageItem(target, stats.damage * wallDamageBoost, center);
      const projectile = { x: center.x, y: center.y, tx: point.x, ty: point.y, age: 0, owner: structure.owner, directHitId: target.id };
      const wallHit = projectileWallHit(projectile);
      if (wallHit) {
        projectile.tx = (wallHit.x1 + wallHit.x2) / 2;
        projectile.ty = (wallHit.y1 + wallHit.y2) / 2;
        projectile.blockedByWallId = wallHit.id;
      }
      state.projectiles.push(projectile);
      structure.cooldown = stats.cooldown;
    }
  }
}

function updateProjectiles(dt) {
  const remainingProjectiles = [];
  for (const p of state.projectiles) {
    p.age += dt;
    const flightTime = p.artillery ? (p.flightTime || ARTILLERY_PROJECTILE_SPEED) : (1 / 4.5);
    if (p.age >= flightTime) {
      if (p.artillery) applyExplosion(p);
      else if (p.blockedByWallId) {
        const blockedWall = state.structures.find((structure) => structure.id === p.blockedByWallId);
        if (blockedWall) damageItem(blockedWall, 18, { x: p.tx, y: p.ty });
      }
    } else {
      remainingProjectiles.push(p);
    }
  }
  state.projectiles = remainingProjectiles;
  for (const f of state.floaters) f.age += dt;
  state.floaters = state.floaters.filter((f) => f.age < 0.8);
  for (const e of state.explosions) e.age += dt;
  state.explosions = state.explosions.filter((e) => e.age < 0.35);
}

function aiBase(ai) {
  const spawn = state.currentMap.spawns.find((s) => s.owner === ai.owner);
  const castle = state.structures.find((s) => s.owner === ai.owner && s.type === "castle");
  const center = castle ? rectCenter(castle) : spawn;
  return spawn && center ? { spawn, center, forward: spawn.x > state.currentMap.width / 2 ? -1 : 1 } : null;
}

function aiThreatScore(ai, point, radius = 82) {
  return state.units
    .filter((unit) => unit.owner !== ai.owner && unit.type !== "miner")
    .reduce((sum, unit) => {
      const d = Math.hypot(unit.x - point.x, unit.y - point.y);
      return d <= radius ? sum + unitCount(unit) * (1 - d / radius) : sum;
    }, 0);
}

function aiArmyPower(units) {
  return units.reduce((sum, unit) => {
    const spec = unitTypes[unit.type];
    const role = unit.type === "archer" ? 1.25 : unit.type === "soldier" ? 1.05 : 0.35;
    return sum + unitCount(unit) * spec.hp * spec.damage * role;
  }, 0);
}

function aiDefensePowerAgainst(ai, target) {
  const targetPoint = itemPoint(target);
  return state.structures
    .filter((s) => s.owner !== ai.owner)
    .reduce((sum, structure) => {
      const stats = structureStats(structure);
      if (!stats.range || !stats.damage) return sum;
      const center = rectCenter(structure);
      const distanceToTarget = Math.hypot(center.x - targetPoint.x, center.y - targetPoint.y);
      const coversTarget = distanceToTarget <= stats.range + 18;
      const routeExposure = state.units
        .filter((unit) => unit.owner === ai.owner && unit.type !== "miner")
        .some((unit) => Math.hypot(center.x - unit.x, center.y - unit.y) <= stats.range + 22);
      if (!coversTarget && !routeExposure) return sum;
      const level = structure.level || 1;
      const typeWeight = structure.type === "tower" ? 3.6 : structure.type === "castle" ? 2.4 : 0.8;
      const hpWeight = Math.max(0.35, structureHpPercent(structure));
      return sum + stats.damage * stats.range * typeWeight * level * hpWeight;
    }, 0);
}

function aiCanAttack(ai, ownedArmy, target, hostileArmy) {
  if (!target) return false;
  const armyPower = aiArmyPower(ownedArmy);
  const hostilePower = aiArmyPower(state.units.filter((u) => u.owner !== ai.owner && u.type !== "miner"));
  // Only count structures that actually shoot (towers, castles) - walls don't matter
  const towerCount = state.structures.filter((s) => s.owner !== ai.owner && s.type === "tower").length;
  const castleCount = state.structures.filter((s) => s.owner !== ai.owner && s.type === "castle").length;
  const defensePenalty = towerCount * 35 + castleCount * 25;
  const requiredPower = Math.max(50, hostilePower * 0.55 + defensePenalty);
  return armyPower >= requiredPower;
}

function aiSetCombatFormation(ai, armySize, hostileArmy, attackReady) {
  const desired = attackReady ? "offensive" : hostileArmy > armySize * 1.1 ? "defensive" : "normal";
  if ((ai.formation || "normal") !== desired) setOwnerFormation(ai.owner, desired);
}

function aiTryBuildBridgeForAttack(ai, ownedArmy, target) {
  if (!target || ai.money < structureTypes.bridge.cost || (ai.wood || 0) < (structureTypes.bridge.costWood || 0)) return false;
  const targetPoint = rectCenter(target);
  const unit = ownedArmy
    .filter((entry) => unitCount(entry) > 0)
    .map((entry) => ({ unit: entry, d: Math.hypot(entry.x - targetPoint.x, entry.y - targetPoint.y) }))
    .sort((a, b) => a.d - b.d)[0]?.unit;
  if (!unit) return false;
  const plan = bridgePlanForPath({ x: unit.x, y: unit.y }, targetPoint, ai.owner);
  if (!plan) return false;
  return placeStructure("bridge", plan.center.x, plan.center.y, ai.owner, { bridgePlan: plan });
}

function aiArtilleryRisk(ai) {
  const base = aiBase(ai);
  if (!base) return 0;
  const hostileCannons = state.structures.filter((s) => s.owner !== ai.owner && s.type === "cannon").length;
  const hostileMoneyPower = ai.owner === "player" ? 0 : (state.money > artilleryTypes.shell.cost * 0.75 ? 1 : 0);
  const damagedImportantStructures = state.structures.filter((s) => s.owner === ai.owner && ["castle", "tower", "barracks", "cannon"].includes(s.type) && structureHpPercent(s) < 0.82).length;
  return hostileCannons * 2 + hostileMoneyPower + damagedImportantStructures * 0.7;
}

function aiHasThingsToDefend(ai) {
  const valuable = state.structures.filter((s) => s.owner === ai.owner && ["castle", "tower", "barracks", "cannon", "mine"].includes(s.type));
  return valuable.length >= 3 || valuable.some((s) => ["barracks", "cannon"].includes(s.type));
}

function aiValuablesToProtect(ai) {
  const base = aiBase(ai);
  if (!base) return [];
  return state.structures
    .filter((s) => s.owner === ai.owner && ["castle", "tower", "barracks", "cannon", "mine"].includes(s.type))
    .filter((s) => s.type !== "mine" || Math.hypot(rectCenter(s).x - base.center.x, rectCenter(s).y - base.center.y) < 70);
}

function perimeterPointsForRect(left, right, top, bottom) {
  const width = right - left;
  const height = bottom - top;
  const safeSpan = structureTypes.wall.joinRange * 0.72;
  const edgeCounts = {
    top: Math.max(1, Math.ceil(width / safeSpan)),
    right: Math.max(1, Math.ceil(height / safeSpan)),
    bottom: Math.max(1, Math.ceil(width / safeSpan)),
    left: Math.max(1, Math.ceil(height / safeSpan))
  };
  const points = [];
  const pushPoint = (x, y) => points.push({ x: Math.round(x), y: Math.round(y), index: points.length });
  for (let i = 0; i < edgeCounts.top; i++) pushPoint(left + (width * i) / edgeCounts.top, top);
  for (let i = 0; i < edgeCounts.right; i++) pushPoint(right, top + (height * i) / edgeCounts.right);
  for (let i = 0; i < edgeCounts.bottom; i++) pushPoint(right - (width * i) / edgeCounts.bottom, bottom);
  for (let i = 0; i < edgeCounts.left; i++) pushPoint(left, bottom - (height * i) / edgeCounts.left);
  return points.map((point, index) => ({ ...point, index }));
}

function pointInsideRectPerimeter(perimeter, point, padding = 0) {
  return point.x >= perimeter.left + padding && point.x <= perimeter.right - padding && point.y >= perimeter.top + padding && point.y <= perimeter.bottom - padding;
}

function aiNearestInsidePerimeterPoint(ai, point, padding = 10) {
  const perimeter = aiPerimeterData(ai);
  if (!perimeter) return point;
  return {
    x: clamp(point.x, perimeter.left + padding, perimeter.right - padding),
    y: clamp(point.y, perimeter.top + padding, perimeter.bottom - padding)
  };
}

function aiArmyInsidePerimeter(ai, ownedArmy, padding = 4) {
  const progress = aiPerimeterProgress(ai);
  if (!progress.complete) return true;
  const army = ownedArmy || state.units.filter((unit) => unit.owner === ai.owner && unit.type !== "miner");
  if (!army.length) return true;
  for (const unit of army) {
    for (const member of unit.members) {
      if (!pointInsideRectPerimeter(progress.perimeter, member, padding)) return false;
    }
  }
  return true;
}

function aiPerimeterPointMatchDistance() {
  return Math.min(30, structureTypes.wall.joinRange * 0.34);
}

function findAiPerimeterColumn(columns, pointsLength, index, point) {
  const matchDistance = aiPerimeterPointMatchDistance();
  return columns.find((column) => column.aiPerimeterTotal === pointsLength && column.aiPerimeterIndex === index && Math.hypot(rectCenter(column).x - point.x, rectCenter(column).y - point.y) <= matchDistance) || null;
}

function aiPerimeterPlacementOptions(point, perimeter, owner) {
  const center = perimeter.center;
  const awayX = point.x === center.x ? 0 : Math.sign(point.x - center.x);
  const awayY = point.y === center.y ? 0 : Math.sign(point.y - center.y);
  const tangentX = Math.abs(awayX) > Math.abs(awayY) ? 0 : 1;
  const tangentY = Math.abs(awayX) > Math.abs(awayY) ? 1 : 0;
  const offsets = [
    { x: 0, y: 0, score: 120 },
    { x: -awayX * 10, y: -awayY * 10, score: 86 },
    { x: awayX * 10, y: awayY * 10, score: 78 },
    { x: tangentX * 10, y: tangentY * 10, score: 70 },
    { x: -tangentX * 10, y: -tangentY * 10, score: 70 },
    { x: -awayX * 18, y: -awayY * 18, score: 62 },
    { x: awayX * 18, y: awayY * 18, score: 56 },
    { x: tangentX * 18, y: tangentY * 18, score: 48 },
    { x: -tangentX * 18, y: -tangentY * 18, score: 48 },
    { x: -awayX * 12 + tangentX * 12, y: -awayY * 12 + tangentY * 12, score: 42 },
    { x: -awayX * 12 - tangentX * 12, y: -awayY * 12 - tangentY * 12, score: 42 },
    { x: awayX * 12 + tangentX * 12, y: awayY * 12 + tangentY * 12, score: 34 },
    { x: awayX * 12 - tangentX * 12, y: awayY * 12 - tangentY * 12, score: 34 }
  ];
  const seen = new Set();
  return offsets
    .map((offset) => ({ x: Math.round(clamp(point.x + offset.x, 8, mapWidth() - 8)), y: Math.round(clamp(point.y + offset.y, 8, mapHeight() - 8)), offsetScore: offset.score }))
    .filter((candidate) => {
      const key = `${candidate.x},${candidate.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return canPlace("wall", candidate.x, candidate.y, owner);
    });
}

function createInitialAiPerimeterPlan(spawn) {
  const forward = spawn.x > mapWidth() / 2 ? -1 : 1;
  const baseRadius = Math.min(mapWidth(), mapHeight()) * 0.28;
  const nearbyRocks = state.currentMap.rocks.filter((rock) => Math.hypot(rock.x - spawn.x, rock.y - spawn.y) <= baseRadius);
  const pointsToProtect = [{ x: spawn.x, y: spawn.y }, ...nearbyRocks.map((rock) => ({ x: rock.x, y: rock.y }))];
  if (!nearbyRocks.length) pointsToProtect.push({ x: spawn.x + forward * 48, y: spawn.y });
  const minX = Math.min(...pointsToProtect.map((point) => point.x));
  const maxX = Math.max(...pointsToProtect.map((point) => point.x));
  const minY = Math.min(...pointsToProtect.map((point) => point.y));
  const maxY = Math.max(...pointsToProtect.map((point) => point.y));
  const marginX = 34;
  const marginY = 30;
  let left = clamp(minX - marginX, 8, mapWidth() - 8);
  let right = clamp(maxX + marginX, 8, mapWidth() - 8);
  let top = clamp(minY - marginY, 8, mapHeight() - 8);
  let bottom = clamp(maxY + marginY, 8, mapHeight() - 8);
  const minW = 74;
  const minH = 64;
  const cx = clamp((left + right) / 2, 8 + minW / 2, mapWidth() - 8 - minW / 2);
  const cy = clamp((top + bottom) / 2, 8 + minH / 2, mapHeight() - 8 - minH / 2);
  if (right - left < minW) {
    left = clamp(cx - minW / 2, 8, mapWidth() - 8);
    right = clamp(cx + minW / 2, 8, mapWidth() - 8);
  }
  if (bottom - top < minH) {
    top = clamp(cy - minH / 2, 8, mapHeight() - 8);
    bottom = clamp(cy + minH / 2, 8, mapHeight() - 8);
  }
  return { left, right, top, bottom, center: { x: (left + right) / 2, y: (top + bottom) / 2 }, points: perimeterPointsForRect(left, right, top, bottom) };
}

function aiPerimeterData(ai) {
  const base = aiBase(ai);
  if (!base) return null;
  if (ai.perimeterPlan?.points?.length) return ai.perimeterPlan;
  ai.perimeterPlan = createInitialAiPerimeterPlan(base.spawn);
  return ai.perimeterPlan;
}

function aiPointInsidePerimeter(ai, point, padding = 0) {
  const perimeter = aiPerimeterData(ai);
  if (!perimeter) return false;
  return pointInsideRectPerimeter(perimeter, point, padding);
}

function aiPerimeterProgress(ai) {
  const perimeter = aiPerimeterData(ai);
  if (!perimeter) return { complete: false, columns: 0, perimeter: null };
  // Use cached result if recent (avoid expensive canPlace calls every frame)
  const now = performance.now();
  if (ai._perimeterCache && now - ai._perimeterCacheTime < 2000) return ai._perimeterCache;
  const ownColumns = ownedWallColumns(ai.owner);
  let builtCount = 0;
  let placeableCount = 0;
  for (const point of perimeter.points) {
    const isBuilt = !!findAiPerimeterColumn(ownColumns, perimeter.points.length, point.index, point);
    if (isBuilt) { builtCount++; placeableCount++; }
    else if (aiPerimeterPlacementOptions(point, perimeter, ai.owner).length) { placeableCount++; }
  }
  const complete = (placeableCount > 0 && builtCount >= placeableCount) || builtCount >= perimeter.points.length * 0.8;
  const result = { complete, columns: builtCount, total: perimeter.points.length, perimeter };
  ai._perimeterCache = result;
  ai._perimeterCacheTime = now;
  return result;
}

function aiPerimeterWallPlan(ai) {
  const progress = aiPerimeterProgress(ai);
  if (!progress.perimeter) return null;
  const points = progress.perimeter.points;
  const existingColumns = ownedWallColumns(ai.owner);
  const perimeterColumns = points.map((point, index) => ({ point, index, column: findAiPerimeterColumn(existingColumns, points.length, index, point) }));
  
  // Find all missing perimeter indexes, including nearby fallback points if the exact tile is blocked.
  const missing = points
    .flatMap((point, index) => {
      const hasColumn = perimeterColumns[index]?.column;
      if (hasColumn) return [];
      return aiPerimeterPlacementOptions(point, progress.perimeter, ai.owner).map((candidate) => ({ ...candidate, plannedX: point.x, plannedY: point.y, index, missing: true }));
    });
  if (!missing.length) return null;
  
  // Prioritize points adjacent to existing columns (to allow wall segments to connect)
  const scored = missing.map((point) => {
    const prevIdx = (point.index - 1 + points.length) % points.length;
    const nextIdx = (point.index + 1) % points.length;
    const hasAdjacentPrev = perimeterColumns[prevIdx]?.column != null;
    const hasAdjacentNext = perimeterColumns[nextIdx]?.column != null;
    const adjacencyScore = (hasAdjacentPrev ? 500 : 0) + (hasAdjacentNext ? 500 : 0);
    const connectionScore = wallPreviewSegments(point.x, point.y, ai.owner).length * 200;
    const deviationPenalty = Math.hypot(point.x - point.plannedX, point.y - point.plannedY) * 1.8;
    // Prefer building in order from index 0
    const orderScore = -point.index * 2;
    return { ...point, aiPerimeterIndex: point.index, aiPerimeterTotal: points.length, score: adjacencyScore + connectionScore + point.offsetScore + orderScore - deviationPenalty };
  }).sort((a, b) => b.score - a.score);
  
  return scored[0] || null;
}

function aiBuildCandidates(ai, type) {
  const base = aiBase(ai);
  if (!base) return [];
  const { spawn, center, forward } = base;
  if (type === "mine") {
    return state.currentMap.rocks
      .map((rock) => {
        const nearOwn = state.structures.filter((s) => s.owner === ai.owner).some((s) => Math.hypot(rectCenter(s).x - rock.x, rectCenter(s).y - rock.y) < 58);
        const safety = Math.max(0, 70 - aiThreatScore(ai, rock, 95));
        const distancePenalty = Math.hypot(rock.x - spawn.x, rock.y - spawn.y) * (nearOwn ? 0.12 : 0.24);
        return { x: rock.x, y: rock.y, score: safety - distancePenalty + (nearOwn ? 18 : 0) };
      })
      .filter((candidate) => canPlace(type, candidate.x, candidate.y, ai.owner) && aiPointInsidePerimeter(ai, candidate, -2))
      .sort((a, b) => b.score - a.score);
  }

  const enemyCastles = state.structures.filter((s) => s.type === "castle" && s.owner !== ai.owner);
  const nearestEnemyCastle = enemyCastles
    .map((castle) => ({ castle, d: Math.hypot(rectCenter(castle).x - spawn.x, rectCenter(castle).y - spawn.y) }))
    .sort((a, b) => a.d - b.d)[0]?.castle;
  const enemyPoint = nearestEnemyCastle ? rectCenter(nearestEnemyCastle) : { x: state.currentMap.width / 2, y: state.currentMap.height / 2 };
  const candidates = [];
  if (type === "wall") {
    const perimeterPoint = aiPerimeterWallPlan(ai);
    if (perimeterPoint) candidates.push({ x: perimeterPoint.x, y: perimeterPoint.y, aiPerimeterIndex: perimeterPoint.aiPerimeterIndex, aiPerimeterTotal: perimeterPoint.aiPerimeterTotal, score: 999 + perimeterPoint.score });
    return candidates.filter((candidate) => canPlace(type, candidate.x, candidate.y, ai.owner)).sort((a, b) => b.score - a.score);
  }
  const rings = type === "tower" ? [22, 34, 46, 58] : [18, 30, 42];
  const perimeterProgress = aiPerimeterProgress(ai);
  for (const radius of rings) {
    for (const dy of [-34, -20, -8, 8, 20, 34]) {
      const x = center.x + forward * radius;
      const y = center.y + dy;
      const chokeBonus = type === "tower" ? aiThreatScore(ai, { x, y }, 110) * 1.7 : 0;
      const insidePerimeter = perimeterProgress.complete && aiPointInsidePerimeter(ai, { x, y }, 4);
      const frontBonus = perimeterProgress.complete ? (insidePerimeter ? 42 : -58) : forward * (x - center.x) * (type === "tower" ? 1.6 : 0.5);
      const enemyAlignment = -Math.abs(y - enemyPoint.y) * 0.15;
      const spacingPenalty = state.structures.filter((s) => s.owner === ai.owner && s.type === type).reduce((sum, s) => {
        const d = Math.hypot(rectCenter(s).x - x, rectCenter(s).y - y);
        return sum + (d < 26 ? 35 : d < 44 ? 10 : 0);
      }, 0);
      candidates.push({ x, y, score: frontBonus + chokeBonus + enemyAlignment - spacingPenalty });
    }
  }
  return candidates.filter((candidate) => canPlace(type, candidate.x, candidate.y, ai.owner) && aiPointInsidePerimeter(ai, candidate, 2)).sort((a, b) => b.score - a.score);
}

function aiChooseBuildType(ai) {
  const mines = currentMineCount(ai.owner);
  const towers = state.structures.filter((s) => s.owner === ai.owner && s.type === "tower").length;
  const barracks = state.structures.filter((s) => s.owner === ai.owner && s.type === "barracks").length;
  const cannons = state.structures.filter((s) => s.owner === ai.owner && s.type === "cannon").length;
  const threat = aiThreatScore(ai, aiBase(ai)?.center || { x: 0, y: 0 }, 115);
  const mineTarget = Math.min(state.currentMap.rocks.length, Math.max(2, (ai.castleLevel || 1) + 1));
  const enemyHasCannon = state.structures.some((s) => s.owner !== ai.owner && s.type === "cannon");
  if (enemyHasCannon && aiHasThingsToDefend(ai) && aiPerimeterWallPlan(ai) && ai.money >= structureTypes.wall.cost) return "wall";
  if (mines < mineTarget && ai.money >= structureTypes.mine.cost) return "mine";
  if ((threat > 22 || towers < 2) && ai.money >= structureTypes.tower.cost) return "tower";
  if (barracks < 2 && ai.money >= structureTypes.barracks.cost) return "barracks";
  if (aiHasThingsToDefend(ai) && aiArtilleryRisk(ai) >= 2 && aiPerimeterWallPlan(ai) && ai.money >= structureTypes.wall.cost) return "wall";
  if ((cannons < 1 || (mines >= 3 && cannons < 2)) && ai.money >= structureTypes.cannon.cost) return "cannon";
  if (towers < 5 && ai.money >= structureTypes.tower.cost) return "tower";
  if (mines < mineTarget + 1 && ai.money >= structureTypes.mine.cost) return "mine";
  if (ai.money >= 4200 && aiPerimeterWallPlan(ai) && ai.money >= structureTypes.wall.cost) return "wall";
  return ["barracks", "cannon", "tower", "mine"].find((type) => ai.money >= structureTypes[type].cost) || null;
}

function aiTryBuild(ai) {
  const type = aiChooseBuildType(ai);
  if (!type) return false;
  const candidates = aiBuildCandidates(ai, type);
  const chosen = candidates[0];
  if (!chosen) return false;
  return placeStructure(type, chosen.x, chosen.y, ai.owner, { aiPerimeterIndex: chosen.aiPerimeterIndex, aiPerimeterTotal: chosen.aiPerimeterTotal });
}

function aiRallyPoint(ai) {
  const base = aiBase(ai);
  if (!base) return null;
  const { spawn, forward } = base;
  const perimeterProgress = aiPerimeterProgress(ai);
  if (perimeterProgress.complete) return aiNearestInsidePerimeterPoint(ai, perimeterProgress.perimeter.center, 14);
  const enemyStructures = state.structures.filter((s) => s.owner !== ai.owner && s.type !== "mine");
  const nearestEnemy = enemyStructures
    .map((structure) => ({ structure, d: Math.hypot(rectCenter(structure).x - spawn.x, rectCenter(structure).y - spawn.y) }))
    .sort((a, b) => a.d - b.d)[0]?.structure;
  if (!nearestEnemy) return { x: spawn.x + forward * 38, y: spawn.y };
  const enemy = rectCenter(nearestEnemy);
  const rally = { x: clamp((spawn.x * 0.62) + (enemy.x * 0.38), 8, mapWidth() - 8), y: clamp((spawn.y * 0.62) + (enemy.y * 0.38), 8, mapHeight() - 8) };
  return perimeterProgress.complete ? aiNearestInsidePerimeterPoint(ai, rally, 14) : rally;
}

function aiTryUpgradeWall(ai) {
  const progress = aiPerimeterProgress(ai);
  if (!progress.complete || ai.money < structureTypes.wall.cost) return false;
  const columns = ownedWallColumns(ai.owner)
    .filter((column) => column.aiPerimeterTotal === progress.total)
    .sort((a, b) => (a.level || 1) - (b.level || 1));
  const column = columns[0];
  if (!column || (column.level || 1) >= 3) return false;
  ai.money -= structureTypes.wall.cost;
  upgradeStructure(column);
  return true;
}

function aiTryUpgradeCannon(ai) {
  if (ai.money < structureTypes.cannon.cost) return false;
  const enemyHasCannon = state.structures.some((s) => s.owner !== ai.owner && s.type === "cannon");
  const threat = aiThreatScore(ai, aiBase(ai)?.center || { x: 0, y: 0 }, 130);
  const cannons = state.structures
    .filter((s) => s.owner === ai.owner && s.type === "cannon")
    .sort((a, b) => {
      const levelDiff = (a.level || 1) - (b.level || 1);
      if (levelDiff !== 0) return levelDiff;
      return (a.cooldown || 0) - (b.cooldown || 0);
    });
  const cannon = cannons[0];
  if (!cannon || (cannon.level || 1) >= 4) return false;
  const shouldUpgrade = enemyHasCannon || cannons.length >= 2 || threat >= 26 || ai.money >= structureTypes.cannon.cost * 2.6;
  if (!shouldUpgrade) return false;
  ai.money -= structureTypes.cannon.cost;
  upgradeStructure(cannon);
  return true;
}

function aiPreferredTarget(ai, spawn) {
  const attackTargets = state.structures
    .filter((s) => s.owner !== ai.owner && s.type !== "wall" && s.type !== "wallSegment" && s.type !== "bridgeSegment")
    .map((structure) => {
      const center = rectCenter(structure);
      const distance = Math.hypot(center.x - spawn.x, center.y - spawn.y);
      const priority = structure.type === "castle" ? 220 : structure.type === "tower" ? 150 : structure.type === "cannon" ? 135 : structure.type === "barracks" ? 120 : 70;
      const playerFocusPenalty = structure.owner === "player" ? ai.attackBias * 70 : 0;
      return { structure, score: priority - distance * 0.28 - playerFocusPenalty + (1 - structureHpPercent(structure)) * 80 };
    })
    .sort((a, b) => b.score - a.score);
  return attackTargets[0]?.structure || null;
}

function aiUnitCombatPower(type) {
  const spec = unitTypes[type];
  if (!spec) return 0;
  const rangeBonus = spec.range > 20 ? 1.18 : 1;
  const tankBonus = type === "tank" ? 1.35 : 1;
  return (spec.hp * 1.1 + spec.damage * 8 + spec.speed * 0.18 + spec.cost / 55) * rangeBonus * tankBonus;
}

function aiArmyPower(units) {
  return units.reduce((sum, unit) => sum + aiUnitCombatPower(unit.type) * unitCount(unit), 0);
}

function aiWaveTargetPower(hostilePower, hostileArmy) {
  return Math.max(70, hostilePower * 1.16 + hostileArmy * 1.9);
}

function aiWaveChargeDuration(hostilePower, hostileArmy, reservePower) {
  return clamp(4 + hostileArmy * 0.12 + hostilePower / 150 - reservePower / 320, 3.5, 11);
}

function aiWaveAttackDuration(hostileArmy, hostilePower) {
  return clamp(12 + hostileArmy * 0.12 + hostilePower / 180, 12, 26);
}

function aiActiveWaveUnits(ai, units) {
  return units.filter((unit) => ai.currentWaveId && unit.aiWaveId === ai.currentWaveId);
}

function aiReserveUnits(units) {
  return units.filter((unit) => !Number.isFinite(unit.aiWaveSentAt));
}

function aiLaunchWave(ai, units, preferredTarget, hostileArmy, hostilePower) {
  if (!units.length || !preferredTarget) return false;
  ai.waveCounter = (ai.waveCounter || 0) + 1;
  ai.currentWaveId = ai.waveCounter;
  ai.waveAttackUntil = state.gameTime + aiWaveAttackDuration(hostileArmy, hostilePower);
  ai.waveAttackTargetId = preferredTarget.id;
  for (const unit of units) {
    unit.aiWaveId = ai.waveCounter;
    unit.aiWaveSentAt = state.gameTime;
    moveUnitTo(unit, rectCenter(preferredTarget).x, rectCenter(preferredTarget).y, preferredTarget.id);
  }
  if (preferredTarget.owner === "player") ai.attackBias += 0.3;
  return true;
}

function aiChooseUnitType(ai, armySize, hostileArmy) {
  const miners = currentMinerPop(ai.owner);
  const mines = currentMineCount(ai.owner);
  const archers = state.units.filter((u) => u.owner === ai.owner && u.type === "archer").reduce((sum, unit) => sum + unitCount(unit), 0);
  const soldiers = state.units.filter((u) => u.owner === ai.owner && u.type === "soldier").reduce((sum, unit) => sum + unitCount(unit), 0);
  if (miners < Math.min(40, Math.max(10, mines * 10)) && ai.money >= unitTypes.miner.cost) return "miner";
  if (hostileArmy > armySize * 1.15 && soldiers < archers * 0.75 && ai.money >= unitTypes.soldier.cost) return "soldier";
  if (archers < soldiers * 0.65 && ai.money >= unitTypes.archer.cost) return "archer";
  if (ai.money >= unitTypes.soldier.cost && (armySize < 50 || Math.random() < 0.58)) return "soldier";
  if (ai.money >= unitTypes.archer.cost) return "archer";
  return ai.money >= unitTypes.miner.cost ? "miner" : null;
}

function aiUpdate(dt) {
  const graceActive = state.gameTime < 20;
  for (const ai of state.aiPlayers) {
    ai.money += 34 * dt;
    ai.wood = (ai.wood || 0) + 4.5 * dt;
    ai.stone = (ai.stone || 0) + 1.5 * dt;
    ai.unitTimer -= dt;
    ai.buildTimer -= dt;
    ai.shellTimer = (ai.shellTimer ?? 7) - dt;
    ai.attackBias = Math.max(0, (ai.attackBias || 0) - dt * 0.08);
    if (ai.buildTimer <= 0) {
      const built = aiTryBuild(ai);
      const mines = currentMineCount(ai.owner);
      ai.buildTimer = built ? (mines < 2 ? 2.0 + Math.random() * 1.5 : 3.0 + Math.random() * 2.0) : 1.0 + Math.random() * 0.8;
    }

    const ownedArmy = state.units.filter((u) => u.owner === ai.owner && u.type !== "miner");
    const hostileCombatUnits = state.units.filter((u) => u.owner !== ai.owner && u.type !== "miner");
    const armySize = ownedArmy.reduce((sum, unit) => sum + unitCount(unit), 0);
    const hostileArmy = hostileCombatUnits.reduce((sum, unit) => sum + unitCount(unit), 0);
    const armyPower = aiArmyPower(ownedArmy);
    const hostilePower = aiArmyPower(hostileCombatUnits);
    const spawn = state.currentMap.spawns.find((s) => s.owner === ai.owner);
    const preferredTarget = spawn ? aiPreferredTarget(ai, spawn) : null;
    const perimeterProgress = aiPerimeterProgress(ai);
    const armyContained = aiArmyInsidePerimeter(ai, ownedArmy, 4);
    const reserveArmy = aiReserveUnits(ownedArmy);
    const committedWaveActive = Boolean(ai.waveAttackUntil) && state.gameTime < ai.waveAttackUntil;
    const activeWaveUnits = aiActiveWaveUnits(ai, ownedArmy);
    const reservePower = aiArmyPower(reserveArmy);
    const waveTargetPower = aiWaveTargetPower(hostilePower, hostileArmy);
    const attackReady = !graceActive && aiCanAttack(ai, ownedArmy, preferredTarget, hostileArmy);
    const hasAdvantage = attackReady && armyPower >= Math.max(hostilePower * 1.08, 64);
    const shouldChargeWave = hasAdvantage && reserveArmy.length > 0 && reservePower >= waveTargetPower * 0.72;
    if (!committedWaveActive && (!shouldChargeWave || !preferredTarget)) {
      ai.waveChargeUntil = 0;
      ai.waveChargeTargetId = null;
    } else if (!committedWaveActive && !ai.waveChargeUntil) {
      ai.waveChargeUntil = state.gameTime + aiWaveChargeDuration(hostilePower, hostileArmy, reservePower);
      ai.waveChargeTargetId = preferredTarget.id;
    }
    const waveReady = Boolean(ai.waveChargeUntil) && state.gameTime >= ai.waveChargeUntil && hasAdvantage && reserveArmy.length > 0 && reservePower >= waveTargetPower;
    if (!committedWaveActive && !activeWaveUnits.length) {
      ai.currentWaveId = 0;
      ai.waveAttackUntil = 0;
      ai.waveAttackTargetId = null;
    }
    aiSetCombatFormation(ai, armySize, hostileArmy, Boolean(ai.waveChargeUntil) || committedWaveActive || activeWaveUnits.length > 0);
    ai.bridgeTimer = Math.max(0, (ai.bridgeTimer || 0) - dt);
    const committedTarget = state.structures.find((s) => s.id === ai.waveAttackTargetId) || preferredTarget;
    if ((waveReady || committedWaveActive || activeWaveUnits.length > 0) && committedTarget && ai.bridgeTimer <= 0 && aiTryBuildBridgeForAttack(ai, ownedArmy, committedTarget)) ai.bridgeTimer = 10;

    if (graceActive) {
      // During grace period, rally units near base - they can defend but not advance
      const rally = aiRallyPoint(ai);
      if (rally) {
        for (const unit of ownedArmy) {
          if (Math.hypot(unit.x - rally.x, unit.y - rally.y) > 28) moveUnitTo(unit, rally.x, rally.y + Math.random() * 10 - 5, null);
        }
      }
    } else if (!committedWaveActive && perimeterProgress.complete && !armyContained && !attackReady) {
      for (const unit of ownedArmy) {
        const rally = aiNearestInsidePerimeterPoint(ai, unit, 16);
        moveUnitTo(unit, rally.x, rally.y, null);
      }
    } else {
      if (committedTarget) {
        for (const unit of activeWaveUnits) {
          const pursueBuffer = unit.type === "archer" ? 8 : 2;
          if (distanceToItemFromPoint(committedTarget, unit) > unitTypes[unit.type].range + pursueBuffer) {
            moveUnitTo(unit, rectCenter(committedTarget).x, rectCenter(committedTarget).y, committedTarget.id);
          }
        }
      }
      if (waveReady && preferredTarget) {
        aiLaunchWave(ai, reserveArmy, preferredTarget, hostileArmy, hostilePower);
        ai.waveChargeUntil = 0;
        ai.waveChargeTargetId = null;
      }
      const rally = aiRallyPoint(ai);
      if (rally) {
        for (const unit of reserveArmy) {
          if (Math.hypot(unit.x - rally.x, unit.y - rally.y) > 28) moveUnitTo(unit, rally.x, rally.y + Math.random() * 10 - 5, null);
        }
      }
    }

    if (ai.unitTimer > 0) continue;
    const type = aiChooseUnitType(ai, armySize, hostileArmy);
    if (type && ai.money >= unitTypes[type].cost) {
      ai.money -= unitTypes[type].cost;
      const unit = spawnUnit(type, ai.owner, spawn.x, spawn.y);
      if (type === "miner") retargetMinerUnit(unit);
      else {
        const rally = aiRallyPoint(ai) || { x: spawn.x, y: spawn.y };
        moveUnitTo(unit, rally.x, rally.y + Math.random() * 12 - 6, null);
      }
    }
    ai.unitTimer = ai.money < 600 ? 2.4 + Math.random() * 1.5 : 1.2 + Math.random() * 1.0;

    const aiWalls = state.structures.filter((s) => s.owner === ai.owner && s.type === "wall").length;
    const perimeterProgressNow = aiPerimeterProgress(ai);
    const enemyHasCannonNow = state.structures.some((s) => s.owner !== ai.owner && s.type === "cannon");
    const wallUrgency = aiArtilleryRisk(ai) + (aiHasThingsToDefend(ai) ? 1.5 : 0) + (aiWalls ? 0.8 : 0) + (enemyHasCannonNow ? 3 : 0);
    if (ai.money >= structureTypes.wall.cost && wallUrgency >= 2 && (!perimeterProgressNow.complete || aiWalls < (perimeterProgressNow.total || 4))) {
      const candidates = aiBuildCandidates(ai, "wall");
      const chosen = candidates[0];
      if (chosen && placeStructure("wall", chosen.x, chosen.y, ai.owner, { aiPerimeterIndex: chosen.aiPerimeterIndex, aiPerimeterTotal: chosen.aiPerimeterTotal })) {
        ai.buildTimer = 1.8 + Math.random() * 1.5;
        continue;
      }
    }

    // Upgrade walls even without enemy cannons - whenever perimeter is complete and money allows
    if (ai.money >= structureTypes.wall.cost * 1.4 && aiTryUpgradeWall(ai)) continue;
    if (ai.money >= structureTypes.cannon.cost * 1.35 && aiTryUpgradeCannon(ai)) continue;

    const aiCannons = state.structures.filter((s) => s.owner === ai.owner && s.type === "cannon");
    const shellType = ai.money >= artilleryTypes.heavyShell.cost && Math.random() < 0.35 ? "heavyShell" : "shell";
    if (!graceActive && aiCannons.length && ai.shellTimer <= 0 && ai.money >= artilleryTypes[shellType].cost) {
      const spawn = state.currentMap.spawns.find((s) => s.owner === ai.owner);
      const enemyUnits = state.units.filter((u) => u.owner !== ai.owner && unitCount(u) >= 15);
      const bestUnitCluster = enemyUnits.sort((a, b) => (unitCount(b) + aiThreatScore(ai, b, 32)) - (unitCount(a) + aiThreatScore(ai, a, 32)))[0];
      const targets = state.structures.filter((s) => s.owner !== ai.owner && s.type !== "castle");
      const target = targets.sort((a, b) => Math.hypot(rectCenter(a).x - spawn.x, rectCenter(a).y - spawn.y) - Math.hypot(rectCenter(b).x - spawn.x, rectCenter(b).y - spawn.y))[0];
      if (bestUnitCluster || target) {
        const t = bestUnitCluster ? { x: bestUnitCluster.x, y: bestUnitCluster.y } : rectCenter(target);
        const cannon = bestReadyArtilleryCannon(ai.owner, t);
        if (cannon) {
          ai.money -= artilleryTypes[shellType].cost;
          state.projectiles.push(createArtilleryProjectile(cannon, shellType, t));
          cannon.cooldown = cannonArtilleryCooldown(cannon);
          ai.shellTimer = 8 + Math.random() * 5;
        }
      }
    }
  }
}

function updateEconomy(dt) {
  state.money += 12 * dt;
  state.wood += 3 * dt;
  state.stone += 1.5 * dt;
  state.income = 12;
  state.income += state.structures.filter((s) => s.owner === "player" && s.type === "mine").reduce((sum, structure) => sum + structureStats(structure).income, 0);
  for (const unit of state.units) {
    if (unit.owner !== "player" || unit.type !== "miner") continue;
    for (const member of unit.members) {
      for (const rock of state.currentMap.rocks) {
        const dx = rock.x - member.x;
        const dy = rock.y - member.y;
        if (dx * dx + dy * dy <= 324) {
          state.income += 1.8;
          break;
        }
      }
    }
  }
}

function updateButtons() {
  const pop = currentPop("player");
  if (ui.buySoldier) ui.buySoldier.disabled = state.money < unitTypes.soldier.cost || pop + 10 > state.popCap;
  if (ui.buyArcher) ui.buyArcher.disabled = state.money < unitTypes.archer.cost || pop + 10 > state.popCap;
  if (ui.buyMiner) ui.buyMiner.disabled = state.money < unitTypes.miner.cost || pop + 10 > state.popCap || currentMinerPop("player") + 10 > minerCap();
  if (ui.buyTank) ui.buyTank.disabled = state.money < unitTypes.tank.cost || pop + 10 > state.popCap;
  if (ui.buyShell) ui.buyShell.disabled = state.money < artilleryTypes.shell.cost || !playerCannons().length;
  if (ui.buyHeavyShell) ui.buyHeavyShell.disabled = state.money < artilleryTypes.heavyShell.cost || !playerCannons().length;
  if (ui.buildTower) ui.buildTower.disabled = state.money < structureTypes.tower.cost;
  if (ui.buildMine) ui.buildMine.disabled = state.money < structureTypes.mine.cost || currentMineCount("player") >= mineCap();
  if (ui.buildBarracks) ui.buildBarracks.disabled = state.money < structureTypes.barracks.cost;
  if (ui.buildCannon) ui.buildCannon.disabled = state.money < structureTypes.cannon.cost;
  if (ui.buildWall) ui.buildWall.disabled = state.money < structureTypes.wall.cost;
  if (ui.buildBridge) ui.buildBridge.disabled = state.money < structureTypes.bridge.cost || state.wood < (structureTypes.bridge.costWood || 0);
  if (ui.buildFabbro) ui.buildFabbro.disabled = state.money < structureTypes.fabbro.cost || state.stone < (structureTypes.fabbro.costStone || 0);
  if (ui.upgradeCastle) ui.upgradeCastle.disabled = state.money < castleUpgradeCost();
  if (ui.castleUpgradeCost) ui.castleUpgradeCost.textContent = `${castleUpgradeCost()} oro`;
}

function updateCostLabels() {
  if (ui.costSoldier) ui.costSoldier.textContent = `${unitTypes.soldier.cost} oro, 10 pop`;
  if (ui.costArcher) ui.costArcher.textContent = `${unitTypes.archer.cost} oro, 10 pop`;
  if (ui.costMiner) ui.costMiner.textContent = `${unitTypes.miner.cost} oro, 10 pop`;
  if (ui.costTank) ui.costTank.textContent = `${unitTypes.tank.cost} oro, 10 pop`;
  if (ui.costTower) ui.costTower.textContent = `${structureTypes.tower.cost} oro`;
  if (ui.costMine) ui.costMine.textContent = `${structureTypes.mine.cost} oro`;
  if (ui.costBarracks) ui.costBarracks.textContent = `${structureTypes.barracks.cost} oro, +${structureTypes.barracks.pop} pop`;
  if (ui.costCannon) ui.costCannon.textContent = `${structureTypes.cannon.cost} oro`;
  if (ui.costWall) ui.costWall.textContent = `${structureTypes.wall.cost} oro - barriere`;
  if (ui.costBridge) ui.costBridge.textContent = `${structureTypes.bridge.cost} oro + ${structureTypes.bridge.costWood} legno`;
  if (ui.costFabbro) ui.costFabbro.textContent = `${structureTypes.fabbro.cost} oro + ${structureTypes.fabbro.costStone} pietra`;
  if (ui.costShell) ui.costShell.textContent = `${artilleryTypes.shell.cost} oro - area ${artilleryTypes.shell.radius}`;
  if (ui.costHeavyShell) ui.costHeavyShell.textContent = `${artilleryTypes.heavyShell.cost} oro - area ${artilleryTypes.heavyShell.radius}`;
}

function updateUI() {
  if (ui.money) ui.money.textContent = Math.floor(state.money);
  if (ui.wood) ui.wood.textContent = Math.floor(state.wood);
  if (ui.stone) ui.stone.textContent = Math.floor(state.stone);
  if (ui.population) ui.population.textContent = `${currentPop("player")}/${state.popCap}`;
  if (ui.income) ui.income.textContent = `${state.income.toFixed(1)}/s`;
  if (ui.minerLimit) ui.minerLimit.textContent = `Minatori ${currentMinerPop("player")}/${minerCap()}`;
  if (ui.mineLimit) ui.mineLimit.textContent = `Miniere ${currentMineCount("player")}/${mineCap()}`;
  const castle = state.structures.find((s) => s.id === "castle-player");
  ui.castleHp.textContent = castle ? `${Math.max(0, Math.round(structureHpPercent(castle) * 100))}%` : "0%";
  ui.cameraInfo.textContent = `Zoom ${state.camera.zoom.toFixed(2)}x - X ${Math.round(state.camera.x)} Y ${Math.round(state.camera.y)}`;
  if (ui.speedButton) ui.speedButton.textContent = `Velocità ${String(state.gameSpeed).replace(".", ",")}x`;
  updateCostLabels();
  const selected = selectedItem();
  const hovered = hoveredItem();
  if (!selected) {
    if (hovered && !state.placement && !state.selectedArtillery) {
      if (hovered.members) {
        const spec = unitTypes[hovered.type];
        ui.selectionName.textContent = `${spec.name} ${hovered.owner === "player" ? "alleati" : "nemici"}`;
        ui.selectionStats.textContent = `${itemCostText(hovered)} - HP unità ${spec.hp} - Danno ${spec.damage} - Range ${spec.range}`;
      } else if (hovered.type === "wallSegment" || hovered.type === "bridgeSegment") {
        ui.selectionName.textContent = hovered.type === "wallSegment" ? `Muro collegato` : `Ponte collegato`;
        ui.selectionStats.textContent = itemCostText(hovered);
      } else {
        const spec = structureTypes[hovered.type];
        const stats = structureStats(hovered);
        ui.selectionName.textContent = `${spec.name} ${hovered.owner === "player" ? "alleato" : "nemico"}`;
        ui.selectionStats.textContent = `${itemCostText(hovered)} - HP ${Math.ceil(hovered.hp)}/${hovered.maxHp} - Danno ${stats.damage.toFixed(0)} - Range ${stats.range.toFixed(0)}`;
      }
    } else if (state.selectedArtillery) {
      const ammo = artilleryTypes[state.selectedArtillery];
      ui.selectionName.textContent = `${ammo.name} selezionato`;
      ui.selectionStats.textContent = `Clicca sulla mappa per sparare - costo ${ammo.cost} - area ${ammo.radius} - danno ${ammo.damage}`;
    } else {
      ui.selectionName.textContent = state.placement ? `Piazza: ${structureTypes[state.placement].name}` : `Castello lv ${state.castleLevel}`;
      ui.selectionStats.textContent = `Mappa ${state.currentMap.name} - Limite minatori ${minerCap()} - Limite miniere ${mineCap()} - Cannoni ${playerCannons().length}`;
    }
  } else if (selected.members) {
    const spec = unitTypes[selected.type];
    const totalHp = selected.members.reduce((sum, member) => sum + Math.max(0, member.hp), 0);
    ui.selectionName.textContent = `${spec.name} selezionati`;
    ui.selectionStats.textContent = `${unitCount(selected)} pixel vivi - HP tot ${Math.max(0, Math.ceil(totalHp))}/${spec.hp * unitCount(selected)} - Destinazione ${Math.round(selected.targetX)}, ${Math.round(selected.targetY)}`;
  } else {
    if (selected.type === "wallSegment" || selected.type === "bridgeSegment") {
      ui.selectionName.textContent = selected.type === "wallSegment" ? `Muro collegato` : `Ponte collegato`;
      ui.selectionStats.textContent = `HP ${Math.max(0, Math.ceil(selected.hp))}/${selected.maxHp} - Lunghezza ${Math.round(lineLength(selected))}`;
    } else {
      const spec = structureTypes[selected.type];
      const stats = structureStats(selected);
      ui.selectionName.textContent = `${spec.name} Lv ${selected.level}`;
      ui.selectionStats.textContent = selected.type === "wall"
        ? `Ancora muro senza HP - collegamenti ${wallConnectionCount(selected)}/2`
        : selected.type === "bridge"
          ? `Ancora ponte senza HP - collegamenti ${bridgeConnectionCount(selected)}/2`
          : selected.type === "cannon"
            ? `HP ${Math.max(0, Math.ceil(selected.hp))}/${selected.maxHp} - Ricarica ${Math.max(0, selected.cooldown || 0).toFixed(1)}s/${cannonArtilleryCooldown(selected).toFixed(1)}s`
            : `HP ${Math.max(0, Math.ceil(selected.hp))}/${selected.maxHp} - Danno ${stats.damage.toFixed(0)} - Range ${stats.range.toFixed(0)} - Entrate ${stats.income.toFixed(1)}`;
    }
  }
  updateButtons();
  if (state.messageUntil < performance.now()) ui.toast.classList.remove("show");
}

function drawGrass() {
  ctx.fillStyle = "#2a9d3e";
  ctx.fillRect(0, 0, state.currentMap.width, state.currentMap.height);
}

function drawWater() {
  ctx.fillStyle = "rgba(49, 101, 180, 0.75)";
  for (const water of state.currentMap.waters) {
    ctx.beginPath();
    ctx.arc(water.x, water.y, water.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRocks() {
  for (const rock of state.currentMap.rocks) {
    ctx.fillStyle = "#696a61";
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a3a28d";
    ctx.fillRect(rock.x - 1, rock.y - 1, 2, 2);
  }
}

function drawSpawns() {
  for (const spawn of state.currentMap.spawns) {
    ctx.fillStyle = ownerColor(spawn.owner);
    ctx.fillRect(spawn.x - 5, spawn.y - 5, 10, 10);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(spawn.x - 5.5, spawn.y - 5.5, 11, 11);
  }
}

function drawStructure(s) {
  if (s.type === "wallSegment" || s.type === "bridgeSegment") {
    ctx.strokeStyle = s.type === "bridgeSegment" ? "#6b4f1d" : ownerDark(s.owner);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.strokeStyle = s.type === "bridgeSegment" ? "#c49a2e" : ownerColor(s.owner);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Only show HP bar if damaged
    if (s.hp < s.maxHp) {
      const midX = (s.x1 + s.x2) / 2;
      const midY = (s.y1 + s.y2) / 2;
      ctx.fillStyle = "#1d1d19";
      ctx.fillRect(midX - 12, midY - 8, 24, 3);
      ctx.fillStyle = "#78d85d";
      ctx.fillRect(midX - 12, midY - 8, Math.max(1, 24 * segmentHpPercent(s)), 3);
    }
    return;
  }
  const color = ownerColor(s.owner);
  const dark = ownerDark(s.owner);
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.fillRect(s.x + 1, s.y + s.h, s.w, 2);
  ctx.fillStyle = dark;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = color;
  if (s.type === "tower") {
    ctx.fillRect(s.x + 1, s.y, s.w - 2, s.h);
    ctx.fillStyle = "#f4df91";
    ctx.fillRect(s.x + 3, s.y + 2, 2, 2);
  } else if (s.type === "mine") {
    ctx.fillRect(s.x, s.y + 3, s.w, s.h - 3);
    ctx.fillStyle = "#5d5f57";
    ctx.fillRect(s.x + 3, s.y, 6, 4);
    ctx.fillStyle = "#e8bb4b";
    ctx.fillRect(s.x + 5, s.y + 5, 2, 2);
  } else if (s.type === "cannon") {
    ctx.fillRect(s.x + 1, s.y + 3, s.w - 2, s.h - 3);
    ctx.fillStyle = "#303030";
    ctx.fillRect(s.x + 2, s.y + 1, s.w - 4, 3);
    const cooldownFill = cannonCooldownPercent(s);
    if (cooldownFill > 0) {
      ctx.fillStyle = "#1d1d19";
      ctx.fillRect(s.x - 1, s.y - 7, s.w + 2, 3);
      ctx.fillStyle = "#f29c38";
      ctx.fillRect(s.x - 1, s.y - 7, Math.max(1, (s.w + 2) * cooldownFill), 3);
    }
  } else if (s.type === "wall") {
    ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.fillStyle = "#d2c5a3";
    ctx.fillRect(s.x + 1, s.y + 2, s.w - 2, 2);
    ctx.fillStyle = dark;
    ctx.fillRect(s.x + 2, s.y + s.h - 3, s.w - 4, 2);
  } else if (s.type === "bridge") {
    ctx.fillStyle = "#6b4f1d";
    ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.fillStyle = "#c49a2e";
    ctx.fillRect(s.x + 1, s.y + 2, s.w - 2, 2);
    ctx.fillStyle = "#4f3711";
    ctx.fillRect(s.x + 2, s.y + s.h - 3, s.w - 4, 2);
  } else if (s.type === "fabbro") {
    ctx.fillRect(s.x + 1, s.y + 2, s.w - 2, s.h - 2);
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(s.x + 2, s.y, s.w - 4, 4);
    ctx.fillStyle = "#ff6633";
    ctx.fillRect(s.x + 4, s.y + 4, 3, 3);
    ctx.fillStyle = "#888";
    ctx.fillRect(s.x + 8, s.y + 3, 2, 5);
  } else {
    ctx.fillRect(s.x, s.y + 4, s.w, s.h - 4);
    ctx.fillStyle = "#ede0ba";
    ctx.fillRect(s.x + 4, s.y + 6, 4, 4);
    ctx.fillStyle = dark;
    ctx.fillRect(s.x + 2, s.y + 1, s.w - 4, 3);
  }
  if (s.hp < s.maxHp && s.type !== "wall") {
    ctx.fillStyle = "#1d1d19";
    ctx.fillRect(s.x, s.y - 4, s.w, 2);
    ctx.fillStyle = "#78d85d";
    ctx.fillRect(s.x, s.y - 4, Math.max(1, s.w * structureHpPercent(s)), 2);
    if ((s.level || 1) > 1) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 7px monospace";
      ctx.fillText(`Lv${s.level}`, s.x + s.w + 2, s.y - 2);
    }
  } else if ((s.level || 1) > 1) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 7px monospace";
    ctx.fillText(String(s.level), s.x + s.w - 8, s.y - 2);
  }
}

function drawSwarm(unit) {
  for (const member of unit.members) {
    ctx.fillStyle = unitTypes[unit.type].color;
    if (unit.owner !== "player") ctx.fillStyle = unit.type === "archer" ? "#9ed0ff" : "#d7ecff";
    if (unit.owner === "player" && unit.type === "soldier") ctx.fillStyle = "#ffefe8";
    ctx.fillRect(Math.round(member.x), Math.round(member.y), 1, 1);
  }
  if (state.selectedId === unit.id) {
    const xs = unit.members.map((m) => m.x);
    const ys = unit.members.map((m) => m.y);
    const left = Math.floor(Math.min(...xs)) - 3;
    const top = Math.floor(Math.min(...ys)) - 3;
    const right = Math.ceil(Math.max(...xs)) + 3;
    const bottom = Math.ceil(Math.max(...ys)) + 3;
    ctx.strokeStyle = "#f4d35e";
    ctx.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top);
    ctx.strokeStyle = "rgba(244, 211, 94, 0.85)";
    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y);
    ctx.lineTo(unit.targetX, unit.targetY);
    ctx.stroke();
    ctx.fillStyle = "rgba(244, 211, 94, 0.9)";
    ctx.fillRect(Math.round(unit.targetX) - 2, Math.round(unit.targetY) - 2, 4, 4);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    const point = projectileDrawPoint(p);
    if (p.artillery) {
      const trailT = Math.max(0, point.t - 0.08);
      const tailX = p.x + (p.tx - p.x) * trailT;
      const tailBaseY = p.y + (p.ty - p.y) * trailT;
      const distance = Math.hypot(p.tx - p.x, p.ty - p.y);
      const arcHeight = Math.max(8, Math.min(34, distance * 0.12));
      const tailY = tailBaseY - Math.sin(trailT * Math.PI) * arcHeight;
      ctx.strokeStyle = p.artilleryType === "heavyShell" ? "rgba(255, 138, 52, 0.42)" : "rgba(245, 221, 109, 0.4)";
      ctx.lineWidth = p.artilleryType === "heavyShell" ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.fillStyle = p.artilleryType === "heavyShell" ? "#ff9d4d" : "#f6df73";
      ctx.fillRect(Math.round(point.x) - 2, Math.round(point.y) - 2, 5, 5);
      ctx.fillStyle = "rgba(255, 245, 214, 0.72)";
      ctx.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 2, 2);
    } else {
      ctx.fillStyle = "#f6df73";
      ctx.fillRect(Math.round(point.x), Math.round(point.y), 2, 2);
    }
  }
  for (const e of state.explosions) {
    ctx.strokeStyle = `rgba(255, 180, 80, ${1 - e.age / 0.35})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.7 + e.age * 2), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFloaters() {
  ctx.font = "8px monospace";
  ctx.fillStyle = "#f2ce58";
  for (const f of state.floaters) ctx.fillText(f.text, f.x, f.y - f.age * 8);
}

function drawPlacementPreview() {
  if (!state.placement || !state.lastPointerWorld) return;
  const spec = structureTypes[state.placement];
  const ok = canPlace(state.placement, state.lastPointerWorld.x, state.lastPointerWorld.y);
  ctx.fillStyle = ok ? "rgba(232, 187, 75, 0.32)" : "rgba(219, 65, 62, 0.42)";
  const bridgePlan = state.placement === "bridge" ? bridgeAutoPlan(state.lastPointerWorld.x, state.lastPointerWorld.y) : null;
  const previewX = bridgePlan ? bridgePlan.center.x : state.lastPointerWorld.x;
  const previewY = bridgePlan ? bridgePlan.center.y : state.lastPointerWorld.y;
  ctx.fillRect(Math.round(previewX - spec.w / 2), Math.round(previewY - spec.h / 2), spec.w, spec.h);
  if (state.placement === "wall" || state.placement === "bridge") {
    const previews = state.placement === "wall" ? wallPreviewSegments(state.lastPointerWorld.x, state.lastPointerWorld.y) : bridgePreviewSegments(state.lastPointerWorld.x, state.lastPointerWorld.y);
    for (const preview of previews) {
      ctx.strokeStyle = ok ? "rgba(232, 187, 75, 0.65)" : "rgba(219, 65, 62, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(preview.x1, preview.y1);
      ctx.lineTo(preview.x2, preview.y2);
      ctx.stroke();
    }
  }
}

function drawArtilleryPreview() {
  if (!state.selectedArtillery || !state.lastPointerWorld) return;
  const ammo = artilleryTypes[state.selectedArtillery];
  ctx.strokeStyle = "rgba(255, 175, 70, 0.8)";
  ctx.beginPath();
  ctx.arc(state.lastPointerWorld.x, state.lastPointerWorld.y, ammo.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.currentMap) return;
  ctx.save();
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);
  drawGrass();
  drawWater();
  drawRocks();
  drawSpawns();
  for (const s of PERF.blockingSegments) drawStructure(s);
  for (const s of state.structures) if (s.type !== "wallSegment" && s.type !== "bridgeSegment") drawStructure(s);
  for (const unit of state.units) drawSwarm(unit);
  drawProjectiles();
  drawFloaters();
  drawPlacementPreview();
  drawArtilleryPreview();
  ctx.restore();
}

function seedGame() {
  const playerSpawn = state.currentMap.spawns.find((s) => s.owner === "player");
  const playerCastle = spawnStructure("castle", "player", playerSpawn.x, playerSpawn.y);
  playerCastle.id = "castle-player";
  playerCastle.x = Math.max(0, playerSpawn.x - 9);
  playerCastle.y = Math.max(0, playerSpawn.y - 11);
  for (const spawn of state.currentMap.spawns.filter((s) => s.owner !== "player")) {
    const castle = spawnStructure("castle", spawn.owner, spawn.x, spawn.y);
    castle.id = `castle-${spawn.owner}`;
    state.aiPlayers.push({ owner: spawn.owner, money: 1300, wood: 160, stone: 80, unitTimer: 2 + Math.random() * 2, buildTimer: 6 + Math.random() * 5, bridgeTimer: 0, attackBias: 0, formation: "normal", waveCounter: 0, currentWaveId: 0, waveChargeUntil: 0, waveChargeTargetId: null, waveAttackUntil: 0, waveAttackTargetId: null, perimeterPlan: createInitialAiPerimeterPlan(spawn) });
    spawnStructure("tower", spawn.owner, spawn.x + (spawn.x > state.currentMap.width / 2 ? -22 : 22), spawn.y);
  }
  spawnUnit("soldier", "player", playerSpawn.x + 14, playerSpawn.y + 2);
  const miner = spawnUnit("miner", "player", playerSpawn.x + 12, playerSpawn.y + 15);
  retargetMinerUnit(miner);
}

function startGame() {
  const map = mapFromStorage();
  if (!map) return;
  syncCanvasSize();
  resetGame(map);
  seedGame();
  render();
}

function checkWinLoss() {
  const playerCastle = state.structures.find((s) => s.id === "castle-player");
  const enemyCastles = state.structures.filter((s) => s.type === "castle" && s.owner !== "player");
  if (!playerCastle) { showToast("Il castello rosso e caduto."); return true; }
  if (!enemyCastles.length) { showToast("Hai vinto la partita."); return true; }
  return false;
}

let _uiFrameCounter = 0;
function frame(now) {
  syncCanvasSize();
  const rawDt = Math.min(0.05, (now - state.lastTime) / 1000);
  const speedMultiplier = state.gameSpeed;
  const dt = rawDt * speedMultiplier;
  state.lastTime = now;
  if (state.currentMap) {
    state.camera.zoom = Math.max(state.camera.zoom, minCameraZoom());
    state.camera.x = clamp(state.camera.x, 0, Math.max(0, mapWidth() - canvas.width / state.camera.zoom));
    state.camera.y = clamp(state.camera.y, 0, Math.max(0, mapHeight() - canvas.height / state.camera.zoom));
    state.gameTime += dt;
    if (!checkWinLoss()) {
      rebuildPerfCaches();
      updateEconomy(dt);
      updateUnits(dt);
      mergeNearbyUnits();
      updateStructures(dt);
      updateProjectiles(dt);
      aiUpdate(dt);
      rebuildPerfCaches();
    }
    _uiFrameCounter++;
    if (_uiFrameCounter % 4 === 0) updateUI(); // DOM updates every 4 frames
    render();
  }
  requestAnimationFrame(frame);
}

canvas.addEventListener("click", (event) => {
  if (!state.currentMap) return;
  const p = pointerPos(event);
  state.lastPointerWorld = p;
  if (state.selectedArtillery) return fireArtillery(state.selectedArtillery, p);
  if (state.placement) return placeStructure(state.placement, p.x, p.y);
  const own = selectableAt(p.x, p.y);
  if (own) {
    const selected = selectedItem();
    if (selected?.members && own.members && selected.id !== own.id && selected.type === own.type) return mergeUnits(selected, own);
    state.selectedId = own.id;
    return;
  }
  const selected = selectedItem();
  if (!selected || !selected.members) return;
  const hostile = hostileAt(p.x, p.y);
  moveUnitTo(selected, p.x, p.y, hostile ? hostile.id : null);
});

canvas.addEventListener("mousemove", (event) => {
  if (!state.currentMap) return;
  state.lastPointerWorld = pointerPos(event);
  if (!state.camera.dragging) return;
  const rect = canvas.getBoundingClientRect();
  const dx = ((event.clientX - rect.left) - state.camera.dragStartX) / state.camera.zoom;
  const dy = ((event.clientY - rect.top) - state.camera.dragStartY) / state.camera.zoom;
  state.camera.x = clamp(state.camera.startX - dx, 0, Math.max(0, mapWidth() - canvas.width / state.camera.zoom));
  state.camera.y = clamp(state.camera.startY - dy, 0, Math.max(0, mapHeight() - canvas.height / state.camera.zoom));
});

canvas.addEventListener("mousedown", (event) => {
  if (!state.currentMap) return;
  if (event.button !== 1 && !(event.button === 0 && event.shiftKey)) return;
  const rect = canvas.getBoundingClientRect();
  state.camera.dragging = true;
  state.camera.dragStartX = event.clientX - rect.left;
  state.camera.dragStartY = event.clientY - rect.top;
  state.camera.startX = state.camera.x;
  state.camera.startY = state.camera.y;
});

window.addEventListener("mouseup", () => { state.camera.dragging = false; });

canvas.addEventListener("wheel", (event) => {
  if (!state.currentMap) return;
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const pointerBefore = pointerPos(event);
  state.camera.zoom = clamp(state.camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1), minCameraZoom(), 4);
  const screenX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const screenY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  state.camera.x = clamp(pointerBefore.x - screenX / state.camera.zoom, 0, Math.max(0, mapWidth() - canvas.width / state.camera.zoom));
  state.camera.y = clamp(pointerBefore.y - screenY / state.camera.zoom, 0, Math.max(0, mapHeight() - canvas.height / state.camera.zoom));
});

window.addEventListener("keydown", (event) => {
  if (!state.currentMap) return;
  const key = event.key.toLowerCase();
  const pan = 18 / state.camera.zoom;
  if (key === "arrowleft") state.camera.x = clamp(state.camera.x - pan, 0, Math.max(0, mapWidth() - canvas.width / state.camera.zoom));
  else if (key === "arrowright") state.camera.x = clamp(state.camera.x + pan, 0, Math.max(0, mapWidth() - canvas.width / state.camera.zoom));
  else if (key === "arrowup") state.camera.y = clamp(state.camera.y - pan, 0, Math.max(0, mapHeight() - canvas.height / state.camera.zoom));
  else if (key === "arrowdown") state.camera.y = clamp(state.camera.y + pan, 0, Math.max(0, mapHeight() - canvas.height / state.camera.zoom));
  else if (key === unitTypes.soldier.hotkey) buyUnit("soldier");
  else if (key === unitTypes.archer.hotkey) buyUnit("archer");
  else if (key === unitTypes.miner.hotkey) buyUnit("miner");
  else if (key === unitTypes.tank.hotkey) buyUnit("tank");
  else if (key === artilleryTypes.shell.hotkey) selectArtillery("shell");
  else if (key === artilleryTypes.heavyShell.hotkey) selectArtillery("heavyShell");
  else if (key === structureTypes.tower.hotkey) setPlacement("tower");
  else if (key === structureTypes.mine.hotkey) setPlacement("mine");
  else if (key === structureTypes.barracks.hotkey) setPlacement("barracks");
  else if (key === structureTypes.cannon.hotkey) setPlacement("cannon");
  else if (key === structureTypes.wall.hotkey) setPlacement("wall");
  else if (key === structureTypes.bridge.hotkey) setPlacement("bridge");
  else if (key === structureTypes.fabbro.hotkey) setPlacement("fabbro");
  else if (key === "u") upgradeCastle();
  else if (key === "q") toggleFormation();
  else if (key === "escape") {
    state.placement = null;
    state.selectedArtillery = null;
    state.selectedId = null;
  }
});

if (ui.buySoldier) ui.buySoldier.addEventListener("click", () => buyUnit("soldier"));
if (ui.buyArcher) ui.buyArcher.addEventListener("click", () => buyUnit("archer"));
if (ui.buyMiner) ui.buyMiner.addEventListener("click", () => buyUnit("miner"));
if (ui.buyTank) ui.buyTank.addEventListener("click", () => buyUnit("tank"));
if (ui.buyShell) ui.buyShell.addEventListener("click", () => selectArtillery("shell"));
if (ui.buyHeavyShell) ui.buyHeavyShell.addEventListener("click", () => selectArtillery("heavyShell"));
if (ui.buildTower) ui.buildTower.addEventListener("click", () => setPlacement("tower"));
if (ui.buildMine) ui.buildMine.addEventListener("click", () => setPlacement("mine"));
if (ui.buildBarracks) ui.buildBarracks.addEventListener("click", () => setPlacement("barracks"));
if (ui.buildCannon) ui.buildCannon.addEventListener("click", () => setPlacement("cannon"));
if (ui.buildWall) ui.buildWall.addEventListener("click", () => setPlacement("wall"));
if (ui.buildBridge) ui.buildBridge.addEventListener("click", () => setPlacement("bridge"));
if (ui.buildFabbro) ui.buildFabbro.addEventListener("click", () => setPlacement("fabbro"));
if (ui.upgradeCastle) ui.upgradeCastle.addEventListener("click", () => upgradeCastle());
if (ui.speedButton) ui.speedButton.addEventListener("click", cycleGameSpeed);
if (ui.formationBtn) ui.formationBtn.addEventListener("click", toggleFormation);

// Disable browser tooltip delay on all buttons
document.querySelectorAll(".hud-tool, .command").forEach((el) => { el.title = ""; });

startGame();
requestAnimationFrame(frame);
