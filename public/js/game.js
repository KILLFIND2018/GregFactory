// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Масштаб
let zoom = 1;             // текущий масштаб
const minZoom = 0.5;        //минимальный
const maxZoom = 6;          //максимальный

let baseTileSize = 32;
let tileSize = baseTileSize * zoom;

// GLOBAL SPEED VARIABLES

// === WORLD / CHUNKS ===
const CHUNK_SIZE = 16;

const chunkCache = new Map();     // загруженные чанки
const loadingChunks = new Set();  // чанки в процессе загрузки

let velocityX = 0;
let velocityY = 0;

let lastMouseX = 0;
let lastMouseY = 0;


const inertiaDamping = 0.94;   // скорость затухания
const velocityMax = 60;        // ограничение инерции (px/frame)



// === CAMERA (левый верхний угол мира) ===
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

// === RESIZE ===
function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    camera.screenCenterX = canvas.width / 2;
    camera.screenCenterY = canvas.height / 2;

    visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
    visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
}
window.addEventListener("resize", onResize);

// === CAMERA LIMITS ===
function clampCamera() {

}

// === ZOOM ===
function setZoom(newZoom, centerX = camera.screenCenterX, centerY = camera.screenCenterY) {
    const oldZoom = zoom;
    zoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

    if (zoom === oldZoom) return;

    // координата мира под курсором до зума
    const worldX = (camera.x + centerX) / (baseTileSize * oldZoom);
    const worldY = (camera.y + centerY) / (baseTileSize * oldZoom);

    tileSize = baseTileSize * zoom;

    // новая позиция камеры — держим точку под курсором
    camera.x = worldX * tileSize - centerX;
    camera.y = worldY * tileSize - centerY;

    clampCamera();

    visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
    visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
}

// === WHEEL ZOOM (ПК) ===
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom(zoom + delta, e.clientX, e.clientY);
}, { passive: false });

// === DRAG (как Google Maps) ===
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


// === TOUCH CONTROLS ===
let isTouchDragging = false;
let touchStartX = 0;
let touchStartY = 0;
let touchCameraStartX = 0;
let touchCameraStartY = 0;

// pinch
let lastPinchDist = null;
let pinchCenterX = 0;
let pinchCenterY = 0;

let lastTouchDX = 0;
let lastTouchDY = 0;


canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        // Начинаем обычный свайп (панорама)
        const t = e.touches[0];

        isTouchDragging = true;

        touchStartX = t.clientX;
        touchStartY = t.clientY;

        touchCameraStartX = camera.x;
        touchCameraStartY = camera.y;

        lastPinchDist = null; // сброс pinch
    }

    else if (e.touches.length === 2) {
        // Начинается pinch zoom
        const t1 = e.touches[0], t2 = e.touches[1];

        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;

        lastPinchDist = Math.sqrt(dx*dx + dy*dy);

        pinchCenterX = (t1.clientX + t2.clientX) / 2;
        pinchCenterY = (t1.clientY + t2.clientY) / 2;

        isTouchDragging = false; // отключаем панорамирование
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
        // === PAN / SWIPE ===
        e.preventDefault();

        // если до этого был pinch, запрещаем дергание
        if (!isTouchDragging) return;

        const t = e.touches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;

        camera.x = touchCameraStartX - dx;
        camera.y = touchCameraStartY - dy;

        // инерционная скорость
        velocityX = (dx - lastTouchDX) * 0.5;
        velocityY = (dy - lastTouchDY) * 0.5;

        velocityX = Math.max(-velocityMax, Math.min(velocityX, velocityMax));
        velocityY = Math.max(-velocityMax, Math.min(velocityY, velocityMax));

        lastTouchDX = dx;
        lastTouchDY = dy;

        clampCamera();
    }

    else if (e.touches.length === 2) {
        // === PINCH ZOOM ===
        e.preventDefault();

        const t1 = e.touches[0], t2 = e.touches[1];

        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;

        const dist = Math.sqrt(dx*dx + dy*dy);

        if (lastPinchDist !== null) {
            const delta = (dist - lastPinchDist) * 0.004;

            pinchCenterX = (t1.clientX + t2.clientX) / 2;
            pinchCenterY = (t1.clientY + t2.clientY) / 2;

            setZoom(zoom + delta, pinchCenterX, pinchCenterY);
        }

        lastPinchDist = dist;
    }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
        lastPinchDist = null;
    }
    if (e.touches.length === 0) {
        isTouchDragging = false;
        lastTouchDX = 0;
        lastTouchDY = 0;
    }
});



async function loadChunk(cx, cy) {
    const key = cx + "," + cy;

    if (chunkCache.has(key) || loadingChunks.has(key)) return;

    loadingChunks.add(key);

    try {
        const res = await fetch(`/api/chunk?cx=${cx}&cy=${cy}`);
        const data = await res.json();

        if (data && data.tiles) {
            chunkCache.set(key, data.tiles);
        }
    } catch (e) {
        console.error("Chunk load error", cx, cy, e);
    } finally {
        loadingChunks.delete(key);
    }
}

