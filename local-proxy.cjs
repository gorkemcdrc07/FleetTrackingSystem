const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/proxy/tmsdespatches", async (req, res) => {
    try {
        console.log("LOCAL PROXY BODY:", req.body);

        const response = await fetch("https://filo-backend-57wx.onrender.com/api/proxy/tmsdespatches", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(req.body),
        });

        const text = await response.text();

        console.log("BACKEND STATUS:", response.status);
        console.log("BACKEND RESPONSE:", text);

        res.status(response.status).send(text);
    } catch (err) {
        console.error("LOCAL PROXY ERROR:", err);
        res.status(500).send(err.message);
    }
});

app.listen(4000, () => {
    console.log("Local proxy calisiyor: http://localhost:4000");
});
