// Chart configuration
let temperatureChart;
const chartColors = [
    '#64ffda',
    '#3a86ff',
    '#ff006e',
    '#8338ec',
    '#ffbe0b'
];

// Fetch and process data
async function fetchData() {
    try {
        const response = await fetch('https://script.googleusercontent.com/a/macros/coic.lv/echo?user_content_key=AehSKLhVArv2211ihNs2RzYk5MRK9VFCBok5rqo2X5345sVnwueUcXPlzopvHofOgrKYzwa9sBlD2g_KW7PvDr8ZTUx_F53ferK5k4xlWCe-5repjrg5yrnM5AF8x-ApiARu0djDF6KI7pBq8HcTGwTiRczluZtmBlVLg1RIiBDItawk7CEwJep5WJ7-QeGZuPVSH9Frf0QrqWN0AB6qrj4sjYKY2UMqoeVfjBA--JxJzE_tOuu0GX-_mxFDEIhnQAyqfY1f65CRHcLFIWfCPQSNV3H5qpJTp1OfpmGn-H6j9U-TgEdlU84&lib=MjE54VOUTJvBBczSHKNrag3eLxmpFSsFs');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Initialize chart
function initChart(data) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    
    const datasets = Object.keys(data[0])
        .filter(key => key !== 'heure')
        .map((sensor, index) => ({
            label: `Sensor ${index + 1}`,
            data: data.map(point => ({
                x: new Date(point.heure),
                y: parseFloat(point[sensor])
            })),
            borderColor: chartColors[index],
            backgroundColor: chartColors[index] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.4
        }));

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
                    position: 'top',
                    labels: {
                        color: '#e6f1ff'
                    }
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

    temperatureChart.options.scales.x.min = start;
    temperatureChart.options.scales.x.max = end;
    temperatureChart.update();
}

// Toggle sensor visibility
function toggleSensor(sensorIndex) {
    if (!temperatureChart) return;
    
    const meta = temperatureChart.getDatasetMeta(sensorIndex);
    meta.hidden = !meta.hidden;
    temperatureChart.update();
}

// Set default time range to last 24 hours
function setDefaultTimeRange() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().slice(0, 5);

    document.getElementById('startDate').value = formatDate(yesterday);
    document.getElementById('startTime').value = formatTime(yesterday);
    document.getElementById('endDate').value = formatDate(now);
    document.getElementById('endTime').value = formatTime(now);

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
    if (!data) return;

    initChart(data);
    setDefaultTimeRange();

    // Add event listeners for date and time inputs
    const dateTimeInputs = ['startDate', 'startTime', 'endDate', 'endTime'];
    dateTimeInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            updateChartDateRange(
                document.getElementById('startDate').value,
                document.getElementById('startTime').value,
                document.getElementById('endDate').value,
                document.getElementById('endTime').value
            );
        });
    });

    // Add event listeners for sensor buttons
    document.querySelectorAll('.sensor-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            toggleSensor(index);
        });
    });
}

// Start the application
init(); 