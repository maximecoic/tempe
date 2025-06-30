// Chart configuration
let temperatureChart;
let originalData = null; // Store the original data globally
const sensorVisibility = new Map();
let groups = [];
const groupVisibility = new Map();
const GROUP_STORAGE_KEY = 'sensorGroups';

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
    // Check for exact match first
    let iconClass = sensorIcons[sensorName];
    // If no exact match, check for partial matches
    if (!iconClass) {
        for (const [key, icon] of Object.entries(sensorIcons)) {
            if (sensorName.toLowerCase().includes(key.toLowerCase())) {
                iconClass = icon;
                break; // Found a match, stop searching
            }
        }
    }
    return iconClass ? `<i class="fas ${iconClass}"></i>` : sensorName;
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
        
        const isHidden = sensorVisibility.get(sensorName);

        button.className = `sensor-btn ${!isHidden ? 'active' : ''} ${hasIcon ? 'icon-btn' : ''}`;
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
            toggleSensor(btn.dataset.sensor);
        });
    });
}

// Recalculate Y-axis scale based on visible data in the current viewport
function updateYAxis(chart = temperatureChart) {
    if (!chart) return;

    let minTemp = Infinity;
    let maxTemp = -Infinity;

    const visibleDatasets = chart.data.datasets.filter(d => !d.hidden);

    if (visibleDatasets.length === 0) {
        chart.options.scales.yAxes[0].ticks.min = 0;
        chart.options.scales.yAxes[0].ticks.max = 40;
        return;
    }

    // Get the min/max of the current x-axis view (timestamps)
    const chartMin = chart.scales['x-axis-0'].min;
    const chartMax = chart.scales['x-axis-0'].max;

    visibleDatasets.forEach(dataset => {
        // Iterate through points and only consider those within the visible x-range
        dataset.data.forEach(point => {
            if (point.x >= chartMin && point.x <= chartMax) {
                if (point.y < minTemp) minTemp = point.y;
                if (point.y > maxTemp) maxTemp = point.y;
            }
        });
    });

    const paddedMin = (minTemp === Infinity) ? 0 : Math.floor(minTemp) - 2;
    const paddedMax = (maxTemp === -Infinity) ? 40 : Math.ceil(maxTemp) + 2;

    chart.options.scales.yAxes[0].ticks.min = paddedMin;
    chart.options.scales.yAxes[0].ticks.max = paddedMax;
}

// Update info boxes with min/max and live temperatures
function updateInfoBoxes() {
    if (!temperatureChart) return;

    const statsList = document.getElementById('sensor-stats-list');
    if (!statsList) return;

    statsList.innerHTML = '';

    const allDatasets = [...temperatureChart.data.datasets];

    // New sort: 1. Visible first. 2. Custom order. 3. Alphabetical.
    const sortOrder = { 'Paris': 1, 'Chambre': 2 };
    allDatasets.sort((a, b) => {
        // 1. Primary sort: hidden status (visible items first)
        if (a.hidden !== b.hidden) {
            return a.hidden ? 1 : -1;
        }

        // 2. Secondary sort for visible items: custom order
        if (!a.hidden) {
            const aOrder = sortOrder[a.label] || 3;
            const bOrder = sortOrder[b.label] || 3;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
        }

        // 3. Tertiary sort: alphabetical for all items within their group (visible/hidden)
        return a.label.localeCompare(b.label);
    });

    const chartMin = temperatureChart.scales['x-axis-0'].min;
    const chartMax = temperatureChart.scales['x-axis-0'].max;

    allDatasets.forEach(dataset => {
        // --- Calculate Stats ---
        let minTemp = Infinity;
        let maxTemp = -Infinity;
        let hasVisiblePoints = false;

        dataset.data.forEach(point => {
            if (point.x >= chartMin && point.x <= chartMax) {
                if (point.y < minTemp) minTemp = point.y;
                if (point.y > maxTemp) maxTemp = point.y;
                hasVisiblePoints = true;
            }
        });

        const lastPoint = dataset.data.length > 0 ? dataset.data[dataset.data.length - 1] : null;

        // --- Build HTML ---
        const li = document.createElement('li');
        if (dataset.hidden) {
            li.classList.add('is-hidden');
        }
        const datasetColor = dataset.borderColor;

        const sensorInfoHTML = `<div class="sensor-info"><button class="color-dot" data-sensor-toggle="${dataset.label}" style="background-color: ${datasetColor};" aria-label="Toggle ${dataset.label}"></button><span class="sensor-name-text">${dataset.label}</span></div>`;

        const liveValueHTML = lastPoint ?
            `<span class="live-temp">${lastPoint.y.toFixed(1)}°C</span>` :
            `<span class="live-temp">N/A</span>`;

        const minMaxHTML = hasVisiblePoints ?
            `<span class="temp-values"><span class="min-temp"><i class="fas fa-arrow-down"></i> ${minTemp.toFixed(1)}°</span><span class="max-temp"><i class="fas fa-arrow-up"></i> ${maxTemp.toFixed(1)}°</span></span>` :
            `<span class="temp-values">N/A</span>`;

        // The three elements for the list item, to be laid out by CSS Grid
        li.innerHTML = sensorInfoHTML + liveValueHTML + minMaxHTML;
        statsList.appendChild(li);
    });

    // Add event listeners to the new toggle dots
    statsList.querySelectorAll('.color-dot').forEach(button => {
        button.addEventListener('click', (e) => {
            const sensorLabel = e.currentTarget.dataset.sensorToggle;
            const dataset = temperatureChart.data.datasets.find(d => d.label === sensorLabel);
            if (!dataset) return;

            if (dataset.isGroup) {
                toggleGroup(dataset.groupId);
            } else {
                toggleSensor(dataset.label);
            }
        });
    });
}

