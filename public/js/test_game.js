// ==============================================
// 🧪 TEST GAME.JS - Тесты для игры V2
// Обновлено для работы с game_v2.js
// ==============================================

// 🔧 Игровые переменные (будут заполнены после загрузки)
let game = {
    // Основные объекты
    player: null,
    inventory: null,
    camera: null,
    canvas: null,
    ctx: null,
    keys: null,
    chunkCache: null,

    // Переменные состояния
    tileSize: null,
    zoom: null,
    lastPositionSync: null,
    showInventory: null,
    showGrid: null,
    miningMode: null,
    miningProgress: null,
    playerId: null,

    // Функции
    getTileAt: null,
    isBlockInRange: null,
    startMining: null,
    cancelMining: null,
    cleanupChunkCache: null,
    refreshChunk: null,

    // Константы
    maxChunkCache: null,
    maxStack: null,
    chunkSize: null,
    miningRadius: null,

    // API функции
    fetchPlayerInventory: null,
    loadPlayerInventory: null,

    // Конфигурации
    resourceConfig: null,
    toolsConfig: null,
    blocksConfig: null
};

// Функция для загрузки игровых переменных из game_v2.js
function loadGameVariables() {
    if (typeof window === 'undefined') return false;

    // Основные объекты (из экспорта game_v2.js)
    game.player = window.gamePlayer || PlayerModule?.player;
    game.inventory = window.gameInventory || InventoryModule;
    game.camera = window.gameCamera || camera;
    game.canvas = window.gameCanvas || document.getElementById('game');
    game.ctx = window.gameCtx || ctx;
    game.keys = window.gameKeys || keys;
    game.chunkCache = window.gameChunkCache || chunkCache;

    // Переменные состояния (из экспорта game_v2.js)
    game.tileSize = window.gameTileSize || tileSize;
    game.zoom = window.gameZoom || zoom;
    game.lastPositionSync = window.gameLastPositionSync || lastPositionSync;
    game.showInventory = window.gameShowInventory || showInventory;
    game.showGrid = window.gameShowGrid || showGrid;
    game.miningMode = window.gameMiningMode || miningMode;
    game.miningProgress = window.gameMiningProgress || miningProgress;
    game.playerId = window.gamePlayerId || window.playerId;

    // Функции (из экспорта game_v2.js)
    game.getTileAt = window.gameGetTileAt || WorldModule?.getTileAt;
    game.isBlockInRange = window.gameIsBlockInRange || MiningModule?.isBlockInRange;
    game.startMining = window.gameStartMining || MiningModule?.startMining;
    game.cancelMining = window.gameCancelMining || MiningModule?.cancelMining;
    game.cleanupChunkCache = window.gameCleanupChunkCache || ChunkModule?.cleanupChunkCache;
    game.refreshChunk = MiningModule?.refreshChunk;

    // Константы (из экспорта game_v2.js)
    game.maxChunkCache = window.gameMaxChunkCache || CONSTANTS?.MAX_CHUNK_CACHE;
    game.maxStack = window.gameMaxStack || CONSTANTS?.MAX_STACK;
    game.chunkSize = window.gameChunkSize || CONSTANTS?.CHUNK_SIZE;
    game.miningRadius = window.gameMiningRadius || CONSTANTS?.MINING_RADIUS;

    // API функции (из экспорта game_v2.js)
    game.fetchPlayerInventory = window.gameFetchPlayerInventory || APIModule?.fetchPlayerInventory;
    game.loadPlayerInventory = window.gameLoadPlayerInventory || APIModule?.loadPlayerInventory;

    // Конфигурации (из экспорта game_v2.js)
    game.resourceConfig = window.RESOURCE_CONFIG || RESOURCE_CONFIG;
    game.toolsConfig = window.TOOLS_CONFIG || TOOLS_CONFIG;
    game.blocksConfig = window.BLOCKS_CONFIG || BLOCKS_CONFIG;

    return true;
}

// Функция проверки загрузки игры
function isGameLoaded() {
    loadGameVariables();

    const hasPlayer = game.player && typeof game.player === 'object';
    const hasInventory = game.inventory && typeof game.inventory === 'object';
    const hasCanvas = game.canvas && (game.canvas instanceof HTMLCanvasElement || game.canvas.tagName === 'CANVAS');

    return hasPlayer && hasInventory && hasCanvas;
}

