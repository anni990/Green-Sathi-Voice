/**
 * AnalyticsController - Handles analytics page logic
 */
class AnalyticsController {
    constructor() {
        this.days = 1; // Default to today
        this.deviceId = 'all';
        this.devices = [];
        this.charts = {
            hourly: null,
            language: null,
            daily: null
        };
    }

    /**
     * Initialize and load analytics data
     */
    async init() {
        this.setupPeriodSelector();
        this.setupDeviceFilter();
        await this.loadDevices();
        this.loadData();
    }

    /**
     * Load devices list
     */
    async loadDevices() {
        try {
            const response = await adminApiService.getDevices(1, 100);
            if (response.success && response.data.devices) {
                this.devices = response.data.devices;
                this.populateDeviceDropdown();
            }
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    }

    /**
     * Populate device dropdown
     */
    populateDeviceDropdown() {
        const dropdown = document.getElementById('deviceDropdown');
        if (!dropdown) return;

        let html = '<div class="px-4 py-2 hover:bg-gray-100 cursor-pointer" data-device-id="all"><strong>All Devices</strong></div>';
        
        this.devices.forEach(device => {
            html += `
                <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer" data-device-id="${device.device_id}">
                    <div class="font-medium">${tableRenderer.escapeHtml(device.device_name || 'Unknown')}</div>
                    <div class="text-xs text-gray-500">ID: ${device.device_id}</div>
                </div>
            `;
        });

        dropdown.innerHTML = html;
    }

    /**
     * Setup device filter handlers
     */
    setupDeviceFilter() {
        const searchInput = document.getElementById('deviceSearch');
        const dropdown = document.getElementById('deviceDropdown');

        if (searchInput) {
            // Show dropdown on focus
            searchInput.addEventListener('focus', () => {
                dropdown.classList.remove('hidden');
            });

            // Search devices
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const items = dropdown.querySelectorAll('[data-device-id]');
                
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Handle device selection
            dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('[data-device-id]');
                if (item) {
                    this.deviceId = item.dataset.deviceId;
                    const deviceName = item.querySelector('.font-medium')?.textContent || 'All Devices';
                    const deviceIdText = item.querySelector('.text-xs')?.textContent || '';
                    
                    searchInput.value = '';
                    dropdown.classList.add('hidden');
                    
                    // Update selected device display
                    const selectedDeviceName = document.getElementById('selectedDeviceName');
                    const selectedDeviceId = document.getElementById('selectedDeviceId');
                    
                    if (selectedDeviceName) {
                        selectedDeviceName.textContent = deviceName;
                    }
                    
                    if (selectedDeviceId) {
                        selectedDeviceId.textContent = this.deviceId === 'all' ? '' : deviceIdText;
                    }
                    
                    this.loadData();
                }
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        }
    }

    /**
     * Setup period selector handler
     */
    setupPeriodSelector() {
        const selector = document.getElementById('analyticsPeriod');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.days = parseInt(e.target.value);
                this.updatePeriodDisplay();
                this.loadData();
            });
            // Initialize period display
            this.updatePeriodDisplay();
        }
    }

    /**
     * Update period display text
     */
    updatePeriodDisplay() {
        const periodDisplay = document.getElementById('periodDisplay');
        if (periodDisplay) {
            const periodTexts = {
                1: "Today's Data",
                7: "Last 7 Days",
                30: "Last 30 Days",
                90: "Last 90 Days"
            };
            periodDisplay.textContent = periodTexts[this.days] || "Custom Period";
        }
    }

    /**
     * Load analytics data
     */
    async loadData() {
        try {
            this.showLoading();

            const response = await adminApiService.getAnalytics(this.days, this.deviceId);

            if (response.success) {
                const analytics = response.data;

                this.updateStats(analytics);
                this.initCharts();
                this.updateCharts(analytics);
                this.updateInsights(analytics);
            } else {
                showNotification('Failed to load analytics', 'error');
            }
        } catch (error) {
            console.error('Analytics load error:', error);
            showNotification('Error loading analytics', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update stats cards
     */
    updateStats(analytics) {
        document.getElementById('totalConversationsAnalytics').textContent = analytics.total_conversations || 0;
        document.getElementById('uniqueUsers').textContent = analytics.unique_users || 0;
        document.getElementById('avgResponseLength').textContent = analytics.avg_response_length || 0;
        
        // Calculate peak hour
        if (analytics.hourly_distribution) {
            const peakHour = this.getPeakHour(analytics.hourly_distribution);
            document.getElementById('peakHour').textContent = peakHour;
        }
    }

    /**
     * Initialize charts
     */
    initCharts() {
        if (!this.charts.hourly) {
            this.charts.hourly = chartManager.initHourlyChart('hourlyDistributionChart');
        }
        if (!this.charts.language) {
            this.charts.language = chartManager.initLanguageChart('languageDistributionChart');
        }
        if (!this.charts.daily) {
            this.charts.daily = chartManager.initUserRegistrationChart('dailyTrendChart');
        }
    }

    /**
     * Update charts with data
     */
    updateCharts(analytics) {
        // Update hourly distribution
        if (analytics.hourly_distribution) {
            chartManager.updateHourlyChart('hourlyDistributionChart', analytics.hourly_distribution);
        }

        // Update language distribution
        if (analytics.language_distribution && analytics.language_distribution.length > 0) {
            const labels = analytics.language_distribution.map(l => l.language);
            const data = analytics.language_distribution.map(l => l.count);
            chartManager.updateChart('languageDistributionChart', labels, data);
        }

        // Update daily trend
        if (analytics.daily_trend && analytics.daily_trend.length > 0) {
            const labels = analytics.daily_trend.map(d => d.date);
            const data = analytics.daily_trend.map(d => d.count);
            chartManager.updateChart('dailyTrendChart', labels, data);
        }
    }

    /**
     * Update insights section
     */
    updateInsights(analytics) {
        const insightsContainer = document.getElementById('insightsContainer');
        if (!insightsContainer) return;

        let insights = [];

        // Language insights
        if (analytics.language_distribution && analytics.language_distribution.length > 0) {
            const topLang = analytics.language_distribution[0];
            insights.push(`
                <div class="p-4 bg-green-50 rounded-lg">
                    <h4 class="font-semibold text-green-900 mb-2">
                        <i class="fas fa-language mr-2"></i>Most Used Language
                    </h4>
                    <p class="text-green-800">${topLang.language} with ${topLang.count} conversations (${Math.round(topLang.count / analytics.total_conversations * 100)}%)</p>
                </div>
            `);
        }

        // Device distribution insights
        if (analytics.device_distribution && analytics.device_distribution.length > 0) {
            const totalDevices = analytics.device_distribution.length;
            insights.push(`
                <div class="p-4 bg-blue-50 rounded-lg">
                    <h4 class="font-semibold text-blue-900 mb-2">
                        <i class="fas fa-mobile-alt mr-2"></i>Active Devices
                    </h4>
                    <p class="text-blue-800">${totalDevices} devices recorded conversations in this period</p>
                </div>
            `);
        }

        // Engagement insight
        if (analytics.unique_users > 0) {
            const avgConvPerUser = (analytics.total_conversations / analytics.unique_users).toFixed(1);
            insights.push(`
                <div class="p-4 bg-purple-50 rounded-lg">
                    <h4 class="font-semibold text-purple-900 mb-2">
                        <i class="fas fa-chart-line mr-2"></i>User Engagement
                    </h4>
                    <p class="text-purple-800">Average ${avgConvPerUser} conversations per user</p>
                </div>
            `);
        }

        insightsContainer.innerHTML = insights.join('');
    }

    /**
     * Get peak hour from hourly distribution
     */
    getPeakHour(hourlyData) {
        let maxHour = 0;
        let maxCount = 0;

        Object.entries(hourlyData).forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxHour = parseInt(hour);
            }
        });

        return `${maxHour}:00`;
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loader = document.getElementById('analyticsLoader');
        if (loader) loader.classList.remove('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loader = document.getElementById('analyticsLoader');
        if (loader) loader.classList.add('hidden');
    }
}
