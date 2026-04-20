const express = require("express");

const app = express();

// 🔥 categorías Roblox
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

// 🧠 estado global de cursor (simula paginación real)
let globalCursor = "";

// 🔁 fetch con retry
async function safeFetch(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return res;
        } catch (e) {}
    }
    return null;
}

app.get("/catalog", async (req, res) => {
    try {

        const type = req.query.type;
        const category = CATEGORY_MAP[type] || 11;

        const sortTypes = [1, 2, 3, 5];

        let allIds = [];
        let cursor = globalCursor || "";

        // 🔥 hacemos más páginas pero controladas
        for (let i = 0; i < 5; i++) {

            const sort = sortTypes[Math.floor(Math.random() * sortTypes.length)];

            const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&Limit=30&SortType=${sort}&Cursor=${encodeURIComponent(cursor)}`;

            const response = await safeFetch(url);

            if (!response) continue;

            const data = await response.json().catch(() => null);

            const items = Array.isArray(data?.data) ? data.data : [];

            const ids = items
                .filter(item =>
                    item?.itemType === "Asset" &&
                    item?.id &&
                    item?.creatorName !== "Roblox"
                )
                .map(item => item.id);

            allIds.push(...ids);

            // 🔥 actualizar cursor real si existe
            if (data?.nextPageCursor) {
                cursor = data.nextPageCursor;
                globalCursor = cursor;
            }
        }

        // 🔥 eliminar duplicados rápido (Set)
        const unique = [...new Set(allIds)];

        // 🔀 shuffle mejorado (Fisher-Yates)
        for (let i = unique.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [unique[i], unique[j]] = [unique[j], unique[i]];
        }

        res.json({
            count: unique.length,
            cursorUsed: globalCursor,
            items: unique
        });

    } catch (err) {
        console.error("Error proxy:", err);
        res.json({ count: 0, items: [] });
    }
});

app.get("/", (req, res) => {
    res.send("Proxy infinito PRO 🚀");
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));