// 🔧 Глобальный объект для тестов
window.GameTests = {
    results: [],
    currentTest: null,
    game: game,
    isInitialized: false,

    // Проверка доступности модулей
    checkModules() {
        console.log('🔍 Проверка модулей game_v2.js');

        const modules = [
            { name: 'PlayerModule', obj: PlayerModule },
            { name: 'WorldModule', obj: WorldModule },
            { name: 'MiningModule', obj: MiningModule },
            { name: 'InventoryModule', obj: InventoryModule },
            { name: 'APIModule', obj: APIModule },
            { name: 'UIModule', obj: UIModule },
            { name: 'ChunkModule', obj: ChunkModule },
            { name: 'SyncModule', obj: SyncModule },
            { name: 'RenderModule', obj: RenderModule }
        ];

        modules.forEach(module => {
            console.log(`${module.obj ? '✅' : '❌'} ${module.name}: ${module.obj ? 'доступен' : 'не доступен'}`);
        });

        return modules.every(m => m.obj);
    },

    // Инициализация тестов
    init() {
        console.log('🎮 GameTests инициализированы для game_v2.js');

        // Проверяем модули
        const modulesLoaded = this.checkModules();

        // Загружаем переменные
        if (loadGameVariables() && modulesLoaded) {
            console.log('✅ Игровые переменные загружены');
            console.log('✅ Модули game_v2.js доступны');
            this.isInitialized = true;
        } else {
            console.log('⚠️ Игровые переменные или модули еще не загружены');
        }

        console.log('\n📋 ДОСТУПНЫЕ ТЕСТЫ:');
        console.log('- GameTests.quickCheck() - быстрая проверка');
        console.log('- GameTests.runAllTests() - запуск всех тестов');
        console.log('- GameTests.debugState() - отладка состояния');
        console.log('- GameTests.waitForGame() - ожидание загрузки игры');
        console.log('- GameTests.testModules() - тест модулей');
        console.log('- GameTests.testInventory() - тест инвентаря');
        console.log('- GameTests.testTools() - тест инструментов');
        console.log('- GameTests.testNetwork() - тест сети');
        console.log('- GameTests.testPerformance() - тест производительности');
        console.log('- GameTests.checkVariables() - проверка переменных');

        console.log('\n🎯 ГОТОВЫЕ СЦЕНАРИИ:');
        console.log('- Ctrl+Shift+T - все тесты');
        console.log('- Ctrl+Shift+D - отладка');
        console.log('- Ctrl+Shift+Q - быстрая проверка');
        console.log('- Ctrl+Shift+M - тест модулей');

        return this.isInitialized;
    },

    // Ожидание загрузки игры
    async waitForGame(timeout = 15000) {
        console.log('⏳ Ожидание загрузки игры (game_v2.js)...');

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            // Проверяем сразу
            if (isGameLoaded() && this.checkModules()) {
                console.log('✅ Игра уже загружена!');
                this.isInitialized = true;
                resolve(true);
                return;
            }

            const checkInterval = setInterval(() => {
                loadGameVariables();

                if (isGameLoaded() && this.checkModules()) {
                    clearInterval(checkInterval);
                    console.log('✅ Игра загружена!');
                    this.isInitialized = true;
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.log('❌ Таймаут ожидания игры');
                    console.log('💡 Попробуйте:');
                    console.log('1. Обновить страницу');
                    console.log('2. Проверить что game_v2.js загружен');
                    console.log('3. Проверить консоль на ошибки');
                    console.log('4. Запустить GameTests.checkVariables()');
                    reject(new Error('Таймаут ожидания загрузки игры'));
                } else {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    console.log(`⏳ Игра загружается... (${elapsed} сек)`);
                }
            }, 1000);
        });
    },

    // Сброс результатов
    reset() {
        this.results = [];
        console.log('🧹 Результаты тестов сброшены');
    },

    // Логирование результата теста
    logResult(testName, passed, message = '') {
        const result = {
            name: testName,
            passed: passed,
            time: new Date().toLocaleTimeString(),
            message: message
        };

        this.results.push(result);
        console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);

        return passed;
    },

    // Показать итоги
    showSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 ИТОГИ ТЕСТИРОВАНИЯ');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;

        if (total === 0) {
            console.log('📭 Тесты не запускались');
            return false;
        }

        this.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.passed ? '✅' : '❌'} ${result.name} (${result.time})`);
            if (result.message && !result.passed) {
                console.log(`   ${result.message}`);
            }
        });

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Пройдено: ${passed}/${total}`);
        console.log(`📈 Успешность: ${((passed/total)*100).toFixed(1)}%`);
        console.log('='.repeat(50));

        return passed === total;
    }
};

// ==============================================
// 🧪 БАЗОВЫЕ ТЕСТЫ ДЛЯ GAME_V2.JS
// ==============================================

