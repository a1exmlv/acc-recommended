const express = require("express");
const app = express();

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com/"
};

const FETCH_COOLDOWN = 1000;
let lastFetchTime = 0;


// =========================================================
// CACHE POR GRUPO
// =========================================================

const groupCache = new Map();

const CACHE_TTL = 60 * 1000;


// =========================================================
// FETCH SEGURO
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

            console.log("Fetch →", url);

            const response =
                await fetch(
                    url,
                    {
                        headers: HEADERS
                    }
                );


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
                    resolve =>
                        setTimeout(resolve, 3000)
                );

            }

        } catch (error) {

            console.log(
                `Error intento ${i + 1}:`,
                error.message
            );

        }

    }


    return null;
}


// =========================================================
// OBTENER PRODUCTOS DE UNA CATEGORÍA
// =========================================================

async function getCategoryItems(
    groupId,
    category
) {

    const allItems = [];

    let cursor = "";


    for (let page = 0; page < 3; page++) {

        let url =
            "https://catalog.roblox.com/v1/search/items/details"
            + "?Category=" + category
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


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(text);

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


        console.log(
            `Grupo ${groupId} | categoría ${category} | página ${page + 1}:`,
            items.length
        );


        for (const item of items) {

            if (
                item?.itemType === "Asset"
                && item?.id
            ) {

                allItems.push(
                    Number(item.id)
                );

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


        // -------------------------------------------------
        // VALIDAR GROUP ID
        // -------------------------------------------------

        if (
            !groupId
            || !Number.isInteger(groupId)
            || groupId <= 0
        ) {

            return res.status(400).json({
                count: 0,
                items: [],
                error: "groupId inválido"
            });

        }


        // -------------------------------------------------
        // CACHE
        // -------------------------------------------------

        const cached =
            groupCache.get(groupId);


        if (
            cached
            && (Date.now() - cached.time) < CACHE_TTL
            && cached.items.length > 0
        ) {

            console.log(
                "Devolviendo cache del grupo:",
                groupId,
                "|",
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


        // -------------------------------------------------
        // CLOTHING + ACCESSORIES
        // -------------------------------------------------

        const [clothing, accessories] =
            await Promise.all([
                getCategoryItems(
                    groupId,
                    3
                ),
                getCategoryItems(
                    groupId,
                    11
                )
            ]);


        // -------------------------------------------------
        // UNIR Y ELIMINAR DUPLICADOS
        // -------------------------------------------------

        const unique =
            [
                ...new Set([
                    ...clothing,
                    ...accessories
                ])
            ];


        // -------------------------------------------------
        // MEZCLAR ALEATORIAMENTE
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CACHE
        // -------------------------------------------------

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
            "Grupo:",
            groupId
        );

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


        // -------------------------------------------------
        // CACHE VIEJO COMO FALLBACK
        // -------------------------------------------------

        const groupId =
            Number(req.query.groupId);


        const cached =
            groupCache.get(groupId);


        if (
            cached
            && cached.items.length > 0
        ) {

            console.log(
                "Usando cache vieja del grupo:",
                groupId
            );


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
// ESTADO DEL PROXY
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

        } catch (error) {}

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
