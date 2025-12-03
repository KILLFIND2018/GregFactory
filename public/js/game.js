// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Масштаб
let zoom = 1;             // текущий масштаб
const minZoom = 0.5;        //минимальный
const maxZoom = 6;          //максимальный

let baseTileSize = 32;
let tileSize = baseTileSize * zoom;

// === CAMERA (левый верхний угол мира) ===
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

// === WORLD CONFIG ===
const WORLD_WIDTH = 16 * 16;   // тайлов
const WORLD_HEIGHT = 16 * 16;  // тайлов

// === WORLD GENERATION ===
const world = [];
for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WORLD_WIDTH; x++) row.push(1);
    world.push(row);
}

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
    const maxX = WORLD_WIDTH * tileSize - canvas.width;
    const maxY = WORLD_HEIGHT * tileSize - canvas.height;

    camera.x = Math.max(0, Math.min(camera.x, maxX));
    camera.y = Math.max(0, Math.min(camera.y, maxY));
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
let dragStartX = 0;
let dragStartY = 0;
let cameraStartX = 0;
let cameraStartY = 0;

canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    cameraStartX = camera.x;
    cameraStartY = camera.y;
});

window.addEventListener("mouseup", () => {
    isDragging = false;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    camera.x = cameraStartX - dx;
    camera.y = cameraStartY - dy;

    clampCamera();
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

canvas.addEventListener("touchend", () => {
    if (event.touches.length < 2) {
        lastPinchDist = null;
    }
    if (event.touches.length === 0) {
        isTouchDragging = false;
    }
});

// === DRAW TILE ===
function drawTile(x, y) {
    const screenX = x * tileSize - camera.x;
    const screenY = y * tileSize - camera.y;

    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(screenX, screenY, tileSize - 1, tileSize - 1);
}

// === RENDER WORLD ===
function renderWorld() {
    const startX = Math.floor(camera.x / tileSize);
    const startY = Math.floor(camera.y / tileSize);

    const endX = startX + visibleTilesX;
    const endY = startY + visibleTilesY;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (world[y] && world[y][x] !== undefined) {
                drawTile(x, y);
            }
        }
    }
}

// === MAIN LOOP ===
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderWorld();
    requestAnimationFrame(loop);
}

onResize();
loop();
