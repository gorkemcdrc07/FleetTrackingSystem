const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/proxy/tmsdespatches", async (req, res) => {
    try {
        console.log("PROXY BODY:", req.body);

        // BURAYA GERÇEK TMS API URL'İNİ YAZ
        const response = await fetch("GERCEK_TMS_URL", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(req.body),
        });

        const text = await response.text();

        console.log("TMS STATUS:", response.status);

        res.status(response.status).send(text);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message,
        });
    }
});

app.listen(process.env.PORT || 4000, () => {
    console.log("Proxy server running");
});