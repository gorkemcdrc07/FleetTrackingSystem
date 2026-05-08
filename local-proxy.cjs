const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   POSTGRES CONNECTION
========================= */

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "VERITABANI_ADIN",
    password: "ŞİFREN",
    port: 5432,
});

/* =========================
   KULLANICILARI GETİR
========================= */

app.get("/api/kullanicilar", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                id,
                kullanici,
                ad,
                rol,
                yetki,
                aktif
            FROM kullanicilar
            ORDER BY ad ASC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Kullanıcılar alınamadı:", error);

        res.status(500).json({
            message: "Kullanıcılar alınamadı",
        });
    }
});

/* =========================
   KULLANICI YETKİ GÜNCELLE
========================= */

app.put("/api/kullanicilar/:id/yetki", async (req, res) => {
    try {
        const { id } = req.params;
        const { yetki } = req.body;

        const { rows } = await pool.query(
            `
            UPDATE kullanicilar
            SET
                yetki = $1::jsonb,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                id,
                kullanici,
                ad,
                rol,
                yetki,
                aktif
            `,
            [JSON.stringify(yetki || []), id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Kullanıcı bulunamadı",
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Yetki güncellenemedi:", error);

        res.status(500).json({
            message: "Yetki güncellenemedi",
        });
    }
});

/* =========================
   TMS PROXY
========================= */

app.post("/api/proxy/tmsdespatches", async (req, res) => {
    try {
        console.log("PROXY BODY:", req.body);

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

/* =========================
   SERVER
========================= */

app.listen(process.env.PORT || 4000, () => {
    console.log("Proxy server running on 4000");
});