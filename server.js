const express = require("express");

const app = express();

app.get("/catalog", async (req, res) => {
    try {

        // 🔥 diferentes tipos de orden para variar resultados
        const sortTypes = [1, 2, 3, 5];
        const randomSort = sortTypes[Math.floor(Math.random() * sortTypes.length)];

        // 🔥 endpoint del catálogo
        const url = `https://catalog.roblox.com/v1/search/items/details?Category=11&Limit=60&SortType=${randomSort}`;

        const response = await fetch(url);
        const data = await response.json();

        // 🔥 filtrar accesorios reales y evitar solo Roblox oficial
        const ids = data.data
            .filter(item =>
                item.itemType === "Asset" &&
                item.creatorName !== "Roblox"
            )
            .map(item => item.id);

        // 🔥 shuffle (mezcla real)
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        res.json(ids);

    } catch (err) {
        console.error("Error en proxy:", err);
        res.status(500).json({ error: "Error al obtener catálogo" });
    }
});

// 🔥 ruta base opcional para probar
app.get("/", (req, res) => {
    res.send("Proxy funcionando 🚀");
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));
