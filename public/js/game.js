// -------------------
//  CANVAS SETUP
// -------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let tileSize = 32;
let scale = 1;

function resizeCanvas() {
    // CSS размер (в логических пикселях)
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Pixel Ratio (для Retina)
    const dpr = window.devicePixelRatio || 1;

    // Устанавливаем реальный размер canvas
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Визуальный размер canvas
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Масштабируем контекст
    ctx.scale(dpr, dpr);

    onResize(width, height);
}

function onResize(width, height) {
    // Автоматически рассчитываем масштабир. для всех устройств
    if (width < 600) scale = 0.7;
    else if (width < 1200) scale = 1;
    else scale = 1.5;

    tileSize = 32 * scale;
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

resizeCanvas();

// -------------------
//  RENDER LOOP
// -------------------

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Пример: рисуем кружок в центре экрана
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(window.innerWidth/2, window.innerHeight/2, 40, 0, Math.PI*2);
    ctx.fill();

    requestAnimationFrame(loop);
}
loop();
