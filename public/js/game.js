// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = Object.create(null);

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});


document.addEventListener("DOMContentLoaded", async () => {
    const serverPlayer = await spawnPlayer("DevPlayer");
    player.x = serverPlayer.x;
    player.y = serverPlayer.y;
});


// Scale
let zoom = 1;
const minZoom = 0.5;
const maxZoom = 6;

let baseTileSize = 32;
let tileSize = baseTileSize * zoom;

let velocityX = 0;
let velocityY = 0;
let lastMouseX = 0;
let lastMouseY = 0;


const inertiaDamping = 0.94;

// Camera
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

let visibleTilesX = 0;
let visibleTilesY = 0;

// Отслеживание мыши
let mouseX = 0;
let mouseY = 0;


let highlightRadius = false; // Флаг для включения подсветки радиуса

// Максимальный стак для блоков
const MAX_STACK = 64;


// Базовый URL API
const API_BASE = '/api';

let showInventory = true;
// Resize
function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.screenCenterX = canvas.width / 2;
    camera.screenCenterY = canvas.height / 2;
    visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
    visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
}
window.addEventListener("resize", onResize);



// Zoom
function setZoom(newZoom, centerX = camera.screenCenterX, centerY = camera.screenCenterY) {
    const oldZoom = zoom;
    zoom = Math.min(maxZoom, Math.max(minZoom, newZoom));
    if (zoom === oldZoom) return;

    const worldX = (camera.x + centerX) / (baseTileSize * oldZoom);
    const worldY = (camera.y + centerY) / (baseTileSize * oldZoom);

    tileSize = baseTileSize * zoom;
    camera.x = worldX * tileSize - centerX;
    camera.y = worldY * tileSize - centerY;

    visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
    visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
}

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom(zoom + delta, e.clientX, e.clientY);
}, { passive: false });

// Drag
let isDragging = false;
canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    velocityX = 0;
    velocityY = 0;
});

window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    camera.x -= dx;
    camera.y -= dy;
    velocityX = dx;
    velocityY = dy;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    // Сбрасываем координаты мыши при выходе за пределы канваса
    mouseX = -1;
    mouseY = -1;
});

