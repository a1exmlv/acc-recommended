const express = require("express");
const app = express();

const CATEGORY_MAP = {
    Hat: 8, Hair: 41, Face: 18, Back: 27,
    Waist: 28, Shoulder: 29, Front: 30, Neck: 31
};

let globalCursor = "";
let lastFetchTime = 0;
const FETCH_COOLDOWN = 1000; // 1 segundo entre peticiones

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com/",
};

async function safeFetch(url, retries = 3) {
    // Respetar cooldown entre peticiones
    const now = Date.now();
    const wait = FETCH_COOLDOWN - (now - lastFetchTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastFetchTime = Date.now();

    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            console.log(`Fetch → status: ${res.status}`);
            if (res.ok) return res;
            if (res.status === 429) {
                console.log("Rate limit, esperando 3s...");
                await new Promise(r => setTimeout(r, 3000));
            }
        } catch (e) {
            console.log(`Error intento ${i}:`, e.message);
        }
    }
    return null;
}

// Cache para no llamar la API en cada click
let cachedItems = [];
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minuto de cache

app.get("/catalog", async (req, res) => {
    try {
        // Si hay cache reciente, devuélvela directamente
        if (cachedItems.length > 0 && (Date.now() - cacheTime) < CACHE_TTL) {
            console.log("Devolviendo cache:", cachedItems.length, "items");
            return res.json({ count: cachedItems.length, items: cachedItems });
        }

        const type = req.query.type;
        const category = CATEGORY_MAP[type] || 11;
        const sortTypes = [1, 2, 3, 5];
        let allIds = [];
        let cursor = globalCursor || "";

        for (let i = 0; i < 3; i++) { // Reducido a 3 páginas para evitar rate limit
            const sort = sortTypes[Math.floor(Math.random() * sortTypes.length)];
            const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&Limit=30&SortType=${sort}&Cursor=${encodeURIComponent(cursor)}`;

            const response = await safeFetch(url);
            if (!response) continue;

            const text = await response.text();
            console.log("Raw:", text.substring(0, 150));

            let data;
            try { data = JSON.parse(text); }
            catch(e) { console.log("JSON error:", e.message); continue; }

            const items = Array.isArray(data?.data) ? data.data : [];
            const ids = items
                .filter(item => item?.itemType === "Asset" && item?.id && item?.creatorName !== "Roblox")
                .map(item => item.id);

            console.log(`Página ${i}: ${ids.length} ids`);
            allIds.push(...ids);

            if (data?.nextPageCursor) {
                cursor = data.nextPageCursor;
                globalCursor = cursor;
            }
        }

        const unique = [...new Set(allIds)];
        for (let i = unique.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [unique[i], unique[j]] = [unique[j], unique[i]];
        }

        // Guardar en cache
        if (unique.length > 0) {
            cachedItems = unique;
            cacheTime = Date.now();
        }

        console.log("Total devueltos:", unique.length);
        res.json({ count: unique.length, items: unique });

    } catch (err) {
        console.error("Error proxy:", err);
        // Si hay cache aunque sea vieja, úsala como fallback
        if (cachedItems.length > 0) {
            console.log("Usando cache como fallback");
            return res.json({ count: cachedItems.length, items: cachedItems });
        }
        res.json({ count: 0, items: [] });
    }
});

app.get("/", (req, res) => res.send("Proxy PRO 🚀"));

setInterval(async () => {
    try {
        await fetch("https://acc-recommended.onrender.com/");
        console.log("Keep-alive OK");
    } catch(e) {}
}, 14 * 60 * 1000);

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));
