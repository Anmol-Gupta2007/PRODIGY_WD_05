const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const weatherInfo = document.getElementById('weather-info');
const messageBox = document.getElementById('message-box');
const bgAnimation = document.getElementById('bg-animation');

// --- Helper Functions ---
function showMessage(msg) {
    weatherInfo.style.display = 'none';
    messageBox.style.display = 'block';
    messageBox.textContent = msg;
}

// Convert WMO codes to descriptions and background types
function parseWeather(code) {
    if (code === 0) return { desc: 'Sunny / Clear', type: 'sunny' };
    if (code === 1 || code === 2) return { desc: 'Partly Cloudy', type: 'partly' };
    if (code === 3) return { desc: 'Overcast', type: 'cloudy' };
    if ([45, 48].includes(code)) return { desc: 'Fog', type: 'cloudy' };
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: 'Rainy', type: 'rainy' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: 'Snow', type: 'cloudy' }; // Simplified snow to cloudy bg
    if ([95, 96, 99].includes(code)) return { desc: 'Thunderstorm', type: 'rainy' };
    return { desc: 'Unknown', type: 'default' };
}

// Set dynamic background elements based on weather type
function setBackground(type) {
    bgAnimation.innerHTML = ''; // Clear previous animations
    bgAnimation.className = `bg-${type}`;

    if (type === 'sunny' || type === 'partly') {
        const sun = document.createElement('div');
        sun.className = 'sun';
        bgAnimation.appendChild(sun);
    }
    
    if (type === 'cloudy' || type === 'partly' || type === 'rainy') {
        const cloud1 = document.createElement('div');
        cloud1.className = 'cloud cloud1';
        const cloud2 = document.createElement('div');
        cloud2.className = 'cloud cloud2';
        bgAnimation.appendChild(cloud1);
        bgAnimation.appendChild(cloud2);
    }

    if (type === 'rainy') {
        const rain = document.createElement('div');
        rain.className = 'rain';
        // Create 50 raindrops
        for (let i = 0; i < 50; i++) {
            const drop = document.createElement('div');
            drop.className = 'drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            rain.appendChild(drop);
        }
        bgAnimation.appendChild(rain);
    }
}

// --- Main API Logic ---
async function fetchWeather(lat, lon, locationName) {
    try {
        showMessage('Fetching weather data...');
        
        // 1. Fetch Weather Data (Temp, Humidity, Pressure, Wind)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m&hourly=visibility,uv_index&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        // 2. Fetch Air Quality Data (AQI)
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`;
        const aqiRes = await fetch(aqiUrl);
        const aqiData = await aqiRes.json();

        // Parse Data
        const current = weatherData.current;
        const condition = parseWeather(current.weather_code);
        
        // Visibility and UV are hourly arrays, grab the first one as "current" approximation
        const visibilityKm = (weatherData.hourly.visibility[0] / 1000).toFixed(1); 
        const uvIndex = weatherData.hourly.uv_index[0];
        const aqi = aqiData.current.european_aqi;

        // Update DOM
        messageBox.style.display = 'none';
        weatherInfo.style.display = 'block';

        document.getElementById('city-name').textContent = locationName;
        document.getElementById('temp').textContent = Math.round(current.temperature_2m);
        document.getElementById('weather-desc').textContent = condition.desc;
        
        document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('wind-speed').textContent = `${current.wind_speed_10m} km/h`;
        document.getElementById('pressure').textContent = `${current.surface_pressure} hPa`;
        document.getElementById('uv-index').textContent = uvIndex;
        document.getElementById('visibility').textContent = `${visibilityKm} km`;
        document.getElementById('aqi').textContent = aqi;

        // Trigger Animations
        setBackground(condition.type);

    } catch (error) {
        showMessage('Error fetching data. Please try again.');
        console.error(error);
    }
}

// Get coordinates from city name
async function searchCity(city) {
    try {
        showMessage('Searching for city...');
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        fetchWeather(latitude, longitude, `${name}, ${country}`);
    } catch (error) {
        showMessage('City not found.');
    }
}

// --- Event Listeners ---
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) searchCity(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) searchCity(city);
    }
});

// Geolocation Feature
locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showMessage('Detecting location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchWeather(lat, lon, "Your Location");
            },
            (error) => {
                showMessage('Location access denied or unavailable.');
            }
        );
    } else {
        showMessage('Geolocation is not supported by this browser.');
    }
});

// Initialize with a default background
setBackground('default');