canvas.addEventListener("mouseenter", (e) => {
    // При входе в канвас обновляем координаты
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

//Player

const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,

    width: 0.8,
    height: 1.8,

    speed: 0.12,
    gravity: 0.02,  // уменьшили для плавности
    jumpForce: 0.3, // сила прыжка/подъема

    onGround: true,
    hp: 100,

    // НОВОЕ: анимация прыжков/спусков
    jumpAnim: 0,
    jumpHeight: 0,
    jumpType: 'none',
    jumpCooldown: 0,
};


// === КЭШИРОВАНИЕ API ЗАПРОСОВ ===
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 секунд

async function cachedFetch(url, options = {}, cacheKey = null) {
    const key = cacheKey || url;
    const now = Date.now();

    // Проверяем кэш
    if (apiCache.has(key)) {
        const cached = apiCache.get(key);
        if (now - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const text = await response.text();
            console.error('API ERROR', response.status, text);
            throw new Error(text);
        }

        const data = await response.json();

        // Сохраняем в кэш
        apiCache.set(key, {
            data: data,
            timestamp: now
        });

        return data;
    } catch (error) {
        // Если есть закэшированные данные, возвращаем их даже если старые
        if (apiCache.has(key)) {
            console.log('Используем закэшированные данные из-за ошибки:', error.message);
            return apiCache.get(key).data;
        }
        throw error;
    }
}

// Получить инвентарь игрока
async function fetchPlayerInventory(playerId) {
    return cachedFetch(
        `${API_BASE}/inventory?player_id=${playerId}`,
        {},
        `inventory_${playerId}`
    );
}





// Добыть блок (комплексная операция)
async function mineBlock(playerId, x, y, layer, blockType, worldId = 1) {
    try {
        const response = await fetch(`${API_BASE}/blocks/mine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId,
                world_id: worldId,
                x: x,
                y: y,
                layer: layer,
                block_type: blockType
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('API ERROR', response.status, text);
            throw new Error(text);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка добычи блока:', error);
        return null;
    }
}




let lastUpdate = 0;
let lastSyncTime = 0;
const UPDATE_INTERVAL = 5000; // 2 секунды между обновлениями
const SYNC_INTERVAL = 5000;

window.spawnPlayer = async function(username) {
    try {
        const res = await fetch('/api/player/spawn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (!res.ok) throw new Error('Ошибка спавна игрока');

        const data = await res.json();
        window.playerId = data.id;

        // Загружаем инвентарь игрока
        await loadPlayerInventory(data.id);

        return data;
    } catch (error) {
        console.error('Ошибка спавна игрока:', error);
        throw error;
    }
};

// Функция загрузки инвентаря
async function loadPlayerInventory(playerId, forceRefresh = false) {
    try {
        // Если forceRefresh = true, очищаем кэш
        if (forceRefresh) {
            const cacheKey = `inventory_${playerId}`;
            apiCache.delete(cacheKey);
        }

        const res = await fetchPlayerInventory(playerId);
        const inventory = res.inventory ?? res;

        if (!inventory) {
            console.warn('Инвентарь пуст', res);
            return;
        }

        // ОБНОВЛЯЕМ ЛОКАЛЬНЫЙ ИНВЕНТАРЬ
        playerInventory.blocks = {};
        playerInventory.items = {};

        // Блоки
        if (inventory.blocks) {
            for (const [blockType, data] of Object.entries(inventory.blocks)) {
                // data может быть объектом {count: X, item: {...}} или просто числом
                const count = typeof data === 'object' ? data.count : data;
                if (count > 0) {
                    playerInventory.blocks[blockType] = count;
                }
            }
        }

        // Предметы
        if (inventory.items) {
            for (const [itemId, data] of Object.entries(inventory.items)) {
                const count = typeof data === 'object' ? data.count : data;
                if (count > 0) {
                    playerInventory.items[itemId] = count;
                }
            }
        }

        // Инструменты
        if (inventory.tools) {
            for (const [id, tool] of Object.entries(inventory.tools)) {
                if (playerInventory.tools[id]) {
                    playerInventory.tools[id].durability = tool.durability;
                }
            }
        }

        // Синхронизируем текущий инструмент
        if (inventory.current_tool && playerInventory.tools[inventory.current_tool]) {
            playerInventory.currentTool = inventory.current_tool;
        }

        console.log('Инвентарь загружен с сервера:', inventory);
        return inventory;

    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        return null;
    }
}

window.syncPlayer = function(player) {
    if (!window.playerId) return;

    // Троттлинг: обновляем не чаще чем раз в UPDATE_INTERVAL мс
    const now = Date.now();
    if (now - lastUpdate < UPDATE_INTERVAL) return;

    // Обновляем только если позиция изменилась
    const lastX = localStorage.getItem('lastPlayerX');
    const lastY = localStorage.getItem('lastPlayerY');

    if (lastX === player.x && lastY === player.y) return;

    fetch('/api/player/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: window.playerId,
            x: Math.round(player.x * 100) / 100,
            y: Math.round(player.y * 100) / 100,
            hp: player.hp
        })
    }).catch(err => console.error('Sync failed:', err));

    // Сохраняем последнюю позицию
    localStorage.setItem('lastPlayerX', player.x);
    localStorage.setItem('lastPlayerY', player.y);
    lastUpdate = now;
};

function checkSync() {
    const now = Date.now();
    if (now - lastSyncTime > SYNC_INTERVAL) {
        syncPlayer(player);
        lastSyncTime = now;
    }
    syncPlayerPosition();
    syncPlayerInventory();
}


//коллизия и взаимодествие игрока с миром
function getSurfaceEffect(tile) {
    switch (tile.b) {
        case 'ocean':    return { speed: 0.4 }; // замедление в океане
        case 'beach':    return { speed: 0.9 };
        case 'forest':   return { speed: 0.8 };
        case 'tundra':   return { speed: 0.7 };
        case 'savanna':  return { speed: 0.85 };
        case 'desert':   return { speed: 0.75 }; // замедление в пустыне
        case 'mountain': return { speed: 0.6 }; // замедление в горах
        case 'peak':     return { speed: 0.5 }; // замедление в пиках
        default:         return { speed: 1 };
    }
}

// Добавляем функцию для получения тайла по координатам
function getTileAt(tx, ty) {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    const chunk = chunkCache.get(key);
    if (!chunk || !chunk.tiles) {
        return { b: 'default', e: null };
    }
    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.tiles[ly][lx];
}

// Добавляем функцию проверки коллизии с объектами (включая деревья как препятствия)
function checkObjectCollision() {
    const left = Math.floor(player.x - player.width / 2);
    const right = Math.floor(player.x + player.width / 2);
    const top = Math.floor(player.y - player.height);
    const bottom = Math.floor(player.y);

    for (let tx = left; tx <= right; tx++) {
        for (let ty = top; ty <= bottom; ty++) {
            const tile = getTileAt(tx, ty);
            if (tile.e && isSolidEntity(tile.e)) {
                return true; // коллизия
            }
        }
    }
    return false; // нет коллизии
}

// Функция для определения, является ли сущность твердой (деревья - препятствия)
function isSolidEntity(e) {
    return ['tree', 'jungle_tree', 'pine', 'cactus'].includes(e); // деревья - препятствия, кусты можно добавить если нужно
}

// Для autostep: добавляем базовую логику для автоматического подъема на переходах (вода -> пляж, лес/тундра/саванна -> горы)
// Модифицируем движение для проверки перехода и автоподъема (предполагаем, что гравитация и vy будут использоваться для подъема, но пока добавляем как корректировку y)
function getBiomeHeight(biome) {
    switch (biome) {
        case 'ocean': return 0;
        case 'beach': return 1;
        case 'forest': return 1;
        case 'tundra': return 1;
        case 'savanna': return 1;
        case 'desert': return 1;
        case 'mountain': return 2;
        case 'peak': return 3;
        default: return 1;
    }
}

// Модифицируем updatePlayer для поддержки autostep
function updatePlayer() {
    let dx = 0;
    let dy = 0;

    // --- управление ---
    if (keys['a'] || keys['arrowleft'])  dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup'])    dy -= 1;
    if (keys['s'] || keys['arrowdown'])  dy += 1;

    // --- нормализация диагонали ---
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
    }

    // === ОБНОВЛЕНИЕ АНИМАЦИИ ПРЫЖКА (ГЛАВНОЕ ИСПРАВЛЕНИЕ) ===
    if (player.jumpAnim > 0) {
        player.jumpAnim -= 0.12; // затухание анимации
        if (player.jumpAnim <= 0) {
            player.jumpAnim = 0;
            player.onGround = true;
            player.vy = 0;
            player.jumpType = 'none';
        }
    }

    // Гравитация ТОЛЬКО во время прыжка
    if (!player.onGround && player.jumpAnim > 0) {
        player.vy += player.gravity;
        player.y += player.vy * 0.8; // плавное движение
    }

    // Кулдаун
    if (player.jumpCooldown > 0) player.jumpCooldown--;

    const currentTile = getTileAt(Math.floor(player.x), Math.floor(player.y));
    const surface = getSurfaceEffect(currentTile);
    const speed = player.speed * surface.speed;

    const moveX = dx * speed;
    const moveY = dy * speed;



    // 🔥 ОСОБЫЙ ПРЫЖОК: выход из воды на пляж
    if (player.onGround && player.jumpCooldown === 0) {
        const currentHeight = getBiomeHeight(currentTile.b);

        // ПРЯМО СЕЙЧАС проверяем НАПРАВЛЕНИЕ движения
        const lookAheadDist = 1.2;
        const lookAheadX = Math.floor(player.x + dx * lookAheadDist);
        const lookAheadY = Math.floor(player.y + dy * lookAheadDist);
        const aheadTile = getTileAt(lookAheadX, lookAheadY);
        const aheadHeight = getBiomeHeight(aheadTile.b);
        const heightDiff = aheadHeight - currentHeight;


        // === ОТЛИЧИЕ ВЫСОТ = ПРЫЖОК/СПУСК ===
        if (Math.abs(heightDiff) === 1) {
            if (heightDiff > 0) {
                // ПОДЪЕМ (включая океан→пляж!)
                console.log("⬆️  ПОДЪЕМ обнаружен!");
                triggerJump('up', heightDiff);
                return;
            } else {
                // СПУСК (пляж→океан)
                console.log("⬇️  СПУСК обнаружен!");
                triggerJump('down', Math.abs(heightDiff));
                return;
            }
        }
    }

    // === X ДВИЖЕНИЕ ===
    const oldX = player.x;
    const targetX = player.x + moveX;

    // БЛОКИРОВКА движения во время прыжка
    if (player.onGround) {
        player.x = targetX;
        if (checkObjectCollision()) {
            player.x = oldX;
        }
    }

    // === Y ДВИЖЕНИЕ ===
    const oldY = player.y;
    const targetY = player.y + moveY;

    if (player.onGround) {
        player.y = targetY;
        if (checkObjectCollision()) {
            player.y = oldY;
        }
    }

    // 🔥 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ПРЫЖКА ПО ВСЕМ БИОМАМ
    if (player.onGround && player.jumpCooldown === 0) {
        const currentHeight = getBiomeHeight(currentTile.b);
        const nextTileX = getTileAt(Math.floor(player.x + dx * 1.5), Math.floor(player.y));
        const nextHeightX = getBiomeHeight(nextTileX.b);
        const heightDiffX = nextHeightX - currentHeight;

        if (Math.abs(heightDiffX) === 1) {
            if (heightDiffX > 0 && isAutostepTransition(currentTile.b, nextTileX.b)) {
                console.log("🏔️ MOUNTAIN JUMP:", currentTile.b, "→", nextTileX.b);
                triggerJump('up', heightDiffX);

            } else if (heightDiffX < 0) {
                console.log("⬇️ DESCENT:", currentTile.b, "→", nextTileX.b);
                triggerJump('down', Math.abs(heightDiffX));

            }
        }
    }
}



//запускает прыжок/спуск
function triggerJump(type, heightLevels) {
    console.log(`🎮 TRIGGER JUMP: ${type} (${heightLevels})`);
    player.onGround = false;
    player.jumpType = type;
    player.jumpAnim = 1.0;
    player.jumpHeight = heightLevels * 0.8;
    player.vy = type === 'up' ? -player.jumpForce * heightLevels : player.jumpForce * heightLevels / 2;
    player.jumpCooldown = 15;
}

// Функция для проверки, является ли переход autostep (вода -> пляж, лес/тундра/саванна -> горы)
function isAutostepTransition(currentBiome, targetBiome) {
    // Прыжки разрешены: океан->пляж И лес/тундра/саванна->горы/пики
    if (currentBiome === 'ocean' && targetBiome === 'beach') return true;
    return ['forest', 'tundra', 'savanna'].includes(currentBiome) &&
        ['mountain', 'peak'].includes(targetBiome);
}


// Конфигурация инструментов (похожа на GregTech/IguanaTweaks)
const TOOLS_CONFIG = {
    hand: {
        id: 'hand',
        name: 'Рука',
        durability: Infinity,
        miningLevel: 0,
        miningSpeed: 1.0,
        damage: 1,
        // Какие типы блоков может добывать
        canMine: {
            'plant': true,    // Растения
            'dirt': true,     // Земля, песок, гравий
            'wood': true,     // Деревья
        }
    },
    axe: {
        id: 'axe',
        name: 'Деревянный топор',
        durability: 60,
        miningLevel: 1,
        miningSpeed: 2.0,
        damage: 4,
        canMine: {
            'plant': true,
            'dirt': false,
            'wood': true,
            'leaves': true,
        }
    },
    shovel: {
        id: 'shovel',
        name: 'Деревянная лопата',
        durability: 60,
        miningLevel: 1,
        miningSpeed: 2.0,
        damage: 3,
        canMine: {
            'plant': false,
            'dirt': true,
            'sand': true,
            'gravel': true,
            'clay': true,
        }
    },
    pickaxe: {
        id: 'pickaxe',
        name: 'Деревянная кирка',
        durability: 60,
        miningLevel: 1,
        miningSpeed: 2.0,
        damage: 3,
        canMine: {
            'stone': true,
            'ore': true,
            'mineral': true,
        }
    }
};

// Конфигурация блоков (mining level, hardness, required tool)
const BLOCKS_CONFIG = {
    // Поверхностные блоки (s)
    'grass':        { type: 'plant',   level: 0, hardness: 0.5, tool: 'hand' },
    'beach_sand':   { type: 'sand',    level: 0, hardness: 0.3, tool: 'hand' },
    'sand':         { type: 'sand',    level: 0, hardness: 0.3, tool: 'shovel' },
    'clay':         { type: 'clay',    level: 0, hardness: 0.6, tool: 'shovel' },
    'gravel':       { type: 'gravel',  level: 0, hardness: 0.7, tool: 'shovel' },
    'desert_sand':  { type: 'sand',    level: 0, hardness: 0.3, tool: 'shovel' },
    'stone':        { type: 'stone',   level: 1, hardness: 1.5, tool: 'pickaxe' },
    'rock_peak':    { type: 'stone',   level: 2, hardness: 2.0, tool: 'pickaxe' },
    'snow':         { type: 'plant',   level: 0, hardness: 0.2, tool: 'shovel' },
    'snow_peak':    { type: 'stone',   level: 1, hardness: 1.0, tool: 'pickaxe' },
    'deep_ocean':   { type: 'water',   level: 0, hardness: Infinity, tool: null },
    'water':        { type: 'water',   level: 0, hardness: Infinity, tool: null },

    // Грунтовые блоки (g) - под поверхностью
    'dirt':         { type: 'dirt',    level: 0, hardness: 0.5, tool: 'shovel' },
    'ocean':        { type: 'water',   level: 0, hardness: Infinity, tool: null },
    'sand_ground':  { type: 'sand',    level: 0, hardness: 0.4, tool: 'shovel' },

    // Объекты (e)
    'tree':         { type: 'wood',    level: 0, hardness: 1.0, tool: 'axe' },
    'jungle_tree':  { type: 'wood',    level: 0, hardness: 1.2, tool: 'axe' },
    'pine':         { type: 'wood',    level: 0, hardness: 1.1, tool: 'axe' },
    'cactus':       { type: 'plant',   level: 0, hardness: 0.8, tool: 'hand' },
    'flower_red':   { type: 'plant',   level: 0, hardness: 0.1, tool: 'hand' },
    'flower_yellow':{ type: 'plant',   level: 0, hardness: 0.1, tool: 'hand' },
    'flower_white': { type: 'plant',   level: 0, hardness: 0.1, tool: 'hand' },
    'stone_flower': { type: 'mineral', level: 1, hardness: 1.0, tool: 'pickaxe' },
    'grass_detail': { type: 'plant',   level: 0, hardness: 0.1, tool: 'hand' },
    'bush_cold':    { type: 'plant',   level: 0, hardness: 0.3, tool: 'hand' },
    'sugar_cane':   { type: 'plant',   level: 0, hardness: 0.2, tool: 'hand' },

    // Руда (o)
    'ore_andesite':      { type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_basalt':        { type: 'ore', level: 1, hardness: 2.2, tool: 'pickaxe' },
    'ore_brown_limonite':{ type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_yellow_limonite':{ type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_malachite':     { type: 'ore', level: 1, hardness: 2.5, tool: 'pickaxe' },
    'ore_copper':        { type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_cassiterite':   { type: 'ore', level: 1, hardness: 2.3, tool: 'pickaxe' },
    'ore_tin':           { type: 'ore', level: 1, hardness: 2.1, tool: 'pickaxe' },
    'ore_bismuth':       { type: 'ore', level: 1, hardness: 2.4, tool: 'pickaxe' },
};

// Замените INFINITE_RESOURCES и INFINITE_BLOCKS на RESOURCE_CONFIG:
const RESOURCE_CONFIG = {
    // === БЕСКОНЕЧНЫЕ С ДРОПОМ (persistent) ===
    'stone': {
        finite: false,
        drop: 1,
        persistent: true  // Остается на карте после добычи
    },

    // === КОНЕЧНЫЕ (finite) ГРУНТОВЫЕ БЛОКИ ===
    'dirt': { finite: true, drop: 1 },
    'sand': { finite: true, drop: 1 },
    'gravel': { finite: true, drop: 1 },
    'clay': { finite: true, drop: 1 },
    'beach_sand': { finite: true, drop: 1 },
    'desert_sand': { finite: true, drop: 1 },
    'snow': { finite: true, drop: 1 },

    // Растения и цветы (1 блок)
    'grass': { finite: true, drop: 1 },
    'grass_detail': { finite: true, drop: 1 },
    'flower_red': { finite: true, drop: 1 },
    'flower_yellow': { finite: true, drop: 1 },
    'flower_white': { finite: true, drop: 1 },
    'cactus': { finite: true, drop: 1 },
    'bush_cold': { finite: true, drop: 1 },
    'sugar_cane': { finite: true, drop: 1 },
    'stone_flower': { finite: true, drop: 1 },

    // Деревья (3-5 блоков)
    'tree': { finite: true, drop: 3 },
    'jungle_tree': { finite: true, drop: 4 },
    'pine': { finite: true, drop: 3 },

    // Руда (1-2 блока)
    'ore_andesite': { finite: true, drop: 1 },
    'ore_basalt': { finite: true, drop: 1 },
    'ore_brown_limonite': { finite: true, drop: 2 },
    'ore_yellow_limonite': { finite: true, drop: 2 },
    'ore_malachite': { finite: true, drop: 1 },
    'ore_copper': { finite: true, drop: 1 },
    'ore_cassiterite': { finite: true, drop: 1 },
    'ore_tin': { finite: true, drop: 1 },
    'ore_bismuth': { finite: true, drop: 1 },

    // Декоративные блоки
    'rock_peak': { finite: true, drop: 1 },
    'snow_peak': { finite: true, drop: 1 },

    // Вода и жидкости (нельзя добывать)
    'water': { finite: false, drop: 0, unbreakable: true },
    'deep_ocean': { finite: false, drop: 0, unbreakable: true },
    'ocean': { finite: false, drop: 0, unbreakable: true },
    'lake': { finite: false, drop: 0, unbreakable: true },
};

const playerInventory = {
    tools: {
        hand: { ...TOOLS_CONFIG.hand, durability: Infinity },
        axe: { ...TOOLS_CONFIG.axe, durability: TOOLS_CONFIG.axe.durability },
        shovel: { ...TOOLS_CONFIG.shovel, durability: TOOLS_CONFIG.shovel.durability },
        pickaxe: { ...TOOLS_CONFIG.pickaxe, durability: TOOLS_CONFIG.pickaxe.durability }
    },

    currentTool: 'hand',

    // Блоки в инвентаре
    blocks: {},

    // Предметы
    items: {},

    // Сменить инструмент
    switchTool(toolId) {
        if (this.tools[toolId]) {
            this.currentTool = toolId;
            console.log(`Инструмент изменен на: ${this.tools[toolId].name}`);
            return true;
        }
        return false;
    },

    // Использовать инструмент (уменьшить прочность)
    useTool() {
        const tool = this.tools[this.currentTool];
        if (tool.durability !== Infinity) {
            tool.durability--;
            if (tool.durability <= 0) {
                console.log(`Инструмент ${tool.name} сломался!`);
                // Возвращаемся к руке
                this.currentTool = 'hand';
            }
        }
    },

    // Добавить блок в инвентарь
    addBlock(blockType, count = 1) {
        if (!this.blocks[blockType]) {
            this.blocks[blockType] = 0;
        }
        this.blocks[blockType] = Math.min(this.blocks[blockType] + count, MAX_STACK);
    },

    // Получить текущий инструмент
    getCurrentTool() {
        return this.tools[this.currentTool];
    },

    // Проверить, может ли текущий инструмент добывать блок
    canMineBlock(blockType) {
        const tool = this.getCurrentTool();
        const blockConfig = BLOCKS_CONFIG[blockType];

        if (!blockConfig || !tool) return false;

        // Проверяем уровень добычи
        if (tool.miningLevel < blockConfig.level) {
            console.log(`Слишком низкий уровень инструмента! Нужен уровень ${blockConfig.level}`);
            return false;
        }

        // Проверяем тип инструмента
        if (blockConfig.tool && blockConfig.tool !== tool.id) {
            // Если блок требует конкретный инструмент, а у нас другой
            if (blockConfig.tool === 'pickaxe' && tool.id !== 'pickaxe') return false;
            if (blockConfig.tool === 'axe' && tool.id !== 'axe') return false;
            if (blockConfig.tool === 'shovel' && tool.id !== 'shovel') return false;
        }

        // Проверяем по типу блока (canMine)
        return tool.canMine[blockConfig.type] || false;
    },

    // Получить скорость добычи для блока
    getMiningSpeed(blockType) {
        const tool = this.getCurrentTool();
        const blockConfig = BLOCKS_CONFIG[blockType];

        if (!this.canMineBlock(blockType)) return 0;

        // Базовая скорость добычи = скорость инструмента / твердость блока
        return (tool.miningSpeed / blockConfig.hardness) * 100;
    }
};


// === СИСТЕМА РАЗРУШЕНИЯ БЛОКОВ ===
let miningMode = false;
let miningTarget = null;
let miningProgress = 0;
let miningTimer = null;
const MINING_RADIUS = 8;
let showLayerLegend = false;

// === СИСТЕМА МНОГОСЛОЙНОГО РЕНДЕРИНГА ===
const LayerRenderer = {
    // Получить все видимые слои для тайла
    getVisibleLayers(tile, showPreview = false, previewLayer = null, prospectingMode = { ore: false, liquid: false }) {
        const layers = [];

        // 1. Биом (фон)
        if (tile.b) {
            layers.push({
                type: 'biome',
                value: tile.b,
                visible: true,
                priority: 0
            });
        }

        // 2. Скальная порода (r) - бесконечный камень под всем
        if (tile.r && tile.r !== 'none') {
            layers.push({
                type: 'rock',
                value: tile.r,
                visible: !tile.o && !tile.g && !tile.s, // Только если нет других слоев
                priority: 1
            });
        }

        // 3. Руда (o) - в скальной породе
        if (tile.o && tile.o !== 'none') {
            layers.push({
                type: 'ore',
                value: tile.o,
                visible: (!tile.g && !tile.s) || showPreview,
                priority: 2
            });
        }

        // 4. Подпочва (p) - переходный слой между грунтом и скалой
        if (tile.p && tile.p !== 'none') {
            layers.push({
                type: 'subsoil',
                value: tile.p,
                visible: !tile.g && !tile.s,
                priority: 3
            });
        }

        // 5. Грунт (g) - основной слой почвы
        if (tile.g && tile.g !== 'none') {
            layers.push({
                type: 'ground',
                value: tile.g,
                visible: !tile.s || showPreview,
                priority: 4
            });
        }

        // 6. Поверхность (s) - верхний слой
        if (tile.s && tile.s !== 'none') {
            layers.push({
                type: 'surface',
                value: tile.s,
                visible: true,
                priority: 5
            });
        }

        // 7. Объекты (e) - растения, деревья
        if (tile.e && tile.e !== 'none') {
            layers.push({
                type: 'entity',
                value: tile.e,
                visible: true,
                priority: 6
            });
        }

        // 8. Жидкость (l) - поверх всего
        if (tile.l && tile.l !== 'none') {
            layers.push({
                type: 'liquid',
                value: tile.l,
                amount: tile.la || 0,
                max: tile.lm || 0,
                visible: prospectingMode.liquid,
                priority: 7
            });
        }

        // Сортируем по приоритету
        layers.sort((a, b) => a.priority - b.priority);

        // Режим предпросмотра для добычи
        if (showPreview && previewLayer) {
            const previewIndex = layers.findIndex(l => l.type === previewLayer);
            if (previewIndex > -1) {
                layers[previewIndex].preview = true;

                // Показываем следующий слой
                if (previewIndex + 1 < layers.length) {
                    layers[previewIndex + 1].visible = true;
                    layers[previewIndex + 1].previewNext = true;
                }
            }
        }

        return layers.filter(layer => layer.visible !== false);
    },

    // Отрисовать тайл со всеми слоями
    renderTileLayers(ctx, x, y, tile, tileSize, showPreview = false, previewLayer = null, prospectingMode = { ore: false, liquid: false }) {
        const layers = this.getVisibleLayers(tile, showPreview, previewLayer, prospectingMode);

        // Очищаем область
        ctx.clearRect(x, y, tileSize, tileSize);

        // Рисуем слои от нижнего к верхнему
        layers.forEach(layer => {
            this.renderLayer(ctx, x, y, layer, tileSize);
        });
    },

    // Отрисовать один слой
    renderLayer(ctx, x, y, layer, tileSize) {
        const { type, value, preview = false, previewNext = false, amount, max } = layer;

        let color = colors[value] || '#000';
        let alpha = 1.0;

        // Настройки для разных типов слоев
        switch(type) {
            case 'biome':
                // Биом - фон, полупрозрачный
                alpha = 0.3;
                color = this.darkenColor(color, 0.5);
                break;

            case 'ground':
                // Грунт - темнее обычного
                color = this.darkenColor(color, 0.7);
                if (preview) alpha = 0.4;
                break;

            case 'ore':
                // Руда - текстурированная
                color = colors[value] || '#FFD700';
                if (preview) alpha = 0.5;
                break;

            case 'surface':
                // Поверхность - обычный цвет
                if (preview) alpha = 0.3;
                break;

            case 'entity':
                // Объекты - особый рендеринг
                this.renderEntity(ctx, x, y, tileSize, value, preview ? 0.3 : 1.0);
                return; // Возвращаем, так как объект рисуется отдельно

            case 'liquid':
                // Жидкость - с прозрачностью
                alpha = 0.6;
                this.renderLiquid(ctx, x, y, tileSize, color, amount, max);
                return;

            case 'rock':
                // Скальная порода - темный камень
                color = this.darkenColor(color, 0.8);
                if (preview) alpha = 0.4;
                break;

            case 'subsoil':
                // Подпочва - смесь земли и камня
                color = this.mixColors('#8B7355', color, 0.5); // Смешиваем землю и камень
                if (preview) alpha = 0.4;
                break;
        }

        // Применяем прозрачность
        if (alpha !== 1.0) ctx.globalAlpha = alpha;

        // Рисуем слой
        ctx.fillStyle = color;
        ctx.fillRect(x, y, tileSize, tileSize);

        // Для руды добавляем текстуру
        if (type === 'ore' && !preview) {
            this.renderOreTexture(ctx, x, y, tileSize, color);
        }

        // Для previewNext добавляем подсветку
        if (previewNext) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }

        // Восстанавливаем прозрачность
        if (alpha !== 1.0) ctx.globalAlpha = 1.0;
    },

    // Рендер текстуры руды
    renderOreTexture(ctx, x, y, size, color) {
        ctx.fillStyle = this.lightenColor(color, 0.3);
        const spots = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < spots; i++) {
            const spotX = x + Math.random() * (size - 4);
            const spotY = y + Math.random() * (size - 4);
            const spotSize = 2 + Math.random() * 3;

            ctx.beginPath();
            ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Рендер объекта
    renderEntity(ctx, x, y, size, entityType, alpha = 1.0) {
        ctx.globalAlpha = alpha;

        const color = colors[entityType] || '#228B22';

        if (entityType.includes('tree')) {
            // Дерево
            ctx.fillStyle = this.darkenColor(color, 0.3);
            ctx.fillRect(x + size/2 - 3, y + size/4, 6, size/2);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(x + size/2, y + size/4, size/3, size/4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (entityType.includes('flower')) {
            // Цветок
            ctx.fillStyle = color;
            ctx.fillRect(x + size/2 - 4, y + size/2 - 4, 8, 8);
        } else if (entityType === 'cactus') {
            // Кактус
            ctx.fillStyle = color;
            ctx.fillRect(x + size/2 - 3, y + 4, 6, size - 8);
        } else if (entityType === 'grass_detail') {
            // Травинка
            ctx.fillStyle = color;
            ctx.fillRect(x + 4, y + 4, size - 8, 2);
        } else {
            // Остальные объекты
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        }

        ctx.globalAlpha = 1.0;
    },

    // Рендер жидкости
    renderLiquid(ctx, x, y, size, color, amount = 0, max = 100) {
        const fillHeight = (amount / max) * size;

        // Фон
        ctx.fillStyle = this.darkenColor(color, 0.7);
        ctx.fillRect(x, y, size, size);

        // Жидкость
        ctx.fillStyle = color;
        ctx.fillRect(x, y + size - fillHeight, size, fillHeight);
    },

    // Вспомогательные функции для работы с цветами
    darkenColor(hex, factor) {
        if (!hex || hex === 'none') return '#000';
        if (!hex.startsWith('#')) return hex;

        const r = Math.floor(parseInt(hex.slice(1,3), 16) * factor);
        const g = Math.floor(parseInt(hex.slice(3,5), 16) * factor);
        const b = Math.floor(parseInt(hex.slice(5,7), 16) * factor);

        return `rgb(${r},${g},${b})`;
    },

    lightenColor(hex, factor) {
        if (!hex || hex === 'none') return '#FFF';
        if (!hex.startsWith('#')) return hex;

        const r = Math.min(255, Math.floor(parseInt(hex.slice(1,3), 16) * (1 + factor)));
        const g = Math.min(255, Math.floor(parseInt(hex.slice(3,5), 16) * (1 + factor)));
        const b = Math.min(255, Math.floor(parseInt(hex.slice(5,7), 16) * (1 + factor)));

        return `rgb(${r},${g},${b})`;
    },
    mixColors(color1, color2, ratio) {
        // Конвертируем hex в rgb
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        const rgb1 = hexToRgb(color1) || {r:0,g:0,b:0};
        const rgb2 = hexToRgb(color2) || {r:0,g:0,b:0};

        const r = Math.round(rgb1.r * ratio + rgb2.r * (1 - ratio));
        const g = Math.round(rgb1.g * ratio + rgb2.g * (1 - ratio));
        const b = Math.round(rgb1.b * ratio + rgb2.b * (1 - ratio));

        return `rgb(${r},${g},${b})`;
    }
};


// Функция для определения, какой слой разрушать
function getBlockToMine(tile) {
    // Приоритет разрушения:
    // 1. Объекты (деревья, цветы)
    // 2. Поверхность (трава, песок, камень)
    // 3. Грунт (земля под поверхностью)
    // 4. Руда

    const tool = playerInventory.getCurrentTool();

    // Если в руках кирка И есть руда - добываем руду
    if (tool.id === 'pickaxe' && tile.o && tile.o !== 'none') {
        return { type: tile.o, layer: 'o' };
    }

    // Если в руках топор И есть дерево - добываем дерево
    if (tool.id === 'axe' && tile.e && tile.e !== 'none' &&
        ['tree', 'jungle_tree', 'pine'].includes(tile.e)) {
        return { type: tile.e, layer: 'e' };
    }

    // Если в руках лопата И есть земля/песок - добываем грунт
    if (tool.id === 'shovel' && tile.g && tile.g !== 'none' &&
        ['dirt', 'sand', 'sand_ground', 'clay', 'gravel'].includes(tile.g)) {
        return { type: tile.g, layer: 'g' };
    }

    // Если в руках кирка И есть камень на поверхности
    if (tool.id === 'pickaxe' && tile.s && tile.s !== 'none' &&
        ['stone', 'rock_peak', 'snow_peak'].includes(tile.s)) {
        return { type: tile.s, layer: 's' };
    }

    // Если в руках рука И есть цветы/трава - добываем их
    if (tool.id === 'hand' && tile.e && tile.e !== 'none' &&
        ['flower_red', 'flower_yellow', 'flower_white', 'grass_detail', 'cactus', 'bush_cold', 'sugar_cane'].includes(tile.e)) {
        return { type: tile.e, layer: 'e' };
    }

    if (tile.e && tile.e !== 'none') {
        return { type: tile.e, layer: 'e' };
    } else if (tile.s && tile.s !== 'none') {
        return { type: tile.s, layer: 's' };
    } else if (tile.g && tile.g !== 'none') {
        return { type: tile.g, layer: 'g' };
    } else if (tile.o && tile.o !== 'none') {
        return { type: tile.o, layer: 'o' };
    }

    return null;
}

// Проверка расстояния до блока
function isBlockInRange(worldX, worldY) {
    const distance = Math.sqrt(
        Math.pow(player.x - worldX, 2) +
        Math.pow(player.y - worldY, 2)
    );
    return distance <= MINING_RADIUS;
}

// Функция для перерисовки чанка
function refreshChunk(chunk) {
    if (chunk && chunk.canvas) {
        const chunkCtx = chunk.canvas.getContext('2d');
        chunkCtx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);

        // Рендерим с учетом режимов проспектинга
        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const tile = chunk.tiles[y][x];
                const tx = x * baseTileSize;
                const ty = y * baseTileSize;

                LayerRenderer.renderTileLayers(
                    chunkCtx,
                    tx, ty,
                    tile,
                    baseTileSize,
                    false, // showPreview
                    null,  // previewLayer
                    { ore: isOreProspecting, liquid: isLiquidProspecting }
                );
            }
        }
    }
}

// Начать добычу блока
function startMining(tx, ty, chunk, tile, blockInfo) {
    if (!isBlockInRange(tx + 0.5, ty + 0.5)) {
        console.log('Слишком далеко! Максимальная дистанция: ' + MINING_RADIUS);
        return;
    }

    //проверку на неразрушаемые блоки
    if (!playerInventory.canMineBlock(blockInfo.type)) {
        console.log('Нельзя добыть этот блок текущим инструментом!');

        // Проверяем, является ли блок неразрушаемым
        const resourceConfig = RESOURCE_CONFIG[blockInfo.type];
        if (resourceConfig && resourceConfig.unbreakable) {
            console.log('Этот блок нельзя разрушить!');
        }
        return;
    }

    miningTarget = {
        tx, ty,
        chunkData: chunk, // Теперь передаем весь объект чанка
        tile: tile,
        blockInfo: blockInfo,
        startTime: Date.now()
    };

    miningMode = true;
    const miningSpeed = playerInventory.getMiningSpeed(blockInfo.type);

    // Рассчитываем время добычи (в мс)
    const miningTime = (1000 / miningSpeed) * 1000;

    console.log(`Начата добыча ${blockInfo.type}, время: ${(miningTime/1000).toFixed(2)}с`);

    // Перерисовываем чанк с предпросмотром
    refreshChunk(chunk);

    // Запускаем таймер добычи
    miningTimer = setTimeout(() => {
        finishMining();
    }, miningTime);

    // Запускаем анимацию прогресса
    miningProgress = 0;
    const progressInterval = setInterval(() => {
        miningProgress += 100 / (miningTime / 100);
        if (miningProgress >= 100 || !miningMode) {
            clearInterval(progressInterval);
        }
    }, 100);
}



// Завершить добычу
async function finishMining() {
    if (!miningTarget) return;

    const { tx, ty, chunkData, blockInfo } = miningTarget;
    const resourceConfig = RESOURCE_CONFIG[blockInfo.type] || {
        finite: false,
        drop: 0,
        persistent: false
    };

    // Проверяем, является ли блок неразрушаемым
    if (resourceConfig.unbreakable) {
        console.log('Этот блок нельзя разрушить!');
        cancelMining();
        return;
    }

    try {
        const serverResult = await mineBlock(
            window.playerId,
            tx,
            ty,
            blockInfo.layer,
            blockInfo.type
        );

        // Если сервер вернул ошибку, отменяем добычу
        if (!serverResult || !serverResult.success) {
            throw new Error(serverResult?.error || 'Ошибка добычи на сервере');
        }

        // === ОБНОВЛЕНИЕ НА КЛИЕНТЕ ===

        // 1. ОБНОВЛЯЕМ ТАЙЛ ИЗ ОТВЕТА СЕРВЕРА
        if (serverResult.tile) {
            // Обновляем тайл в чанке
            const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            chunkData.tiles[ly][lx] = serverResult.tile;
        }

        // 2. СРАЗУ ОБНОВЛЯЕМ ИНВЕНТАРЬ НА КЛИЕНТЕ
        if (serverResult.added_to_inventory) {
            const resourceConfig = RESOURCE_CONFIG[blockInfo.type] || {};
            const dropCount = serverResult.drop || resourceConfig.drop || 1;

            // Определяем тип предмета для инвентаря
            let itemType = blockInfo.type;

            // Для персистентных блоков - используем специальный тип
            if (resourceConfig.persistent) {
                itemType = `persistent_${blockInfo.type}`;
            }

            // Добавляем в локальный инвентарь
            playerInventory.addBlock(itemType, dropCount);

            // Показываем уведомление
            showNotification(`+${dropCount} ${blockInfo.type}`, '#4CAF50');
        }

        // 3. СИНХРОНИЗИРУЕМ ИНВЕНТАРЬ С СЕРВЕРОМ
        if (window.playerId) {
            // Загружаем актуальный инвентарь с сервера
            await loadPlayerInventory(window.playerId);

            // Обновляем прочность инструмента
            const tool = playerInventory.getCurrentTool();
            if (tool.durability !== Infinity) {
                playerInventory.useTool();

                // Отправляем обновление прочности на сервер
                await fetch(`${API_BASE}/inventory/update-tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player_id: window.playerId,
                        tool_id: tool.id,
                        durability: tool.durability
                    })
                });
            }
        }

        // 4. ПЕРЕРИСОВЫВАЕМ ЧАНК
        refreshChunk(chunkData);

        // Очищаем кэш чанков
        cleanupChunkCache();

        console.log(`Добыт блок: ${blockInfo.type}`);
        console.log('Результат сервера:', serverResult);

    } catch (error) {
        console.error('Ошибка синхронизации с сервером:', error);
        showNotification(`Ошибка: ${error.message}`, '#F44336');
    }

    // Сбрасываем состояние добычи
    miningMode = false;
    miningTarget = null;
    miningProgress = 0;
    if (miningTimer) {
        clearTimeout(miningTimer);
        miningTimer = null;
    }
}


