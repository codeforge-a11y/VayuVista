require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const BASE_URL = "https://api.openweathermap.org";

// ✅ Ping endpoint to keep server alive
app.get("/ping", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/geo", async (req, res) => {
  const { city } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/geo/1.0/direct`, {
      params: { q: city, limit: 1, appid: process.env.OPEN_KEY }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Geo fetch failed" });
  }
});

app.get("/weather", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/data/2.5/weather`, {
      params: { lat, lon, units: "metric", appid: process.env.OPEN_KEY }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

app.get("/forecast", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/data/2.5/forecast`, {
      params: { lat, lon, units: "metric", appid: process.env.OPEN_KEY }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Forecast fetch failed" });
  }
});

app.get("/uv", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/data/2.5/uvi`, {
      params: { lat, lon, appid: process.env.OPEN_KEY }
    });
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "UV fetch failed" });
  }
});

app.get("/aqi", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`${BASE_URL}/data/2.5/air_pollution`, {
      params: { lat, lon, appid: process.env.OPEN_KEY }
    });
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "AQI fetch failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);

  // ✅ Self-ping every 14 minutes to prevent Render sleep (free tier sleeps after 15 min)
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  setInterval(async () => {
    try {
      await axios.get(`${SELF_URL}/ping`);
      console.log(`[Keep-alive] Pinged ${SELF_URL}/ping at ${new Date().toISOString()}`);
    } catch (err) {
      console.error("[Keep-alive] Ping failed:", err.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
});