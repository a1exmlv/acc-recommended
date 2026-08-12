const express = require("express");
const app = express();

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com/"
};

const FETCH_COOLDOWN = 1000;
let lastFetchTime = 0;

const groupCache = new Map();
const CACHE_TTL = 60 * 1000;


// =========================================================
// FETCH
// =========================================================

async function safeFetch(url, retries = 3) {

    for (let i = 0; i <= retries; i++) {

        const now = Date.now();

        const wait =
            FETCH_COOLDOWN -
            (now - lastFetchTime);

        if (wait > 0) {
            await new Promise(
                resolve => setTimeout(resolve, wait)
            );
        }

        lastFetchTime = Date.now();

        try {

            const response =
                await fetch(url, {
                    headers: HEADERS
                });

            console.log(
                "Fetch → status:",
                response.status
            );

            if (response.ok) {
                return response;
            }

            if (response.status === 429) {

                console.log(
                    "Rate limit, esperando 3s..."
                );

                await new Promise(
                    resolve => setTimeout(resolve, 3000)
                );

            }

        } catch (error) {

            console.log(
                "Error intento:",
                error.message
            );

        }

    }

    return null;
}


// =========================================================
// OBTENER CATEGORÍA
// =========================================================

async function getCategoryItems(
    groupId,
    category
) {

    const allItems = [];

    let cursor = "";


    for (let page = 0; page < 5; page++) {

        let url =
            "https://catalog.roblox.com/v1/search/items/details"
            + "?Category=" + category
            + "&CreatorType=2"
            + "&CreatorTargetId=" + groupId
            + "&SortType=3"
            + "&SortAggregation=5"
            + "&Limit=120";


        if (cursor) {

            url +=
                "&Cursor=" +
                encodeURIComponent(cursor);

        }


        const response =
            await safeFetch(url);


        if (!response) {
            break;
        }


        const text =
            await response.text();


        let data;

        try {

            data = JSON.parse(text);

        } catch (error) {

            console.log(
                "JSON error:",
                error.message
            );

            break;
        }


        const items =
            Array.isArray(data?.data)
                ? data.data
                : [];


        for (const item of items) {

            if (
                item?.itemType === "Asset"
                && item?.id
            ) {

                allItems.push({
                    Id: Number(item.id),
                    AssetType: Number(item.assetType || 0)
                });

            }

        }


        cursor =
            data?.nextPageCursor || "";


        if (!cursor) {
            break;
        }

    }


    return allItems;
}


// =========================================================
// CATÁLOGO DEL GRUPO
// =========================================================

app.get("/catalog", async (req, res) => {

    try {

        const groupId =
            Number(req.query.groupId);


        if (
            !groupId ||
            !Number.isInteger(groupId) ||
            groupId <= 0
        ) {

            return res.status(400).json({
                count: 0,
                items: [],
                error: "groupId inválido"
            });

        }


        // CACHE

        const cached =
            groupCache.get(groupId);


        if (
            cached &&
            Date.now() - cached.time < CACHE_TTL &&
            cached.items.length > 0
        ) {

            console.log(
                "Cache:",
                groupId,
                cached.items.length
            );

            return res.json({
                count: cached.items.length,
                items: cached.items
            });

        }


        console.log(
            "Buscando productos del grupo:",
            groupId
        );


        // Clothing + Accessories

        const [clothing, accessories] =
            await Promise.all([
                getCategoryItems(groupId, 3),
                getCategoryItems(groupId, 11)
            ]);


        const uniqueMap = new Map();


        for (const item of [
            ...clothing,
            ...accessories
        ]) {

            if (!uniqueMap.has(item.Id)) {

                uniqueMap.set(
                    item.Id,
                    item
                );

            }

        }


        const unique =
            Array.from(
                uniqueMap.values()
            );


        // MEZCLAR

        for (
            let i = unique.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                unique[i],
                unique[j]
            ] =
            [
                unique[j],
                unique[i]
            ];

        }


        // CACHE

        if (unique.length > 0) {

            groupCache.set(
                groupId,
                {
                    items: unique,
                    time: Date.now()
                }
            );

        }


        console.log(
            "Clothing:",
            clothing.length
        );

        console.log(
            "Accessories:",
            accessories.length
        );

        console.log(
            "Total:",
            unique.length
        );


        return res.json({
            count: unique.length,
            items: unique
        });


    } catch (error) {

        console.error(
            "Error proxy:",
            error
        );


        const groupId =
            Number(req.query.groupId);


        const cached =
            groupCache.get(groupId);


        if (
            cached &&
            cached.items.length > 0
        ) {

            return res.json({
                count: cached.items.length,
                items: cached.items
            });

        }


        return res.status(500).json({
            count: 0,
            items: [],
            error: "Error obteniendo catálogo"
        });

    }

});


// =========================================================
// HOME
// =========================================================

app.get("/", (req, res) => {

    res.send(
        "Proxy PRO 🚀 | Group Outfit Generator"
    );

});


// =========================================================
// KEEP ALIVE
// =========================================================

setInterval(
    async () => {

        try {

            await fetch(
                "https://acc-recommended.onrender.com/"
            );

            console.log(
                "Keep-alive OK"
            );

        } catch (e) {}

    },
    14 * 60 * 1000
);


// =========================================================
// SERVIDOR
// =========================================================

app.listen(
    3000,
    () => {

        console.log(
            "Servidor activo en puerto 3000"
        );

    }
);