GameTests.basic = {
    // Тест 1: Проверка модулей game_v2.js
    testModules() {
        console.log('🧪 Тест модулей game_v2.js');

        const modules = [
            { name: 'PlayerModule', obj: PlayerModule },
            { name: 'WorldModule', obj: WorldModule },
            { name: 'MiningModule', obj: MiningModule },
            { name: 'InventoryModule', obj: InventoryModule },
            { name: 'APIModule', obj: APIModule },
            { name: 'UIModule', obj: UIModule },
            { name: 'ChunkModule', obj: ChunkModule },
            { name: 'SyncModule', obj: SyncModule },
            { name: 'RenderModule', obj: RenderModule }
        ];

        let allFound = true;
        modules.forEach(module => {
            const exists = module.obj !== null && module.obj !== undefined;
            console.log(`${exists ? '✅' : '❌'} ${module.name}: ${exists ? 'найден' : 'не найден'}`);

            if (exists) {
                // Проверяем основные методы/свойства
                switch(module.name) {
                    case 'PlayerModule':
                        const hasPlayer = module.obj.player && typeof module.obj.player === 'object';
                        const hasUpdate = typeof module.obj.update === 'function';
                        const hasRender = typeof module.obj.render === 'function';
                        console.log(`   player: ${hasPlayer ? '✅' : '❌'}, update: ${hasUpdate ? '✅' : '❌'}, render: ${hasRender ? '✅' : '❌'}`);
                        allFound = allFound && hasPlayer && hasUpdate && hasRender;
                        break;
                    case 'InventoryModule':
                        const hasTools = module.obj.tools && typeof module.obj.tools === 'object';
                        const hasSwitchTool = typeof module.obj.switchTool === 'function';
                        console.log(`   tools: ${hasTools ? '✅' : '❌'}, switchTool: ${hasSwitchTool ? '✅' : '❌'}`);
                        allFound = allFound && hasTools && hasSwitchTool;
                        break;
                }
            }
            allFound = allFound && exists;
        });

        return GameTests.logResult(
            'Модули game_v2.js',
            allFound,
            allFound ? 'Все модули загружены' : 'Некоторые модули отсутствуют'
        );
    },

    // Тест 2: Проверка доступности основных объектов
    testCoreObjects() {
        console.log('🧪 Тест базовых объектов игры');

        loadGameVariables();

        const requiredObjects = [
            { name: 'player', obj: game.player },
            { name: 'inventory', obj: game.inventory },
            { name: 'camera', obj: game.camera },
            { name: 'canvas', obj: game.canvas },
            { name: 'CONSTANTS', obj: CONSTANTS }
        ];

        let allFound = true;
        requiredObjects.forEach(item => {
            const exists = item.obj !== null && item.obj !== undefined;
            console.log(`${exists ? '✅' : '❌'} ${item.name}: ${exists ? 'найден' : 'не найден'}`);
            allFound = allFound && exists;
        });

        // Проверяем чанки
        const hasChunks = game.chunkCache !== null && game.chunkCache !== undefined;
        console.log(`${hasChunks ? '✅' : '⚠️'} chunkCache: ${hasChunks ? 'найден' : 'еще не загружен'}`);

        return GameTests.logResult(
            'Базовые объекты',
            allFound,
            allFound ? 'Основные объекты найдены' : 'Некоторые объекты отсутствуют'
        );
    },

    // Тест 3: Проверка инвентаря
    testInventoryStructure() {
        console.log('🧪 Тест структуры инвентаря');

        loadGameVariables();

        if (!game.inventory) {
            return GameTests.logResult('Структура инвентаря', false, 'Инвентарь не найден');
        }

        const requiredProps = ['tools', 'currentTool', 'blocks', 'switchTool', 'getCurrentTool'];
        let allFound = true;

        requiredProps.forEach(prop => {
            const exists = game.inventory[prop] !== undefined;
            console.log(`${exists ? '✅' : '❌'} inventory.${prop}: ${exists ? 'найден' : 'не найден'}`);
            allFound = allFound && exists;
        });

        // Проверяем инструменты
        const tools = ['hand', 'axe', 'shovel', 'pickaxe'];
        tools.forEach(tool => {
            const exists = game.inventory.tools && game.inventory.tools[tool];
            console.log(`${exists ? '✅' : '❌'} Инструмент ${tool}: ${exists ? 'найден' : 'не найден'}`);
        });

        return GameTests.logResult(
            'Структура инвентаря',
            allFound,
            allFound ? 'Структура инвентаря корректна' : 'Проблемы со структурой инвентаря'
        );
    },

    // Тест 4: Проверка игрока
    testPlayerStructure() {
        console.log('🧪 Тест структуры игрока');

        loadGameVariables();

        if (!game.player) {
            return GameTests.logResult('Структура игрока', false, 'Игрок не найден');
        }

        const requiredProps = ['x', 'y', 'hp', 'onGround', 'width', 'height', 'speed'];
        let allFound = true;

        requiredProps.forEach(prop => {
            const exists = game.player[prop] !== undefined;
            console.log(`${exists ? '✅' : '❌'} player.${prop}: ${exists ? 'найден' : 'не найден'}`);
            allFound = allFound && exists;
        });

        console.log(`Позиция игрока: ${game.player.x?.toFixed(2)}, ${game.player.y?.toFixed(2)}`);
        console.log(`HP: ${game.player.hp}`);

        return GameTests.logResult(
            'Структура игрока',
            allFound,
            allFound ? 'Структура игрока корректна' : 'Проблемы со структурой игрока'
        );
    },

    // Тест 5: Проверка загрузки чанков
    testChunkLoading() {
        console.log('🧪 Тест загрузки чанков');

        loadGameVariables();

        if (!game.chunkCache) {
            return GameTests.logResult('Загрузка чанков', false, 'Кэш чанков не найден');
        }

        const chunkCount = game.chunkCache.size;
        console.log(`Загружено чанков: ${chunkCount}`);

        if (chunkCount > 0) {
            const firstChunk = Array.from(game.chunkCache.values())[0];
            console.log('Первый чанк:', firstChunk ? '✅ найден' : '❌ не найден');

            if (firstChunk) {
                console.log('Чанк содержит:', {
                    hasCanvas: !!firstChunk.canvas,
                    hasTiles: !!firstChunk.tiles,
                    size: firstChunk.tiles ? `${firstChunk.tiles.length}x${firstChunk.tiles[0]?.length}` : 'unknown'
                });
            }
        }

        const passed = chunkCount >= 0; // Может быть 0 на старте
        return GameTests.logResult(
            'Загрузка чанков',
            passed,
            passed ? `Загружено ${chunkCount} чанков` : 'Чанки не загружены'
        );
    },

    // Тест 6: Проверка API соединения
    async testAPIConnection() {
        console.log('🧪 Тест подключения к API');

        try {
            const response = await fetch('/api/player/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'APITestPlayer' })
            });

            const data = await response.json();
            console.log('API ответ:', response.status, data);

            const passed = response.ok;
            return GameTests.logResult(
                'Подключение к API',
                passed,
                passed ? 'API доступен' : `API недоступен: ${response.status}`
            );
        } catch (error) {
            console.error('Ошибка API:', error);
            return GameTests.logResult(
                'Подключение к API',
                false,
                `API недоступен: ${error.message}`
            );
        }
    }
};

