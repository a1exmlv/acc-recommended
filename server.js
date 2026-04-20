const express = require("express");

const app = express();

// 🔥 mapa de tipos (puedes ampliarlo)
const CATEGORY_MAP = {
    Hat: 8,
    Hair: 41,
    Face: 18,
    Back: 27,
    Waist: 28,
    Shoulder: 29,
    Front: 30,
    Neck: 31
};

app.get("/catalog", async (req, res) => {
    try {

        // 🔹 tipo opcional (?type=Hair)
        const type = req.query.type;
        const category = CATEGORY_MAP[type] || 11; // 11 = accesorios generales

        // 🔹 tipos de orden
        const sortTypes = [1, 2, 3, 5];

        // 🔹 cursores (simulan páginas)
        const cursors = [
            "",
            "eyJzdGFydEluZGV4IjoxNX0=",
            "eyJzdGFydEluZGV4IjozMH0=",
            "eyJzdGFydEluZGV4Ijo0NX0=",
            "eyJzdGFydEluZGV4Ijo2MH0=",
            "eyJzdGFydEluZGV4Ijo3NX0="
        ];

        let allIds = [];

        // 🔥 recorrer varias páginas
        for (let i = 0; i < 3; i++) {

            const randomSort = sortTypes[Math.floor(Math.random() * sortTypes.length)];
            const randomCursor = cursors[Math.floor(Math.random() * cursors.length)];

            const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&Limit=30&SortType=${randomSort}&Cursor=${randomCursor}`;

            const response = await fetch(url);

            if (!response.ok) continue;

            const data = await response.json();

            if (!data || !data.data) continue;

            const ids = data.data
                .filter(item =>
                    item &&
                    item.itemType === "Asset" &&
                    item.id &&
                    item.creatorName !== "Roblox"
                )
                .map(item => item.id);

            allIds.push(...ids);
        }

        // 🔥 eliminar duplicados
        allIds = [...new Set(allIds)];

        // 🔀 mezclar
        for (let i = allIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
        }

        res.json(allIds);

    } catch (err) {
        console.error("Error proxy:", err);
        res.json([]);
    }
});

app.get("/", (req, res) => {
    res.send("Proxy infinito funcionando 🚀");
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));