// Функция для показа уведомлений
function showNotification(text, color = '#4CAF50') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.textContent = text;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-family: Arial;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s, transform 0.3s;
    `;

    document.body.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);

    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Отменить добычу
function cancelMining() {
    if (miningTimer) {
        clearTimeout(miningTimer);
        miningTimer = null;
    }
    miningMode = false;
    miningTarget = null;
    miningProgress = 0;
}

// Обработчик клика для добычи
let shiftKeyPressed = false;

window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') shiftKeyPressed = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') shiftKeyPressed = false;
});


//Меню выбора слоя
function showLayerSelectionMenu(tx, ty, tile, chunk) {
    const layers = [];

    // Собираем все доступные слои
    if (tile.e && tile.e !== 'none') {
        layers.push({ type: tile.e, layer: 'e', name: getLayerName('e') });
    }
    if (tile.s && tile.s !== 'none') {
        layers.push({ type: tile.s, layer: 's', name: getLayerName('s') });
    }
    if (tile.g && tile.g !== 'none') {
        layers.push({ type: tile.g, layer: 'g', name: getLayerName('g') });
    }
    if (tile.o && tile.o !== 'none') {
        layers.push({ type: tile.o, layer: 'o', name: getLayerName('o') });
    }

    if (layers.length === 0) {
        console.log('Нет доступных слоев для добычи');
        return;
    }

    // Показываем меню (можно сделать как всплывающее окно или консольный вывод)
    console.log('Доступные слои для добычи:');
    layers.forEach((layer, index) => {
        console.log(`${index + 1}. ${layer.name}: ${layer.type}`);
    });

    let selectedLayer = null;

    // Ищем слой, который можно добыть текущим инструментом
    for (const layer of layers) {
        if (playerInventory.canMineBlock(layer.type)) {
            selectedLayer = layer;
            break;
        }
    }

    if (selectedLayer) {
        console.log(`Выбран слой: ${selectedLayer.name} (${selectedLayer.type})`);
        startMining(tx, ty, chunk, tile, selectedLayer);
    } else {
        console.log('Нет слоев, которые можно добыть текущим инструментом');
    }
}

// Обновленная функция для клика
canvas.addEventListener('click', (e) => {
    if (miningMode) {
        cancelMining();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = (x + camera.x) / tileSize;
    const worldY = (y + camera.y) / tileSize;
    const tx = Math.floor(worldX);
    const ty = Math.floor(worldY);

    // Получаем чанк и тайл
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    const chunk = chunkCache.get(key);

    if (!chunk || !chunk.tiles) return;

    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const tile = chunk.tiles[ly][lx];

    // Если зажат Shift - показываем меню выбора слоя
    if (shiftKeyPressed) {
        showLayerSelectionMenu(tx, ty, tile, chunk);
        return;
    }

    // Определяем, какой блок добывать (с учетом инструмента)
    const blockInfo = getBlockToMine(tile);
    if (!blockInfo) {
        console.log('Здесь нечего добывать');
        return;
    }

    startMining(tx, ty, chunk, tile, blockInfo);
});

// Добавим обработку движения для отмены добычи
window.addEventListener('keydown', () => {
    if (miningMode && (keys['a'] || keys['d'] || keys['w'] || keys['s'])) {
        cancelMining();
    }
});

// Рендер прогресса добычи
function renderMiningProgress() {
    if (!miningMode || miningProgress <= 0) return;

    if (miningTarget) {
        const { tx, ty } = miningTarget;
        const screenX = tx * tileSize - camera.x;
        const screenY = ty * tileSize - camera.y;

        // Фон прогресса
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX, screenY - 10, tileSize, 5);

        // Полоса прогресса
        ctx.fillStyle = miningProgress < 100 ? '#4CAF50' : '#FF5722';
        ctx.fillRect(screenX, screenY - 10, (tileSize * miningProgress) / 100, 5);

        // Текст прогресса
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.round(miningProgress)}%`,
            screenX + tileSize / 2,
            screenY - 12
        );
    }
}