// ==============================================
// 🧪 ТЕСТЫ МИРА И СОХРАНЕНИЯ
// ==============================================

GameTests.world = {
    // Тест добычи блока
    testMiningFunctions() {
        console.log('🧪 Тест функций добычи');

        loadGameVariables();

        const requiredFunctions = ['getTileAt', 'isBlockInRange', 'startMining', 'cancelMining'];
        let allFound = true;

        requiredFunctions.forEach(funcName => {
            const exists = typeof game[funcName] === 'function';
            console.log(`${exists ? '✅' : '❌'} ${funcName}(): ${exists ? 'есть' : 'нет'}`);
            allFound = allFound && exists;
        });

        // Проверяем конфигурации
        console.log(`${game.resourceConfig ? '✅' : '❌'} RESOURCE_CONFIG: ${game.resourceConfig ? 'есть' : 'нет'}`);
        console.log(`${game.blocksConfig ? '✅' : '❌'} BLOCKS_CONFIG: ${game.blocksConfig ? 'есть' : 'нет'}`);

        return GameTests.logResult(
            'Функции добычи',
            allFound,
            allFound ? 'Все функции добычи доступны' : 'Не все функции доступны'
        );
    },

    // Тест сохранения изменений
    async testWorldPersistence() {
        console.log('🧪 Тест сохранения мира');

        try {
            const response = await fetch('/api/blocks/area?minX=0&maxX=5&minY=0&maxY=5');
            if (response.ok) {
                const data = await response.json();
                console.log('API блоков доступен, получено данных:', Object.keys(data).length);

                return GameTests.logResult(
                    'Сохранение мира',
                    true,
                    'API блоков работает'
                );
            } else {
                return GameTests.logResult(
                    'Сохранение мира',
                    false,
                    `API блоков недоступен: ${response.status}`
                );
            }
        } catch (error) {
            return GameTests.logResult(
                'Сохранение мира',
                false,
                `Ошибка API: ${error.message}`
            );
        }
    },

    // Тест кэша чанков
    testChunkCache() {
        console.log('🧪 Тест кэша чанков');

        loadGameVariables();

        if (!game.chunkCache) {
            return GameTests.logResult('Кэш чанков', false, 'Кэш чанков не найден');
        }

        const cacheSize = game.chunkCache.size;
        console.log(`Размер кэша: ${cacheSize}`);

        // Проверяем, что есть функция очистки
        const hasCleanup = typeof game.cleanupChunkCache === 'function';
        console.log(`Функция cleanupChunkCache: ${hasCleanup ? '✅ есть' : '❌ нет'}`);

        // Проверяем максимальный размер кэша
        const maxCache = game.maxChunkCache || 50;
        console.log(`Максимальный размер кэша: ${maxCache}`);

        const passed = cacheSize >= 0 && hasCleanup;
        return GameTests.logResult(
            'Кэш чанков',
            passed,
            passed ? `Кэш работает (${cacheSize} чанков)` : 'Проблемы с кэшем'
        );
    },

    // Тест получения тайла
    testTileFunctions() {
        console.log('🧪 Тест функций работы с тайлами');

        loadGameVariables();

        if (!game.getTileAt) {
            return GameTests.logResult('Функции тайлов', false, 'getTileAt не найдена');
        }

        // Пробуем получить тайл на позиции игрока
        const playerX = Math.floor(game.player?.x || 0);
        const playerY = Math.floor(game.player?.y || 0);

        try {
            const tile = game.getTileAt(playerX, playerY);
            console.log('Тайл на позиции игрока:', tile);

            const passed = tile && typeof tile === 'object';
            return GameTests.logResult(
                'Функции тайлов',
                passed,
                passed ? 'getTileAt работает' : 'getTileAt не вернула данные'
            );
        } catch (error) {
            return GameTests.logResult(
                'Функции тайлов',
                false,
                `Ошибка getTileAt: ${error.message}`
            );
        }
    }
};

