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

    //определение реки

    function riverNoise(x, y) {
        return rand(
            Math.floor(x / 32) * 987654 +
            Math.floor(y / 32) * 456789
        );
    }

    //Условие, что это река
    function isRiver(x, y, biome) {
        if (biome !== "plains" || biome === "mountains") return false;

        const n = riverNoise(x, y);
        return n > 0.45 && n < 0.55;
    }

    //ширина реки

    function isNearRiver(x, y, biome) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (isRiver(x + dx, y + dy, biome)) {
                    return true;
                }
            }
        }
        return false;
    }

    //Сила реки

    function riverStrength(x, y) {
        return Math.abs(riverNoise(x,y) - 0.5);
    }


    //Ширина зависит от силы
    function  riverWidth(x,y) {
        const s = riverStrength(x, y);

        if (s < 0.01) return 3; // широкая река
        if (s > 0.03) return 2; // средняя
        return 1; //ручей
    }

    function isRiverTile(x, y, biome) {
        if (biome === "ocean" || biome === "mountains") return false;

        const width = riverWidth(x, y);

        for (let dy = -width; dy <= width; dy++) {
            for (let dx = -width; dx <= width; dx++) {
                if (isRiver(x + dx, y + dy, biome)) {
                    return true;
                }
            }
        }
        return false;
    }



    function generateTile(x, y) {
        const biome = getBiomeForRegion(x, y);
        const h = heightNoise(x, y);

        let surface;

        // ОКЕАН
        if (biome === "ocean") {
            surface = "water";
        }
        // РЕКА
        else if (isNearRiver(x, y, biome)) {
            surface = "water";
        }
        else if (isRiverTile(x, y, biome)) {
            surface = "water"
        }
        // ГОРЫ
        else if (biome === "mountains") {
            surface = h > 0.55 ? "stone" : "grass";
        }
        // РАВНИНЫ
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
