let map = null;
let marker = null;
let tempChart = null;
let precipChart = null;

// 🔁 Change this after backend deployment
const BASE_URL = "https://vayuvista.onrender.com/";
// Example after deploy:
// const BASE_URL = "https://your-backend-name.onrender.com";

async function searchWeather() {
  const city = document.getElementById("cityInput").value;
  if (!city) return;

  const geo = await fetch(`${BASE_URL}/geo?city=${city}`)
    .then(r => r.json());

  if (!geo.length) return alert("City not found");

  loadWeather(geo[0].lat, geo[0].lon, geo[0].name);
}

function detectLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    loadWeather(
      pos.coords.latitude,
      pos.coords.longitude,
      "Your Location"
    );
  });
}

async function loadWeather(lat, lon, name) {

  const weather = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}`
  ).then(r => r.json());

  document.getElementById("locationName").innerText = name;
  document.getElementById("temp").innerText =
    Math.round(weather.main.temp) + "°C";

  document.getElementById("feelsLike").innerText =
    "Feels like " + Math.round(weather.main.feels_like) + "°C";

  document.getElementById("humidity").innerText =
    weather.main.humidity + "%";

  document.getElementById("wind").innerText =
    weather.wind.speed + " m/s";

  document.getElementById("pressure").innerText =
    weather.main.pressure + " hPa";

  document.getElementById("visibility").innerText =
    (weather.visibility / 1000).toFixed(1) + " km";

  document.getElementById("weatherIcon").innerText =
    getWeatherEmoji(weather.weather[0].main);

  loadRain(weather);
  loadForecast(lat, lon);
  loadUV(lat, lon);
  loadAQI(lat, lon);
  loadMap(lat, lon);
}

function loadRain(weatherData) {

  let rainValue = "0%";

  if (weatherData.rain && weatherData.rain["1h"]) {
    rainValue = weatherData.rain["1h"] + " mm";
  }

  const rainEl = document.getElementById("rain");
  if (rainEl) rainEl.innerText = rainValue;
}

async function loadForecast(lat, lon) {

  const data = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}`
  ).then(r => r.json());

  const next12 = data.list.slice(0, 8);
  const container12 = document.getElementById("forecast12h");
  container12.innerHTML = "";

  function formatTime(timestamp) {
    const dateObj = new Date(timestamp * 1000);
    let hour = dateObj.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return hour + ":00 " + ampm;
  }

  next12.forEach(item => {

    const formattedHour = formatTime(item.dt);
    const temp = Math.round(item.main.temp);
    const icon = getWeatherEmoji(item.weather[0].main);

    let rainPercent = "0%";
    if (typeof item.pop === "number") {
      rainPercent = Math.round(item.pop * 100) + "%";
    }

    container12.innerHTML += `
      <div class="forecast-card">
        <p>${formattedHour}</p>
        <div>${icon}</div>
        <h3>${temp}°C</h3>
        <small>☔ ${rainPercent}</small>
      </div>
    `;
  });

  const labels = next12.map(i => formatTime(i.dt));
  const temps = next12.map(i => Math.round(i.main.temp));

  if (tempChart) tempChart.destroy();

  tempChart = new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: temps,
        tension: 0.4
      }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });

  const rainValues = next12.map(i =>
    Math.round((i.pop || 0) * 100)
  );

  if (precipChart) precipChart.destroy();

  precipChart = new Chart(
    document.getElementById("precipChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Rain Probability (%)",
          data: rainValues,
          backgroundColor: "rgba(37, 99, 235, 0.7)",
          borderColor: "#2563eb",
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 18
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: value => value + "%"
            }
          }
        }
      }
    }
  );

  const days = {};

  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];

    if (!days[date]) {
      days[date] = {
        temps: [],
        icon: item.weather[0].main
      };
    }

    days[date].temps.push(item.main.temp);
  });

  const container7 = document.getElementById("forecast7d");
  container7.innerHTML = "";

  Object.keys(days).slice(0, 7).forEach(date => {

    const avg = Math.round(
      days[date].temps.reduce((a,b)=>a+b) /
      days[date].temps.length
    );

    const icon = getWeatherEmoji(days[date].icon);

    container7.innerHTML += `
      <div class="forecast-card">
        <p>${date}</p>
        <div>${icon}</div>
        <h3>${avg}°C</h3>
      </div>
    `;
  });
}

async function loadUV(lat, lon){
  const data = await fetch(
    `${BASE_URL}/uv?lat=${lat}&lon=${lon}`
  ).then(r=>r.json()).catch(()=>null);

  document.getElementById("uv").innerText =
    data?.value ?? "--";
}

async function loadAQI(lat, lon){
  const data = await fetch(
    `${BASE_URL}/aqi?lat=${lat}&lon=${lon}`
  ).then(r=>r.json()).catch(()=>null);

  if(!data?.list) return;

  const aqi = data.list[0].main.aqi;
  document.getElementById("aqiValue").innerText = aqi;

  const labels = ["Good","Fair","Moderate","Poor","Very Poor"];
  document.getElementById("aqiText").innerText = labels[aqi-1];

  const circle = document.querySelector(".progress-ring");
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const percent = aqi / 5;
  const offset = circumference - (percent * circumference);

  circle.style.strokeDashoffset = offset;

  const colors = ["#2ecc71","#f1c40f","#e67e22","#e74c3c","#8e44ad"];
  circle.style.stroke = colors[aqi-1];
}

async function loadMap(lat, lon) {
  if (!window.L) return;

  if (!map) {
    map = L.map("map").setView([lat, lon], 10);
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution: "© OpenStreetMap contributors"
      }
    ).addTo(map);
  } else {
    map.setView([lat, lon], 10);
  }

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
}

function getWeatherEmoji(condition){
  const icons={
    Clear:"☀️",
    Clouds:"☁️",
    Rain:"🌧️",
    Snow:"❄️",
    Thunderstorm:"⛈️"
  };
  return icons[condition]||"🌤️";
}

function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById("currentTime").textContent = timeString;
}

setInterval(updateTime, 1000);
updateTime();