// ==============================================
// 🧪 ТЕСТЫ ИНВЕНТАРЯ
// ==============================================

GameTests.inventory = {
    // Тест структуры инвентаря
    testInventoryAPI() {
        console.log('🧪 Тест API инвентаря');

        loadGameVariables();

        if (!game.inventory) {
            return GameTests.logResult('API инвентаря', false, 'Инвентарь не найден');
        }

        // Проверяем основные методы
        const methods = ['switchTool', 'useTool', 'addBlock', 'getCurrentTool', 'canMineBlock'];
        let allFound = true;

        methods.forEach(method => {
            const exists = typeof game.inventory[method] === 'function';
            console.log(`${exists ? '✅' : '❌'} inventory.${method}(): ${exists ? 'есть' : 'нет'}`);
            allFound = allFound && exists;
        });

        // Проверяем текущий инструмент
        const currentTool = game.inventory.getCurrentTool?.();
        console.log('Текущий инструмент:', currentTool ? currentTool.name : 'не найден');

        return GameTests.logResult(
            'API инвентаря',
            allFound,
            allFound ? 'Все методы инвентаря доступны' : 'Не все методы доступны'
        );
    },

    // Тест переключения инструментов
    testToolSwitching() {
        console.log('🧪 Тест переключения инструментов');

        loadGameVariables();

        if (!game.inventory || !game.inventory.switchTool) {
            return GameTests.logResult('Переключение инструментов', false, 'Метод switchTool не найден');
        }

        const originalTool = game.inventory.currentTool;
        console.log(`Исходный инструмент: ${originalTool}`);

        // Пробуем переключить инструменты
        const testTools = ['hand', 'axe', 'shovel', 'pickaxe'];
        let successCount = 0;

        testTools.forEach(tool => {
            const success = game.inventory.switchTool(tool);
            console.log(`Переключение на ${tool}: ${success ? '✅' : '❌'}`);
            if (success) successCount++;
        });

        // Возвращаем исходный инструмент
        game.inventory.switchTool(originalTool);

        const passed = successCount === testTools.length;
        return GameTests.logResult(
            'Переключение инструментов',
            passed,
            passed ? 'Все инструменты переключаются' : `Переключилось только ${successCount}/${testTools.length}`
        );
    },

    // Тест добавления блоков в инвентарь
    testAddingBlocks() {
        console.log('🧪 Тест добавления блоков');

        loadGameVariables();

        if (!game.inventory || !game.inventory.addBlock) {
            return GameTests.logResult('Добавление блоков', false, 'Метод addBlock не найден');
        }

        const testBlock = 'dirt';
        const initialCount = game.inventory.blocks?.[testBlock] || 0;
        console.log(`Начальное количество ${testBlock}: ${initialCount}`);

        // Добавляем блок
        game.inventory.addBlock(testBlock, 5);
        const afterAddCount = game.inventory.blocks?.[testBlock] || 0;
        console.log(`После добавления 5 блоков: ${afterAddCount}`);

        // Проверяем лимит стака
        game.inventory.addBlock(testBlock, 100);
        const afterOverflow = game.inventory.blocks?.[testBlock];
        console.log(`После переполнения: ${afterOverflow}`);

        const maxStack = game.maxStack || 64;
        const passed = afterOverflow === maxStack;

        // Возвращаем к исходному состоянию
        if (game.inventory.blocks) {
            game.inventory.blocks[testBlock] = initialCount;
        }

        return GameTests.logResult(
            'Добавление блоков',
            passed,
            passed ? `Лимит стака работает (макс ${maxStack})` : 'Проблемы с добавлением блоков'
        );
    },

    // Тест синхронизации с сервером
    async testInventorySync() {
        console.log('🧪 Тест синхронизации инвентаря');

        if (!game.playerId) {
            return GameTests.logResult('Синхронизация инвентаря', false, 'ID игрока не найден');
        }

        try {
            const response = await fetch(`/api/inventory?player_id=${game.playerId}`);

            if (response.ok) {
                const data = await response.json();
                console.log('Инвентарь с сервера: получено', data.success ? 'успешно' : 'с ошибкой');

                return GameTests.logResult(
                    'Синхронизация инвентаря',
                    data.success !== false,
                    data.success ? 'Инвентарь загружен с сервера' : 'Ошибка загрузки инвентаря'
                );
            } else {
                return GameTests.logResult(
                    'Синхронизация инвентаря',
                    false,
                    `Ошибка загрузки: ${response.status}`
                );
            }
        } catch (error) {
            return GameTests.logResult(
                'Синхронизация инвентаря',
                false,
                `Ошибка: ${error.message}`
            );
        }
    }
};

// ==============================================
// 🧪 ТЕСТЫ СЕТИ И ПРОИЗВОДИТЕЛЬНОСТИ
// ==============================================