// Функция для определения, что будет добыто и что останется
function getMiningPreview(tile) {
    const tool = playerInventory.getCurrentTool();
    const preview = {
        canMine: false,
        currentLayer: null,
        nextLayer: null,
        resourceCount: 0,
        highlightColor: HIGHLIGHT_COLORS.cannot_mine,
        willRemain: null
    };

    // Определяем доступные слои для инструмента
    const availableLayers = [];

    if (tool.id === 'pickaxe') {
        // Кирка: руда -> подпочва -> скала
        if (tile.o && tile.o !== 'none') availableLayers.push({ type: tile.o, layer: 'o' });
        if (tile.p && tile.p !== 'none') availableLayers.push({ type: tile.p, layer: 'p' });
        if (tile.s && ['stone', 'rock_peak', 'snow_peak'].includes(tile.s))
            availableLayers.push({ type: tile.s, layer: 's' });
    } else if (tool.id === 'shovel') {
        // Лопата: грунт -> подпочва
        if (tile.g && tile.g !== 'none') availableLayers.push({ type: tile.g, layer: 'g' });
        if (tile.p && tile.p !== 'none') availableLayers.push({ type: tile.p, layer: 'p' });
        if (tile.s && ['dirt', 'sand', 'gravel', 'clay'].includes(tile.s))
            availableLayers.push({ type: tile.s, layer: 's' });
    } else if (tool.id === 'axe') {
        // Топор: деревья
        if (tile.e && ['tree', 'jungle_tree', 'pine'].includes(tile.e))
            availableLayers.push({ type: tile.e, layer: 'e' });
    } else if (tool.id === 'hand') {
        // Рука: растения, трава
        if (tile.e && ['flower_red', 'flower_yellow', 'flower_white',
            'grass_detail', 'cactus', 'bush_cold', 'sugar_cane',
            'stone_flower'].includes(tile.e))
            availableLayers.push({ type: tile.e, layer: 'e' });
        if (tile.s && ['grass', 'beach_sand'].includes(tile.s))
            availableLayers.push({ type: tile.s, layer: 's' });
    }

    // Выбираем верхний доступный слой
    if (availableLayers.length > 0) {
        const layer = availableLayers[0];
        const resourceConfig = RESOURCE_CONFIG[layer.type] || { finite: false, drop: 0 };

        preview.currentLayer = layer;
        preview.resourceCount = resourceConfig.drop;
        preview.canMine = playerInventory.canMineBlock(layer.type);

        // Определяем, что останется
        switch(layer.layer) {
            case 'e':
                preview.willRemain = 'ничего';
                preview.highlightColor = HIGHLIGHT_COLORS.entity;
                break;
            case 's':
                if (tile.g && tile.g !== 'none') {
                    preview.nextLayer = { type: tile.g, layer: 's' };
                    preview.willRemain = tile.g;
                } else if (tile.p && tile.p !== 'none') {
                    preview.nextLayer = { type: tile.p, layer: 's' };
                    preview.willRemain = 'подпочва';
                } else {
                    preview.nextLayer = { type: 'stone', layer: 's' };
                    preview.willRemain = 'скала';
                }
                preview.highlightColor = HIGHLIGHT_COLORS.surface;
                break;
            case 'g':
                if (tile.p && tile.p !== 'none') {
                    preview.nextLayer = { type: tile.p, layer: 's' };
                    preview.willRemain = 'подпочва';
                } else if (tile.o && tile.o !== 'none') {
                    preview.nextLayer = { type: tile.o, layer: 's' };
                    preview.willRemain = 'руда';
                } else {
                    preview.nextLayer = { type: 'stone', layer: 's' };
                    preview.willRemain = 'скала';
                }
                preview.highlightColor = HIGHLIGHT_COLORS.ground;
                break;
            case 'p':
                if (tile.o && tile.o !== 'none') {
                    preview.nextLayer = { type: tile.o, layer: 's' };
                    preview.willRemain = 'руда';
                } else {
                    preview.nextLayer = { type: 'stone', layer: 's' };
                    preview.willRemain = 'скала';
                }
                preview.highlightColor = HIGHLIGHT_COLORS.stone;
                break;
            case 'o':
                preview.nextLayer = { type: 'stone', layer: 's' };
                preview.willRemain = 'скала';
                preview.highlightColor = HIGHLIGHT_COLORS.ore;
                break;
        }
    }

    return preview;
}

