/**
 * ChartManager - Handles Chart.js initialization and updates
 */
class ChartManager {
    constructor() {
        this.charts = {};
    }

    /**
     * Initialize user registration line chart
     */
    initUserRegistrationChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'New Users',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Initialize language distribution pie chart
     */
    initLanguageChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#10b981',
                        '#ea580c',
                        '#3b82f6',
                        '#8b5cf6',
                        '#ec4899',
                        '#f59e0b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Initialize hourly distribution bar chart
     */
    initHourlyChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Conversations',
                    data: Array(24).fill(0),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, labels, data) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    /**
     * Update hourly distribution chart
     */
    updateHourlyChart(canvasId, hourlyData) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        const data = Array(24).fill(0);
        Object.entries(hourlyData).forEach(([hour, count]) => {
            data[parseInt(hour)] = count;
        });

        chart.data.datasets[0].data = data;
        chart.update();
    }

    /**
     * Destroy chart
     */
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(id => this.destroyChart(id));
    }
}

// Export singleton instance
const chartManager = new ChartManager();
