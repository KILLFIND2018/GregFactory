// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Scale
let zoom = 1;
const minZoom = 0.05;
const maxZoom = 6;

let baseTileSize = 32;
let tileSize = baseTileSize * zoom;

let velocityX = 0;
let velocityY = 0;
let lastMouseX = 0;
let lastMouseY = 0;


const inertiaDamping = 0.94;
const velocityMax = 60;

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

function clampCamera() {}

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

// Chunk management
const CHUNK_SIZE = 16;
const MAX_CONCURRENT_REQUESTS = 10;
let activeRequests = 0;
const loadingChunks = new Set();
const chunkCache = new Map();
const chunkQueue = [];
let currentSeed = 1767904171111;
let isProspecting = false;

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
        'ore_bismuth': '#6e8b8b'
    };


function renderTilesToCanvas(tiles, chunkCtx) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = tiles[y][x];
            const tx = x * baseTileSize;
            const ty = y * baseTileSize;

            // 1. ПОЧВА
            chunkCtx.fillStyle = colors[tile.s] || '#000';
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
            if (isProspecting && tile.o) {
                chunkCtx.fillStyle = colors[tile.o] || '#fff';
                chunkCtx.fillRect(tx + 12, ty + 12, 8, 8);
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
    if (e.key.toLowerCase() === 'p' && !isProspecting) {
        isProspecting = true;
        refreshVisibleChunks();
    }
    if (e.key.toLowerCase() === "1") {
        regenerateWorld();
    }
    if (e.key.toLowerCase() === 'g') { // Клавиша G для сетки
        showGrid = !showGrid;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'p') {
        isProspecting = false;
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
    renderWorld();
    requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
    onResize();
    preloadInitialChunks();
    requestAnimationFrame(loop);
});
