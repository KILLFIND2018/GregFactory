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




setInterval(() => {
    syncPlayer(player);
}, 1000);

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

        console.log(`🔍 Смотрим вперед: ${currentTile.b}(${currentHeight}) → ${aheadTile.b}(${aheadHeight})`);

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





// Chunk management
const CHUNK_SIZE = 16;
const MAX_CONCURRENT_REQUESTS = 10;
let activeRequests = 0;
const loadingChunks = new Set();
const chunkCache = new Map();
const chunkQueue = [];
let currentSeed = 1767904171111;
let isOreProspecting = false;
let isLiquidProspecting = false;

let showGrid = false;

// Вспомогательная функция для создания холста чанка
function createChunkObject(tiles) {
    const c = document.createElement('canvas');
    c.width = CHUNK_SIZE * baseTileSize;
    c.height = CHUNK_SIZE * baseTileSize;
    const chunkCtx = c.getContext('2d');

    renderTilesToCanvas(tiles, chunkCtx);

    return {
        canvas: c,
        tiles: tiles,
        loadedAt: performance.now() // Для плавного появления
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
        const res = await fetch(`/api/chunk?batch=${batchStr}&seed=${currentSeed}`);
        if (!res.ok) throw new Error('Batch fetch failed');
        const data = await res.json();

        for (const [key, tiles] of Object.entries(data)) {
            chunkCache.set(key, createChunkObject(tiles));
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
    const batch = chunkQueue.splice(0, 16);
    fetchBatch(batch);
}

function preloadInitialChunks() {
    const screenChunkSize = CHUNK_SIZE * tileSize;
    const centerX = Math.floor((camera.x + canvas.width / 2) / screenChunkSize);
    const centerY = Math.floor((camera.y + canvas.height / 2) / screenChunkSize);

    const RADIUS = 4; // Сокращаем радиус до минимума для быстрого старта

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



const colors = {
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


function renderTilesToCanvas(tiles, chunkCtx) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = tiles[y][x];
            const tx = x * baseTileSize;
            const ty = y * baseTileSize;

            // 1. ПОЧВА (с градиентом для гор)
            if (tile.b === 'mountains') {
                const grad = chunkCtx.createLinearGradient(tx, ty, tx + baseTileSize, ty + baseTileSize);
                grad.addColorStop(0, colors[tile.s]);
                grad.addColorStop(1, darkenColor(colors[tile.s], 0.8));  // Темнее для "тени" пиков
                chunkCtx.fillStyle = grad;
            } else {
                chunkCtx.fillStyle = colors[tile.s] || '#000';
            }
            chunkCtx.fillRect(tx, ty, baseTileSize, baseTileSize);

            // 2. ОБЪЕКТЫ
            if (tile.e) {
                if (tile.e === 'cactus') {
                    chunkCtx.fillStyle = colors['cactus'];
                    // Рисуем кактус узким высоким прямоугольником в центре
                    const width = 6;
                    const height = baseTileSize - 12;
                    chunkCtx.fillRect(tx + (baseTileSize - width) / 2, ty + 6, width, height);

                    // Добавим маленькую "колючку" сбоку для узнаваемости
                    chunkCtx.fillRect(tx + (baseTileSize - width) / 2 + width, ty + 12, 4, 2);
                } else if (tile.e === 'stone_flower') {
                    chunkCtx.fillStyle = colors['stone_flower']; // Убеждаемся, что цвет берется из конфига
                    chunkCtx.beginPath();

                    // Центрируем кружок точно в середине тайла
                    const centerX = tx + baseTileSize / 2;
                    const centerY = ty + baseTileSize / 2;
                    const radius = baseTileSize / 4; // Сделаем радиус зависимым от размера тайла (8 при 32)

                    chunkCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    chunkCtx.fill();
                } else if (tile.e.startsWith('flower_')) {
                    // Обычные цветы оставляем квадратиками (или тоже можно скруглить)
                    chunkCtx.fillStyle = colors[tile.e];
                    chunkCtx.fillRect(tx + 12, ty + 12, 8, 8);
                } else if (tile.e === 'grass_detail') {
                    chunkCtx.fillStyle = colors['grass_detail'];
                    chunkCtx.fillRect(tx + 10, ty + 14, 8, 3);
                } else {
                    // Деревья
                    chunkCtx.fillStyle = 'rgba(0,0,0,0.2)';
                    chunkCtx.fillRect(tx + 6, ty + 6, baseTileSize - 10, baseTileSize - 10);

                    chunkCtx.fillStyle = colors[tile.e];
                    chunkCtx.fillRect(tx + 4, ty + 4, baseTileSize - 10, baseTileSize - 10);
                }
            }

            // 3. РУДА (Детектор)
            if (isOreProspecting && tile.o) {
                chunkCtx.fillStyle = colors[tile.o] || '#fff';
                chunkCtx.fillRect(tx + 12, ty + 12, 8, 8);
            }

            // 4. ЖИДКОСТИ (новое): закрашиваем весь тайл для видимости чанка
            if (isLiquidProspecting && tile.lm !== undefined) {  // Только если есть жила (lm существует)
                const fillRatio = tile.la / tile.lm;  // 0.0 — 1.0
                const fillHeight = fillRatio * baseTileSize;

                // Заполнение снизу вверх (как жидкость в резервуаре)
                chunkCtx.fillStyle = colors[tile.l] || '#000';
                chunkCtx.globalAlpha = 0.85;  // Немного прозрачно, чтобы видеть рельеф под ней
                chunkCtx.fillRect(tx, ty + baseTileSize - fillHeight, baseTileSize, fillHeight);
                chunkCtx.globalAlpha = 1.0;

                // Текст количества (всегда, даже 0L)
                const fontSize = Math.min(16, Math.max(10, 14 * zoom));
                chunkCtx.font = `${Math.floor(fontSize)}px Arial`;
                chunkCtx.textAlign = 'center';
                chunkCtx.textBaseline = 'middle';

                // Цвет текста: белый на тёмном заполнении, серый на светлом/пустом
                chunkCtx.fillStyle = fillRatio > 0.5 ? '#ffffff' : '#aaaaaa';
                chunkCtx.fillText(`${tile.la}L`, tx + baseTileSize / 2, ty + baseTileSize / 2);

                // Опционально: лёгкая рамка вокруг тайла с жидкостью для выделения
                if (fillRatio > 0) {
                    chunkCtx.strokeStyle = '#ffff00';
                    chunkCtx.lineWidth = 1;
                    chunkCtx.strokeRect(tx + 0.5, ty + 0.5, baseTileSize - 1, baseTileSize - 1);
                }
            }
        }
    }
}

// Хелпер для затемнения цвета
function darkenColor(color, factor) {
    const r = parseInt(color.slice(1,3),16) * factor;
    const g = parseInt(color.slice(3,5),16) * factor;
    const b = parseInt(color.slice(5,7),16) * factor;
    return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
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
    if (e.key.toLowerCase() === 'f') {
        console.log(`Jump: ${player.jumpType}, Anim: ${player.jumpAnim.toFixed(2)}, OnGround: ${player.onGround}`);
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



function loop() {
    if (!isDragging) {
        camera.x -= velocityX;
        camera.y -= velocityY;
        velocityX *= inertiaDamping;
        velocityY *= inertiaDamping;
    }
    processChunkQueue();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    //камера следует за игроком
    updatePlayer();

    if (followPlayer) {
        camera.x = player.x * tileSize - canvas.width / 2;
        camera.y = player.y * tileSize - canvas.height / 2;
    }


    renderWorld();  //рендер мира
    renderPlayer(); //рендер игрока
    requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
    onResize();
    preloadInitialChunks();
    requestAnimationFrame(loop);
});