const chunkQueue = [];
const MAX_CONCURRENT_REQUESTS = 6;
let activeRequests = 0;

function enqueueChunk(cx, cy, priority) {
    const key = cx + "," + cy;

    if (chunkCache.has(key) || loadingChunks.has(key)) return;

    loadingChunks.add(key);

    chunkQueue.push({ cx, cy, priority });

    // ближние чанки — первыми
    chunkQueue.sort((a, b) => a.priority - b.priority);
}
//Загрузка по очереди
async function processChunkQueue() {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;
    if (chunkQueue.length === 0) return;

    const { cx, cy } = chunkQueue.shift();
    const key = cx + "," + cy;

    activeRequests++;

    try {
        const res = await fetch(`/api/chunk?cx=${cx}&cy=${cy}`);
        const data = await res.json();
        chunkCache.set(key, {
            tiles: data.tiles,
            loadedAt: performance.now()
        });

    } catch (e) {
        console.error("Chunk load error", cx, cy);
    } finally {
        loadingChunks.delete(key);
        activeRequests--;
    }
}
//PRELOAD CHUNKS
function preloadInitialChunks() {
    const centerTileX = Math.floor((camera.x + canvas.width / 2) / tileSize);
    const centerTileY = Math.floor((camera.y + canvas.height / 2) / tileSize);

    const centerChunkX = Math.floor(centerTileX / CHUNK_SIZE);
    const centerChunkY = Math.floor(centerTileY / CHUNK_SIZE);

    const PRELOAD_RADIUS = 3; // 3 чанка вокруг центра

    for (let dy = -PRELOAD_RADIUS; dy <= PRELOAD_RADIUS; dy++) {
        for (let dx = -PRELOAD_RADIUS; dx <= PRELOAD_RADIUS; dx++) {

            const cx = centerChunkX + dx;
            const cy = centerChunkY + dy;

            const priority = Math.abs(dx) + Math.abs(dy);
            enqueueChunk(cx, cy, priority);
        }
    }
}


//Pattern render world

function getTileColor(tile) {
    switch (tile.surface) {
        case "water":
            return tile.biome === "ocean"
                ? "#3a6ea5"
                : "#2e8bff";
        case "sand":  return "#e5d38a";
        case "grass": return "#4caf50";
        case "stone": return "#888888";
        default: return "#000";
    }
}



// === DRAW LAYER TILE ===
function drawTile(tile, x, y) {
    const screenX = x * tileSize - camera.x;
    const screenY = y * tileSize - camera.y;

    ctx.fillStyle = getTileColor(tile);
    ctx.fillRect(screenX, screenY, tileSize, tileSize);
}



// === RENDER CHUNK WORLD ===
function renderWorld() {
    if (!isFinite(tileSize) || tileSize <= 0) return;

    const tilesOnScreenX = canvas.width / tileSize;
    const tilesOnScreenY = canvas.height / tileSize;

    const VIEW_RADIUS = Math.ceil(
        Math.max(tilesOnScreenX, tilesOnScreenY) / 2
    ) + 2;

    const centerTileX = Math.floor((camera.x + canvas.width / 2) / tileSize);
    const centerTileY = Math.floor((camera.y + canvas.height / 2) / tileSize);

    const startTileX = centerTileX - VIEW_RADIUS;
    const startTileY = centerTileY - VIEW_RADIUS;
    const endTileX   = centerTileX + VIEW_RADIUS;
    const endTileY   = centerTileY + VIEW_RADIUS;

    for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {

            const cx = Math.floor(tx / CHUNK_SIZE);
            const cy = Math.floor(ty / CHUNK_SIZE);

            const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

            const key = cx + "," + cy;
            const chunkData = chunkCache.get(key);

            if (!chunkData) {
                // асинхронно грузим
                const dx = cx - Math.floor(centerTileX / CHUNK_SIZE);
                const dy = cy - Math.floor(centerTileY / CHUNK_SIZE);
                const priority = Math.abs(dx) + Math.abs(dy);

                enqueueChunk(cx, cy, priority);

                continue;
            }

            const fadeDuration = 300; // ms

            const age = performance.now() - chunkData.loadedAt;
            ctx.globalAlpha = Math.min(age / fadeDuration, 1);

            const tile = chunkData.tiles[ly][lx];
            drawTile(tile, tx, ty);

            ctx.globalAlpha = 1;

        }
    }
}






// === MAIN LOOP ===
let warmupDone = false;


function loop() {

    // === INERTIA UPDATE ===
    if (!isDragging && !isTouchDragging) {
        camera.x -= velocityX;
        camera.y -= velocityY;

        velocityX *= inertiaDamping;
        velocityY *= inertiaDamping;

        if (Math.abs(velocityX) < 0.05) velocityX = 0;
        if (Math.abs(velocityY) < 0.05) velocityY = 0;
    }

    // 🔥 Обрабатываем очередь чанков (1 раз за кадр)
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
    chunkCache.clear();
}

window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") {
        regenerateWorld();
    }
});