// --- Group Management Functions ---

function loadGroups() {
    const storedGroups = localStorage.getItem(GROUP_STORAGE_KEY);
    if (storedGroups) {
        groups = JSON.parse(storedGroups);
    }
}

function saveGroups() {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
}

function calculateGroupAverageData(group, allData) {
    if (!group || !Array.isArray(group.sensors) || !Array.isArray(allData)) {
        return [];
    }

    return allData.map(dataPoint => {
        let sum = 0;
        let count = 0;
        group.sensors.forEach(sensorName => {
            const value = parseFloat(dataPoint[sensorName]);
            if (dataPoint.hasOwnProperty(sensorName) && !isNaN(value)) {
                sum += value;
                count++;
            }
        });

        if (count > 0) {
            return {
                x: new Date(dataPoint.Heure),
                y: parseFloat((sum / count).toFixed(2)) // Average with 2 decimal places
            };
        }
        return null;
    }).filter(point => point !== null);
}

function createGroupButtons() {
    const container = document.querySelector('.group-buttons');
    if (!container) return;
    container.innerHTML = ''; // Clear old buttons

    groups.forEach(group => {
        const isHidden = groupVisibility.get(group.id);
        const button = document.createElement('button');
        button.className = `group-btn ${!isHidden ? 'active' : ''}`;
        button.dataset.groupId = group.id;
        button.style.setProperty('--group-color', group.color);
        button.innerHTML = `<i class="fas ${group.icon}"></i> ${group.name}`;
        container.appendChild(button);
    });

    addGroupButtonListeners();
}

function addGroupButtonListeners() {
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleGroup(btn.dataset.groupId);
        });
    });
}

function toggleGroup(groupId) {
    if (!temperatureChart) return;
    const newHiddenState = !groupVisibility.get(groupId);
    groupVisibility.set(groupId, newHiddenState);

    const dataset = temperatureChart.data.datasets.find(d => d.groupId === groupId);
    if (dataset) dataset.hidden = newHiddenState;

    document.querySelector(`.group-btn[data-group-id="${groupId}"]`)?.classList.toggle('active', !newHiddenState);
    updateYAxis();
    temperatureChart.update();
    updateInfoBoxes();
}


