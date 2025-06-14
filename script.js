// Chart configuration
let temperatureChart;

// Sensor icon mapping
const sensorIcons = {
    'Paris': 'fa-tower-eiffel',
    'Bureau': 'fa-desktop',
    'Bureau 1': 'fa-desktop',
    'Bureau 2': 'fa-desktop',
    'Chambre': 'fa-bed',
    'SdB': 'fa-shower'
};

// Generate colors dynamically based on number of sensors
function generateColors(count) {
    const baseColors = [
        '#64ffda', // Teal
        '#3a86ff', // Blue
        '#ff006e', // Pink
        '#8338ec', // Purple
        '#ffbe0b', // Yellow
        '#fb5607', // Orange
        '#00b4d8', // Light Blue
        '#06d6a0', // Mint
        '#ef476f', // Rose
        '#118ab2'  // Dark Blue
    ];
    
    // If we have more sensors than base colors, generate additional colors
    if (count > baseColors.length) {
        const additionalColors = Array.from({ length: count - baseColors.length }, (_, i) => {
            const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
            return `hsl(${hue}, 70%, 60%)`;
        });
        return [...baseColors, ...additionalColors];
    }
    
    return baseColors.slice(0, count);
}

// Get icon for sensor
function getSensorIcon(sensorName) {
    // Check for exact match
    if (sensorIcons[sensorName]) {
        return `<i class="fas ${sensorIcons[sensorName]}"></i>`;
    }
    
    // Check for partial matches
    for (const [key, icon] of Object.entries(sensorIcons)) {
        if (sensorName.toLowerCase().includes(key.toLowerCase())) {
            return `<i class="fas ${icon}"></i>`;
        }
    }
    
    // If no match found, return the sensor name
    return sensorName;
}

// Fetch and process data
async function fetchData() {
    try {
        const response = await fetch('https://script.googleusercontent.com/a/macros/coic.lv/echo?user_content_key=AehSKLhVArv2211ihNs2RzYk5MRK9VFCBok5rqo2X5345sVnwueUcXPlzopvHofOgrKYzwa9sBlD2g_KW7PvDr8ZTUx_F53ferK5k4xlWCe-5repjrg5yrnM5AF8x-ApiARu0djDF6KI7pBq8HcTGwTiRczluZtmBlVLg1RIiBDItawk7CEwJep5WJ7-QeGZuPVSH9Frf0QrqWN0AB6qrj4sjYKY2UMqoeVfjBA--JxJzE_tOuu0GX-_mxFDEIhnQAyqfY1f65CRHcLFIWfCPQSNV3H5qpJTp1OfpmGn-H6j9U-TgEdlU84&lib=MjE54VOUTJvBBczSHKNrag3eLxmpFSsFs');
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid data format or empty data');
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Create sensor buttons dynamically
function createSensorButtons(sensorNames) {
    const sensorButtonsContainer = document.querySelector('.sensor-buttons');
    if (!sensorButtonsContainer) {
        console.error('Sensor buttons container not found');
        return;
    }
    
    sensorButtonsContainer.innerHTML = ''; // Clear existing buttons
    
    const colors = generateColors(sensorNames.length);
    
    sensorNames.forEach((sensorName, index) => {
        const button = document.createElement('button');
        button.className = 'sensor-btn active';
        button.dataset.sensor = sensorName;
        button.innerHTML = getSensorIcon(sensorName);
        button.style.borderColor = colors[index];
        button.style.color = colors[index];
        sensorButtonsContainer.appendChild(button);
    });
}

// Initialize chart
function initChart(data) {
    const ctx = document.getElementById('temperatureChart');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }
    
    // Get sensor names (all keys except 'Heure')
    const sensorNames = Object.keys(data[0]).filter(key => key !== 'Heure');
    if (sensorNames.length === 0) {
        console.error('No sensor data found');
        return;
    }
    
    // Create sensor buttons
    createSensorButtons(sensorNames);
    
    const colors = generateColors(sensorNames.length);
    
    const datasets = sensorNames.map((sensor, index) => ({
        label: sensor,
        data: data.map(point => ({
            x: new Date(point.Heure),
            y: parseFloat(point[sensor])
        })).filter(point => !isNaN(point.y)), // Filter out invalid temperature values
        borderColor: colors[index],
        backgroundColor: colors[index],
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBorderWidth: 2,
        fill: false,
        tension: 0.4
    }));

    // Destroy existing chart if it exists
    if (temperatureChart) {
        temperatureChart.destroy();
    }

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide the legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MMM d, HH:mm'
                        },
                        tooltipFormat: 'MMM d, HH:mm'
                    },
                    grid: {
                        color: '#112240'
                    },
                    ticks: {
                        color: '#e6f1ff',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: '#112240'
                    },
                    ticks: {
                        color: '#e6f1ff',
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                }
            }
        }
    });
}

// Update chart based on date and time range
function updateChartDateRange(startDate, startTime, endDate, endTime) {
    if (!temperatureChart) return;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date range');
        return;
    }

    temperatureChart.options.scales.x.min = start;
    temperatureChart.options.scales.x.max = end;
    temperatureChart.update();
}

// Toggle sensor visibility
function toggleSensor(sensorName) {
    if (!temperatureChart) return;
    
    const datasetIndex = temperatureChart.data.datasets.findIndex(ds => ds.label === sensorName);
    if (datasetIndex === -1) {
        console.error(`Sensor ${sensorName} not found`);
        return;
    }
    
    const meta = temperatureChart.getDatasetMeta(datasetIndex);
    meta.hidden = !meta.hidden;
    temperatureChart.update();
}

// Set default time range to last 24 hours
function setDefaultTimeRange() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().slice(0, 5);

    const startDateInput = document.getElementById('startDate');
    const startTimeInput = document.getElementById('startTime');
    const endDateInput = document.getElementById('endDate');
    const endTimeInput = document.getElementById('endTime');

    if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) {
        console.error('Date/time inputs not found');
        return;
    }

    startDateInput.value = formatDate(yesterday);
    startTimeInput.value = formatTime(yesterday);
    endDateInput.value = formatDate(now);
    endTimeInput.value = formatTime(now);

    updateChartDateRange(
        formatDate(yesterday),
        formatTime(yesterday),
        formatDate(now),
        formatTime(now)
    );
}

// Initialize the application
async function init() {
    const data = await fetchData();
    if (!data) {
        console.error('Failed to initialize: No data available');
        return;
    }

    initChart(data);
    setDefaultTimeRange();

    // Add event listeners for date and time inputs
    const dateTimeInputs = ['startDate', 'startTime', 'endDate', 'endTime'];
    dateTimeInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                updateChartDateRange(
                    document.getElementById('startDate').value,
                    document.getElementById('startTime').value,
                    document.getElementById('endDate').value,
                    document.getElementById('endTime').value
                );
            });
        }
    });

    // Add event listeners for sensor buttons
    document.querySelectorAll('.sensor-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            toggleSensor(btn.dataset.sensor);
        });
    });
}

// Start the application
init(); 