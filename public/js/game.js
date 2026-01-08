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
const MAX_CONCURRENT_REQUESTS = 2;
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
    if (chunkCache.has(key) || loadingChunks.has(key) || chunkQueue.some(q => q.cx === cx && q.cy === cy)) return;
    loadingChunks.add(key);
    chunkQueue.push({ cx, cy, priority });
    chunkQueue.sort((a, b) => a.priority - b.priority);
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
    const batch = chunkQueue.splice(0, 8);
    fetchBatch(batch);
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
            if (chunkData) {
                const age = performance.now() - chunkData.loadedAt;
                ctx.globalAlpha = Math.min(age / 300, 1);
                ctx.drawImage(chunkData.canvas, screenX, screenY, screenChunkSize, screenChunkSize);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = "#0a0a0a";
                ctx.fillRect(screenX, screenY, screenChunkSize, screenChunkSize);
                enqueueChunk(cx, cy, 0);
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

function renderTilesToCanvas(tiles, chunkCtx) {
    const colors = {
        'deep_ocean': '#000b1a',
        'water': '#0077be',
        'beach_sand': '#f0e68c',
        'grass': '#567d46',
        'grass_cold': '#4d6d40',
        'freeze_grass': '#6a8d7a',
        'grass_forest': '#3d5e30',
        'dry_grass': '#8b8d46',
        'sand': '#d2b48c',
        'stone': '#808080',
        'snow': '#ffffff',
        'clay': '#a1887f', // Коричневато-глиняный
        'gravel': '#8d8d8d',


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

    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = tiles[y][x];
            // 1. Слой земли
            chunkCtx.fillStyle = colors[tile.s] || '#000';
            chunkCtx.fillRect(x * baseTileSize, y * baseTileSize, baseTileSize, baseTileSize);

            // 2. Слой руды (если режим активен)
            if (isProspecting && tile.o && colors[tile.o]) {
                chunkCtx.fillStyle = colors[tile.o];
                const p = 6;
                chunkCtx.fillRect(
                    x * baseTileSize + p,
                    y * baseTileSize + p,
                    baseTileSize - p * 2,
                    baseTileSize - p * 2
                );
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

function preloadInitialChunks() {
    const cx = Math.floor((camera.x + canvas.width/2) / (baseTileSize * CHUNK_SIZE * zoom));
    const cy = Math.floor((camera.y + canvas.height/2) / (baseTileSize * CHUNK_SIZE * zoom));
    const RADIUS = 6;
    for (let i = 0; i <= RADIUS; i++) {
        for (let dx = -i; dx <= i; dx++) {
            for (let dy = -i; dy <= i; dy++) {
                if (Math.abs(dx) === i || Math.abs(dy) === i) enqueueChunk(cx + dx, cy + dy, i);
            }
        }
    }
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
