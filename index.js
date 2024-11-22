function getRecommendationText(snowInForecast, averageTemp) {
    let recommendationMessage = '';
    if (averageTemp <= 45) {
        recommendationMessage = 'OMG yes put snow tires on!!';
        if (snowInForecast) {
            recommendationMessage += " THERE IS LITERALLY SNOW IN THE FORECAST YA DINGUS!! HURRY!!!"
        }
    } else {
        recommendationMessage = 'Nope :(';
    }
    return recommendationMessage;
}

async function getSnowTireRecommendation() {
    if (navigator.geolocation) {
        try {
            const loc = await getLocationFromUser();
            const forecast = await getWeatherForecast(loc.latitude, loc.longitude);
            const snowInForecast = forecast.some((day) => day.shortForecast.toLowerCase().includes("snow"));
            const averageTemp = Math.floor(forecast.reduce((sum, day) => sum + day.temperature, 0) / forecast.length);
            let recommendationMessage = getRecommendationText(snowInForecast, averageTemp);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'block';
            document.getElementById('recommendation').textContent = recommendationMessage;
        } catch (error) {
            showFallbackButton();
            return;
        }
    } else {
        showFallbackButton();
        return;
    }

}

function showFallbackButton() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('zip-input').style.display = 'block';
}

function getLocationFromUser() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position) => {
            resolve(position.coords);
        }, reject);
    });
}

async function getWeatherForecast(lat, lon) {
    try {
        // Step 1: Build the endpoint URL
        const url = `https://api.weather.gov/points/${lat},${lon}`;

        // Step 2: Get the grid points from the API (the forecast URL)
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch forecast: ${response.statusText}`);
        }

        const data = await response.json();

        // Step 3: Get the forecast URL
        const forecastUrl = data.properties.forecast;

        // Step 4: Fetch the 7-day forecast
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) {
            throw new Error(`Failed to fetch forecast: ${forecastResponse.statusText}`);
        }

        const forecastData = await forecastResponse.json();

        // Step 5: Extract high and low temperatures from the forecast
        const dailyForecasts = forecastData.properties.periods;
        const temperatureData = dailyForecasts.map(period => ({
            day: period.name,  // Day name (e.g., Monday, Tuesday)
            shortForecast: period.shortForecast,
            temperature: period.temperature,
        }));

        // Step 6: Return the temperature data
        return temperatureData;
    } catch (error) {
        alert('Error fetching weather data:', error);
        throw error;
    }
}

const latLongMap = new Map();

async function checkSnowTireWithZip() {
    document.getElementById('loading').style.display = 'flex';
    const zipcode = document.getElementById('zipcode').value.trim();
    if (zipcode === "") {
        alert("Please enter a ZIP code.");
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'none';
        return;
    }
    if (latLongMap.size == 0) {
        try {
            await getZipsToLatLongMap();
        } catch (error) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'none';
            alert('Error downloading ZIP code CSV, try again later:', error);
            return;
        }
    }
    const latLong = latLongMap.get(zipcode);
    if (!latLong) {
        alert("Please enter a valid ZIP code.");
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'none';
        return;
    }
    const forecast = await getWeatherForecast(latLong.LAT, latLong.LNG);
    const snowInForecast = forecast.some((day) => day.shortForecast.toLowerCase().includes("snow"));
    const averageTemp = Math.floor(forecast.reduce((sum, day) => sum + day.temperature, 0) / forecast.length);

    let recommendationMessage = getRecommendationText(snowInForecast, averageTemp);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('recommendation').textContent = recommendationMessage;
}

async function getZipsToLatLongMap() {
    // Step 1: Download the CSV file using fetch
    const response = await fetch('zips.csv');
    if (!response.ok) {
        document.getElementById('loading').style.display = 'none';
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    // Step 2: Get the text content of the CSV file
    const csvText = await response.text();
    // Step 3: Parse the CSV into a HashMap
    const csvRows = csvText.split('\n');
    const headers = csvRows[0].split(','); // Assuming the first row is the header
    for (let i = 1; i < csvRows.length; i++) {
        const row = csvRows[i].trim();
        if (!row) continue; // Skip empty rows
        const values = row.split(',');
        // Create a key-value pair for the row using headers
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header.trim()] = values[index]?.trim();
        });
        // Assuming the first column is the key for the HashMap
        const key = rowObject[headers[0].trim()];
        latLongMap.set(key, rowObject);
    }
}

getSnowTireRecommendation();