// Функция для отображения предпросмотра добычи
function renderMiningPreview() {
    if (mouseX < 0 || mouseY < 0 || mouseX >= canvas.width || mouseY >= canvas.height) return;

    const worldX = (mouseX + camera.x) / tileSize;
    const worldY = (mouseY + camera.y) / tileSize;
    const tx = Math.floor(worldX);
    const ty = Math.floor(worldY);

    // Проверяем расстояние
    if (!isBlockInRange(tx + 0.5, ty + 0.5)) return;

    const tile = getTileAt(tx, ty);
    if (!tile) return;

    const preview = getMiningPreview(tile);
    if (!preview.currentLayer) return;

    const screenX = tx * tileSize - camera.x;
    const screenY = ty * tileSize - camera.y;

    // Подсветка текущего слоя
    ctx.fillStyle = preview.highlightColor;
    ctx.fillRect(screenX, screenY, tileSize, tileSize);

    // Если есть следующий слой - показываем его в центре
    if (preview.nextLayer) {
        ctx.fillStyle = colors[preview.nextLayer.type] || '#888888';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(screenX + tileSize/4, screenY + tileSize/4, tileSize/2, tileSize/2);
        ctx.globalAlpha = 1.0;

        // Обводка для наглядности
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + tileSize/4 - 1, screenY + tileSize/4 - 1,
            tileSize/2 + 2, tileSize/2 + 2);
    }

    // Если нельзя добыть - показываем красный крестик
    if (!preview.canMine) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX + 5, screenY + 5);
        ctx.lineTo(screenX + tileSize - 5, screenY + tileSize - 5);
        ctx.moveTo(screenX + tileSize - 5, screenY + 5);
        ctx.lineTo(screenX + 5, screenY + tileSize - 5);
        ctx.stroke();
    }
}

// Легенда слоев
function renderLayerLegend() {
    const legendX = canvas.width - 250;
    const legendY = 120;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(legendX, legendY, 230, 200);

    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Легенда слоев', legendX + 115, legendY + 25);

    // Слои
    const layers = [
        { layer: 's', color: '#00FF00', name: 'Поверхность', desc: 'Трава, песок, камень' },
        { layer: 'g', color: '#8B7355', name: 'Грунт', desc: 'Земля под поверхностью' },
        { layer: 'o', color: '#FFD700', name: 'Руда', desc: 'Полезные ископаемые' },
        { layer: 'e', color: '#228B22', name: 'Объекты', desc: 'Деревья, растения' },
        { layer: 'l', color: '#0000FF', name: 'Жидкость', desc: 'Нефть, вода' }
    ];

    let yOffset = 45;
    layers.forEach(item => {
        // Цветной квадрат
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX + 10, legendY + yOffset, 12, 12);

        // Текст
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, legendX + 30, legendY + yOffset + 10);
        ctx.fillText(item.desc, legendX + 30, legendY + yOffset + 25);

        yOffset += 35;
    });
}

// Функция для получения имени слоя
function getLayerName(layer) {
    const names = {
        'e': 'Объект',
        's': 'Поверхность',
        'g': 'Грунт',
        'o': 'Руда',
        'l': 'Жидкость'
    };
    return names[layer] || layer;
}

// === УЛУЧШЕННЫЙ UI ===
function renderEnhancedUI() {
    const tool = playerInventory.getCurrentTool();

    // Панель состояния соединения
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 250, canvas.height - 100, 230, 80);

    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    // ID игрока
    if (window.playerId) {
        ctx.fillText(`Игрок ID: ${window.playerId}`, canvas.width - 240, canvas.height - 85);
    } else {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText('Не подключен к серверу', canvas.width - 240, canvas.height - 85);
    }

    // Позиция
    ctx.fillStyle = '#FFF';
    ctx.fillText(`Позиция: ${player.x.toFixed(2)}, ${player.y.toFixed(2)}`, canvas.width - 240, canvas.height - 70);

    // Чанки
    const loadedChunks = chunkCache.size;
    ctx.fillText(`Загружено чанков: ${loadedChunks}`, canvas.width - 240, canvas.height - 55);

    // Время синхронизации
    const lastSync = Math.floor((Date.now() - lastPositionSync) / 1000);
    ctx.fillText(`Синхронизация: ${lastSync}с назад`, canvas.width - 240, canvas.height - 40);

    // Панель инструментов
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, canvas.height - 150, 280, 140);

    // Текущий инструмент
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Инструмент: ${tool.name}`, 20, canvas.height - 130);

    // Уровень добычи
    ctx.fillText(`Уровень: ${tool.miningLevel}`, 20, canvas.height - 110);

    // Прочность
    if (tool.durability === Infinity) {
        ctx.fillText('Прочность: ∞', 20, canvas.height - 90);
    } else {
        ctx.fillText(`Прочность: ${tool.durability}/${TOOLS_CONFIG[tool.id].durability}`, 20, canvas.height - 90);

        // Полоса прочности
        const durabilityPercent = (tool.durability / TOOLS_CONFIG[tool.id].durability) * 100;
        ctx.fillStyle = durabilityPercent > 50 ? '#4CAF50' :
            durabilityPercent > 20 ? '#FF9800' : '#F44336';
        ctx.fillRect(20, canvas.height - 80, 200 * (durabilityPercent / 100), 8);
    }

    // Информация о добываемом блоке
    if (miningTarget) {
        ctx.fillStyle = 'rgba(50, 50, 150, 0.8)';
        ctx.fillRect(canvas.width - 220, 20, 200, 80);

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Добыча: ${miningTarget.blockInfo.type}`, canvas.width - 210, 40);
        ctx.fillText(`Слой: ${getLayerName(miningTarget.blockInfo.layer)}`, canvas.width - 210, 60);
        ctx.fillText(`Прогресс: ${Math.round(miningProgress)}%`, canvas.width - 210, 80);

        // Полоса прогресса
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(canvas.width - 210, 90, 180 * (miningProgress / 100), 5);
    }

    // Предпросмотр добычи (под курсором)
    if (mouseX >= 0 && mouseY >= 0 && mouseX < canvas.width && mouseY < canvas.height) {
        const worldX = (mouseX + camera.x) / tileSize;
        const worldY = (mouseY + camera.y) / tileSize;
        const tx = Math.floor(worldX);
        const ty = Math.floor(worldY);

        if (isBlockInRange(tx + 0.5, ty + 0.5)) {
            const tile = getTileAt(tx, ty);
            if (tile) {
                const preview = getMiningPreview(tile);

                if (preview.currentLayer) {
                    // Панель предпросмотра
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    const previewHeight = 100;
                    ctx.fillRect(mouseX + 20, mouseY + 20, 220, previewHeight);

                    ctx.fillStyle = '#FFF';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'left';

                    // Текущий слой
                    ctx.fillText(`Добыть: ${preview.currentLayer.type}`, mouseX + 30, mouseY + 40);

                    // Количество ресурсов
                    if (preview.resourceCount > 0) {
                        ctx.fillStyle = '#4CAF50';

                        // Для персистентных блоков добавляем специальную пометку
                        const resourceConfig = RESOURCE_CONFIG[preview.currentLayer?.type] || {};
                        if (resourceConfig.persistent) {
                            ctx.fillText(`Ресурсов: ${preview.resourceCount} (остается на карте)`, mouseX + 30, mouseY + 60);
                        } else if (resourceConfig.finite === false) {
                            ctx.fillText(`Ресурсов: ∞ (бесконечный)`, mouseX + 30, mouseY + 60);
                        } else {
                            ctx.fillText(`Ресурсов: ${preview.resourceCount}`, mouseX + 30, mouseY + 60);
                        }
                    } else {
                        ctx.fillStyle = '#888';
                        ctx.fillText(`Ресурсов: 0`, mouseX + 30, mouseY + 60);
                    }

                    // Что останется
                    if (preview.willRemain) {
                        ctx.fillStyle = '#FF9800';
                        ctx.fillText(`Останется: ${preview.willRemain}`, mouseX + 30, mouseY + 80);
                    }

                    // Статус добычи
                    ctx.fillStyle = preview.canMine ? '#4CAF50' : '#F44336';
                    ctx.fillText(preview.canMine ? '✓ Можно добыть' : '✗ Нельзя добыть',
                        mouseX + 30, mouseY + previewHeight);
                }
            }
        }
    }

    // Информация о блоке под курсором (при наведении)
    if (mouseX >= 0 && mouseY >= 0 && mouseX < canvas.width && mouseY < canvas.height) {
        const worldX = (mouseX + camera.x) / tileSize;
        const worldY = (mouseY + camera.y) / tileSize;
        const hoverTile = getTileAt(Math.floor(worldX), Math.floor(worldY));

        if (hoverTile) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(mouseX + 10, mouseY - 50, 150, 40);
            ctx.fillStyle = '#FFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';

            // Показываем информацию о всех слоях в этой клетке
            let layersText = [];

            if (hoverTile.e && hoverTile.e !== 'none') {
                layersText.push(`Объект: ${hoverTile.e}`);
            }
            if (hoverTile.s && hoverTile.s !== 'none') {
                layersText.push(`Поверхность: ${hoverTile.s}`);
            }
            if (hoverTile.g && hoverTile.g !== 'none') {
                layersText.push(`Грунт: ${hoverTile.g}`);
            }
            if (hoverTile.o && hoverTile.o !== 'none') {
                layersText.push(`Руда: ${hoverTile.o}`);
            }
            if (hoverTile.l && hoverTile.l !== 'none' && isLiquidProspecting) {
                layersText.push(`Жидкость: ${hoverTile.l} (${hoverTile.la || 0}/${hoverTile.lm || 0}L)`);
            }

            // Отображаем не более 3 слоев, чтобы не перекрывать экран
            const displayLayers = layersText.slice(0, 3);
            displayLayers.forEach((text, index) => {
                ctx.fillText(text, mouseX + 15, mouseY - 30 + (index * 15));
            });

            if (layersText.length > 3) {
                ctx.fillText(`... и еще ${layersText.length - 3}`, mouseX + 15, mouseY - 30 + (3 * 15));
            }
        }
    }



    // Легенда слоев
    if (showLayerLegend) {
        renderLayerLegend();
    }

    // Подсказки управления
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.fillText('1-Рука 2-Топор 3-Лопата 4-Кирка', 20, canvas.height - 60);
    ctx.fillText('L - Легенда слоев  C - Камера  G - Сетка', 20, canvas.height - 45);
    ctx.fillText('P - Поиск руды  R - Регенерация', 20, canvas.height - 30);
}