// Initialize chart
function initChart(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error('initChart: data is not a valid array', data);
        return;
    }
    const ctx = document.getElementById('temperatureChart');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }

    // --- 1. Get state from old chart (if it exists) ---
    let oldXAxis = null;
    if (temperatureChart) {
        oldXAxis = {
             min: temperatureChart.options.scales.xAxes[0].ticks.min,
             max: temperatureChart.options.scales.xAxes[0].ticks.max
        };
        temperatureChart.destroy();
    }

    // --- 2. Prepare datasets and apply visibility state ---
    const sensorNames = Object.keys(data[0]).filter(key => key !== 'Heure');
    const theme = document.body.dataset.theme || 'dark';
    const colors = generateColors(sensorNames.length, theme);
    
    sensorNames.forEach(name => {
        if (!sensorVisibility.has(name)) sensorVisibility.set(name, false);
    });
    
    const datasets = sensorNames.map((sensor, index) => ({
        label: sensor,
        data: data.map(point => ({
            x: new Date(point.Heure),
            y: parseFloat(point[sensor])
        })).filter(point => !isNaN(point.y)),
        borderColor: colors[index],
        backgroundColor: colors[index],
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointBorderWidth: 2,
        fill: false,
        tension: 0.6,
        hidden: sensorVisibility.get(sensor) || false
    }));
    
    // --- 3. Prepare group datasets ---
    const groupDatasets = groups.map(group => {
        const groupData = calculateGroupAverageData(group, originalData);
        if (!groupVisibility.has(group.id)) {
            groupVisibility.set(group.id, true); // Default to hidden
        }
        return {
            label: group.name,
            data: groupData,
            borderColor: group.color,
            backgroundColor: group.color,
            borderWidth: 2.5,
            pointRadius: 1,
            pointHoverRadius: 3,
            pointBorderWidth: 2,
            fill: false,
            tension: 0.6,
            hidden: groupVisibility.get(group.id),
            isGroup: true,
            groupId: group.id
        };
    });


    // On first load, create the sensor buttons
    if (!temperatureChart) { // A bit of a hack to detect first run
        createSensorButtons(sensorNames);
        createGroupButtons();
    }

    // --- 3. Calculate Y-axis scale from VISIBLE datasets ---
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    const visibleDatasets = datasets.filter(d => !d.hidden);
    
    visibleDatasets.forEach(dataset => {
        dataset.data.forEach(point => {
            if (point.y < minTemp) minTemp = point.y;
            if (point.y > maxTemp) maxTemp = point.y;
        });
    });

    const paddedMin = (minTemp === Infinity) ? 0 : Math.floor(minTemp) - 2;
    const paddedMax = (maxTemp === -Infinity) ? 40 : Math.ceil(maxTemp) + 2;
    
    // --- 4. Create the new chart ---
    const themeColors = themes[theme];
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [...datasets, ...groupDatasets] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: { display: false },
            pan: {
                enabled: true,
                mode: 'x',
                onPanComplete: ({chart}) => {
                    updateYAxis(chart);
                    chart.update({duration: 0});
                    updateInfoBoxes();
                }
            },
            zoom: {
                enabled: true,
                mode: 'x',
                onZoomComplete: ({chart}) => {
                    updateYAxis(chart);
                    chart.update({duration: 0});
                    updateInfoBoxes();
                }
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: { unit: 'hour', displayFormats: { hour: 'MMM d, HH:mm' }, tooltipFormat: "MMM d, yyyy, HH:mm" },
                    gridLines: { color: themeColors.gridColor },
                    ticks: {
                        fontColor: themeColors.textColor,
                        maxRotation: 0,
                        minRotation: 0,
                        maxTicksLimit: 5,
                        minTicksLimit: 3,
                        min: oldXAxis ? oldXAxis.min : undefined,
                        max: oldXAxis ? oldXAxis.max : undefined,
                        callback: function(value, index, values) {
                            const date = new Date(value);
                            const day = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
                            const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            return [day, time];
                        }
                    }
                }],
                yAxes: [{
                    position: 'right',
                    gridLines: { drawBorder: false, color: themeColors.gridColor },
                    ticks: {
                        min: paddedMin,
                        max: paddedMax,
                        mirror: true,
                        fontColor: themeColors.textColor,
                        callback: function(value) { return value + '°C'; }
                    }
                }]
            }
        }
    });
    updateInfoBoxes();
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
    updateYAxis();
    temperatureChart.update(); // Redraw the chart with new ranges
    updateInfoBoxes();
}

