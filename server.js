const express = require("express");
const app = express();

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

let globalCursor = "";

// 🔥 Headers que simulan un navegador real para evitar bloqueos
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com/",
};

async function safeFetch(url, retries = 3) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            // 🔍 Log para diagnosticar
            console.log(`Fetch ${url} → status: ${res.status}`);
            if (res.ok) return res;
            // Si es 429 (rate limit), espera antes de reintentar
            if (res.status === 429) {
                console.log("Rate limited, esperando 2s...");
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.log(`Error fetch intento ${i}:`, e.message);
        }
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

        for (let i = 0; i < 5; i++) {
            const sort = sortTypes[Math.floor(Math.random() * sortTypes.length)];
            const url = `https://catalog.roblox.com/v1/search/items/details?Category=${category}&Limit=30&SortType=${sort}&Cursor=${encodeURIComponent(cursor)}`;
            
            const response = await safeFetch(url);
            if (!response) {
                console.log("safeFetch falló, skip...");
                continue;
            }

            const text = await response.text();
            console.log("Raw response:", text.substring(0, 200)); // Solo primeros 200 chars

            let data;
            try {
                data = JSON.parse(text);
            } catch(e) {
                console.log("JSON parse error:", e.message);
                continue;
            }

            const items = Array.isArray(data?.data) ? data.data : [];
            const ids = items
                .filter(item =>
                    item?.itemType === "Asset" &&
                    item?.id &&
                    item?.creatorName !== "Roblox"
                )
                .map(item => item.id);

            console.log(`Página ${i}: ${ids.length} ids encontrados`);
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

        console.log(`Total items devueltos: ${unique.length}`);

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

// Keep-alive
setInterval(async () => {
    try {
        await fetch("https://acc-recommended.onrender.com/catalog");
        console.log("Keep-alive ping OK");
    } catch(e) {
        console.log("Keep-alive falló:", e.message);
    }
}, 14 * 60 * 1000);

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));
