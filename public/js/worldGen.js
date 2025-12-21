// public/js/worldGen.js

window.WorldGen = (() => {

    const CHUNK_SIZE = 16;

    function rand(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    //Счетчик высоты в каждой клетке
    function heightNoise(x, y) {
        // простая детерминированная "высота"
        return rand(x * 734287 + y * 912931);
    }
    //Биом считаем по высоте
    function getBiome(h) {
        if (h < 0.3) return "ocean";
        if (h < 0.45) return "shore";
        if (h < 0.7) return "plains";
        return "mountains";
    }

    function generateTile(wx, wy) {
        const h = heightNoise(wx, wy);
        const biome = getBiome(h);

        let surface = "grass";

        if (biome === "ocean") surface = "water";
        else if (biome === "shore") surface = "sand";
        else if (biome === "plains") surface = "grass";
        else if (biome === "mountains") surface = "stone";

        return {
            surface,
            biome
        };
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