// Toggle sensor visibility
function toggleSensor(sensorName) {
    if (!temperatureChart) return;
    // Defensive: check if originalData exists and is valid
    if (!Array.isArray(originalData) || originalData.length === 0) {
        console.error('toggleSensor: originalData is not a valid array', originalData);
        return;
    }
    // 1. Update visibility state
    const newHiddenState = !sensorVisibility.get(sensorName);
    sensorVisibility.set(sensorName, newHiddenState);

    // 2. Update chart dataset visibility
    const dataset = temperatureChart.data.datasets.find(d => d.label === sensorName);
    if (dataset) {
        dataset.hidden = newHiddenState;
    }

    // 3. Update button appearance
    const button = document.querySelector(`.sensor-btn[data-sensor="${sensorName}"]`);
    if (button) {
        button.classList.toggle('active', !newHiddenState);
    }

    // 4. Recalculate Y-axis and update chart
    updateYAxis();
    temperatureChart.update();
    updateInfoBoxes();
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
    const start = new Date(now); // Initialize with now

    switch (range) {
        case '2h':
            start.setHours(start.getHours() - 2);
            break;
        case '6h':
            start.setHours(start.getHours() - 6);
            break;
        case 'day':
            start.setDate(start.getDate() - 1);
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        default:
            // Default to 1 day for safety, though the UI should prevent this.
            start.setDate(start.getDate() - 1);
    }

    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().slice(0, 5);

    document.getElementById('startDate').value = formatDate(start);
    document.getElementById('startTime').value = formatTime(start);
    document.getElementById('endDate').value = formatDate(now);
    document.getElementById('endTime').value = formatTime(now);

    applyDateRangeToChart();
}

function setupGroupModal() {
    const modalOverlay = document.getElementById('groupModalOverlay');
    const addGroupBtn = document.getElementById('addGroupBtn');
    const cancelGroupBtn = document.getElementById('cancelGroupBtn');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    addGroupBtn?.addEventListener('click', openGroupModal);
    cancelGroupBtn?.addEventListener('click', closeGroupModal);
    saveGroupBtn?.addEventListener('click', saveNewGroup);
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeGroupModal();
        }
    });
}

function openGroupModal() {
    const modalOverlay = document.getElementById('groupModalOverlay');
    const sensorsSelect = document.getElementById('groupSensors');
    if (!modalOverlay || !sensorsSelect) return;

    // Populate sensor list
    sensorsSelect.innerHTML = '';
    const sensorNames = Object.keys(originalData[0]).filter(key => key !== 'Heure');
    sensorNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        sensorsSelect.appendChild(option);
    });

    modalOverlay.style.display = 'flex';
}

function closeGroupModal() {
    const modalOverlay = document.getElementById('groupModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        // Optionally reset form fields
        document.getElementById('groupName').value = '';
        document.getElementById('groupIcon').value = '';
        document.getElementById('groupSensors').selectedIndex = -1;
    }
}

function saveNewGroup() {
    const name = document.getElementById('groupName').value.trim();
    const selectedSensors = Array.from(document.getElementById('groupSensors').selectedOptions).map(opt => opt.value);
    const icon = document.getElementById('groupIcon').value.trim() || 'fa-layer-group';
    const color = document.getElementById('groupColor').value;

    if (!name || selectedSensors.length < 1) {
        alert('Please provide a group name and select at least one sensor.');
        return;
    }

    const newGroup = { id: `group_${Date.now()}`, name, sensors: selectedSensors, icon, color };
    groups.push(newGroup);
    saveGroups();

    // Dynamically add to chart and UI
    const groupData = calculateGroupAverageData(newGroup, originalData);
    const newDataset = { label: newGroup.name, data: groupData, borderColor: newGroup.color, backgroundColor: newGroup.color, borderWidth: 2.5, pointRadius: 1, pointHoverRadius: 3, pointBorderWidth: 2, fill: false, tension: 0.6, hidden: true, isGroup: true, groupId: newGroup.id };
    temperatureChart.data.datasets.push(newDataset);
    groupVisibility.set(newGroup.id, true);
    createGroupButtons();
    temperatureChart.update();
    closeGroupModal();
}


function applyDateRangeToChart() {
    if (!temperatureChart) return;
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    updateChartDateRange(startDate, startTime, endDate, endTime);
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
        initChart(originalData); 
    }
}

// Initialize the application
async function init() {
    const data = await fetchData();
    if (!data) {
        console.error('Failed to initialize: No data available');
        return;
    }

    loadGroups();
    setupGroupModal();

    // Initialize visibility state for all sensors
    const sensorNames = Object.keys(data[0]).filter(key => key !== 'Heure');
    sensorNames.forEach(name => {
        if (!sensorVisibility.has(name)) sensorVisibility.set(name, false);
    });

    originalData = data; // Store globally for toggling
    initChart(originalData);
    setRangeSelectorHandlers();

    // Add event listeners for date and time inputs
    const dateTimeInputs = ['startDate', 'startTime', 'endDate', 'endTime'];
    dateTimeInputs.forEach(id => {
        const element = document.getElementById(id);
        element?.addEventListener('change', applyDateRangeToChart);
    });

    // Set initial range by simulating a click on the default active button.
    document.querySelector('.range-btn.active')?.click();
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
