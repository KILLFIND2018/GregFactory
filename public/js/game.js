// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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
const velocityMax = 60;

// Camera
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

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

// Clamp camera (add limits if needed)
function clampCamera() {
    // e.g., camera.x = Math.max(0, Math.min(camera.x, worldSize * tileSize - canvas.width));
}

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

    clampCamera();

    visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
    visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
}

// Wheel zoom
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

window.addEventListener("mouseup", () => {
    isDragging = false;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;

    camera.x -= dx;
    camera.y -= dy;

    velocityX = dx;
    velocityY = dy;

    velocityX = Math.max(-velocityMax, Math.min(velocityX, velocityMax));
    velocityY = Math.max(-velocityMax, Math.min(velocityY, velocityMax));

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

// Touch
let isTouchDragging = false;
let touchStartX = 0;
let touchStartY = 0;
let touchCameraStartX = 0;
let touchCameraStartY = 0;

let lastPinchDist = null;
let pinchCenterX = 0;
let pinchCenterY = 0;

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        const t = e.touches[0];
        isTouchDragging = true;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchCameraStartX = camera.x;
        touchCameraStartY = camera.y;
        lastPinchDist = null;
    } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        lastPinchDist = Math.sqrt(dx*dx + dy*dy);
        pinchCenterX = (t1.clientX + t2.clientX) / 2;
        pinchCenterY = (t1.clientY + t2.clientY) / 2;
        isTouchDragging = false;
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
        e.preventDefault();
        if (!isTouchDragging) return;
        const t = e.touches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        camera.x = touchCameraStartX - dx;
        camera.y = touchCameraStartY - dy;
        velocityX = dx * -0.1; // Adjust for inertia
        velocityY = dy * -0.1;
    } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (lastPinchDist) {
            const delta = (dist - lastPinchDist) * 0.01;
            setZoom(zoom + delta, pinchCenterX, pinchCenterY);
        }
        lastPinchDist = dist;
    }
}, { passive: false });

canvas.addEventListener("touchend", () => {
    isTouchDragging = false;
    lastPinchDist = null;
});

// Chunk management
const CHUNK_SIZE = 16;
const MAX_CONCURRENT_REQUESTS = 2;
let activeRequests = 0;
const chunkCache = new Map();
const loadingChunks = new Set();
const chunkQueue = [];
let currentSeed = 12345;
let batchQueue = [];


function enqueueChunk(cx, cy, priority) {
    const key = `${cx},${cy}`;
    if (chunkCache.has(key) || loadingChunks.has(key) || chunkQueue.some(q => q.cx === cx && q.cy === cy)) return;

    // Сразу помечаем как загружающийся
    loadingChunks.add(key);
    chunkQueue.push({ cx, cy, priority });
    chunkQueue.sort((a, b) => a.priority - b.priority);
}

async function fetchBatch(batch) {
    activeRequests++;
    const batchStr = batch.map(c => `${c.cx},${c.cy}`).join(';');

    try {
        // Мы передаем сразу список чанков через параметр batch
        const res = await fetch(`/api/chunk?batch=${batchStr}&seed=${currentSeed}`);
        if (!res.ok) throw new Error('Batch fetch failed');
        const data = await res.json();

        // Перебираем каждый чанк в ответе
        for (const key in data) {
            const tiles = data[key]; // Массив 16x16

            // Создаем холст для конкретного чанка
            const chunkCanvas = document.createElement('canvas');
            const size = CHUNK_SIZE * baseTileSize;
            chunkCanvas.width = size;
            chunkCanvas.height = size;
            const cctx = chunkCanvas.getContext('2d');

            // Рисуем тайлы чанка (используем короткие ключи: s, f)
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const tile = tiles[y][x];

                    // Отрисовка земли
                    cctx.fillStyle = getTileColor(tile);
                    cctx.fillRect(x * baseTileSize, y * baseTileSize, baseTileSize, baseTileSize);

                    // Отрисовка объектов (feature -> f)
                    if (tile.f === 'tree') {
                        cctx.fillStyle = "#228B22";
                        cctx.beginPath();
                        cctx.arc(
                            x * baseTileSize + baseTileSize / 2,
                            y * baseTileSize + baseTileSize / 2,
                            baseTileSize / 3, 0, Math.PI * 2
                        );
                        cctx.fill();
                    }
                }
            }

            // Сохраняем и картинку для отрисовки, и данные для логики
            chunkCache.set(key, {
                image: chunkCanvas,
                tiles: tiles, // сохраняем данные (с короткими ключами)
                loadedAt: performance.now()
            });
            loadingChunks.delete(key);
        }
    } catch (e) {
        console.error("Batch loading error:", e);
        // В случае ошибки удаляем из списка загрузки, чтобы попробовать снова
        batch.forEach(c => loadingChunks.delete(`${c.cx},${c.cy}`));
    } finally {
        activeRequests--;
        processChunkQueue();
    }
}