// Переключение инструментов
window.addEventListener('keydown', (e) => {
    if (e.key === '1') playerInventory.switchTool('hand');
    if (e.key === '2') playerInventory.switchTool('axe');
    if (e.key === '3') playerInventory.switchTool('shovel');
    if (e.key === '4') playerInventory.switchTool('pickaxe');

    // Отмена добычи при смене инструмента
    if (miningMode && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
        cancelMining();
    }
});

// Chunk management
const CHUNK_SIZE = 16;
const MAX_CONCURRENT_REQUESTS = 3;
const BATCH_SIZE = 8; // Уменьшаем размер батча
let activeRequests = 0;
const loadingChunks = new Set();
const chunkCache = new Map();
const chunkQueue = [];
let currentSeed = 1767904171111;
let isOreProspecting = false;
let isLiquidProspecting = false;

let showGrid = false;

// Вспомогательная функция для создания холста чанка
// Вызываем очистку при добавлении нового чанка
function createChunkObject(tiles, cx, cy) {
    const c = document.createElement('canvas');
    c.width = CHUNK_SIZE * baseTileSize;
    c.height = CHUNK_SIZE * baseTileSize;
    const chunkCtx = c.getContext('2d');

    chunkCtx.chunkX = cx;
    chunkCtx.chunkY = cy;

    renderTilesToCanvas(tiles, chunkCtx);

    // Очищаем кэш если нужно
    if (chunkCache.size >= MAX_CHUNK_CACHE) {
        cleanupChunkCache();
    }

    return {
        canvas: c,
        tiles: tiles,
        loadedAt: performance.now(),
        cx: cx,
        cy: cy
    };
}

function enqueueChunk(cx, cy, priority) {
    const key = `${cx},${cy}`;
    // Если уже грузится или есть в кэше — выходим
    if (chunkCache.has(key) || loadingChunks.has(key)) return;

    if (priority === -1) {
        // Добавляем в НАЧАЛО очереди, чтобы запрос ушел немедленно
        chunkQueue.unshift({ cx, cy, priority });
    } else {
        // Добавляем в конец (для фоновой загрузки окружения)
        chunkQueue.push({ cx, cy, priority });
    }

    loadingChunks.add(key);
}

