// public/js/worldGen.js

window.WorldGen = (() => {

    const CHUNK_SIZE = 16;

    function rand(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function generateTile(wx, wy) {
        // базовые слои
        let surface = "grass";
        let soil = "dirt";
        let fluid = null;

        // простая "высота"
        const h = rand(wx * 928371 + wy * 12377);

        if (h < 0.2) {
            surface = "sand";
            soil = "sand";
            fluid = { type: "water" };
        }

        if (h > 0.8) {
            surface = "stone";
            soil = "stone";
        }

        // логические слои (пока не рендерим)
        let oreVein = null;
        if (rand(wx * 9999 + wy * 7777) > 0.97) {
            oreVein = {
                type: "iron_vein",
                blocksLeft: 4
            };
        }

        return {
            surface,
            soil,
            fluid,
            structure: null,

            // логика
            oreVein,
            bedrock: true
        };
    }

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