function processChunkQueue() {
    if (chunkQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) return;

    // Берем до 8 чанков за один раз
    const batch = chunkQueue.splice(0, 8);
    fetchBatch(batch);
}





// Colors
function getTileColor(tile) {
    const colors = {
        // Вода
        'deep_ocean':   '#000b1a',
        'water':        '#0077be',

        // Берег
        'beach_sand':   '#dcb35c', // Песок у воды

        // Суша
        'grass':        '#567d46', // Обычная трава
        'grass_cold':   '#5b7c5b', // Тайга
        'grass_forest': '#3e5e32', // Густой лес
        'dry_grass':    '#b3a95d', // Саванна
        'sand':         '#f2d16b', // Пустыня
        'snow':         '#ffffff', // Пик гор
        'freeze_grass': '#8ecff3', // Тундра
        'stone':        '#696969', // Горы

        // Ошибка
        'default':      '#ff00ff'
    };
    return colors[tile.s] || colors['default'];
}




// Render world
// В функции renderWorld меняем цикл:
function renderWorld() {
    const screenChunkSize = CHUNK_SIZE * tileSize;

    // Определяем диапазон видимых чанков
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

            if (chunkData) {
                const age = performance.now() - chunkData.loadedAt;
                ctx.globalAlpha = Math.min(age / 300, 1);
                // Рисуем весь чанк одной командой!
                ctx.drawImage(chunkData.image, screenX, screenY, screenChunkSize, screenChunkSize);
                ctx.globalAlpha = 1;
            } else {
                // Плейсхолдер для незагруженного чанка
                ctx.fillStyle = "#0a0a0a";
                ctx.fillRect(screenX, screenY, screenChunkSize, screenChunkSize);
                enqueueChunk(cx, cy, 0);
            }
        }
    }
}

// Увеличиваем радиус предзагрузки до 32 чанков (в площади это много, берем радиус 4-6)
function preloadInitialChunks() {
    const cx = Math.floor((camera.x + canvas.width/2) / (baseTileSize * CHUNK_SIZE * zoom));
    const cy = Math.floor((camera.y + canvas.height/2) / (baseTileSize * CHUNK_SIZE * zoom));
    const RADIUS = 6; // Это охватит примерно 144 чанка вокруг игрока

    for (let i = 0; i <= RADIUS; i++) {
        for (let dx = -i; dx <= i; dx++) {
            for (let dy = -i; dy <= i; dy++) {
                if (Math.abs(dx) === i || Math.abs(dy) === i) {
                    enqueueChunk(cx + dx, cy + dy, i);
                }
            }
        }
    }
}

// Main loop
function loop() {
    if (!isDragging && !isTouchDragging) {
        camera.x -= velocityX;
        camera.y -= velocityY;
        velocityX *= inertiaDamping;
        velocityY *= inertiaDamping;
        if (Math.abs(velocityX) < 0.05) velocityX = 0;
        if (Math.abs(velocityY) < 0.05) velocityY = 0;
    }

    processChunkQueue();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderWorld();

    requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
    onResize();
    preloadInitialChunks();
    requestAnimationFrame(loop);
});

function regenerateWorld() {
    currentSeed = Date.now(); // New seed
    chunkCache.clear();
    preloadInitialChunks();
}

window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "1") {
        regenerateWorld();
    }
});
