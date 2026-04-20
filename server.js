const express = require("express");

const app = express();

app.get("/catalog", async (req, res) => {
    try {

        // 🔥 cambia resultados cada vez
        const sorts = [3, 5, 1];
        const randomSort = sorts[Math.floor(Math.random() * sorts.length)];

      const url = `https://catalog.roblox.com/v1/search/items/details?Category=11&Limit=60&SortType=${Math.floor(Math.random()*5)}`

        const response = await fetch(url);
        const data = await response.json();

        const ids = data.data
            .filter(item =>
                item.itemType === "Asset" &&
                item.creatorName !== "Roblox"
            )
            .map(item => item.id);

        res.json(ids);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error" });
    }
});

app.listen(3000, () => console.log("Servidor activo"));

