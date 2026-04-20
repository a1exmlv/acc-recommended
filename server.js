const express = require("express");

const app = express();

app.get("/catalog", async (req, res) => {
	try {
		const url = "https://catalog.roblox.com/v1/search/items/details?Category=11&Limit=10"

		const response = await fetch(url);
		const data = await response.json();

		const ids = data.data.map(item => item.id);

		res.json(ids);

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Error al obtener datos" });
	}
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));