const cityInput = document.getElementById('city-input');
const dataList = document.getElementById('city-suggestions');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const weatherInfo = document.getElementById('weather-info');
const messageBox = document.getElementById('message-box');
const bgAnimation = document.getElementById('bg-animation');

let debounceTimer;

// Real-time Searchable Dropdown Logic
cityInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        debounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
    } else {
        dataList.innerHTML = '';
    }
});

async function fetchCitySuggestions(query) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        
        dataList.innerHTML = '';
        
        if (data.results) {
            data.results.forEach(city => {
                const adminInfo = city.admin1 ? `${city.admin1}, ` : '';
                const fullName = `${city.name}, ${adminInfo}${city.country}`;
                
                const option = document.createElement('option');
                option.value = fullName;
                option.dataset.lat = city.latitude;
                option.dataset.lon = city.longitude;
                option.dataset.name = fullName;
                dataList.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching city suggestions:", error);
    }
}

// UI Helpers
function showMessage(msg) {
    weatherInfo.style.display = 'none';
    messageBox.style.display = 'block';
    messageBox.textContent = msg;
}

function parseWeather(code) {
    if (code === 0) return { desc: 'Sunny / Clear', type: 'sunny' };
    if (code === 1 || code === 2) return { desc: 'Partly Cloudy', type: 'partly' };
    if (code === 3) return { desc: 'Overcast', type: 'cloudy' };
    if ([45, 48].includes(code)) return { desc: 'Fog', type: 'cloudy' };
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: 'Rainy', type: 'rainy' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: 'Snow', type: 'cloudy' };
    if ([95, 96, 99].includes(code)) return { desc: 'Thunderstorm', type: 'rainy' };
    return { desc: 'Unknown', type: 'default' };
}

function setBackground(type) {
    bgAnimation.innerHTML = ''; 
    bgAnimation.className = `bg-${type}`;

    if (type === 'sunny' || type === 'partly') {
        const sun = document.createElement('div');
        sun.className = 'sun';
        bgAnimation.appendChild(sun);
    }
    if (type === 'cloudy' || type === 'partly' || type === 'rainy') {
        const cloud1 = document.createElement('div'); cloud1.className = 'cloud cloud1';
        const cloud2 = document.createElement('div'); cloud2.className = 'cloud cloud2';
        bgAnimation.append(cloud1, cloud2);
    }
    if (type === 'rainy') {
        const rain = document.createElement('div'); rain.className = 'rain';
        for (let i = 0; i < 50; i++) {
            const drop = document.createElement('div'); drop.className = 'drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            rain.appendChild(drop);
        }
        bgAnimation.appendChild(rain);
    }
}

// Main Weather Fetch Logic
async function fetchWeather(lat, lon, locationName) {
    try {
        showMessage('Fetching current data...');
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m&hourly=visibility,uv_index&timezone=auto`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`;
        
        const [weatherRes, aqiRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();

        const current = weatherData.current;
        const condition = parseWeather(current.weather_code);
        
        const visibilityKm = (weatherData.hourly.visibility[0] / 1000).toFixed(1); 
        const uvIndex = weatherData.hourly.uv_index[0] || 0;
        const aqi = aqiData.current.european_aqi || '--';

        // Update UI
        messageBox.style.display = 'none';
        weatherInfo.style.display = 'block';

        document.getElementById('city-name').textContent = locationName;
        document.getElementById('temp').textContent = Math.round(current.temperature_2m);
        document.getElementById('weather-desc').textContent = condition.desc;
        
        document.getElementById('humidity').textContent = `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('wind-speed').textContent = `${current.wind_speed_10m} km/h`;
        document.getElementById('pressure').textContent = `${current.surface_pressure} hPa`;
        document.getElementById('uv-index').textContent = uvIndex;
        document.getElementById('visibility').textContent = `${visibilityKm} km`;
        document.getElementById('aqi').textContent = aqi;

        setBackground(condition.type);

    } catch (error) {
        showMessage('Error fetching data. Try again.');
    }
}

// Execution Logic
function handleSearch() {
    const inputValue = cityInput.value.trim();
    if (!inputValue) return;

    const options = Array.from(dataList.options);
    const selectedOption = options.find(opt => opt.value === inputValue);

    if (selectedOption) {
        fetchWeather(selectedOption.dataset.lat, selectedOption.dataset.lon, selectedOption.dataset.name);
    } else {
        searchCity(inputValue);
    }
}

async function searchCity(city) {
    try {
        showMessage('Searching...');
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) throw new Error('Not found');

        const { latitude, longitude, name, country } = geoData.results[0];
        fetchWeather(latitude, longitude, `${name}, ${country}`);
    } catch (error) {
        showMessage('City not found in database.');
    }
}

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showMessage('Detecting location...');
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "Your Location"),
            () => showMessage('Location access denied.')
        );
    } else {
        showMessage('Geolocation is not supported.');
    }
});

setBackground('default');
