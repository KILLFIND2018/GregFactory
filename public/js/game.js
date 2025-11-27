// -------------------
//  CANVAS SETUP
// -------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let tileSize = 32;
let scale = 1;

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.scale(dpr, dpr);

    onResize(width, height);
}

function onResize(width, height) {
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

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(window.innerWidth/2, window.innerHeight/2, 40, 0, Math.PI*2);
    ctx.fill();

    requestAnimationFrame(loop);
}
loop();