async function fetchBatch(batch) {
    activeRequests++;
    const batchStr = batch.map(c => `${c.cx},${c.cy}`).join(';');

    try {
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`/api/chunk?batch=${batchStr}&seed=${currentSeed}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('Batch fetch failed');
        const generatedChunks = await res.json();

        for (const [key, tiles] of Object.entries(generatedChunks)) {
            const [cx, cy] = key.split(',').map(Number);

            // Создаем объект чанка без загрузки сохраненных блоков на каждом кадре
            chunkCache.set(key, createChunkObject(tiles, cx, cy));
            loadingChunks.delete(key);
        }
    } catch (e) {
        console.error("Batch loading error:", e);
        batch.forEach(c => loadingChunks.delete(`${c.cx},${c.cy}`));
    } finally {
        activeRequests--;
        processChunkQueue();
    }
}



function processChunkQueue() {
    if (chunkQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) return;
    const batch = chunkQueue.splice(0, BATCH_SIZE);
    fetchBatch(batch);
}

function preloadInitialChunks() {
    const screenChunkSize = CHUNK_SIZE * tileSize;
    const centerX = Math.floor((camera.x + canvas.width / 2) / screenChunkSize);
    const centerY = Math.floor((camera.y + canvas.height / 2) / screenChunkSize);

    const RADIUS = 2; // Сокращаем радиус до минимума для быстрого старта

    for (let i = 0; i <= RADIUS; i++) {
        for (let dx = -i; dx <= i; dx++) {
            for (let dy = -i; dy <= i; dy++) {
                if (Math.abs(dx) === i || Math.abs(dy) === i) {
                    enqueueChunk(centerX + dx, centerY + dy, i);
                }
            }
        }
    }
}

function renderWorld() {
    const screenChunkSize = CHUNK_SIZE * tileSize;
    const startCX = Math.floor(camera.x / screenChunkSize);
    const startCY = Math.floor(camera.y / screenChunkSize);
    const endCX = Math.ceil((camera.x + canvas.width) / screenChunkSize);
    const endCY = Math.ceil((camera.y + canvas.height) / screenChunkSize);

    for (let cy = startCY; cy <= endCY; cy++) {
        for (let cx = startCX; cx <= endCX; cx++) {
            const key = `${cx},${cy}`;
            const chunkData = chunkCache.get(key);
            const screenX = cx * screenChunkSize - camera.x;
            const screenY = cy * screenChunkSize - camera.y;

            // 1. Рисуем сам чанк
            // В функции renderWorld найдите блок отрисовки чанка:
            if (chunkData) {
                // Убираем прозрачность для мгновенного появления (тест)
                ctx.drawImage(chunkData.canvas, screenX, screenY, screenChunkSize, screenChunkSize);
            } else {
                ctx.fillStyle = "#0a0a0a";
                ctx.fillRect(screenX, screenY, screenChunkSize, screenChunkSize);

                // ВАЖНО: Приоритет -1 выталкивает эти чанки в самый верх очереди
                enqueueChunk(cx, cy, -1);
            }

            // 2. РИСУЕМ СЕТКУ (Debug Grid)
            if (showGrid) {
                // Граница обычного чанка (тонкая серая линия)
                ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, screenChunkSize, screenChunkSize);

                // Координаты чанка
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = `${Math.max(10, 12 * zoom)}px Arial`;
                ctx.fillText(`${cx}:${cy}`, screenX + 5, screenY + 15);

                // Граница СЕКТОРА генерации руды (каждые 3 чанка)
                // Так как сектор = 48 тайлов, а чанк = 16, то сектор = 3 чанка.
                if (cx % 3 === 0 && cy % 3 === 0) {
                    ctx.strokeStyle = "#ffeb3b"; // Желтый цвет для секторов
                    ctx.lineWidth = 2;
                    // Рисуем рамку размером в 3x3 чанка
                    ctx.strokeRect(screenX, screenY, screenChunkSize * 3, screenChunkSize * 3);

                    ctx.fillStyle = "#ffeb3b";
                    ctx.fillText(`SECTOR`, screenX + 5, screenY + 30);
                }
            }
        }
    }
}

//Рендер игрока

function renderPlayer() {
    const px = player.x * tileSize - camera.x;
    let py = player.y * tileSize - camera.y;

    // Смещение при прыжке
    if (player.jumpAnim > 0) {
        const offset = Math.sin(player.jumpAnim * Math.PI) * player.jumpHeight * tileSize;
        py -= offset;
    }

    // Тень
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(
        px - (player.width * tileSize)/2 + 4,
        py - player.height * tileSize + player.height * tileSize * 0.7,
        player.width * tileSize * 0.9,
        player.height * tileSize * 0.3
    );

    // Основной цвет тела
    let bodyColor = "#ff3b3b"; // обычный
    if (player.jumpType === 'up')   bodyColor = "#ff6b6b";
    if (player.jumpType === 'down') bodyColor = "#6ba0ff";

    ctx.fillStyle = bodyColor;
    ctx.fillRect(
        px - (player.width * tileSize)/2,
        py - player.height * tileSize,
        player.width * tileSize,
        player.height * tileSize
    );

    // Глаза
    const eyeSize = player.jumpAnim > 0.4 ? 5 : 4;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 8, py - player.height * tileSize + 10, eyeSize, eyeSize);
    ctx.fillRect(px + 4, py - player.height * tileSize + 10, eyeSize, eyeSize);

    // Ротик при прыжке вверх
    if (player.jumpType === 'up' && player.jumpAnim > 0.3) {
        ctx.fillStyle = "#ffff66";
        ctx.fillRect(px - 5, py - player.height * tileSize + 22, 10, 3);
    }
}

// Функция для отрисовки подсветки блоков в радиусе
function renderRadiusHighlight() {
    if (!highlightRadius) return;

    const playerX = Math.floor(player.x);
    const playerY = Math.floor(player.y);
    const tool = playerInventory.getCurrentTool();

    // Перебираем все тайлы в радиусе MINING_RADIUS
    for (let dx = -MINING_RADIUS; dx <= MINING_RADIUS; dx++) {
        for (let dy = -MINING_RADIUS; dy <= MINING_RADIUS; dy++) {
            const tx = playerX + dx;
            const ty = playerY + dy;

            // Проверяем расстояние
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance > MINING_RADIUS) continue;

            const tile = getTileAt(tx, ty);
            if (!tile) continue;

            const preview = getMiningPreview(tile);
            if (!preview.canMine || !preview.currentLayer) continue;

            const screenX = tx * tileSize - camera.x;
            const screenY = ty * tileSize - camera.y;

            // Подсветка в зависимости от инструмента
            let highlightColor = 'rgba(255, 255, 255, 0.1)'; // По умолчанию прозрачная

            switch(tool.id) {
                case 'pickaxe':
                    // Кирка: подсвечиваем руду и камень
                    if (tile.o && tile.o !== 'none') {
                        highlightColor = 'rgba(255, 215, 0, 0.3)'; // Золотой для руды
                    } else if (tile.s && ['stone', 'rock_peak', 'snow_peak'].includes(tile.s)) {
                        highlightColor = 'rgba(128, 128, 128, 0.2)'; // Серый для камня
                    }
                    break;

                case 'shovel':
                    // Лопата: подсвечиваем землю, песок, глину, гравий
                    if (tile.g && ['dirt', 'sand', 'sand_ground', 'clay', 'gravel'].includes(tile.g)) {
                        highlightColor = 'rgba(139, 69, 19, 0.3)'; // Коричневый для земли
                    } else if (tile.s && ['dirt', 'sand', 'gravel', 'clay'].includes(tile.s)) {
                        highlightColor = 'rgba(139, 69, 19, 0.2)'; // Светло-коричневый
                    }
                    break;

                case 'axe':
                    // Топор: подсвечиваем деревья
                    if (tile.e && ['tree', 'jungle_tree', 'pine'].includes(tile.e)) {
                        highlightColor = 'rgba(0, 255, 0, 0.3)'; // Зеленый для деревьев
                    }
                    break;

                case 'hand':
                    // Рука: подсвечиваем растения и цветы
                    if (tile.e && ['flower_red', 'flower_yellow', 'flower_white',
                        'grass_detail', 'cactus', 'bush_cold', 'sugar_cane',
                        'stone_flower'].includes(tile.e)) {
                        highlightColor = 'rgba(0, 255, 0, 0.2)'; // Светло-зеленый
                    } else if (tile.s && ['grass', 'beach_sand'].includes(tile.s)) {
                        highlightColor = 'rgba(255, 255, 0, 0.2)'; // Желтый для травы
                    }
                    break;
            }

            // Рисуем подсветку
            ctx.fillStyle = highlightColor;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);

            // Рисуем обводку радиуса
            if (distance === Math.floor(MINING_RADIUS)) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            }
        }
    }
}

// Показ инвентаря
function renderInventory() {
    const inventoryX = canvas.width - 250;
    const inventoryY = 20;
    const inventoryWidth = 230;

    // Рассчитываем высоту инвентаря на основе количества предметов
    const blockCount = Object.keys(playerInventory.blocks).length;
    const inventoryHeight = Math.max(200, 40 + (blockCount * 20));

    // Фон инвентаря
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(inventoryX, inventoryY, inventoryWidth, inventoryHeight);

    // Заголовок
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Инвентарь', inventoryX + inventoryWidth / 2, inventoryY + 25);

    // Разделительная линия
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inventoryX + 10, inventoryY + 35);
    ctx.lineTo(inventoryX + inventoryWidth - 10, inventoryY + 35);
    ctx.stroke();

    // Список блоков
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    let yOffset = 50;

    if (blockCount === 0) {
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('Инвентарь пуст', inventoryX + inventoryWidth / 2, inventoryY + yOffset);
        yOffset += 20;
    } else {
        // Сортируем блоки по названию
        const sortedBlocks = Object.entries(playerInventory.blocks)
            .filter(([_, count]) => count > 0)
            .sort(([a], [b]) => a.localeCompare(b));

        for (const [blockType, count] of sortedBlocks) {
            const maxStack = RESOURCE_CONFIG[blockType]?.maxStack || MAX_STACK;
            const percentage = (count / maxStack) * 100;

            // Название блока
            ctx.fillStyle = '#FFF';
            ctx.fillText(`${blockType}: ${count}`, inventoryX + 15, inventoryY + yOffset);

            // Полоска заполненности стака
            if (maxStack > 1) {
                const barWidth = 80;
                const barHeight = 8;
                const barX = inventoryX + inventoryWidth - barWidth - 15;
                const barY = inventoryY + yOffset - 6;

                // Фон полоски
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Заполненная часть
                ctx.fillStyle = percentage > 80 ? '#4CAF50' :
                    percentage > 50 ? '#8BC34A' :
                        percentage > 30 ? '#FFC107' : '#F44336';
                ctx.fillRect(barX, barY, (barWidth * percentage) / 100, barHeight);

                // Обводка
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
            }

            yOffset += 20;

            // Ограничиваем максимальное количество отображаемых блоков
            if (yOffset > inventoryY + inventoryHeight - 20) {
                ctx.fillStyle = '#888';
                ctx.fillText('... и другие', inventoryX + 15, inventoryY + yOffset);
                break;
            }
        }
    }

    // Инструменты
    yOffset += 10;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText('Инструменты:', inventoryX + 15, inventoryY + yOffset);
    yOffset += 20;

    const currentTool = playerInventory.getCurrentTool();

    // Список инструментов
    const tools = ['hand', 'axe', 'shovel', 'pickaxe'];
    for (const toolId of tools) {
        const tool = playerInventory.tools[toolId];
        if (!tool) continue;

        const isCurrent = toolId === currentTool.id;
        // Название инструмента
        ctx.fillStyle = isCurrent ? '#FFD700' : '#FFF';
        ctx.font = isCurrent ? 'bold 12px Arial' : '12px Arial';
        ctx.fillText(tool.name, inventoryX + 20, inventoryY + yOffset);

        // Прочность
        if (tool.durability !== Infinity) {
            const durabilityPercent = (tool.durability / TOOLS_CONFIG[toolId].durability) * 100;
            const durabilityText = isCurrent ? `${tool.durability}/${TOOLS_CONFIG[toolId].durability}` : '';

            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(durabilityText, inventoryX + inventoryWidth - 15, inventoryY + yOffset);

            // Полоска прочности
            if (isCurrent) {
                const barWidth = 60;
                const barHeight = 4;
                const barX = inventoryX + inventoryWidth - barWidth - 60;
                const barY = inventoryY + yOffset + 4;

                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                ctx.fillStyle = durabilityPercent > 50 ? '#4CAF50' :
                    durabilityPercent > 20 ? '#FF9800' : '#F44336';
                ctx.fillRect(barX, barY, (barWidth * durabilityPercent) / 100, barHeight);
            }
        }

        yOffset += 16;
        ctx.textAlign = 'left';
    }
}

// Интервалы синхронизации
const SYNC_POSITION_INTERVAL = 30000; // 30 секунд
const SYNC_INVENTORY_INTERVAL = 60000; // 60 секунд

let lastPositionSync = 0;
let lastInventorySync = 0;

// Флаги для предотвращения одновременных запросов
let isSyncingPosition = false;
let isSyncingInventory = false;

// === ИСПРАВЛЕННАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ ПОЗИЦИИ ===
async function syncPlayerPosition() {
    if (!window.playerId || isSyncingPosition) return;

    const now = Date.now();
    if (now - lastPositionSync < SYNC_POSITION_INTERVAL) return;

    isSyncingPosition = true;

    try {
        await fetch('/api/player/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: window.playerId,
                x: Math.round(player.x * 100) / 100,
                y: Math.round(player.y * 100) / 100,
                hp: player.hp
            })
        });

        lastPositionSync = now;
    } catch (error) {
        console.error('Ошибка синхронизации позиции:', error);
        // При ошибке увеличиваем интервал до 30 секунд
        lastPositionSync = now - SYNC_POSITION_INTERVAL + 30000;
    } finally {
        isSyncingPosition = false;
    }
}

// === ИСПРАВЛЕННАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ ИНВЕНТАРЯ ===
async function syncPlayerInventory() {
    if (!window.playerId || isSyncingInventory) return;

    const now = Date.now();
    if (now - lastInventorySync < SYNC_INVENTORY_INTERVAL) return;

    isSyncingInventory = true;

    try {
        await loadPlayerInventory(window.playerId);
        lastInventorySync = now;
    } catch (error) {
        console.error('Ошибка синхронизации инвентаря:', error);
        // При ошибке увеличиваем интервал до 60 секунд
        lastInventorySync = now - SYNC_INVENTORY_INTERVAL + 60000;
    } finally {
        isSyncingInventory = false;
    }
}



const colors = {
    'void': '#1a1a2e',

    // ===== ВОДА =====
    'deep_ocean': '#000b1a',     // очень тёмный синий
    'water': '#0077be',          // океан
    'lake': '#2a9df4',           // озёра (чуть светлее и чище)

    // ===== БЕРЕГА =====
    'beach_sand': '#f0e68c',     // пляж
    'sand': '#d2b48c',           // обычный песок
    'clay': '#a1887f',           // глина (коричневатая)
    'gravel': '#8d8d8d',         // гравий (зернистый серый)
    'beach': '#f0e68c',     // песчаный океанский берег
    'coast': '#e6d8a3',     // если вдруг начнёшь рисовать b
    'dirt': '#8B7355',


    // ===== РАСТИТЕЛЬНОСТЬ =====
    'grass': '#567d46',          // равнины
    'grass_forest': '#3d5e30',   // лес (темнее)
    'grass_cold': '#4fe611',     // холодная трава (ярче)
    'freeze_grass': '#6a8d7a',   // тундра
    'dry_grass': '#8b8d46',      // сухие земли
    'jungle': '#1f7a3a',         // тропики
    'shrubland': '#7a7f3a',      // кустарники

    //Цвета растительности в растительном слое
    'tree': '#2d4c1e',        // Обычное дерево
    'jungle_tree': '#145228', // Тропическое дерево
    'pine': '#1a3317',        // Хвоя (темная)
    'bush': '#719236',        // Куст
    'bush_cold': '#5e7361',   // Замерзший куст для тундры
    'grass_detail': '#47da05', // Цвет травинок (чуть темнее основной травы)
    'stone_flower': '#add8e6', // Каменный цвет (светло-голубоватый/серый)
    'flower_red': '#e74c3c',   // Красный цветок
    'flower_yellow': '#f1c40f', // Желтый цветок
    'flower_white': '#ecf0f1',  // Белый цветок
    'cactus': '#2ecc71', // Ярко-зеленый цвет кактуса
    'sugar_cane':'#942dd8',


    // ===== ПУСТЫНЯ =====
    'desert_sand': '#f4e209',    // пустыня (ярко)

    // ===== ГОРЫ =====
    'stone': '#808080',          // камень
    'rock_peak': '#5c5c5c',      // скальные пики (темнее)
    'snow': '#ffffff',           // снег
    'snow_peak': '#e6f2ff',      // снежные пики (чуть голубой)

    // ===== ХОЛМЫ / ПРЕДГОРЬЯ =====
    'grass_rocky': '#6b7d5a',    // каменистая трава

    // ===== РУДЫ =====
    'ore_andesite': '#8a8d8f',
    'ore_basalt': '#303030',
    'ore_brown_limonite': '#7b5c3d',
    'ore_yellow_limonite': '#bca05d',
    'ore_malachite': '#2b7a4b',
    'ore_copper': '#d37c5d',
    'ore_cassiterite': '#333333',
    'ore_tin': '#acacac',
    'ore_bismuth': '#6e8b8b',

    // ===== ЖИДКОСТИ =====
    'raw_oil': '#0f0f0f',       // Очень тёмный, почти чёрный (сырая нефть)
    'heavy_oil': '#1a0f00',      // Тёмно-коричневый (тяжёлая)
    'light_oil': '#331a00',      // Светло-коричневый (лёгкая)
    'oil': '#260f00',            // Средний коричневый (обычная нефть)
};

//Подсветка разных слоев при добыче
const HIGHLIGHT_COLORS = {
    'surface': 'rgba(255, 255, 0, 0.3)',      // желтый для поверхности
    'ground': 'rgba(139, 69, 19, 0.3)',       // коричневый для земли
    'ore': 'rgba(255, 215, 0, 0.3)',          // золотой для руды
    'entity': 'rgba(0, 255, 0, 0.3)',         // зеленый для объектов
    'stone': 'rgba(128, 128, 128, 0.3)',      // серый для камня
    'cannot_mine': 'rgba(255, 0, 0, 0.2)'     // красный для недоступных
};


// === ОБНОВЛЕННАЯ ФУНКЦИЯ РЕНДЕРА ТАЙЛОВ ===
function renderTilesToCanvas(tiles, chunkCtx) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = tiles[y][x];
            const tx = x * baseTileSize;
            const ty = y * baseTileSize;

            // Определяем, нужно ли показывать предпросмотр
            let showPreview = false;
            let previewLayer = null;

            // Если этот тайл выбран для добычи
            if (miningTarget && miningTarget.chunk && miningTarget.chunk === chunkCtx.canvas) {
                // Проверяем координаты в чанке
                const chunkX = miningTarget.tx % CHUNK_SIZE;
                const chunkY = miningTarget.ty % CHUNK_SIZE;
                if (chunkX === x && chunkY === y) {
                    showPreview = true;
                    previewLayer = miningTarget.blockInfo.layer;
                }
            }

            // Рендерим слои
            LayerRenderer.renderTileLayers(
                chunkCtx,
                tx, ty,
                tile,
                baseTileSize,
                showPreview,
                previewLayer,
                { ore: isOreProspecting, liquid: isLiquidProspecting } // Передаем режимы проспектинга
            );

            // === ДЕТЕКТОРЫ (ОРЕ И ЖИДКОСТИ) ===
            // Оставьте существующий код для детекторов
            if (isOreProspecting && tile.o && tile.o !== 'none') {
                // Подсветка руды при проспектинге
                chunkCtx.fillStyle = '#FFFF00';
                chunkCtx.globalAlpha = 0.3;
                chunkCtx.fillRect(tx, ty, baseTileSize, baseTileSize);
                chunkCtx.globalAlpha = 1.0;

                // Текст с названием руды
                chunkCtx.fillStyle = '#FFFFFF';
                chunkCtx.font = '10px Arial';
                chunkCtx.textAlign = 'center';
                chunkCtx.fillText(
                    tile.o.replace('ore_', ''),
                    tx + baseTileSize / 2,
                    ty + baseTileSize / 2
                );
            }

            if (isLiquidProspecting && tile.lm !== undefined) {
                const fillRatio = tile.la / tile.lm;
                const fillHeight = fillRatio * baseTileSize;

                chunkCtx.fillStyle = colors[tile.l] || '#000';
                chunkCtx.globalAlpha = 0.85;
                chunkCtx.fillRect(tx, ty + baseTileSize - fillHeight, baseTileSize, fillHeight);
                chunkCtx.globalAlpha = 1.0;

                const fontSize = Math.min(16, Math.max(10, 14));
                chunkCtx.font = `${Math.floor(fontSize)}px Arial`;
                chunkCtx.textAlign = 'center';
                chunkCtx.textBaseline = 'middle';
                chunkCtx.fillStyle = fillRatio > 0.5 ? '#ffffff' : '#aaaaaa';
                chunkCtx.fillText(`${tile.la}L`, tx + baseTileSize / 2, ty + baseTileSize / 2);
            }
        }
    }
}



function refreshVisibleChunks() {
    chunkCache.forEach((data) => {
        if (data && data.canvas && data.tiles) {
            const chunkCtx = data.canvas.getContext('2d');
            chunkCtx.clearRect(0, 0, data.canvas.width, data.canvas.height);
            renderTilesToCanvas(data.tiles, chunkCtx);
        }
    });
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' && !isOreProspecting) {
        isOreProspecting = true;
        refreshVisibleChunks();
    }
    if (e.key === 'l' && !isLiquidProspecting) {
        isLiquidProspecting = true;
        refreshVisibleChunks();
    }
    if (e.key.toLowerCase() === "r") {
        regenerateWorld();
    }
    if (e.key.toLowerCase() === 'g') { // Клавиша G для сетки
        showGrid = !showGrid;
    }
    if (e.key.toLowerCase() === 'c') {
        followPlayer = !followPlayer;
    }
    if (e.key.toLowerCase() === 'i') {
        showLayerLegend = !showLayerLegend;
    }
    if (e.key.toLowerCase() === 'f') {
        console.log(`Jump: ${player.jumpType}, Anim: ${player.jumpAnim.toFixed(2)}, OnGround: ${player.onGround}`);
    }
    if (e.key.toLowerCase() === 'h') {
        highlightRadius = !highlightRadius;
        console.log(`Подсветка радиуса: ${highlightRadius ? 'ВКЛ' : 'ВЫКЛ'}`);
    }
    if (e.key.toLowerCase() === 'tab') {
        showInventory = !showInventory;
        console.log(`Инвентарь: ${showInventory ? 'ПОКАЗАН' : 'СКРЫТ'}`);
        e.preventDefault(); // Чтобы Tab не переключал фокус
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'p') {
        isOreProspecting = false;
        refreshVisibleChunks();
    }
    if (e.key.toLowerCase() === 'l') {
        isLiquidProspecting = false;
        refreshVisibleChunks();
    }
});

function regenerateWorld() {
    currentSeed = Date.now();
    chunkCache.clear();
    loadingChunks.clear();
    chunkQueue.length = 0;
    preloadInitialChunks();
}


//флаг следования игрока
let followPlayer = true;



let renderSkipCounter = 0;
const RENDER_SKIP_FACTOR = 2; // Рендерим каждый 2й кадр

function loop() {
    if (!gameInitialized) {
        requestAnimationFrame(loop);
        return;
    }

    // Пропускаем кадры для рендеринга
    renderSkipCounter++;
    const shouldRender = renderSkipCounter % RENDER_SKIP_FACTOR === 0;

    // Физика всегда рассчитывается
    if (!isDragging) {
        camera.x -= velocityX;
        camera.y -= velocityY;
        velocityX *= inertiaDamping;
        velocityY *= inertiaDamping;
    }

    processChunkQueue();

    if (shouldRender) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        updatePlayer();
        if (followPlayer) {
            camera.x = player.x * tileSize - canvas.width / 2;
            camera.y = player.y * tileSize - canvas.height / 2;
        }

        renderWorld();
        renderMiningPreview();
        renderRadiusHighlight();
        renderPlayer();
        renderMiningProgress();
        renderEnhancedUI();
        renderInventory();
    }

    // Синхронизация раз в 10 кадров
    if (renderSkipCounter % 10 === 0) {
        checkSync();
    }

    requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
    onResize();
    preloadInitialChunks();
    requestAnimationFrame(loop);
});

// Глобальный обработчик ошибок
window.addEventListener('error', function(event) {
    console.error('Глобальная ошибка:', event.error);

    // Показываем уведомление пользователю
    if (event.error.message && event.error.message.includes('fetch') ||
        event.error.message.includes('network')) {
        showNetworkError('Проблема с соединением. Проверьте интернет.');
    }
});

// Функция показа ошибки сети
function showNetworkError(message) {
    // Создаем элемент для отображения ошибки
    let errorDiv = document.getElementById('network-error');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'network-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Флаг инициализации
let gameInitialized = false;

async function initializeGame() {
    if (gameInitialized) return;

    try {
        // Инициализация canvas
        onResize();

        // Спавн игрока
        if (!window.playerId) {
            const serverPlayer = await spawnPlayer("DevPlayer");
            if (serverPlayer) {
                player.x = serverPlayer.x;
                player.y = serverPlayer.y;
            }
        }

        // Предзагрузка чанков
        preloadInitialChunks();

        // Запуск игрового цикла
        gameInitialized = true;
        requestAnimationFrame(loop);

        console.log('Игра инициализирована');
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        showNetworkError('Ошибка загрузки игры. Перезагрузите страницу.');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Запускаем инициализацию
    initializeGame();

    // Периодическая проверка соединения
    setInterval(() => {
        if (!window.playerId && gameInitialized) {
            console.warn('Потеряно соединение с сервером');
            showNetworkError('Потеряно соединение. Попытка переподключения...');

            // Попытка переподключения
            setTimeout(() => {
                initializeGame();
            }, 3000);
        }
    }, 30000); // Проверка каждые 30 секунд
});

// === ОГРАНИЧЕНИЕ КЭША ЧАНКОВ ===
const MAX_CHUNK_CACHE = 50; // Максимум 50 чанков в кэше

// Вспомогательная функция для очистки старых чанков

// === ИСПРАВЛЕННАЯ ФУНКЦИЯ ОЧИСТКИ КЭША ЧАНКОВ ===
function cleanupChunkCache() {
    if (chunkCache.size <= MAX_CHUNK_CACHE) return;

    // Сортируем чанки по времени загрузки (старые первыми)
    const chunksArray = Array.from(chunkCache.entries())
        .sort((a, b) => a[1].loadedAt - b[1].loadedAt);

    // Удаляем старые чанки, но оставляем те, что в области видимости
    const toRemove = [];
    const centerCX = Math.floor((camera.x + canvas.width / 2) / (CHUNK_SIZE * tileSize));
    const centerCY = Math.floor((camera.y + canvas.height / 2) / (CHUNK_SIZE * tileSize));
    const RENDER_RADIUS = 3; // Чанки в радиусе 3 от центра остаются

    for (const [key] of chunksArray) {
        const [cx, cy] = key.split(',').map(Number);
        const distance = Math.sqrt(Math.pow(cx - centerCX, 2) + Math.pow(cy - centerCY, 2));

        if (distance > RENDER_RADIUS) {
            toRemove.push(key);
        }

        if (chunkCache.size - toRemove.length <= MAX_CHUNK_CACHE) {
            break;
        }
    }

    // Удаляем выбранные чанки
    for (const key of toRemove) {
        chunkCache.delete(key);
    }

    console.log(`Очищен кэш чанков. Удалено: ${toRemove.length}, осталось: ${chunkCache.size}`);
}







// Периодическая синхронизация инвентаря
setInterval(() => {
    if (window.playerId) {
        loadPlayerInventory(window.playerId);
    }
}, 10000); // Синхронизация каждые 10 секунд

// ==============================================
// 📤 ЭКСПОРТ ПЕРЕМЕННЫХ ДЛЯ ТЕСТОВ
// ==============================================

if (typeof window !== 'undefined') {
    // Основные объекты
    window.gamePlayer = player;
    window.gameInventory = playerInventory;
    window.gameCamera = camera;
    window.gameCanvas = canvas;
    window.gameCtx = ctx;
    window.gameKeys = keys;
    window.gameChunkCache = chunkCache;

    // Переменные состояния
    window.gameTileSize = tileSize;
    window.gameZoom = zoom;
    window.gameLastPositionSync = lastPositionSync;
    window.gameShowInventory = showInventory;
    window.gameShowGrid = showGrid;
    window.gameMiningMode = miningMode;
    window.gameMiningProgress = miningProgress;
    window.gamePlayerId = window.playerId;

    // Функции
    window.gameGetTileAt = getTileAt;
    window.gameIsBlockInRange = isBlockInRange;
    window.gameStartMining = startMining;
    window.gameCancelMining = cancelMining;
    window.gameCleanupChunkCache = cleanupChunkCache;

    // Константы
    window.gameMaxChunkCache = MAX_CHUNK_CACHE;
    window.gameMaxStack = MAX_STACK;
    window.gameChunkSize = CHUNK_SIZE;
    window.gameMiningRadius = MINING_RADIUS;

    // API функции
    window.gameFetchPlayerInventory = fetchPlayerInventory;
    window.gameLoadPlayerInventory = loadPlayerInventory;

    // Экспорт конфигураций для тестов
    window.RESOURCE_CONFIG = RESOURCE_CONFIG;
    window.BLOCKS_CONFIG = BLOCKS_CONFIG;
    window.TOOLS_CONFIG = TOOLS_CONFIG;

    console.log('🎮 Игровые переменные экспортированы для тестирования');
}