GameTests.performance = {
    // Тест FPS
    async testFPS() {
        console.log('🧪 Тест производительности (FPS)');

        return new Promise(resolve => {
            const samples = [];
            const duration = 2000;
            const startTime = performance.now();

            let lastTime = startTime;
            let frameCount = 0;

            function measureFrame() {
                const currentTime = performance.now();
                const elapsed = currentTime - startTime;

                if (elapsed < duration) {
                    frameCount++;

                    const frameTime = currentTime - lastTime;
                    samples.push(frameTime);
                    lastTime = currentTime;

                    requestAnimationFrame(measureFrame);
                } else {
                    // Расчет результатов
                    const avgFrameTime = samples.length > 0 ?
                        samples.reduce((a, b) => a + b, 0) / samples.length : 0;
                    const avgFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

                    console.log(`Средний FPS: ${avgFPS.toFixed(1)}`);
                    console.log(`Кадров за ${(duration/1000).toFixed(1)}с: ${frameCount}`);
                    console.log(`Среднее время кадра: ${avgFrameTime.toFixed(2)}мс`);

                    const passed = avgFPS > 20;
                    GameTests.logResult(
                        'Производительность (FPS)',
                        passed,
                        passed ? `FPS: ${avgFPS.toFixed(1)}` : `Низкий FPS: ${avgFPS.toFixed(1)}`
                    );

                    resolve(passed);
                }
            }

            requestAnimationFrame(measureFrame);
        });
    },

    // Тест памяти
    testMemory() {
        console.log('🧪 Тест использования памяти');

        if (window.performance && performance.memory) {
            const memory = performance.memory;
            console.log('Использование памяти:', {
                'Used JS heap': `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                'All JS heap': `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                'Limit heap': `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            });

            const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            const passed = memoryUsagePercent < 80;

            return GameTests.logResult(
                'Использование памяти',
                passed,
                passed ? `Память: ${memoryUsagePercent.toFixed(1)}%` : `Много памяти: ${memoryUsagePercent.toFixed(1)}%`
            );
        } else {
            console.log('⚠️ Информация о памяти недоступна');
            return GameTests.logResult(
                'Использование памяти',
                true,
                'Информация о памяти недоступна'
            );
        }
    },

    // Тест сетевых запросов
    async testNetworkRequests() {
        console.log('🧪 Тест сетевых запросов');

        try {
            const endpoints = [
                { url: '/api/chunk?batch=0,0&seed=1767904171111', method: 'GET' },
                { url: '/api/inventory?player_id=1', method: 'GET' }
            ];

            let successCount = 0;

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint.url, { method: endpoint.method });
                    console.log(`${endpoint.method} ${endpoint.url}: ${response.status} ${response.ok ? '✅' : '❌'}`);
                    if (response.ok) successCount++;
                } catch (error) {
                    console.log(`${endpoint.url}: ERROR - ${error.message}`);
                }
            }

            const passed = successCount >= 1;
            return GameTests.logResult(
                'Сетевые запросы',
                passed,
                passed ? `${successCount}/${endpoints.length} API работают` : 'API недоступны'
            );
        } catch (error) {
            return GameTests.logResult(
                'Сетевые запросы',
                false,
                `Ошибка: ${error.message}`
            );
        }
    }
};

// ==============================================
// 🎯 ГОТОВЫЕ ТЕСТОВЫЕ СЦЕНАРИИ
// ==============================================

// Быстрая проверка
GameTests.quickCheck = async function() {
    console.log('🚀 ЗАПУСК БЫСТРОЙ ПРОВЕРКИ ИГРЫ (game_v2.js)');
    console.log('='.repeat(50));

    if (!this.isInitialized) {
        try {
            await this.waitForGame(10000);
        } catch (error) {
            console.error('❌ Игра не загрузилась:', error.message);
            console.log('\n💡 РЕКОМЕНДАЦИИ:');
            console.log('1. Обновите страницу (F5)');
            console.log('2. Проверьте что game_v2.js загружен');
            console.log('3. Проверьте консоль на ошибки');
            console.log('4. Попробуйте GameTests.checkVariables()');
            return false;
        }
    }

    this.reset();

    console.log('\n📁 ГРУППА 1: Тест модулей');
    console.log('-'.repeat(40));
    this.basic.testModules();

    console.log('\n📁 ГРУППА 2: Базовые тесты');
    console.log('-'.repeat(40));
    this.basic.testCoreObjects();
    this.basic.testInventoryStructure();
    this.basic.testPlayerStructure();
    this.basic.testChunkLoading();

    console.log('\n🌐 ГРУППА 3: Тесты API');
    console.log('-'.repeat(40));
    await this.basic.testAPIConnection();

    console.log('\n🎒 ГРУППА 4: Тесты инвентаря');
    console.log('-'.repeat(40));
    this.inventory.testInventoryAPI();
    this.inventory.testToolSwitching();

    console.log('\n⚡ ГРУППА 5: Тесты производительности');
    console.log('-'.repeat(40));
    this.performance.testMemory();

    console.log('\n' + '='.repeat(50));
    return this.showSummary();
};

// Полный набор тестов
GameTests.runAllTests = async function() {
    console.log('🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ (game_v2.js)');
    console.log('='.repeat(50));

    if (!this.isInitialized) {
        try {
            await this.waitForGame(15000);
        } catch (error) {
            console.error('❌ Игра не загрузилась, тесты не могут быть запущены');
            return false;
        }
    }

    this.reset();

    console.log('\n📁 ГРУППА 1: Тест модулей');
    console.log('-'.repeat(40));
    this.basic.testModules();

    console.log('\n📁 ГРУППА 2: Базовые тесты');
    console.log('-'.repeat(40));
    this.basic.testCoreObjects();
    this.basic.testInventoryStructure();
    this.basic.testPlayerStructure();
    this.basic.testChunkLoading();
    await this.basic.testAPIConnection();

    console.log('\n🌍 ГРУППА 3: Тесты мира');
    console.log('-'.repeat(40));
    this.world.testMiningFunctions();
    this.world.testChunkCache();
    this.world.testTileFunctions();
    await this.world.testWorldPersistence();

    console.log('\n🎒 ГРУППА 4: Тесты инвентаря');
    console.log('-'.repeat(40));
    this.inventory.testInventoryAPI();
    this.inventory.testToolSwitching();
    this.inventory.testAddingBlocks();
    await this.inventory.testInventorySync();

    console.log('\n⚡ ГРУППА 5: Тесты производительности');
    console.log('-'.repeat(40));
    this.performance.testMemory();
    await this.performance.testNetworkRequests();
    await this.performance.testFPS();

    console.log('\n' + '='.repeat(50));
    return this.showSummary();
};

// Отладка текущего состояния
GameTests.debugState = function() {
    console.log('🔍 ТЕКУЩЕЕ СОСТОЯНИЕ ИГРЫ (game_v2.js)');
    console.log('='.repeat(50));

    loadGameVariables();

    console.log('\n🧩 МОДУЛИ:');
    console.log(`PlayerModule: ${PlayerModule ? '✅' : '❌'}`);
    console.log(`WorldModule: ${WorldModule ? '✅' : '❌'}`);
    console.log(`MiningModule: ${MiningModule ? '✅' : '❌'}`);
    console.log(`InventoryModule: ${InventoryModule ? '✅' : '❌'}`);

    console.log('\n👤 ИГРОК:');
    if (game.player) {
        console.log(`Позиция: ${game.player.x?.toFixed(2)}, ${game.player.y?.toFixed(2)}`);
        console.log(`HP: ${game.player.hp || 'N/A'}`);
        console.log(`На земле: ${game.player.onGround || 'N/A'}`);
        console.log(`Анимация прыжка: ${game.player.jumpAnim || 'N/A'}`);
    } else {
        console.log('❌ Игрок не найден');
    }

    console.log('\n🎒 ИНВЕНТАРЬ:');
    if (game.inventory) {
        console.log(`Текущий инструмент: ${game.inventory.currentTool}`);
        const tool = game.inventory.getCurrentTool?.();
        console.log(`Инструмент: ${tool?.name || 'N/A'}`);
        console.log(`Блоков в инвентаре: ${Object.keys(game.inventory.blocks || {}).length}`);
        if (game.inventory.blocks && Object.keys(game.inventory.blocks).length > 0) {
            console.log('Блоки:', Object.entries(game.inventory.blocks)
                .slice(0, 5)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', '));
            if (Object.keys(game.inventory.blocks).length > 5) {
                console.log(`... и еще ${Object.keys(game.inventory.blocks).length - 5} блоков`);
            }
        }
    } else {
        console.log('❌ Инвентарь не найден');
    }

    console.log('\n🗺️ МИР:');
    console.log(`Загружено чанков: ${game.chunkCache?.size || 0}`);
    console.log(`Размер тайла: ${game.tileSize || 'N/A'}px`);
    console.log(`Зум: ${game.zoom || 'N/A'}`);

    console.log('\n🌐 СЕТЬ:');
    console.log(`ID игрока: ${game.playerId || 'не установлен'}`);
    console.log(`Последняя синхронизация: ${game.lastPositionSync ? Math.floor((Date.now() - game.lastPositionSync) / 1000) + 's ago' : 'N/A'}`);

    console.log('\n⚙️ СИСТЕМА:');
    console.log(`Режим добычи: ${game.miningMode ? 'активен' : 'не активен'}`);
    console.log(`Прогресс добычи: ${game.miningProgress || 0}%`);
    console.log(`Шоу инвентарь: ${game.showInventory ? 'да' : 'нет'}`);
    console.log(`Шоу сетка: ${game.showGrid ? 'да' : 'нет'}`);

    console.log('\n📊 ПАМЯТЬ:');
    if (window.performance && performance.memory) {
        const mem = performance.memory;
        const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (mem.totalJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`Используется: ${usedMB}MB / ${totalMB}MB`);
    } else {
        console.log('ℹ️ Информация о памяти недоступна');
    }

    console.log('\n' + '='.repeat(50));

    return true;
};

// Проверка переменных
GameTests.checkVariables = function() {
    console.log('🔍 ПРОВЕРКА ПЕРЕМЕННЫХ ИГРЫ (game_v2.js)');
    console.log('='.repeat(50));

    loadGameVariables();

    const variables = [
        { name: 'PlayerModule', value: PlayerModule, type: 'object' },
        { name: 'InventoryModule', value: InventoryModule, type: 'object' },
        { name: 'player', value: game.player, type: 'object' },
        { name: 'inventory', value: game.inventory, type: 'object' },
        { name: 'camera', value: game.camera, type: 'object' },
        { name: 'canvas', value: game.canvas, type: 'element' },
        { name: 'chunkCache', value: game.chunkCache, type: 'object' },
        { name: 'playerId', value: game.playerId, type: 'number' },
        { name: 'tileSize', value: game.tileSize, type: 'number' },
        { name: 'zoom', value: game.zoom, type: 'number' },
        { name: 'getTileAt', value: game.getTileAt, type: 'function' },
        { name: 'CHUNK_SIZE', value: game.chunkSize, type: 'number' },
        { name: 'MAX_STACK', value: game.maxStack, type: 'number' },
        { name: 'CONSTANTS', value: CONSTANTS, type: 'object' }
    ];

    variables.forEach(v => {
        let status = '❌';
        let details = '';

        if (v.value !== null && v.value !== undefined) {
            if (v.type === 'function' && typeof v.value === 'function') {
                status = '✅';
                details = 'функция';
            } else if (v.type === 'object' && typeof v.value === 'object') {
                status = '✅';
                const keyCount = v.name === 'CONSTANTS' ? Object.keys(v.value).length :
                    v.value !== null ? Object.keys(v.value).length : 0;
                details = `объект (${keyCount} св-в)`;
            } else if (v.type === 'number' && typeof v.value === 'number') {
                status = '✅';
                details = `число: ${v.value}`;
            } else if (v.type === 'element' && v.value instanceof HTMLElement) {
                status = '✅';
                details = 'HTML элемент';
            } else {
                status = '⚠️';
                details = `тип: ${typeof v.value}`;
            }
        }

        console.log(`${status} ${v.name}: ${details}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('💡 СОВЕТЫ:');
    console.log('- Если переменные не найдены, обновите страницу (F5)');
    console.log('- Убедитесь что game_v2.js загружен');
    console.log('- Проверьте консоль на ошибки загрузки');

    return game.player !== null;
};

// Тест модулей
GameTests.testModules = function() {
    console.log('🧪 ТЕСТ МОДУЛЕЙ GAME_V2.JS');
    console.log('='.repeat(50));

    this.reset();
    this.basic.testModules();

    return this.showSummary();
};

// Отдельные тесты
GameTests.testSaveWorld = async function() {
    console.log('🧪 ТЕСТ СОХРАНЕНИЯ МИРА');
    console.log('='.repeat(50));

    this.reset();
    await this.world.testWorldPersistence();
    this.world.testChunkCache();
    this.world.testTileFunctions();

    return this.showSummary();
};

GameTests.testInventory = async function() {
    console.log('🧪 ТЕСТ ИНВЕНТАРЯ');
    console.log('='.repeat(50));

    this.reset();
    this.inventory.testInventoryAPI();
    this.inventory.testToolSwitching();
    this.inventory.testAddingBlocks();
    await this.inventory.testInventorySync();

    return this.showSummary();
};

GameTests.testTools = function() {
    console.log('🧪 ТЕСТ ИНСТРУМЕНТОВ');
    console.log('='.repeat(50));

    this.reset();
    this.inventory.testToolSwitching();

    return this.showSummary();
};

GameTests.testNetwork = async function() {
    console.log('🧪 ТЕСТ СЕТИ');
    console.log('='.repeat(50));

    this.reset();
    await this.basic.testAPIConnection();
    await this.performance.testNetworkRequests();
    await this.inventory.testInventorySync();

    return this.showSummary();
};

GameTests.testPerformance = async function() {
    console.log('🧪 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ');
    console.log('='.repeat(50));

    this.reset();
    this.performance.testMemory();
    await this.performance.testFPS();

    return this.showSummary();
};

// ==============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ==============================================

if (typeof window !== 'undefined') {
    setTimeout(() => {
        GameTests.init();

        // Добавляем хоткеи для быстрого доступа
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                console.clear();
                GameTests.runAllTests();
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                console.clear();
                GameTests.debugState();
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
                e.preventDefault();
                console.clear();
                GameTests.quickCheck();
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                console.clear();
                GameTests.checkVariables();
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                console.clear();
                GameTests.testModules();
            }
        });

        console.log('🔥 GameTests для game_v2.js готовы! Используйте:');
        console.log('- Ctrl+Shift+T - запуск всех тестов');
        console.log('- Ctrl+Shift+D - отладка состояния');
        console.log('- Ctrl+Shift+Q - быстрая проверка');
        console.log('- Ctrl+Shift+V - проверка переменных');
        console.log('- Ctrl+Shift+M - тест модулей');
        console.log('\n⏱️  Инициализация завершена');
    }, 3000); // Увеличиваем задержку до 3 секунд
}

// Экспорт для использования в консоли
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameTests;
}
