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
                y: point[sensor]
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
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour'
                    },
                    grid: {
                        color: '#112240'
                    },
                    ticks: {
                        color: '#e6f1ff'
                    }
                },
                y: {
                    grid: {
                        color: '#112240'
                    },
                    ticks: {
                        color: '#e6f1ff'
                    }
                }
            }
        }
    });
}

// Update chart based on date range
function updateChartDateRange(startDate, endDate) {
    if (!temperatureChart) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

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

// Initialize the application
async function init() {
    const data = await fetchData();
    if (!data) return;

    initChart(data);

    // Set initial date range
    const dates = data.map(point => new Date(point.heure));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

    // Add event listeners
    document.getElementById('startDate').addEventListener('change', (e) => {
        updateChartDateRange(e.target.value, document.getElementById('endDate').value);
    });

    document.getElementById('endDate').addEventListener('change', (e) => {
        updateChartDateRange(document.getElementById('startDate').value, e.target.value);
    });

    document.querySelectorAll('.sensor-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            toggleSensor(index);
        });
    });
}

// Start the application
init(); 