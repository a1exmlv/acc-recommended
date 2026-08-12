const express = require("express");
const app = express();

const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
};

const GROUP_ID_DEFAULT = 36024472;

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
        FETCH_COOLDOWN -
        (now - lastFetchTime);

    if (wait > 0) {
        await new Promise(
            resolve => setTimeout(resolve, wait)
        );
    }

    lastFetchTime = Date.now();

    try {

        console.log("Fetch →", url);

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
// OBTENER PRODUCTOS
// =========================================================

async function getItems(
    groupId,
    category
) {

    const url =
        "https://catalog.roblox.com/v1/search/items/details"
        + "?Category=" + category
        + "&CreatorType=2"
        + "&CreatorTargetId=" + groupId
        + "&SortType=3"
        + "&SortAggregation=5"
        + "&Limit=30";


    const response =
        await safeFetch(url);


    if (!response) {
        return [];
    }


    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        console.log(
            "JSON error:",
            error.message
        );

        return [];

    }


    const items =
        Array.isArray(data?.data)
            ? data.data
            : [];


    return items
        .filter(
            item =>
                item &&
                item.itemType === "Asset" &&
                item.id
        )
        .map(
            item => ({
                Id: Number(item.id),
                AssetType: Number(
                    item.assetType || 0
                )
            })
        );

}


// =========================================================
// CATÁLOGO
// =========================================================

app.get("/catalog", async (req, res) => {

    try {

        const groupId =
            Number(
                req.query.groupId
            ) || GROUP_ID_DEFAULT;


        // CACHE

        const cached =
            groupCache.get(groupId);


        if (
            cached &&
            Date.now() - cached.time < CACHE_TTL
        ) {

            console.log(
                "Cache:",
                cached.items.length,
                "items"
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


        // =================================================
        // ROPA
        // =================================================

        const clothing =
            await getItems(
                groupId,
                3
            );


        // =================================================
        // ACCESORIOS
        // =================================================

        const accessories =
            await getItems(
                groupId,
                11
            );


        // =================================================
        // UNIR
        // =================================================

        const map =
            new Map();


        for (const item of [
            ...clothing,
            ...accessories
        ]) {

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


        // =================================================
        // MEZCLAR
        // =================================================

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


        // =================================================
        // CACHE
        // =================================================

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
            "Clothing:",
            clothing.length
        );

        console.log(
            "Accessories:",
            accessories.length
        );

        console.log(
            "Total:",
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
        "Proxy PRO 🚀 | Group Catalog"
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
