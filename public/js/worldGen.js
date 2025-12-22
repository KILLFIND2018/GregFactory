// public/js/worldGen.js

window.WorldGen = (() => {

    const CHUNK_SIZE = 16;

    function rand(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    //Картина мира

    //Континенты создают регионы по 256 клеток

    function continentNoise(x, y) {
        return rand(
            Math.floor(x / 256) * 918273 +
            Math.floor(y / 256) * 123123
        );
    }

    //Регионы формируют уже равнины, холмы и плато

    function regionNoise(x, y) {
        return rand(
            Math.floor(x / 64) * 456456 +
            Math.floor(y / 64) * 789789
        );

    }

    //Мелкие неровности без влияния на биомы
    function detailNoise(x, y) {
        return rand(x * 912931 + y * 734287);
    }

    //Собираем все вместе как конструктор
    //Счетчик высоты в каждой клетке
    function heightNoise(x, y) {
        const c = continentNoise(x, y) * 0.6;
        const r = regionNoise(x, y) * 0.3;
        const d = detailNoise(x, y) * 0.1;

        return c + r + d;
    }

    //Создаем биом-якорь

    function biomeBase(x, y) {
        return rand(
            Math.floor(x / 256) * 111111 +
            Math.floor(y / 256) * 222222
        );
    }
    //размытие границ

    function biomeVariation(x, y) {
        return rand(
            Math.floor(x / 64) * 333333 +
            Math.floor(y / 64) * 444444
        );
    }

    //


    function getBiomeValue(x, y) {
        const base = biomeBase(x, y) * 0.7;
        const variation = biomeVariation(x, y) * 0.3;
        return base + variation;
    }


    //Определение биома в регионе

    function getBiomeForRegion(x, y) {
        const v = getBiomeValue(x, y);

        if (v < 0.28) return "ocean";
        if (v < 0.5)  return "plains";
        if (v < 0.72) return "mountains";
        return "plains";
    }

    //определение реки РЕКА / RIVER

    //кешируем реку при проверке истока
    const riverCache = new Map();

    function riverKey(x, y) {
        return `${x},${y}`;
    }

    function isRiverTile(x, y, biome, height) {
        const key = riverKey(x, y);
        if (riverCache.has(key)) return riverCache.get(key);

        let result = false;

        if (biome !== "ocean") {
            const width = 1; // пока фикс
            for (let dy = -width; dy <= width; dy++) {
                for (let dx = -width; dx <= width; dx++) {
                    if (isRiverCore(x + dx, y + dy, biome, height)) {
                        result = true;
                        break;
                    }
                }
            }
        }

        riverCache.set(key, result);
        return result;
    }




    //Исток реки, старт в горках
    function riverSourceNoise(x, y) {
        return rand(
            Math.floor(x / 64) * 999001 +
            Math.floor(y / 64) * 777013
        );
    }
    //начало реки
    function isRiverSource(x, y, biome, height) {
        if (biome !== "mountains") return false;
        return height > 0.6 && riverSourceNoise(x, y) > 0.92;
    }

    //центр русла
    function isRiverCore(x, y, biome, height) {
        if (biome === "ocean") return false;

        // исток
        if (isRiverSource(x, y, biome, height)) return true;

        // только узкая линия потока
        const dir = flowDir(x, y);
        const px = Math.floor(x - dir.dx);
        const py = Math.floor(y - dir.dy);

        return isRiverSource(px, py, getBiomeForRegion(px, py), heightNoise(px, py));
    }


    //Берега для океанов, рек и озер

    function isNearWater(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                const nx = x + dx;
                const ny = y + dy;

                const biome = getBiomeForRegion(nx, ny);
                const h = heightNoise(nx, ny);

                // океан
                if (biome === "ocean") return true;

                // река
                if (isRiverTile(nx, ny, biome, h)) return true;
            }
        }
        return false;
    }

    //направление потока реки
    function flowDir(x, y) {
        const a = rand(x * 9187 + y * 19237) * Math.PI * 2;
        return {
            dx: Math.cos(a),
            dy: Math.sin(a)
        };
    }



    //Озеро

    function lakeNoise(x, y) {
        return rand(
            Math.floor(x / 32) * 555555 +
            Math.floor(y / 32) * 999999
        );
    }

    function isNearOcean(x, y) {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (getBiomeForRegion(x + dx, y + dy) === "ocean") {
                    return true;
                }
            }
        }
        return false;
    }

    function isLake(x, y, biome, height) {
        if (biome !== "plains") return false;
        if (height > 0.5) return false;
        if (isNearOcean(x, y)) return false;

        return lakeNoise(x, y) > 0.97;
    }







    function generateTile(x, y) {
        const biome = getBiomeForRegion(x, y);
        const h = heightNoise(x, y);

        let surface;

        if (biome === "ocean") {
            surface = "water";
        }
        else if (isRiverTile(x, y, biome, h)) {
            surface = "water";
        }
        else if (isLake(x, y, biome, h)) {
            surface = "water";
        }
        else if (isNearWater(x, y)) {
            surface = "sand";
        }
        else if (biome === "mountains") {
            surface = h > 0.55 ? "stone" : "grass";
        }
        else {
            surface = h < 0.33 ? "sand" : "grass";
        }

        return { surface, biome };
    }








    //Генерация чанка
    function generateChunk(cx, cy) {
        const chunk = [];

        for (let y = 0; y < CHUNK_SIZE; y++) {
            const row = [];
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const wx = cx * CHUNK_SIZE + x;
                const wy = cy * CHUNK_SIZE + y;

                row.push(generateTile(wx, wy));
            }
            chunk.push(row);
        }

        return chunk;
    }

    return {
        CHUNK_SIZE,
        generateChunk
    };

})();
