// === Canvas ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Масштаб
let zoom = 1;             // текущий масштаб
const minZoom = 0.5;        //минимальный
const maxZoom = 6;          //максимальный

let baseTileSize = 32;
let tileSize = baseTileSize * zoom;

let visibleTilesX = 20;
let visibleTilesY = 12;

// Камера
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

// === Мир ===
const WORLD_WIDTH = 16 * 16;     // 16 чанков
const WORLD_HEIGHT = 16 * 16;

const world = [];
for (let y = 0; y < WORLD_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
        row.push(1);
    }
    world.push(row);
}

// === Resize ===
function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    camera.screenCenterX = canvas.width / 2;
    camera.screenCenterY = canvas.height / 2;

    visibleTilesX = Math.ceil(canvas.width / tileSize);
    visibleTilesY = Math.ceil(canvas.height / tileSize);
}
window.addEventListener("resize", onResize);


// === Установка зума ===
function setZoom(newZoom, centerX, centerY) {
    const oldZoom = zoom;
    zoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

    // Место курсора → точка мира
    const worldX = (centerX - camera.screenCenterX + camera.x) / (baseTileSize * oldZoom);
    const worldY = (centerY - camera.screenCenterY + camera.y) / (baseTileSize * oldZoom);

    // Обновляем tileSize
    tileSize = baseTileSize * zoom;

    // Пересчёт камеры так, чтобы точка под курсором оставалась в том же месте
    camera.x = worldX * tileSize;
    camera.y = worldY * tileSize;

    visibleTilesX = Math.ceil(canvas.width / tileSize);
    visibleTilesY = Math.ceil(canvas.height / tileSize);
}


// === Zoom колесом мыши ===
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const delta = -e.deltaY * 0.001; // чувствительность
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    setZoom(zoom + delta, mouseX, mouseY);
}, { passive: false });


// === Pinch zoom (телефон) ===
let lastPinchDist = 0;

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (lastPinchDist !== 0) {
            const delta = (dist - lastPinchDist) * 0.002;

            const centerX = (t1.clientX + t2.clientX) / 2;
            const centerY = (t1.clientY + t2.clientY) / 2;

            setZoom(zoom + delta, centerX, centerY);
        }
        lastPinchDist = dist;
    }
}, { passive: false });

canvas.addEventListener("touchend", () => {
    lastPinchDist = 0;
});


// === Рендер тайла ===
function drawTile(x, y, type) {
    const screenX = x * tileSize - camera.x + camera.screenCenterX;
    const screenY = y * tileSize - camera.y + camera.screenCenterY;

    ctx.fillStyle = "#2ecc71"; // зелёный
    ctx.fillRect(screenX, screenY, tileSize - 1, tileSize - 1);
}


// === Рендер мира ===
function renderWorld() {
    const startX = Math.floor((camera.x - camera.screenCenterX) / tileSize);
    const startY = Math.floor((camera.y - camera.screenCenterY) / tileSize);

    const endX = startX + visibleTilesX + 2;
    const endY = startY + visibleTilesY + 2;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (world[y] && world[y][x] !== undefined) {
                drawTile(x, y, world[y][x]);
            }
        }
    }
}


// === Игрок ===
const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2
};


// === Обновление камеры ===
function updateCamera() {
    camera.x = player.x * tileSize;
    camera.y = player.y * tileSize;
}


// === Game Loop ===
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateCamera();
    renderWorld();

    requestAnimationFrame(loop);
}

onResize();
loop();
