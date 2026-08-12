const express = require("express");
const app = express();

const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
};

const DEFAULT_GROUP_ID = 36024472;

let lastFetchTime = 0;
const FETCH_COOLDOWN = 1200;

const groupCache = new Map();
const CACHE_TTL = 60 * 1000;


// =========================================================
// FETCH
// =========================================================

async function safeFetch(url) {

    const now = Date.now();

    const wait =
        FETCH_COOLDOWN - (now - lastFetchTime);

    if (wait > 0) {
        await new Promise(
            resolve => setTimeout(resolve, wait)
        );
    }

    lastFetchTime = Date.now();

    try {

        const response = await fetch(url, {
            headers: HEADERS
        });

        console.log(
            "Fetch → status:",
            response.status
        );

        if (response.ok) {
            return response;
        }

        return null;

    } catch (error) {

        console.log(
            "Fetch error:",
            error.message
        );

        return null;
    }
}


// =========================================================
// OBTENER ACCESORIOS DEL GRUPO
// =========================================================

async function getAccessories(groupId) {

    const allItems = [];
    let cursor = "";

    for (let page = 0; page < 5; page++) {

        let url =
            "https://catalog.roblox.com/v1/search/items/details"
            + "?Category=11"
            + "&CreatorType=2"
            + "&CreatorTargetId=" + groupId
            + "&SortType=3"
            + "&SortAggregation=5"
            + "&Limit=30";

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

        let data;

        try {

            data = await response.json();

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
                item &&
                item.itemType === "Asset" &&
                item.id
            ) {

                allItems.push({
                    Id: Number(item.id),
                    AssetType: Number(
                        item.assetType || 0
                    )
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
// CATÁLOGO
// =========================================================

app.get("/catalog", async (req, res) => {

    try {

        const groupId =
            Number(req.query.groupId) ||
            DEFAULT_GROUP_ID;

        const cached =
            groupCache.get(groupId);

        if (
            cached &&
            Date.now() - cached.time < CACHE_TTL
        ) {

            console.log(
                "Cache:",
                cached.items.length,
                "accesorios"
            );

            return res.json({
                count: cached.items.length,
                items: cached.items
            });
        }


        console.log(
            "Buscando accesorios del grupo:",
            groupId
        );


        const accessories =
            await getAccessories(groupId);


        // Eliminar duplicados

        const map = new Map();

        for (const item of accessories) {

            if (!map.has(item.Id)) {

                map.set(
                    item.Id,
                    item
                );

            }
        }


        const items =
            Array.from(
                map.values()
            );


        // Mezclar aleatoriamente

        for (
            let i = items.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                items[i],
                items[j]
            ] =
            [
                items[j],
                items[i]
            ];
        }


        if (items.length > 0) {

            groupCache.set(
                groupId,
                {
                    items: items,
                    time: Date.now()
                }
            );
        }


        console.log(
            "Accesorios encontrados:",
            items.length
        );


        return res.json({
            count: items.length,
            items: items
        });


    } catch (error) {

        console.error(
            "Proxy error:",
            error
        );

        return res.status(500).json({
            count: 0,
            items: [],
            error: error.message
        });
    }
});


// =========================================================
// HOME
// =========================================================

app.get("/", (req, res) => {

    res.send(
        "Proxy PRO 🚀 | Group Accessories"
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
// SERVER
// =========================================================

app.listen(
    3000,
    () => {

        console.log(
            "Servidor activo en puerto 3000"
        );

    }
);
