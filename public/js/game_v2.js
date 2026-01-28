// ==============================================
// game_v2.js - Рефакторинг игрового кода
// ==============================================

// ========== КОНСТАНТЫ И КОНФИГУРАЦИИ ==========
const CONSTANTS = {
    API_BASE: '/api',
    CHUNK_SIZE: 16,
    MAX_STACK: 64,
    MINING_RADIUS: 8,
    MAX_CHUNK_CACHE: 50,
    MAX_CONCURRENT_REQUESTS: 3,
    BATCH_SIZE: 8,
    CACHE_TTL: 30000,
    UPDATE_INTERVAL: 5000,       // Интервал обновления позиции игрока (5 секунд)
    SYNC_INTERVAL: 5000,         // Интервал общей синхронизации (5 секунд)
    SYNC_POSITION_INTERVAL: 30000, // Интервал синхронизации позиции (30 секунд)
    SYNC_INVENTORY_INTERVAL: 60000, // Интервал синхронизации инвентаря (60 секунд)
    RENDER_SKIP_FACTOR: 2,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 6,
    BASE_TILE_SIZE: 32
};

// Конфигурация инструментов
const TOOLS_CONFIG = {
    hand: {
        id: 'hand',
        name: 'Рука',
        miningLevel: 0,
        miningSpeed: 1.0,
        damage: 1,
        canMine: {
            'plant': true,
            'dirt': true,
            'wood': true,
        },
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

// Конфигурация блоков
const BLOCKS_CONFIG = {
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
    'dirt':         { type: 'dirt',    level: 0, hardness: 0.5, tool: 'shovel' },
    'ocean':        { type: 'water',   level: 0, hardness: Infinity, tool: null },
    'sand_ground':  { type: 'sand',    level: 0, hardness: 0.4, tool: 'shovel' },
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
    'ore_andesite':      { type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_basalt':        { type: 'ore', level: 1, hardness: 2.2, tool: 'pickaxe' },
    'ore_brown_limonite':{ type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_yellow_limonite':{ type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_malachite':     { type: 'ore', level: 1, hardness: 2.5, tool: 'pickaxe' },
    'ore_copper':        { type: 'ore', level: 1, hardness: 2.0, tool: 'pickaxe' },
    'ore_cassiterite':   { type: 'ore', level: 1, hardness: 2.3, tool: 'pickaxe' },
    'ore_tin':           { type: 'ore', level: 1, hardness: 2.1, tool: 'pickaxe' },
    'ore_bismuth':       { type: 'ore', level: 1, hardness: 2.4, tool: 'pickaxe' }
};

// Конфигурация ресурсов
const RESOURCE_CONFIG = {
    'stone': { finite: false, drop: 1, persistent: true },
    'dirt': { finite: true, drop: 1 },
    'sand': { finite: true, drop: 1 },
    'gravel': { finite: true, drop: 1 },
    'clay': { finite: true, drop: 1 },
    'beach_sand': { finite: true, drop: 1 },
    'desert_sand': { finite: true, drop: 1 },
    'snow': { finite: true, drop: 1 },
    'grass': { finite: true, drop: 1 },
    'grass_detail': { finite: true, drop: 1 },
    'flower_red': { finite: true, drop: 1 },
    'flower_yellow': { finite: true, drop: 1 },
    'flower_white': { finite: true, drop: 1 },
    'cactus': { finite: true, drop: 1 },
    'bush_cold': { finite: true, drop: 1 },
    'sugar_cane': { finite: true, drop: 1 },
    'stone_flower': { finite: true, drop: 1 },
    'tree': { finite: true, drop: 3 },
    'jungle_tree': { finite: true, drop: 4 },
    'pine': { finite: true, drop: 3 },
    'ore_andesite': { finite: true, drop: 1 },
    'ore_basalt': { finite: true, drop: 1 },
    'ore_brown_limonite': { finite: true, drop: 2 },
    'ore_yellow_limonite': { finite: true, drop: 2 },
    'ore_malachite': { finite: true, drop: 1 },
    'ore_copper': { finite: true, drop: 1 },
    'ore_cassiterite': { finite: true, drop: 1 },
    'ore_tin': { finite: true, drop: 1 },
    'ore_bismuth': { finite: true, drop: 1 },
    'rock_peak': { finite: true, drop: 1 },
    'snow_peak': { finite: true, drop: 1 },
    'water': { finite: false, drop: 0, unbreakable: true },
    'deep_ocean': { finite: false, drop: 0, unbreakable: true },
    'ocean': { finite: false, drop: 0, unbreakable: true },
    'lake': { finite: false, drop: 0, unbreakable: true }
};

// Цвета блоков
const COLORS = {
    'void': '#1a1a2e',
    'deep_ocean': '#000b1a',
    'water': '#0077be',
    'lake': '#2a9df4',
    'beach_sand': '#f0e68c',
    'sand': '#d2b48c',
    'clay': '#a1887f',
    'gravel': '#8d8d8d',
    'beach': '#f0e68c',
    'coast': '#e6d8a3',
    'dirt': '#8B7355',
    'grass': '#567d46',
    'grass_forest': '#3d5e30',
    'grass_cold': '#4fe611',
    'freeze_grass': '#6a8d7a',
    'dry_grass': '#8b8d46',
    'jungle': '#1f7a3a',
    'shrubland': '#7a7f3a',
    'tree': '#2d4c1e',
    'jungle_tree': '#145228',
    'pine': '#1a3317',
    'bush': '#719236',
    'bush_cold': '#5e7361',
    'grass_detail': '#47da05',
    'stone_flower': '#add8e6',
    'flower_red': '#e74c3c',
    'flower_yellow': '#f1c40f',
    'flower_white': '#ecf0f1',
    'cactus': '#2ecc71',
    'sugar_cane': '#942dd8',
    'desert_sand': '#f4e209',
    'stone': '#808080',
    'rock_peak': '#5c5c5c',
    'snow': '#ffffff',
    'snow_peak': '#e6f2ff',
    'grass_rocky': '#6b7d5a',
    'ore_andesite': '#8a8d8f',
    'ore_basalt': '#303030',
    'ore_brown_limonite': '#7b5c3d',
    'ore_yellow_limonite': '#bca05d',
    'ore_malachite': '#2b7a4b',
    'ore_copper': '#d37c5d',
    'ore_cassiterite': '#333333',
    'ore_tin': '#acacac',
    'ore_bismuth': '#6e8b8b',
    'raw_oil': '#0f0f0f',
    'heavy_oil': '#1a0f00',
    'light_oil': '#331a00',
    'oil': '#260f00',
    'default': '#808080',
    'none': '#000000',
    'unknown': '#FF00FF',
    'sand_ground': '#c2a679',
    'dirt_ground': '#6b4423'
};

// Цвета подсветки слоев
const HIGHLIGHT_COLORS = {
    'surface': 'rgba(255, 255, 0, 0.3)',
    'ground': 'rgba(139, 69, 19, 0.3)',
    'ore': 'rgba(255, 215, 0, 0.3)',
    'entity': 'rgba(0, 255, 0, 0.3)',
    'stone': 'rgba(128, 128, 128, 0.3)',
    'cannot_mine': 'rgba(255, 0, 0, 0.2)'
};

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let gameInitialized = false;
let useVueInventory = false;
let vueInventoryReady = false;
let inventorySyncInProgress = false;
let shiftKeyPressed = false;
let isDragging = false;
let showInventory = true;
let showGrid = false;
let showLayerLegend = false;
let highlightRadius = false;
let followPlayer = true;
let isOreProspecting = false;
let isLiquidProspecting = false;

// Время синхронизации
let lastSyncTime = 0;
let lastPositionSync = 0;
let lastInventorySync = 0;

// Видимые тайлы
let visibleTilesX = 0;
let visibleTilesY = 0;

// Состояние добычи
let miningMode = false;
let miningTarget = null;
let miningProgress = 0;
let miningTimer = null;

// Игровые объекты
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const keys = {};
const camera = {
    x: 0,
    y: 0,
    screenCenterX: 0,
    screenCenterY: 0
};

// Масштаб
let zoom = 1;
let tileSize = CONSTANTS.BASE_TILE_SIZE * zoom;

// Мышь
let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let velocityX = 0;
let velocityY = 0;
const inertiaDamping = 0.94;

// Чанки
const apiCache = new Map();
const chunkCache = new Map();
const loadingChunks = new Set();
const chunkQueue = [];
let activeRequests = 0;
let currentSeed = 1767904171111;

window.VueInventory = null;
let currentHotbarSlot = 0; // Текущий выбранный слот хотбара (0-8)

let currentTool = 'hand';
let serverInventory = [];

let lastClickTime = 0;
const CLICK_DEBOUNCE = 500; // 500ms

const inflightMoves = new Set();

// ========== МОДУЛЬ ИГРОКА ==========
const PlayerModule = (function() {
    const player = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        width: 0.8,
        height: 1.8,
        speed: 0.12,
        gravity: 0.02,
        jumpForce: 0.3,
        onGround: true,
        hp: 100,
        jumpAnim: 0,
        jumpHeight: 0,
        jumpType: 'none',
        jumpCooldown: 0,
    };

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

    function getSurfaceEffect(tile) {
        switch (tile.b) {
            case 'ocean':    return { speed: 0.4 };
            case 'beach':    return { speed: 0.9 };
            case 'forest':   return { speed: 0.8 };
            case 'tundra':   return { speed: 0.7 };
            case 'savanna':  return { speed: 0.85 };
            case 'desert':   return { speed: 0.75 };
            case 'mountain': return { speed: 0.6 };
            case 'peak':     return { speed: 0.5 };
            default:         return { speed: 1 };
        }
    }

    function isAutostepTransition(currentBiome, targetBiome) {
        if (currentBiome === 'ocean' && targetBiome === 'beach') return true;
        return ['forest', 'tundra', 'savanna'].includes(currentBiome) &&
            ['mountain', 'peak'].includes(targetBiome);
    }

    function triggerJump(type, heightLevels) {
        console.log(`🎮 TRIGGER JUMP: ${type} (${heightLevels})`);
        player.onGround = false;
        player.jumpType = type;
        player.jumpAnim = 1.0;
        player.jumpHeight = heightLevels * 0.8;
        player.vy = type === 'up' ? -player.jumpForce * heightLevels : player.jumpForce * heightLevels / 2;
        player.jumpCooldown = 15;
    }

    function update() {
        let dx = 0;
        let dy = 0;

        // Управление
        if (keys['a'] || keys['arrowleft'])  dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;
        if (keys['w'] || keys['arrowup'])    dy -= 1;
        if (keys['s'] || keys['arrowdown'])  dy += 1;

        // Нормализация диагонали
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
        }

        // Обновление анимации прыжка
        if (player.jumpAnim > 0) {
            player.jumpAnim -= 0.12;
            if (player.jumpAnim <= 0) {
                player.jumpAnim = 0;
                player.onGround = true;
                player.vy = 0;
                player.jumpType = 'none';
            }
        }

        // Гравитация во время прыжка
        if (!player.onGround && player.jumpAnim > 0) {
            player.vy += player.gravity;
            player.y += player.vy * 0.8;
        }

        // Кулдаун
        if (player.jumpCooldown > 0) player.jumpCooldown--;

        const currentTile = WorldModule.getTileAt(Math.floor(player.x), Math.floor(player.y));
        const surface = getSurfaceEffect(currentTile);
        const speed = player.speed * surface.speed;

        const moveX = dx * speed;
        const moveY = dy * speed;

        // Прыжок при переходе между биомами
        if (player.onGround && player.jumpCooldown === 0) {
            const currentHeight = getBiomeHeight(currentTile.b);
            const lookAheadDist = 1.2;
            const lookAheadX = Math.floor(player.x + dx * lookAheadDist);
            const lookAheadY = Math.floor(player.y + dy * lookAheadDist);
            const aheadTile = WorldModule.getTileAt(lookAheadX, lookAheadY);
            const aheadHeight = getBiomeHeight(aheadTile.b);
            const heightDiff = aheadHeight - currentHeight;

            if (Math.abs(heightDiff) === 1) {
                if (heightDiff > 0) {
                    triggerJump('up', heightDiff);
                    return;
                } else {
                    triggerJump('down', Math.abs(heightDiff));
                    return;
                }
            }
        }

        // Движение по X
        const oldX = player.x;
        const targetX = player.x + moveX;

        if (player.onGround) {
            player.x = targetX;
            if (WorldModule.checkObjectCollision(player)) {
                player.x = oldX;
            }
        }

        // Движение по Y
        const oldY = player.y;
        const targetY = player.y + moveY;

        if (player.onGround) {
            player.y = targetY;
            if (WorldModule.checkObjectCollision(player)) {
                player.y = oldY;
            }
        }

        // Дополнительная проверка прыжка
        if (player.onGround && player.jumpCooldown === 0) {
            const currentHeight = getBiomeHeight(currentTile.b);
            const nextTileX = WorldModule.getTileAt(Math.floor(player.x + dx * 1.5), Math.floor(player.y));
            const nextHeightX = getBiomeHeight(nextTileX.b);
            const heightDiffX = nextHeightX - currentHeight;

            if (Math.abs(heightDiffX) === 1) {
                if (heightDiffX > 0 && isAutostepTransition(currentTile.b, nextTileX.b)) {
                    triggerJump('up', heightDiffX);
                } else if (heightDiffX < 0) {
                    triggerJump('down', Math.abs(heightDiffX));
                }
            }
        }
    }

    function render() {
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
        let bodyColor = "#ff3b3b";
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

    return {
        player,
        update,
        render
    };
})();

// ========== МОДУЛЬ МИРА ==========
const WorldModule = (function() {
    function getTileAt(tx, ty) {
        const cx = Math.floor(tx / CONSTANTS.CHUNK_SIZE);
        const cy = Math.floor(ty / CONSTANTS.CHUNK_SIZE);
        const key = `${cx},${cy}`;
        const chunk = chunkCache.get(key);
        if (!chunk || !chunk.tiles) {
            return { b: 'default', e: null };
        }
        const lx = ((tx % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
        const ly = ((ty % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
        return chunk.tiles[ly][lx];
    }

    function checkObjectCollision(player) {
        const left = Math.floor(player.x - player.width / 2);
        const right = Math.floor(player.x + player.width / 2);
        const top = Math.floor(player.y - player.height);
        const bottom = Math.floor(player.y);

        for (let tx = left; tx <= right; tx++) {
            for (let ty = top; ty <= bottom; ty++) {
                const tile = getTileAt(tx, ty);
                if (tile.e && isSolidEntity(tile.e)) {
                    return true;
                }
            }
        }
        return false;
    }

    function isSolidEntity(e) {
        return ['tree', 'jungle_tree', 'pine', 'cactus'].includes(e);
    }

    return {
        getTileAt,
        checkObjectCollision,
    };
})();

// ========== МОДУЛЬ РЕНДЕРИНГА ==========
const RenderModule = (function() {
    const LayerRenderer = {
        getVisibleLayers(tile, showPreview = false, previewLayer = null, prospectingMode = { ore: false, liquid: false }) {
            const layers = [];

            const biomeValue = tile.b || 'grass';
            layers.push({
                type: 'biome',
                value: biomeValue,
                visible: true,
                priority: 0
            });

            if (tile.r && tile.r !== 'none') {
                layers.push({
                    type: 'rock',
                    value: tile.r,
                    visible: true,
                    priority: 1
                });
            }

            if (tile.o && tile.o !== 'none') {
                const oreVisible = prospectingMode.ore ||
                    (!tile.g || tile.g === 'none') &&
                    (!tile.s || tile.s === 'none' || tile.s === 'stone');
                layers.push({
                    type: 'ore',
                    value: tile.o,
                    visible: oreVisible || showPreview,
                    priority: 2
                });
            }

            if (tile.p && tile.p !== 'none') {
                layers.push({
                    type: 'subsoil',
                    value: tile.p,
                    visible: (!tile.g || tile.g === 'none') && (!tile.s || tile.s === 'none'),
                    priority: 3
                });
            }

            if (tile.g && tile.g !== 'none') {
                layers.push({
                    type: 'ground',
                    value: tile.g,
                    visible: !tile.s || tile.s === 'none' || showPreview,
                    priority: 4
                });
            }

            if (tile.s && tile.s !== 'none') {
                layers.push({
                    type: 'surface',
                    value: tile.s,
                    visible: true,
                    priority: 5
                });
            }

            if (tile.e && tile.e !== 'none') {
                layers.push({
                    type: 'entity',
                    value: tile.e,
                    visible: true,
                    priority: 6
                });
            }

            if (tile.l && tile.l !== 'none') {
                layers.push({
                    type: 'liquid',
                    value: tile.l,
                    amount: tile.la || 0,
                    max: tile.lm || 100,
                    visible: prospectingMode.liquid,
                    priority: 7
                });
            }

            layers.sort((a, b) => a.priority - b.priority);

            if (showPreview && previewLayer) {
                const layerTypeMap = {
                    'e': 'entity',
                    's': 'surface',
                    'g': 'ground',
                    'o': 'ore',
                    'p': 'subsoil',
                    'l': 'liquid'
                };
                const previewType = layerTypeMap[previewLayer];
                const previewIndex = layers.findIndex(l => l.type === previewType);

                if (previewIndex > -1) {
                    layers[previewIndex].preview = true;
                }
            }

            const visibleLayers = layers.filter(layer => layer.visible !== false);

            if (visibleLayers.length === 0) {
                return [{
                    type: 'biome',
                    value: tile.b || 'stone',
                    visible: true,
                    priority: 0
                }];
            }

            return visibleLayers;
        },

        renderTileLayers(ctx, x, y, tile, tileSize, showPreview = false, previewLayer = null, prospectingMode = { ore: false, liquid: false }) {
            const layers = this.getVisibleLayers(tile, showPreview, previewLayer, prospectingMode);
            ctx.clearRect(x, y, tileSize, tileSize);

            if (layers.length === 0) {
                ctx.fillStyle = COLORS[tile.b] || COLORS['stone'] || '#808080';
                ctx.fillRect(x, y, tileSize, tileSize);
                return;
            }

            layers.forEach(layer => {
                this.renderLayer(ctx, x, y, layer, tileSize);
            });
        },

        renderLayer(ctx, x, y, layer, tileSize) {
            const { type, value, preview = false, previewNext = false, amount, max } = layer;
            let color = COLORS[value] || '#000';
            let alpha = 1.0;

            switch(type) {
                case 'biome':
                    alpha = 0.3;
                    color = this.darkenColor(color, 0.5);
                    break;
                case 'ground':
                    color = this.darkenColor(color, 0.7);
                    if (preview) alpha = 0.4;
                    break;
                case 'ore':
                    color = COLORS[value] || '#FFD700';
                    if (preview) alpha = 0.5;
                    break;
                case 'surface':
                    if (preview) alpha = 0.3;
                    break;
                case 'entity':
                    this.renderEntity(ctx, x, y, tileSize, value, preview ? 0.3 : 1.0);
                    return;
                case 'liquid':
                    alpha = 0.6;
                    this.renderLiquid(ctx, x, y, tileSize, color, amount, max);
                    return;
                case 'rock':
                    color = this.darkenColor(color, 0.8);
                    if (preview) alpha = 0.4;
                    break;
                case 'subsoil':
                    color = this.mixColors('#8B7355', color, 0.5);
                    if (preview) alpha = 0.4;
                    break;
            }

            if (alpha !== 1.0) ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, tileSize, tileSize);

            if (type === 'ore' && !preview) {
                this.renderOreTexture(ctx, x, y, tileSize, color);
            }

            if (previewNext) {
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            }

            if (alpha !== 1.0) ctx.globalAlpha = 1.0;
        },

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

        renderEntity(ctx, x, y, size, entityType, alpha = 1.0) {
            ctx.globalAlpha = alpha;
            const color = COLORS[entityType] || '#228B22';

            if (entityType.includes('tree')) {
                ctx.fillStyle = this.darkenColor(color, 0.3);
                ctx.fillRect(x + size/2 - 3, y + size/4, 6, size/2);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(x + size/2, y + size/4, size/3, size/4, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (entityType.includes('flower')) {
                ctx.fillStyle = color;
                ctx.fillRect(x + size/2 - 4, y + size/2 - 4, 8, 8);
            } else if (entityType === 'cactus') {
                ctx.fillStyle = color;
                ctx.fillRect(x + size/2 - 3, y + 4, 6, size - 8);
            } else if (entityType === 'grass_detail') {
                ctx.fillStyle = color;
                ctx.fillRect(x + 4, y + 4, size - 8, 2);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
            }

            ctx.globalAlpha = 1.0;
        },

        renderLiquid(ctx, x, y, size, color, amount = 0, max = 100) {
            const fillHeight = (amount / max) * size;
            ctx.fillStyle = this.darkenColor(color, 0.7);
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = color;
            ctx.fillRect(x, y + size - fillHeight, size, fillHeight);
        },

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

    return {
        LayerRenderer
    };
})();

// ========== МЕНЕДЖЕР ИНВЕНТАРЯ ==========
const InventoryManager = {
    // 🔒 Блокировка слотов во время перемещения
    _inflightMoves: new Set(),

    // Данные (только для чтения извне)
    items: [], // Все предметы с slot_index
    tools: {}, // Кэш инструментов для быстрого доступа
    blocks: {}, // Кэш блоков для быстрого доступа

    // Инициализация
    init(playerId) {
        this.playerId = playerId;
        this.loadFromServer();
    },

    // Загрузка с сервера
    async loadFromServer() {
        try {
            const res = await fetch(`${CONSTANTS.API_BASE}/inventory?player_id=${this.playerId}`);
            const data = await res.json();

            if (data.success && data.inventory) {
                this.updateInventory(data.inventory);
                console.log('Инвентарь загружен с сервера:', data.inventory);
            }
        } catch (error) {
            console.error('Ошибка загрузки инвентаря:', error);
        }
    },

    // Обновление данных
    updateInventory(inventoryArray) {
        this.items = inventoryArray || [];
        this.updateCaches();

        // Обновляем Vue инвентарь
        if (window.VueInventory?.updateData) {
            window.VueInventory.updateData({
                inventory: this.items,
                currentHotbarSlot,
                currentTool
            });
        }

        // Обновляем game_v2.js переменные
        window.inventoryData = this.items;
    },

    // Обновление кэшей
    updateCaches() {
        this.tools = {};
        this.blocks = {};

        this.items.forEach(item => {
            if (item.item_type === 'tool') {
                const toolId = item.item_id.replace('wooden_', '');
                this.tools[toolId] = {
                    ...item,
                    name: getToolDisplayName(item.item_id),
                    miningLevel: 1,
                    miningSpeed: 2.0,
                    damage: toolId === 'axe' ? 4 : 3,
                    canMine: getToolCanMine(toolId),
                    durability: item.durability || 60, // Добавляем дефолт
                    maxDurability: 60 // Добавляем дефолт
                };
            } else if (item.item_type === 'block') {
                this.blocks[item.item_id] = (this.blocks[item.item_id] || 0) + item.quantity;
            }
        });
    },

    // Получение предмета в слоте
    getItemAt(slotIndex) {
        return this.items.find(item => item.slot_index === slotIndex);
    },

    // Получение текущего инструмента
    getCurrentTool() {
        if (currentTool === 'hand') {
            return TOOLS_CONFIG.hand;
        }

        // Проверяем, есть ли инструмент в кэше
        const tool = this.tools[currentTool];

        // Если нет в кэше, пытаемся найти в TOOLS_CONFIG
        if (!tool) {
            const configTool = TOOLS_CONFIG[currentTool];
            if (configTool) {
                return {
                    ...configTool,
                    durability: 60, // Дефолтная прочность
                    name: configTool.name || currentTool
                };
            }
            // Если ничего не найдено, возвращаем руку
            return TOOLS_CONFIG.hand;
        }

        // Добавляем дефолтные значения, если их нет
        return {
            ...tool,
            durability: tool.durability || 60,
            miningLevel: tool.miningLevel || 1,
            miningSpeed: tool.miningSpeed || 2.0,
            damage: tool.damage || (currentTool === 'axe' ? 4 : 3),
            name: tool.name || currentTool
        };
    },

    // Получение количества блока
    getBlockCount(blockId) {
        return this.blocks[blockId] || 0;
    },

    // Проверка возможности добычи
    canMineBlock(blockType) {
        const tool = this.getCurrentTool();
        const blockConfig = BLOCKS_CONFIG[blockType];

        if (!blockConfig || !tool) return false;

        if (tool.miningLevel < blockConfig.level) {
            console.log(`Слишком низкий уровень инструмента! Нужен уровень ${blockConfig.level}`);
            return false;
        }

        if (blockConfig.tool && blockConfig.tool !== tool.id) {
            if (blockConfig.tool === 'pickaxe' && tool.id !== 'pickaxe') return false;
            if (blockConfig.tool === 'axe' && tool.id !== 'axe') return false;
            if (blockConfig.tool === 'shovel' && tool.id !== 'shovel') return false;
        }

        return tool.canMine[blockConfig.type] || false;
    },

    // Получение скорости добычи
    getMiningSpeed(blockType) {
        const tool = this.getCurrentTool();
        const blockConfig = BLOCKS_CONFIG[blockType];

        if (!this.canMineBlock(blockType)) return 0;

        return (tool.miningSpeed / blockConfig.hardness) * 100;
    },

    // Использование инструмента (уменьшение прочности)
    useTool() {
        const tool = this.getCurrentTool();
        if (tool.id === 'hand') return;

        // Находим инструмент в инвентаре
        const toolItem = this.items.find(item =>
            item.item_type === 'tool' &&
            item.item_id.replace('wooden_', '') === tool.id
        );

        if (!toolItem) return;

        // Уменьшаем прочность
        toolItem.durability = Math.max(0, (toolItem.durability || 60) - 1);

        // Если сломался
        if (toolItem.durability <= 0) {
            // Удаляем из инвентаря
            this.items = this.items.filter(item => item !== toolItem);

            // Переключаем на руку
            currentTool = 'hand';

            // Обновляем Vue
            this.updateInventory(this.items);

            // Отправляем на сервер
            this.syncToServer();

            showVueNotification(`${tool.name} сломался!`, 'warning');
        } else {
            // Обновляем Vue
            this.updateInventory(this.items);
        }
    },

    // Синхронизация с сервером
    async syncToServer() {
        // Обновление прочности инструмента
        for (const item of this.items) {
            if (item.item_type === 'tool' && item.durability !== undefined) {
                try {
                    await fetch(`${CONSTANTS.API_BASE}/inventory/update-tool`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            player_id: this.playerId,
                            tool_id: item.item_id,
                            durability: item.durability
                        })
                    });
                } catch (error) {
                    console.error('Ошибка синхронизации инструмента:', error);
                }
            }
        }
    },

    // ПЕРЕКЛЮЧЕНИЕ ИНСТРУМЕНТА ПО ID (добавлено)
    switchTool(toolId) {
        if (toolId === 'hand') {
            currentTool = 'hand';
            localStorage.setItem('currentTool', 'hand');
            return;
        }

        // Проверяем, есть ли такой инструмент в инвентаре
        const toolItem = this.items.find(item =>
            item.item_type === 'tool' &&
            item.item_id.replace('wooden_', '') === toolId
        );

        if (toolItem) {
            currentTool = toolId;
            localStorage.setItem('currentTool', toolId);
            console.log(`Переключен инструмент: ${toolId}`);

            // Обновляем Vue инвентарь
            if (window.VueInventory?.updateData) {
                window.VueInventory.updateData({
                    inventory: this.items,
                    currentHotbarSlot,
                    currentTool
                });
            }
        } else {
            console.warn(`Инструмент ${toolId} не найден в инвентаре`);
        }
    },

    // ПЕРЕКЛЮЧЕНИЕ ИНСТРУМЕНТА ПО СЛОТУ ХОТБАРА (добавлено)
    switchToolByHotbarSlot(slotIndex) {
        const item = this.getItemAt(slotIndex);

        if (item && item.item_type === 'tool') {
            const toolId = item.item_id.replace('wooden_', '');
            this.switchTool(toolId);
        } else {
            // Если в слоте не инструмент, переключаем на руку
            this.switchTool('hand');
        }
    },

    // ОБНОВЛЕНИЕ ИНСТРУМЕНТОВ ИЗ СЕРВЕРНЫХ ДАННЫХ (добавлено)
    updateToolsFromServer(inventoryArray) {
        this.updateInventory(inventoryArray);

        // Восстанавливаем выбранный инструмент из localStorage
        const savedTool = localStorage.getItem('currentTool');
        if (savedTool && (savedTool === 'hand' || this.tools[savedTool])) {
            this.switchTool(savedTool);
        } else {
            // Пытаемся найти инструмент в хотбаре
            for (let slot = 0; slot < 9; slot++) {
                const itemInSlot = inventoryArray.find(item =>
                    item.slot_index === slot && item.item_type === 'tool'
                );
                if (itemInSlot) {
                    const toolId = itemInSlot.item_id.replace('wooden_', '');
                    if (this.tools[toolId]) {
                        this.switchTool(toolId);
                        break;
                    }
                }
            }
        }
    },
    async optimisticMove(fromSlot, toSlot) {
        // простая защита от одинаковых слотов
        if (fromSlot === toSlot) return {success: true};

        // защита от конфликтующих перемещений
        if (this._inflightMoves.has(fromSlot) || this._inflightMoves.has(toSlot)) {
            console.warn('Slot busy:', fromSlot, toSlot);
            return {success: false, error: 'slot_busy'};
        }

        // помечаем как in-flight
        this._inflightMoves.add(fromSlot);
        this._inflightMoves.add(toSlot);

        // snapshot для отката
        const snapshot = JSON.parse(JSON.stringify(this.items));

        // helper: find item index in array by slot_index
        const findIndexBySlot = (arr, slot) => arr.findIndex(it => it.slot_index === slot);

        try {
            // --- оптимистично применяем локально ---
            const fromIdx = findIndexBySlot(this.items, fromSlot);
            const toIdx = findIndexBySlot(this.items, toSlot);

            if (fromIdx === -1) {
                // ничего не перемещаем — предмет исчез на сервере
                throw new Error('item_not_found_local');
            }

            // Меняем slot_index локально: swap или move
            if (toIdx !== -1) {
                // swap
                const tmp = this.items[fromIdx].slot_index;
                this.items[fromIdx].slot_index = this.items[toIdx].slot_index;
                this.items[toIdx].slot_index = tmp;
            } else {
                // simple move
                this.items[fromIdx].slot_index = toSlot;
            }

            // применяем изменения в UI
            this.updateInventory([...this.items]);

            // Доп. UI событие (может пригодиться Vue)
            window.dispatchEvent(new CustomEvent('inventory-move-start', {
                detail: {fromSlot, toSlot}
            }));

            // --- отправляем в бекенд ---
            const res = await fetch(`${CONSTANTS.API_BASE}/inventory/move`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    player_id: this.playerId,
                    from_slot: fromSlot,
                    to_slot: toSlot
                })
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('move API error', res.status, text);
                throw new Error('move_api_error');
            }

            const data = await res.json();

            // если сервер вернул success — считаем, что всё ок
            if (data && data.success) {
                // сервер подтвердил — локальное состояние считаем каноничным
                return { success: true };
            } else {
                console.warn('move response no success', data);
                throw new Error('move_failed');
            }
        } catch (err) {
            console.error('optimisticMove failed:', err);

            // откат локального состояния (snapshot)
            try {
                this.updateInventory(snapshot);
            } catch (e) {
                console.error('rollback failed:', e);
            }

            // уведомим Vue и подгрузим свежий инвентарь с сервера (forceRefresh)
            await APIModule.loadPlayerInventory(this.playerId, true);

            window.dispatchEvent(new CustomEvent('inventory-move-end', {
                detail: {fromSlot, toSlot, success: false, error: err.message}
            }));

            return {success: false, error: err.message};
        } finally {
            // снимаем lock
            this._inflightMoves.delete(fromSlot);
            this._inflightMoves.delete(toSlot);
        }
    }
};






// Вспомогательные функции
function getToolDisplayName(itemId) {
    const names = {
        'wooden_pickaxe': 'Деревянная кирка',
        'wooden_axe': 'Деревянный топор',
        'wooden_shovel': 'Деревянная лопата'
    };
    return names[itemId] || itemId.replace('_', ' ');
}

function getToolCanMine(toolId) {
    switch(toolId) {
        case 'axe':
            return { 'plant': true, 'dirt': false, 'wood': true, 'leaves': true };
        case 'shovel':
            return { 'plant': false, 'dirt': true, 'sand': true, 'gravel': true, 'clay': true };
        case 'pickaxe':
            return { 'stone': true, 'ore': true, 'mineral': true };
        default:
            return { 'plant': true, 'dirt': true, 'wood': true };
    }
}





// ========== МОДУЛЬ ДОБЫЧИ ==========
const MiningModule = (function() {
    function getBlockToMine(tile) {
        const tool = InventoryManager.getCurrentTool();

        if (tool.id === 'pickaxe' && tile.o && tile.o !== 'none') {
            return { type: tile.o, layer: 'o' };
        }

        if (tool.id === 'axe' && tile.e && tile.e !== 'none' &&
            ['tree', 'jungle_tree', 'pine'].includes(tile.e)) {
            return { type: tile.e, layer: 'e' };
        }

        if (tool.id === 'shovel' && tile.g && tile.g !== 'none' &&
            ['dirt', 'sand', 'sand_ground', 'clay', 'gravel'].includes(tile.g)) {
            return { type: tile.g, layer: 'g' };
        }

        if (tool.id === 'pickaxe' && tile.s && tile.s !== 'none' &&
            ['stone', 'rock_peak', 'snow_peak'].includes(tile.s)) {
            return { type: tile.s, layer: 's' };
        }

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

    function isBlockInRange(worldX, worldY) {
        const player = PlayerModule.player;
        const distance = Math.sqrt(
            Math.pow(player.x - worldX, 2) +
            Math.pow(player.y - worldY, 2)
        );
        return distance <= CONSTANTS.MINING_RADIUS;
    }

    function refreshChunk(chunk) {
        if (chunk && chunk.canvas) {
            const chunkCtx = chunk.canvas.getContext('2d');
            chunkCtx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);

            for (let y = 0; y < CONSTANTS.CHUNK_SIZE; y++) {
                for (let x = 0; x < CONSTANTS.CHUNK_SIZE; x++) {
                    const tile = chunk.tiles[y][x];
                    const tx = x * CONSTANTS.BASE_TILE_SIZE;
                    const ty = y * CONSTANTS.BASE_TILE_SIZE;
                    RenderModule.LayerRenderer.renderTileLayers(
                        chunkCtx,
                        tx, ty,
                        tile,
                        CONSTANTS.BASE_TILE_SIZE,
                        false,
                        null,
                        { ore: isOreProspecting, liquid: isLiquidProspecting }
                    );
                }
            }
        }
    }

    async function startMining(tx, ty, chunk, tile, blockInfo) {
        if (!isBlockInRange(tx + 0.5, ty + 0.5)) {
            console.log('Слишком далеко! Максимальная дистанция: ' + CONSTANTS.MINING_RADIUS);
            return;
        }

        if (!InventoryManager.canMineBlock(blockInfo.type)) {
            console.log('Нельзя добыть этот блок текущим инструментом!');
            const resourceConfig = RESOURCE_CONFIG[blockInfo.type];
            if (resourceConfig && resourceConfig.unbreakable) {
                console.log('Этот блок нельзя разрушить!');
            }
            return;
        }

        miningTarget = {
            tx, ty,
            chunkData: chunk,
            tile: tile,
            blockInfo: blockInfo,
            startTime: Date.now()
        };

        miningMode = true;
        const miningSpeed = InventoryManager.getMiningSpeed(blockInfo.type);
        const miningTime = (1000 / miningSpeed) * 1000;

        console.log(`Начата добыча ${blockInfo.type}, время: ${(miningTime/1000).toFixed(2)}с`);
        refreshChunk(chunk);

        miningTimer = setTimeout(() => {
            finishMining();
        }, miningTime);

        miningProgress = 0;
        const progressInterval = setInterval(() => {
            miningProgress += 100 / (miningTime / 100);
            if (miningProgress >= 100 || !miningMode) {
                clearInterval(progressInterval);
            }
        }, 100);
    }

    async function finishMining() {
        if (!miningTarget) return;
        const { tx, ty, chunkData, blockInfo } = miningTarget;

        try {
            const serverResult = await APIModule.mineBlock(
                window.playerId,
                tx,
                ty,
                blockInfo.layer,
                blockInfo.type
            );

            if (!serverResult || !serverResult.success) {
                throw new Error(serverResult?.error || 'Ошибка добычи на сервере');
            }

            // Используем инструмент
            InventoryManager.useTool();

            // Обновляем инвентарь из сервера
            if (serverResult.inventory) {
                InventoryManager.updateInventory(serverResult.inventory);
            } else {
                // Перезагружаем инвентарь
                InventoryManager.loadFromServer();
            }

            if (serverResult.tile) {
                const lx = ((tx % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
                const ly = ((ty % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
                const oldTile = chunkData.tiles[ly][lx];
                const newTile = { ...serverResult.tile };

                if (!newTile.b && oldTile.b) {
                    newTile.b = oldTile.b;
                }

                if (oldTile.l && oldTile.l !== 'none') {
                    if (!newTile.l || newTile.l === 'none') {
                        newTile.l  = oldTile.l;
                        newTile.la = oldTile.la || 0;
                        newTile.lm = oldTile.lm || 100;
                    }
                }

                if (blockInfo.layer !== 'o' && oldTile.o && oldTile.o !== 'none') {
                    if (!newTile.o || newTile.o === 'none') {
                        newTile.o = oldTile.o;
                    }
                }

                if (blockInfo.layer !== 'g' && oldTile.g && oldTile.g !== 'none') {
                    if (!newTile.g || newTile.g === 'none') {
                        newTile.g = oldTile.g;
                    }
                }

                if (blockInfo.layer === 'e') {
                    newTile.s = 'none';
                } else if (blockInfo.layer === 's') {
                    newTile.s = 'none';
                }

                if ((!newTile.s || newTile.s === 'none') &&
                    (!newTile.g || newTile.g === 'none')) {
                    newTile.s = 'stone';
                }

                chunkData.tiles[ly][lx] = newTile;
                console.log('🧱 finishMining result', {
                    mined: `${blockInfo.layer}:${blockInfo.type}`,
                    oldTile,
                    newTile
                });
            }

            if (window.playerId) {
                // Используем SyncModule.syncInventorySafe вместо прямой функции
                await SyncModule.syncInventorySafe();

                if (serverResult.added_to_inventory) {
                    const drop = serverResult.drop || 1;
                    showVueNotification?.(`+${drop} ${blockInfo.type}`, 'success');
                }

                const tool = InventoryManager.getCurrentTool();
                if (tool.durability !== Infinity) {
                    InventoryManager.useTool();
                }
            }

            refreshChunk(chunkData);

        } catch (error) {
            console.error('Ошибка добычи:', error);
            showVueNotification?.(`Ошибка: ${error.message}`, 'error');
        }

        miningMode = false;
        miningTarget = null;
        miningProgress = 0;

        if (miningTimer) {
            clearTimeout(miningTimer);
            miningTimer = null;
        }
    }

    function cancelMining() {
        if (miningTimer) {
            clearTimeout(miningTimer);
            miningTimer = null;
        }
        miningMode = false;
        miningTarget = null;
        miningProgress = 0;
    }

    function getMiningPreview(tile) {
        const tool = InventoryManager.getCurrentTool();
        const preview = {
            canMine: false,
            currentLayer: null,
            nextLayer: null,
            resourceCount: 0,
            highlightColor: HIGHLIGHT_COLORS.cannot_mine,
            willRemain: null
        };

        const availableLayers = [];

        if (tool.id === 'pickaxe') {
            if (tile.o && tile.o !== 'none') availableLayers.push({ type: tile.o, layer: 'o' });
            if (tile.p && tile.p !== 'none') availableLayers.push({ type: tile.p, layer: 'p' });
            if (tile.s && ['stone', 'rock_peak', 'snow_peak'].includes(tile.s))
                availableLayers.push({ type: tile.s, layer: 's' });
        } else if (tool.id === 'shovel') {
            if (tile.g && tile.g !== 'none') availableLayers.push({ type: tile.g, layer: 'g' });
            if (tile.p && tile.p !== 'none') availableLayers.push({ type: tile.p, layer: 'p' });
            if (tile.s && ['dirt', 'sand', 'gravel', 'clay'].includes(tile.s))
                availableLayers.push({ type: tile.s, layer: 's' });
        } else if (tool.id === 'axe') {
            if (tile.e && ['tree', 'jungle_tree', 'pine'].includes(tile.e))
                availableLayers.push({ type: tile.e, layer: 'e' });
        } else if (tool.id === 'hand') {
            if (tile.e && ['flower_red', 'flower_yellow', 'flower_white',
                'grass_detail', 'cactus', 'bush_cold', 'sugar_cane',
                'stone_flower'].includes(tile.e))
                availableLayers.push({ type: tile.e, layer: 'e' });
            if (tile.s && ['grass', 'beach_sand'].includes(tile.s))
                availableLayers.push({ type: tile.s, layer: 's' });
        }

        if (availableLayers.length > 0) {
            const layer = availableLayers[0];
            const resourceConfig = RESOURCE_CONFIG[layer.type] || { finite: false, drop: 0 };

            preview.currentLayer = layer;
            preview.resourceCount = resourceConfig.drop;
            preview.canMine = InventoryManager.canMineBlock(layer.type);

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

    return {
        getBlockToMine,
        isBlockInRange,
        refreshChunk,
        startMining,
        cancelMining,
        getMiningPreview
    };
})();

// ========== МОДУЛЬ API ==========
const APIModule = (function() {
    async function cachedFetch(url, options = {}, cacheKey = null) {
        const key = cacheKey || url;
        const now = Date.now();

        if (apiCache.has(key)) {
            const cached = apiCache.get(key);
            if (now - cached.timestamp < CONSTANTS.CACHE_TTL) {
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
            apiCache.set(key, {
                data: data,
                timestamp: now
            });

            return data;
        } catch (error) {
            if (apiCache.has(key)) {
                console.log('Используем закэшированные данные из-за ошибки:', error.message);
                return apiCache.get(key).data;
            }
            throw error;
        }
    }

    async function fetchPlayerInventory(playerId) {
        return cachedFetch(
            `${CONSTANTS.API_BASE}/inventory?player_id=${playerId}`,
            {},
            `inventory_${playerId}`
        );
    }

    async function mineBlock(playerId, x, y, layer, blockType, worldId = 1) {
        try {
            const response = await fetch(`${CONSTANTS.API_BASE}/blocks/mine`, {
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

    async function spawnPlayer(username) {
        try {
            const res = await fetch('/api/player/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!res.ok) throw new Error('Ошибка спавна игрока');

            const data = await res.json();
            window.playerId = data.id;
            await loadPlayerInventory(data.id);

            return data;
        } catch (error) {
            console.error('Ошибка спавна игрока:', error);
            throw error;
        }
    }


    async function loadPlayerInventory(playerId, forceRefresh = false) {
        try {
            if (forceRefresh) {
                const cacheKey = `inventory_${playerId}`;
                apiCache.delete(cacheKey);
            }

            const res = await APIModule.fetchPlayerInventory(playerId);

            // Обрабатываем разные форматы ответа
            let inventoryData = res.inventory || res;

            if (!inventoryData) {
                console.warn('Инвентарь пуст или не получен');
                inventoryData = [];
            }

            // Сохраняем серверные данные
            if (Array.isArray(inventoryData)) {
                // Обновляем инструменты из серверных данных
                InventoryManager.updateToolsFromServer(inventoryData);

                // Восстанавливаем выбранный слот хотбара из localStorage
                const savedHotbarSlot = localStorage.getItem('currentHotbarSlot');
                if (savedHotbarSlot !== null) {
                    currentHotbarSlot = parseInt(savedHotbarSlot);
                }
            }

            updateVueInventory(inventoryData);
            return inventoryData;

        } catch (error) {
            console.error('Ошибка загрузки инвентаря:', error);
            return null;
        }
    }


    return {
        /** @private - используется только внутри модуля */
        cachedFetch,
        fetchPlayerInventory,
        mineBlock,
        spawnPlayer,
        loadPlayerInventory
    };
})();

// ========== МОДУЛЬ UI И УТИЛИТ ==========
const UIModule = (function() {
    function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.screenCenterX = canvas.width / 2;
        camera.screenCenterY = canvas.height / 2;
        visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
        visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
    }

    function setZoom(newZoom, centerX = camera.screenCenterX, centerY = camera.screenCenterY) {
        const oldZoom = zoom;
        zoom = Math.min(CONSTANTS.MAX_ZOOM, Math.max(CONSTANTS.MIN_ZOOM, newZoom));
        if (zoom === oldZoom) return;

        const worldX = (camera.x + centerX) / (CONSTANTS.BASE_TILE_SIZE * oldZoom);
        const worldY = (camera.y + centerY) / (CONSTANTS.BASE_TILE_SIZE * oldZoom);

        tileSize = CONSTANTS.BASE_TILE_SIZE * zoom;
        camera.x = worldX * tileSize - centerX;
        camera.y = worldY * tileSize - centerY;

        visibleTilesX = Math.ceil(canvas.width / tileSize) + 2;
        visibleTilesY = Math.ceil(canvas.height / tileSize) + 2;
    }

    function renderMiningProgress() {
        if (!miningMode || miningProgress <= 0) return;

        if (miningTarget) {
            const { tx, ty } = miningTarget;
            const screenX = tx * tileSize - camera.x;
            const screenY = ty * tileSize - camera.y;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(screenX, screenY - 10, tileSize, 5);

            ctx.fillStyle = miningProgress < 100 ? '#4CAF50' : '#FF5722';
            ctx.fillRect(screenX, screenY - 10, (tileSize * miningProgress) / 100, 5);

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

    function renderMiningPreview() {
        if (mouseX < 0 || mouseY < 0 || mouseX >= canvas.width || mouseY >= canvas.height) return;

        const worldX = (mouseX + camera.x) / tileSize;
        const worldY = (mouseY + camera.y) / tileSize;
        const tx = Math.floor(worldX);
        const ty = Math.floor(worldY);

        if (!MiningModule.isBlockInRange(tx + 0.5, ty + 0.5)) return;

        const tile = WorldModule.getTileAt(tx, ty);
        if (!tile) return;

        const preview = MiningModule.getMiningPreview(tile);
        if (!preview.currentLayer) return;

        const screenX = tx * tileSize - camera.x;
        const screenY = ty * tileSize - camera.y;

        ctx.fillStyle = preview.highlightColor;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        if (preview.nextLayer) {
            ctx.fillStyle = COLORS[preview.nextLayer.type] || '#888888';
            ctx.globalAlpha = 0.7;
            ctx.fillRect(screenX + tileSize/4, screenY + tileSize/4, tileSize/2, tileSize/2);
            ctx.globalAlpha = 1.0;

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX + tileSize/4 - 1, screenY + tileSize/4 - 1,
                tileSize/2 + 2, tileSize/2 + 2);
        }

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

    function renderRadiusHighlight() {
        if (!highlightRadius) return;

        const player = PlayerModule.player;
        const playerX = Math.floor(player.x);
        const playerY = Math.floor(player.y);
        const tool = InventoryManager.getCurrentTool();

        for (let dx = -CONSTANTS.MINING_RADIUS; dx <= CONSTANTS.MINING_RADIUS; dx++) {
            for (let dy = -CONSTANTS.MINING_RADIUS; dy <= CONSTANTS.MINING_RADIUS; dy++) {
                const tx = playerX + dx;
                const ty = playerY + dy;

                const distance = Math.sqrt(dx*dx + dy*dy);
                if (distance > CONSTANTS.MINING_RADIUS) continue;

                const tile = WorldModule.getTileAt(tx, ty);
                if (!tile) continue;

                const preview = MiningModule.getMiningPreview(tile);
                if (!preview.canMine || !preview.currentLayer) continue;

                const screenX = tx * tileSize - camera.x;
                const screenY = ty * tileSize - camera.y;

                let highlightColor = 'rgba(255, 255, 255, 0.1)';

                switch(tool.id) {
                    case 'pickaxe':
                        if (tile.o && tile.o !== 'none') {
                            highlightColor = 'rgba(255, 215, 0, 0.3)';
                        } else if (tile.s && ['stone', 'rock_peak', 'snow_peak'].includes(tile.s)) {
                            highlightColor = 'rgba(128, 128, 128, 0.2)';
                        }
                        break;
                    case 'shovel':
                        if (tile.g && ['dirt', 'sand', 'sand_ground', 'clay', 'gravel'].includes(tile.g)) {
                            highlightColor = 'rgba(139, 69, 19, 0.3)';
                        } else if (tile.s && ['dirt', 'sand', 'gravel', 'clay'].includes(tile.s)) {
                            highlightColor = 'rgba(139, 69, 19, 0.2)';
                        }
                        break;
                    case 'axe':
                        if (tile.e && ['tree', 'jungle_tree', 'pine'].includes(tile.e)) {
                            highlightColor = 'rgba(0, 255, 0, 0.3)';
                        }
                        break;
                    case 'hand':
                        if (tile.e && ['flower_red', 'flower_yellow', 'flower_white',
                            'grass_detail', 'cactus', 'bush_cold', 'sugar_cane',
                            'stone_flower'].includes(tile.e)) {
                            highlightColor = 'rgba(0, 255, 0, 0.2)';
                        } else if (tile.s && ['grass', 'beach_sand'].includes(tile.s)) {
                            highlightColor = 'rgba(255, 255, 0, 0.2)';
                        }
                        break;
                }

                ctx.fillStyle = highlightColor;
                ctx.fillRect(screenX, screenY, tileSize, tileSize);

                if (distance === Math.floor(CONSTANTS.MINING_RADIUS)) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(screenX, screenY, tileSize, tileSize);
                }
            }
        }
    }

    function renderEnhancedUI() {
        // Получаем текущий инструмент
        const tool = InventoryManager.getCurrentTool();

        // Проверяем, что tool существует
        if (!tool) {
            console.error('Инструмент не найден!');
            return;
        }

        // Панель состояния соединения
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 250, canvas.height - 100, 230, 80);

        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        if (window.playerId) {
            ctx.fillText(`Игрок ID: ${window.playerId}`, canvas.width - 240, canvas.height - 85);
        } else {
            ctx.fillStyle = '#FF6B6B';
            ctx.fillText('Не подключен к серверу', canvas.width - 240, canvas.height - 85);
        }

        const player = PlayerModule.player;
        ctx.fillStyle = '#FFF';
        ctx.fillText(`Позиция: ${player.x.toFixed(2)}, ${player.y.toFixed(2)}`, canvas.width - 240, canvas.height - 70);
        ctx.fillText(`Загружено чанков: ${chunkCache.size}`, canvas.width - 240, canvas.height - 55);

        const lastSync = Math.floor((Date.now() - lastPositionSync) / 1000);
        ctx.fillText(`Синхронизация: ${lastSync}с назад`, canvas.width - 240, canvas.height - 40);

        // Панель инструментов
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, canvas.height - 150, 280, 140);

        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Инструмент: ${tool.name}`, 20, canvas.height - 130);
        ctx.fillText(`Уровень: ${tool.miningLevel}`, 20, canvas.height - 110);

        // Проверяем наличие durability перед использованием
        const durability = tool.durability;
        const toolConfig = TOOLS_CONFIG[tool.id];



        if (durability === Infinity || tool.id === 'hand') {
            ctx.fillText('Прочность: ∞', 20, canvas.height - 90);
        } else if (durability !== undefined) {
            const maxDurability = tool.maxDurability || (toolConfig ? toolConfig.durability : 60);
            ctx.fillText(`Прочность: ${durability}/${maxDurability}`, 20, canvas.height - 90);

            if (maxDurability && maxDurability > 0) {
                const durabilityPercent = (durability / maxDurability) * 100;
                ctx.fillStyle = durabilityPercent > 50 ? '#4CAF50' :
                    durabilityPercent > 20 ? '#FF9800' : '#F44336';
                ctx.fillRect(20, canvas.height - 80, 200 * (durabilityPercent / 100), 8);
            }
        }

        if (miningTarget) {
            ctx.fillStyle = 'rgba(50, 50, 150, 0.8)';
            ctx.fillRect(canvas.width - 220, 20, 200, 80);

            ctx.fillStyle = '#FFF';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Добыча: ${miningTarget.blockInfo.type}`, canvas.width - 210, 40);
            ctx.fillText(`Слой: ${getLayerName(miningTarget.blockInfo.layer)}`, canvas.width - 210, 60);
            ctx.fillText(`Прогресс: ${Math.round(miningProgress)}%`, canvas.width - 210, 80);

            ctx.fillStyle = '#2196F3';
            ctx.fillRect(canvas.width - 210, 90, 180 * (miningProgress / 100), 5);
        }

        if (inventorySyncInProgress) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.fillText('Синхронизация инвентаря...', canvas.width - 240, canvas.height - 20);
        }

        if (mouseX >= 0 && mouseY >= 0 && mouseX < canvas.width && mouseY < canvas.height) {
            const worldX = (mouseX + camera.x) / tileSize;
            const worldY = (mouseY + camera.y) / tileSize;
            const tx = Math.floor(worldX);
            const ty = Math.floor(worldY);

            if (MiningModule.isBlockInRange(tx + 0.5, ty + 0.5)) {
                const tile = WorldModule.getTileAt(tx, ty);
                if (tile) {
                    const preview = MiningModule.getMiningPreview(tile);

                    if (preview.currentLayer) {
                        const previewHeight = 100;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.fillRect(mouseX + 20, mouseY + 20, 220, previewHeight);

                        ctx.fillStyle = '#FFF';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'left';
                        ctx.fillText(`Добыть: ${preview.currentLayer.type}`, mouseX + 30, mouseY + 40);

                        if (preview.resourceCount > 0) {
                            ctx.fillStyle = '#4CAF50';
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

                        if (preview.willRemain) {
                            ctx.fillStyle = '#FF9800';
                            ctx.fillText(`Останется: ${preview.willRemain}`, mouseX + 30, mouseY + 80);
                        }

                        ctx.fillStyle = preview.canMine ? '#4CAF50' : '#F44336';
                        ctx.fillText(preview.canMine ? '✓ Можно добыть' : '✗ Нельзя добыть',
                            mouseX + 30, mouseY + previewHeight);
                    }
                }
            }
        }

        if (mouseX >= 0 && mouseY >= 0 && mouseX < canvas.width && mouseY < canvas.height) {
            const worldX = (mouseX + camera.x) / tileSize;
            const worldY = (mouseY + camera.y) / tileSize;
            const hoverTile = WorldModule.getTileAt(Math.floor(worldX), Math.floor(worldY));

            if (hoverTile) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(mouseX + 10, mouseY - 50, 150, 40);
                ctx.fillStyle = '#FFF';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';

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

                const displayLayers = layersText.slice(0, 3);
                displayLayers.forEach((text, index) => {
                    ctx.fillText(text, mouseX + 15, mouseY - 30 + (index * 15));
                });

                if (layersText.length > 3) {
                    ctx.fillText(`... и еще ${layersText.length - 3}`, mouseX + 15, mouseY - 30 + (3 * 15));
                }
            }
        }

        if (showLayerLegend) {
            renderLayerLegend();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText('1-Рука 2-Топор 3-Лопата 4-Кирка', 20, canvas.height - 60);
        ctx.fillText('L - Легенда слоев  C - Камера  G - Сетка', 20, canvas.height - 45);
        ctx.fillText('P - Поиск руды  R - Регенерация', 20, canvas.height - 30);
    }

    function renderLayerLegend() {
        const legendX = canvas.width - 250;
        const legendY = 120;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(legendX, legendY, 230, 200);

        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Легенда слоев', legendX + 115, legendY + 25);

        const layers = [
            { layer: 's', color: '#00FF00', name: 'Поверхность', desc: 'Трава, песок, камень' },
            { layer: 'g', color: '#8B7355', name: 'Грунт', desc: 'Земля под поверхностью' },
            { layer: 'o', color: '#FFD700', name: 'Руда', desc: 'Полезные ископаемые' },
            { layer: 'e', color: '#228B22', name: 'Объекты', desc: 'Деревья, растения' },
            { layer: 'l', color: '#0000FF', name: 'Жидкость', desc: 'Нефть, вода' }
        ];

        let yOffset = 45;
        layers.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX + 10, legendY + yOffset, 12, 12);

            ctx.fillStyle = '#FFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(item.name, legendX + 30, legendY + yOffset + 10);
            ctx.fillText(item.desc, legendX + 30, legendY + yOffset + 25);

            yOffset += 35;
        });
    }

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

    function showNotification(text, color = '#4CAF50') {
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

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showNetworkError(message) {
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

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    return {
        onResize,
        setZoom,
        renderMiningProgress,
        renderMiningPreview,
        renderRadiusHighlight,
        renderEnhancedUI,
        getLayerName,
        showNotification,
        showNetworkError
    };
})();

// ========== МОДУЛЬ УПРАВЛЕНИЯ ЧАНКАМИ ==========
const ChunkModule = (function() {
    function createChunkObject(tiles, cx, cy) {
        const c = document.createElement('canvas');
        c.width = CONSTANTS.CHUNK_SIZE * CONSTANTS.BASE_TILE_SIZE;
        c.height = CONSTANTS.CHUNK_SIZE * CONSTANTS.BASE_TILE_SIZE;
        const chunkCtx = c.getContext('2d');

        chunkCtx.chunkX = cx;
        chunkCtx.chunkY = cy;

        renderTilesToCanvas(tiles, chunkCtx);

        if (chunkCache.size >= CONSTANTS.MAX_CHUNK_CACHE) {
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
        if (chunkCache.has(key) || loadingChunks.has(key)) return;

        if (priority === -1) {
            chunkQueue.unshift({ cx, cy, priority });
        } else {
            chunkQueue.push({ cx, cy, priority });
        }

        loadingChunks.add(key);
    }

    async function fetchBatch(batch) {
        activeRequests++;
        const batchStr = batch.map(c => `${c.cx},${c.cy}`).join(';');

        try {
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
        if (chunkQueue.length === 0 || activeRequests >= CONSTANTS.MAX_CONCURRENT_REQUESTS) return;
        const batch = chunkQueue.splice(0, CONSTANTS.BATCH_SIZE);
        fetchBatch(batch);
    }

    function preloadInitialChunks() {
        const screenChunkSize = CONSTANTS.CHUNK_SIZE * tileSize;
        const centerX = Math.floor((camera.x + canvas.width / 2) / screenChunkSize);
        const centerY = Math.floor((camera.y + canvas.height / 2) / screenChunkSize);

        const RADIUS = 2;

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
        const screenChunkSize = CONSTANTS.CHUNK_SIZE * tileSize;
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
                    ctx.drawImage(chunkData.canvas, screenX, screenY, screenChunkSize, screenChunkSize);
                } else {
                    ctx.fillStyle = "#0a0a0a";
                    ctx.fillRect(screenX, screenY, screenChunkSize, screenChunkSize);
                    enqueueChunk(cx, cy, -1);
                }

                if (showGrid) {
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(screenX, screenY, screenChunkSize, screenChunkSize);

                    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.font = `${Math.max(10, 12 * zoom)}px Arial`;
                    ctx.fillText(`${cx}:${cy}`, screenX + 5, screenY + 15);

                    if (cx % 3 === 0 && cy % 3 === 0) {
                        ctx.strokeStyle = "#ffeb3b";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(screenX, screenY, screenChunkSize * 3, screenChunkSize * 3);

                        ctx.fillStyle = "#ffeb3b";
                        ctx.fillText(`SECTOR`, screenX + 5, screenY + 30);
                    }
                }
            }
        }
    }

    function renderTilesToCanvas(tiles, chunkCtx) {
        for (let y = 0; y < CONSTANTS.CHUNK_SIZE; y++) {
            for (let x = 0; x < CONSTANTS.CHUNK_SIZE; x++) {
                const tile = tiles[y][x];
                const tx = x * CONSTANTS.BASE_TILE_SIZE;
                const ty = y * CONSTANTS.BASE_TILE_SIZE;

                let showPreview = false;
                let previewLayer = null;

                if (miningTarget && miningTarget.chunk && miningTarget.chunk === chunkCtx.canvas) {
                    const chunkX = miningTarget.tx % CONSTANTS.CHUNK_SIZE;
                    const chunkY = miningTarget.ty % CONSTANTS.CHUNK_SIZE;
                    if (chunkX === x && chunkY === y) {
                        showPreview = true;
                        previewLayer = miningTarget.blockInfo.layer;
                    }
                }

                RenderModule.LayerRenderer.renderTileLayers(
                    chunkCtx,
                    tx, ty,
                    tile,
                    CONSTANTS.BASE_TILE_SIZE,
                    showPreview,
                    previewLayer,
                    { ore: isOreProspecting, liquid: isLiquidProspecting }
                );

                if (isOreProspecting && tile.o && tile.o !== 'none') {
                    chunkCtx.fillStyle = '#FFFF00';
                    chunkCtx.globalAlpha = 0.3;
                    chunkCtx.fillRect(tx, ty, CONSTANTS.BASE_TILE_SIZE, CONSTANTS.BASE_TILE_SIZE);
                    chunkCtx.globalAlpha = 1.0;

                    chunkCtx.fillStyle = '#FFFFFF';
                    chunkCtx.font = '10px Arial';
                    chunkCtx.textAlign = 'center';
                    chunkCtx.fillText(
                        tile.o.replace('ore_', ''),
                        tx + CONSTANTS.BASE_TILE_SIZE / 2,
                        ty + CONSTANTS.BASE_TILE_SIZE / 2
                    );
                }

                if (isLiquidProspecting && tile.lm !== undefined) {
                    const fillRatio = tile.la / tile.lm;
                    const fillHeight = fillRatio * CONSTANTS.BASE_TILE_SIZE;

                    chunkCtx.fillStyle = COLORS[tile.l] || '#000';
                    chunkCtx.globalAlpha = 0.85;
                    chunkCtx.fillRect(tx, ty + CONSTANTS.BASE_TILE_SIZE - fillHeight, CONSTANTS.BASE_TILE_SIZE, fillHeight);
                    chunkCtx.globalAlpha = 1.0;

                    const fontSize = Math.min(16, Math.max(10, 14));
                    chunkCtx.font = `${Math.floor(fontSize)}px Arial`;
                    chunkCtx.textAlign = 'center';
                    chunkCtx.textBaseline = 'middle';
                    chunkCtx.fillStyle = fillRatio > 0.5 ? '#ffffff' : '#aaaaaa';
                    chunkCtx.fillText(`${tile.la}L`, tx + CONSTANTS.BASE_TILE_SIZE / 2, ty + CONSTANTS.BASE_TILE_SIZE / 2);
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

    function cleanupChunkCache() {
        if (chunkCache.size <= CONSTANTS.MAX_CHUNK_CACHE) return;

        const chunksArray = Array.from(chunkCache.entries())
            .sort((a, b) => a[1].loadedAt - b[1].loadedAt);

        const toRemove = [];
        const centerCX = Math.floor((camera.x + canvas.width / 2) / (CONSTANTS.CHUNK_SIZE * tileSize));
        const centerCY = Math.floor((camera.y + canvas.height / 2) / (CONSTANTS.CHUNK_SIZE * tileSize));
        const RENDER_RADIUS = 3;

        for (const [key] of chunksArray) {
            const [cx, cy] = key.split(',').map(Number);
            const distance = Math.sqrt(Math.pow(cx - centerCX, 2) + Math.pow(cy - centerCY, 2));

            if (distance > RENDER_RADIUS) {
                toRemove.push(key);
            }

            if (chunkCache.size - toRemove.length <= CONSTANTS.MAX_CHUNK_CACHE) {
                break;
            }
        }

        for (const key of toRemove) {
            chunkCache.delete(key);
        }

        console.log(`Очищен кэш чанков. Удалено: ${toRemove.length}, осталось: ${chunkCache.size}`);
    }

    function regenerateWorld() {
        currentSeed = Date.now();
        chunkCache.clear();
        loadingChunks.clear();
        chunkQueue.length = 0;
        preloadInitialChunks();
    }

    return {
        processChunkQueue,
        preloadInitialChunks,
        renderWorld,
        refreshVisibleChunks,
        cleanupChunkCache,
        regenerateWorld
    };
})();

// ========== МОДУЛЬ СИНХРОНИЗАЦИИ ==========
const SyncModule = (function() {
    let isSyncingPosition = false;
    let isSyncingInventory = false;

    async function syncPlayerPosition() {
        if (!window.playerId || isSyncingPosition) return;

        const now = Date.now();
        if (now - lastPositionSync < CONSTANTS.UPDATE_INTERVAL) return;

        const lastX = localStorage.getItem('lastPlayerX');
        const lastY = localStorage.getItem('lastPlayerY');
        const player = PlayerModule.player;

        if (lastX === player.x.toString() && lastY === player.y.toString()) return;

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

            localStorage.setItem('lastPlayerX', player.x);
            localStorage.setItem('lastPlayerY', player.y);
            lastPositionSync = now;
        } catch (error) {
            console.error('Ошибка синхронизации позиции:', error);
            lastPositionSync = now - CONSTANTS.UPDATE_INTERVAL + 30000;
        } finally {
            isSyncingPosition = false;
        }
    }

    async function syncPlayerInventory() {
        if (!window.playerId || isSyncingInventory) return;

        const now = Date.now();
        if (now - lastInventorySync < CONSTANTS.SYNC_INVENTORY_INTERVAL) return;

        isSyncingInventory = true;

        try {
            await APIModule.loadPlayerInventory(window.playerId);
            lastInventorySync = now;
        } catch (error) {
            console.error('Ошибка синхронизации инвентаря:', error);
            lastInventorySync = now - CONSTANTS.SYNC_INVENTORY_INTERVAL + 60000;
        } finally {
            isSyncingInventory = false;
        }
    }

    async function syncInventorySafe() {
        if (!window.playerId || inventorySyncInProgress) return;

        inventorySyncInProgress = true;

        try {
            const oldBlocks = { ...InventoryManager.blocks };

            const serverInventory = await APIModule.loadPlayerInventory(window.playerId, true);

            if (!serverInventory) {
                console.warn('Не удалось загрузить инвентарь с сервера');
                return;
            }

            console.log('Серверный инвентарь:', serverInventory);
            console.log('Локальный инвентарь до:', oldBlocks);

            if (useVueInventory) {
                updateVueInventory();
            }

            console.log('Инвентарь синхронизирован');

        } catch (error) {
            console.error('Ошибка синхронизации инвентаря:', error);
        } finally {
            inventorySyncInProgress = false;
        }
    }

    function checkSync() {
        const now = Date.now();
        if (now - lastSyncTime > CONSTANTS.SYNC_INTERVAL) {
            lastSyncTime = now;
        }

        syncPlayerPosition();
        syncPlayerInventory();
    }

    return {
        syncInventorySafe, // Добавляем экспорт функции
        checkSync
    };
})();


// ========== VUE ИНТЕГРАЦИЯ ==========
function checkVueInventory() {
    if (window.VueInventory) {
        useVueInventory = true;
        vueInventoryReady = true;
        console.log('✅ Используется Vue инвентарь');
        showInventory = false;

        // Тест: попробуем загрузить инвентарь сразу
        if (window.playerId) {
            setTimeout(() => {
                window.VueInventory.fetchInventory && window.VueInventory.fetchInventory(window.playerId);
            }, 500);
        }
    } else {
        console.log('❌ Vue инвентарь не найден, используется canvas');
        useVueInventory = false;
    }
}

function updateVueInventory(inventoryArray) {
    if (!useVueInventory || !vueInventoryReady) return;

    try {
        setTimeout(() => {
            // Если передали массив инвентаря, обновляем серверные данные
            if (inventoryArray && Array.isArray(inventoryArray)) {
                InventoryManager.updateToolsFromServer(inventoryArray);
            }

            // Создаем данные для Vue инвентаря
            const inventoryData = {
                inventory: InventoryManager.items, // Передаем все предметы
                blocks: InventoryManager.blocks,
                tools: {},
                currentTool: currentTool, // Используем глобальную переменную
                currentHotbarSlot: currentHotbarSlot // Используем глобальную переменную
            };

            // Обновляем инструменты для Vue
            Object.keys(InventoryManager.tools).forEach(key => {
                if (key !== 'hand') {
                    const tool = InventoryManager.tools[key];
                    inventoryData.tools[key] = {
                        durability: tool.durability,
                        name: tool.name,
                        maxDurability: tool.maxDurability || 60
                    };
                }
            });

            // Обновляем Vue инвентарь
            if (window.VueInventory && window.VueInventory.updateData) {
                window.VueInventory.updateData(inventoryData);
            }

            window.dispatchEvent(new CustomEvent('inventory-update', {
                detail: inventoryData
            }));

            console.log('Vue инвентарь обновлен:', inventoryData);
        }, 100);
    } catch (error) {
        console.error('Ошибка обновления Vue инвентаря:', error);
    }
}

function toggleInventory() {
    if (useVueInventory && vueInventoryReady) {
        if (window.VueInventory.isVisible) {
            window.VueInventory.hide();
        } else {
            window.VueInventory.show();
        }
    } else {
        showInventory = !showInventory;
    }
}

function showVueNotification(text, type = 'info') {
    if (useVueInventory && window.VueInventory.addNotification) {
        window.VueInventory.addNotification(text, type);
    } else {
        UIModule.showNotification(text,
            type === 'error' ? '#F44336' :
                type === 'warning' ? '#FF9800' :
                    type === 'success' ? '#4CAF50' : '#2196F3'
        );
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ И ИГРОВОЙ ЦИКЛ ==========
async function initializeGame() {
    if (gameInitialized) return;

    try {
        UIModule.onResize();

        if (!window.playerId) {
            const serverPlayer = await APIModule.spawnPlayer("DevPlayer");
            if (serverPlayer) {
                PlayerModule.player.x = serverPlayer.x;
                PlayerModule.player.y = serverPlayer.y;
            }
        }

        // Инициализируем менеджер инвентаря
        if (window.playerId) {
            InventoryManager.init(window.playerId);
        }

        ChunkModule.preloadInitialChunks();
        gameInitialized = true;
        requestAnimationFrame(loop);

        console.log('Игра инициализирована');
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        UIModule.showNetworkError('Ошибка загрузки игры. Перезагрузите страницу.');
    }
}

let renderSkipCounter = 0;

function loop() {
    if (!gameInitialized) {
        requestAnimationFrame(loop);
        return;
    }

    renderSkipCounter++;
    const shouldRender = renderSkipCounter % CONSTANTS.RENDER_SKIP_FACTOR === 0;

    if (!isDragging) {
        camera.x -= velocityX;
        camera.y -= velocityY;
        velocityX *= inertiaDamping;
        velocityY *= inertiaDamping;
    }

    ChunkModule.processChunkQueue();

    if (shouldRender) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        PlayerModule.update();
        if (followPlayer) {
            camera.x = PlayerModule.player.x * tileSize - canvas.width / 2;
            camera.y = PlayerModule.player.y * tileSize - canvas.height / 2;
        }

        ChunkModule.renderWorld();
        UIModule.renderMiningPreview();
        UIModule.renderRadiusHighlight();
        PlayerModule.render();
        UIModule.renderMiningProgress();
        UIModule.renderEnhancedUI();
    }

    if (renderSkipCounter % 10 === 0) {
        SyncModule.checkSync();
    }

    requestAnimationFrame(loop);
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    // Выбор слотов хотбара (1-9)
    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const slotIndex = parseInt(e.key) - 1;
        currentHotbarSlot = slotIndex;

        // Переключаем инструмент по слоту
        InventoryManager.switchToolByHotbarSlot(slotIndex);

        // Обновляем Vue инвентарь
        if (useVueInventory) {
            updateVueInventory();
        }
    }

    // Управление режимами
    if (e.key.toLowerCase() === 'p' && !isOreProspecting) {
        isOreProspecting = true;
        ChunkModule.refreshVisibleChunks();
    }
    if (e.key === 'l' && !isLiquidProspecting) {
        isLiquidProspecting = true;
        ChunkModule.refreshVisibleChunks();
    }
    if (e.key.toLowerCase() === "r") {
        ChunkModule.regenerateWorld();
    }
    if (e.key.toLowerCase() === 'g') {
        showGrid = !showGrid;
    }
    if (e.key.toLowerCase() === 'c') {
        followPlayer = !followPlayer;
    }
    if (e.key.toLowerCase() === 'i') {
        showLayerLegend = !showLayerLegend;
    }
    if (e.key.toLowerCase() === 'f') {
        console.log(`Jump: ${PlayerModule.player.jumpType}, Anim: ${PlayerModule.player.jumpAnim.toFixed(2)}, OnGround: ${PlayerModule.player.onGround}`);
    }
    if (e.key.toLowerCase() === 'h') {
        highlightRadius = !highlightRadius;
        console.log(`Подсветка радиуса: ${highlightRadius ? 'ВКЛ' : 'ВЫКЛ'}`);
    }
    if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleInventory();
    }

    // Shift для меню выбора слоя
    if (e.key === 'Shift') shiftKeyPressed = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;

    if (e.key.toLowerCase() === 'p') {
        isOreProspecting = false;
        ChunkModule.refreshVisibleChunks();
    }
    if (e.key.toLowerCase() === 'l') {
        isLiquidProspecting = false;
        ChunkModule.refreshVisibleChunks();
    }
    if (e.key === 'Shift') shiftKeyPressed = false;
});

window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    velocityX = 0;
    velocityY = 0;
});

window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    camera.x -= dx;
    camera.y -= dy;
    velocityX = dx;
    velocityY = dy;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    mouseX = -1;
    mouseY = -1;
});

canvas.addEventListener('mouseenter', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    UIModule.setZoom(zoom + delta, e.clientX, e.clientY);
}, { passive: false });

canvas.addEventListener('click', (e) => {

    // Debounce
    const now = Date.now();
    if (now - lastClickTime < CLICK_DEBOUNCE) return;
    lastClickTime = now;

    if (miningMode) {
        MiningModule.cancelMining();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = (x + camera.x) / tileSize;
    const worldY = (y + camera.y) / tileSize;
    const tx = Math.floor(worldX);
    const ty = Math.floor(worldY);

    const cx = Math.floor(tx / CONSTANTS.CHUNK_SIZE);
    const cy = Math.floor(ty / CONSTANTS.CHUNK_SIZE);
    const key = `${cx},${cy}`;
    const chunk = chunkCache.get(key);

    if (!chunk || !chunk.tiles) return;

    const lx = ((tx % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
    const ly = ((ty % CONSTANTS.CHUNK_SIZE) + CONSTANTS.CHUNK_SIZE) % CONSTANTS.CHUNK_SIZE;
    const tile = chunk.tiles[ly][lx];

    if (shiftKeyPressed) {
        showLayerSelectionMenu(tx, ty, tile, chunk);
        return;
    }

    const blockInfo = MiningModule.getBlockToMine(tile);
    if (!blockInfo) {
        console.log('Здесь нечего добывать');
        return;
    }

    MiningModule.startMining(tx, ty, chunk, tile, blockInfo);
});

function showLayerSelectionMenu(tx, ty, tile, chunk) {
    const layers = [];

    if (tile.e && tile.e !== 'none') {
        layers.push({ type: tile.e, layer: 'e', name: UIModule.getLayerName('e') });
    }
    if (tile.s && tile.s !== 'none') {
        layers.push({ type: tile.s, layer: 's', name: UIModule.getLayerName('s') });
    }
    if (tile.g && tile.g !== 'none') {
        layers.push({ type: tile.g, layer: 'g', name: UIModule.getLayerName('g') });
    }
    if (tile.o && tile.o !== 'none') {
        layers.push({ type: tile.o, layer: 'o', name: UIModule.getLayerName('o') });
    }

    if (layers.length === 0) {
        console.log('Нет доступных слоев для добычи');
        return;
    }

    console.log('Доступные слои для добычи:');
    layers.forEach((layer, index) => {
        console.log(`${index + 1}. ${layer.name}: ${layer.type}`);
    });

    let selectedLayer = null;
    for (const layer of layers) {
        if (InventoryManager.canMineBlock(layer.type)) {
            selectedLayer = layer;
            break;
        }
    }

    if (selectedLayer) {
        console.log(`Выбран слой: ${selectedLayer.name} (${selectedLayer.type})`);
        MiningModule.startMining(tx, ty, chunk, tile, selectedLayer);
    } else {
        console.log('Нет слоев, которые можно добыть текущим инструментом');
    }
}

// ========== ЗАПУСК ИГРЫ ==========
document.addEventListener("DOMContentLoaded", () => {
    initializeGame();

    const savedTool = localStorage.getItem('currentTool');
    if (savedTool && TOOLS_CONFIG[savedTool]) {
        currentTool = savedTool;
    }

    setInterval(() => {
        if (!window.playerId && gameInitialized) {
            console.warn('Потеряно соединение с сервером');
            UIModule.showNetworkError('Потеряно соединение. Попытка переподключения...');

            setTimeout(() => {
                initializeGame();
            }, 3000);
        }
    }, 30000);

    setTimeout(() => {
        checkVueInventory();
        if (window.playerId && vueInventoryReady) {
            updateVueInventory();
        }
    }, 1000);
});

window.addEventListener('error', function(event) {
    console.error('Глобальная ошибка:', event.error);

    if (event.error.message && event.error.message.includes('fetch') ||
        event.error.message.includes('network')) {
        UIModule.showNetworkError('Проблема с соединением. Проверьте интернет.');
    }
});

window.addEventListener('inventory-updated', (event) => {
    let { inventory, currentHotbarSlot, currentTool } = event.detail;

    // Обновляем менеджер
    InventoryManager.updateInventory(inventory);



    console.log('Инвентарь обновлен из Vue:', inventory);
});


// ========== ЭКСПОРТ ДЛЯ ТЕСТОВ ==========
if (typeof window !== 'undefined') {
    window.gamePlayer = PlayerModule.player;
    window.gameInventory = InventoryManager;
    window.gameCamera = camera;
    window.gameCanvas = canvas;
    window.gameCtx = ctx;
    window.gameKeys = keys;
    window.gameChunkCache = chunkCache;
    window.gameTileSize = tileSize;
    window.gameZoom = zoom;
    window.gameLastPositionSync = lastPositionSync;
    window.gameShowInventory = showInventory;
    window.gameShowGrid = showGrid;
    window.gameMiningMode = miningMode;
    window.gameMiningProgress = miningProgress;
    window.gamePlayerId = window.playerId;
    window.gameGetTileAt = WorldModule.getTileAt;
    window.gameIsBlockInRange = MiningModule.isBlockInRange;
    window.gameStartMining = MiningModule.startMining;
    window.gameCancelMining = MiningModule.cancelMining;
    window.gameCleanupChunkCache = ChunkModule.cleanupChunkCache;
    window.gameMaxChunkCache = CONSTANTS.MAX_CHUNK_CACHE;
    window.gameMaxStack = CONSTANTS.MAX_STACK;
    window.gameChunkSize = CONSTANTS.CHUNK_SIZE;
    window.gameMiningRadius = CONSTANTS.MINING_RADIUS;
    window.gameFetchPlayerInventory = APIModule.fetchPlayerInventory;
    window.gameLoadPlayerInventory = APIModule.loadPlayerInventory;
    window.RESOURCE_CONFIG = RESOURCE_CONFIG;
    window.BLOCKS_CONFIG = BLOCKS_CONFIG;
    window.TOOLS_CONFIG = TOOLS_CONFIG;
    console.log('🎮 Игровые переменные экспортированы для тестирования');
}

// Периодическая синхронизация инвентаря
setInterval(() => {
    if (window.playerId) {
        APIModule.loadPlayerInventory(window.playerId);
    }
}, 10000);

window.InventoryManager = InventoryManager;
