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
    
    const colors = generateColors(sensorNames.length);
    
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
        tension: 0.6 // Increased smoothness
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
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false // Hide the legend
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
                        },
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleString('fr-FR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }
                    }
                },
                crosshair: {
                    line: {
                        color: 'rgba(100, 255, 218, 0.4)',
                        width: 1,
                        dashPattern: [5, 5]
                    },
                    sync: {
                        enabled: true
                    },
                    zoom: {
                        enabled: false
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
                        color: 'rgba(255, 255, 255, 0.3)' // White grid lines at 30% opacity
                    },
                    ticks: {
                        color: '#e6f1ff',
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                }
            }
        },
        plugins: [verticalLinePlugin]
    });

    // Add touch support
    const chartContainer = ctx.parentElement;
    chartContainer.addEventListener('touchstart', handleTouch);
    chartContainer.addEventListener('touchmove', handleTouch);
    chartContainer.addEventListener('touchend', handleTouchEnd);

    function handleTouch(e) {
        const touch = e.touches[0];
        const rect = ctx.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const chartArea = temperatureChart.chartArea;
        const xScale = temperatureChart.scales.x;
        const xValue = xScale.getValueForPixel(x);
        
        // Find the closest data point
        let closestPoint = null;
        let minDistance = Infinity;
        
        temperatureChart.data.datasets.forEach(dataset => {
            if (!dataset.hidden) {
                dataset.data.forEach(point => {
                    const distance = Math.abs(point.x - xValue);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = point;
                    }
                });
            }
        });
        
        if (closestPoint) {
            temperatureChart.setActiveElements([{
                datasetIndex: 0,
                index: temperatureChart.data.datasets[0].data.findIndex(p => p.x === closestPoint.x)
            }]);
            temperatureChart.update();
        }
    }

    function handleTouchEnd() {
        temperatureChart.setActiveElements([]);
        temperatureChart.update();
    }
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

// --- Custom Chart.js Plugin for Vertical Hover Line ---
const verticalLinePlugin = {
    id: 'verticalLine',
    afterDraw: function(chart) {
        if (chart.tooltip?._active && chart.tooltip._active.length) {
            const ctx = chart.ctx;
            ctx.save();
            const activePoint = chart.tooltip._active[0];
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(activePoint.element.x, chart.chartArea.top);
            ctx.lineTo(activePoint.element.x, chart.chartArea.bottom);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(100,255,218,0.4)';
            ctx.stroke();
            ctx.restore();
        }
    }
};

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

document.addEventListener('DOMContentLoaded', () => {
  // Toggle floating controls
  const floatingControls = document.getElementById('floatingControls');
  const toggleBtn = document.getElementById('toggleControlsBtn');
  const toggleChevron = document.getElementById('toggleChevron');
  let controlsVisible = false; // Start hidden

  toggleBtn.addEventListener('click', () => {
    controlsVisible = !controlsVisible;
    floatingControls.classList.toggle('hidden', !controlsVisible);
    toggleChevron.innerHTML = controlsVisible ? '&#x25B2;' : '&#x25BC;';
  });

  // Date/time input listeners (in floating controls)
  ['startDate', 'startTime', 'endDate', 'endTime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        updateChartDateRange(
          document.getElementById('startDate').value,
          document.getElementById('startTime').value,
          document.getElementById('endDate').value,
          document.getElementById('endTime').value
        );
      });
    }
  });
});
