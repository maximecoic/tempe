// Chart configuration
let temperatureChart;

// Sensor icon mapping
const sensorIcons = {
    'Paris': 'fa-landmark',
    'Bureau': 'fa-desktop',
    'Bureau 1': 'fa-desktop',
    'Bureau 2': 'fa-desktop',
    'Chambre': 'fa-bed',
    'SdB': 'fa-shower'
};

// Generate colors dynamically based on number of sensors
function generateColors(count, theme = 'dark') {
    const themeColors = themes[theme].plotColors;
    
    // If we have more sensors than base colors, generate additional colors
    if (count > themeColors.length) {
        const additionalColors = Array.from({ length: count - themeColors.length }, (_, i) => {
            const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
            return `hsl(${hue}, 70%, 60%)`;
        });
        return [...themeColors, ...additionalColors];
    }
    
    return themeColors.slice(0, count);
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
        const response = await fetch('https://raw.githubusercontent.com/maximecoic/tempe/main/data.json');
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
    const sensorButtonsContainer = document.querySelector('.floating-controls .sensor-buttons');
    if (!sensorButtonsContainer) {
        console.error('Sensor buttons container not found');
        return;
    }
    
    sensorButtonsContainer.innerHTML = ''; // Clear existing buttons
    
    const theme = document.body.dataset.theme || 'dark';
    const colors = generateColors(sensorNames.length, theme);
    
    sensorNames.forEach((sensorName, index) => {
        const button = document.createElement('button');
        const hasIcon = sensorIcons[sensorName] || Object.entries(sensorIcons).some(([key]) => 
            sensorName.toLowerCase().includes(key.toLowerCase())
        );
        
        button.className = `sensor-btn active ${hasIcon ? 'icon-btn' : ''}`;
        button.dataset.sensor = sensorName;
        button.innerHTML = getSensorIcon(sensorName);
        button.style.backgroundColor = colors[index];
        button.style.color = '#ffffff';
        sensorButtonsContainer.appendChild(button);
    });

    addSensorButtonListeners();
}

// Add event listeners for sensor buttons
function addSensorButtonListeners() {
    document.querySelectorAll('.sensor-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            toggleSensor(btn.dataset.sensor);
        });
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
    
    const theme = document.body.dataset.theme || 'dark';
    const colors = generateColors(sensorNames.length, theme);
    
    const datasets = sensorNames.map((sensor, index) => ({
        label: sensor,
        data: data.map(point => ({
            x: new Date(point.Heure),
            y: parseFloat(point[sensor])
        })).filter(point => !isNaN(point.y)), // Filter out invalid temperature values
        borderColor: colors[index],
        backgroundColor: colors[index],
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointBorderWidth: 2,
        fill: false,
        tension: 0.6 // Increased smoothness
    }));

    // Destroy existing chart if it exists
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    const themeColors = themes[theme];

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        config: { // Store original data for theme switching
            data: {
                originalData: data
            }
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false // Hide the legend
            },
            pan: {
                enabled: true,
                mode: 'x'
            },
            zoom: {
                enabled: true,
                mode: 'x'
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MMM d, HH:mm'
                        },
                        tooltipFormat: "MMM d, yyyy, HH:mm"
                    },
                    gridLines: {
                        color: themeColors.gridColor
                    },
                    ticks: {
                        fontColor: themeColors.textColor,
                        maxRotation: 0,
                        minRotation: 0,
                        maxTicksLimit: 5,
                        callback: function(value, index, values) {
                            const date = new Date(value);
                            const day = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
                            const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            return [day, time];
                        }
                    }
                }],
                yAxes: [{
                    gridLines: {
                        color: themeColors.gridColor
                    },
                    ticks: {
                        fontColor: themeColors.textColor,
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                }]
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

    temperatureChart.options.scales.xAxes[0].ticks.min = start;
    temperatureChart.options.scales.xAxes[0].ticks.max = end;
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

// Set default time range to last 6 hours (as requested)
function setDefaultTimeRange() {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

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

    startDateInput.value = formatDate(sixHoursAgo);
    startTimeInput.value = formatTime(sixHoursAgo);
    endDateInput.value = formatDate(now);
    endTimeInput.value = formatTime(now);

    updateChartDateRange(
        formatDate(sixHoursAgo),
        formatTime(sixHoursAgo),
        formatDate(now),
        formatTime(now)
    );
}

// --- Range Selector Logic ---
function setRangeSelectorHandlers() {
    const rangeButtons = document.querySelectorAll('.range-btn');
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setDateRangeBySelector(btn.dataset.range);
        });
    });
}

function setDateRangeBySelector(range) {
    const now = new Date();
    let start;
    switch (range) {
        case '2h':
            start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            break;
        case '6h':
            start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
        case 'day':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            break;
        case 'year':
            start = new Date(now);
            start.setFullYear(start.getFullYear() - 1);
            break;
        default:
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().slice(0, 5);
    document.getElementById('startDate').value = formatDate(start);
    document.getElementById('startTime').value = formatTime(start);
    document.getElementById('endDate').value = formatDate(now);
    document.getElementById('endTime').value = formatTime(now);
    updateChartDateRange(formatDate(start), formatTime(start), formatDate(now), formatTime(now));
}

const themes = {
    dark: {
        textColor: '#e6f1ff',
        gridColor: 'rgba(255, 255, 255, 0.3)',
        axisColor: '#112240',
        plotColors: [
            '#64ffda', '#3a86ff', '#ff006e', '#8338ec', '#ffbe0b',
            '#fb5607', '#00b4d8', '#06d6a0', '#ef476f', '#118ab2'
        ]
    },
    light: {
        textColor: '#1c1e21',
        gridColor: 'rgba(0, 0, 0, 0.1)',
        axisColor: '#ffffff',
        plotColors: [
            '#0052cc', '#0098db', '#f6511d', '#ffb400', '#7fb800',
            '#5a3e8d', '#00a6a6', '#f25f5c', '#247ba0', '#d352c3'
        ]
    }
};

function applyTheme(theme) {
    document.body.dataset.theme = theme;
    if (temperatureChart) {
        // Redraw chart with new theme colors
        const sensorNames = Object.keys(temperatureChart.data.datasets).map(i => temperatureChart.data.datasets[i].label);
        createSensorButtons(sensorNames);
        initChart(temperatureChart.config.data.originalData); 
    }
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
    setRangeSelectorHandlers();

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
}

// Start the application
// init(); // Will be called on DOMContentLoaded

document.addEventListener('DOMContentLoaded', async () => {
    Chart.defaults.global.defaultFontFamily = "'Gill Sans', sans-serif";
    const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    applyTheme(lightModeQuery.matches ? 'light' : 'dark');

    lightModeQuery.addEventListener('change', event => {
        applyTheme(event.matches ? 'light' : 'dark');
    });

    await init();

    // Toggle floating controls
    const floatingControls = document.getElementById('floatingControls');
    const toggleBtn = document.getElementById('toggleControlsBtn');
    const toggleChevron = document.getElementById('toggleChevron');
    let controlsVisible = false; // Start hidden

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            controlsVisible = !controlsVisible;
            if (floatingControls) {
                floatingControls.classList.toggle('hidden', !controlsVisible);
            }
            if (toggleChevron) {
                toggleChevron.innerHTML = controlsVisible ? '&#x25B2;' : '&#x25BC;';
            }
        });
    }
});
