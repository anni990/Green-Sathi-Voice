/**
 * DashboardController - Handles dashboard page logic
 */
class DashboardController {
    constructor() {
        this.charts = {
            userRegistration: null,
            language: null
        };
    }

    /**
     * Initialize and load dashboard data
     */
    async loadData() {
        try {
            // Show loading state
            this.showLoading();

            // Fetch dashboard stats
            const response = await adminApiService.getDashboardStats();

            if (response.success) {
                const { users, conversations, system } = response.data;

                // Update stat cards
                this.updateStats(users, conversations);

                // Initialize and update charts
                this.initCharts();
                this.updateCharts(users, conversations);

                // Update active users table
                const activeUsers = (conversations && conversations.active_users) ? conversations.active_users : [];
                this.updateActiveUsersTable(activeUsers);
            } else {
                showNotification('Failed to load dashboard data', 'error');
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
            showNotification('Error loading dashboard', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update stat cards
     */
    updateStats(users, conversations) {
        document.getElementById('totalUsers').textContent = users.total_users || 0;
        document.getElementById('totalConversations').textContent = conversations.total_conversations || 0;
        document.getElementById('activeDevices').textContent = users.total_users > 0 ? Math.ceil(users.total_users * 0.8) : 0; // Placeholder
        document.getElementById('avgConversations').textContent = 
            users.total_users > 0 
                ? Math.round((conversations.total_conversations / users.total_users) * 10) / 10 
                : 0;
    }

    /**
     * Initialize charts
     */
    initCharts() {
        if (!this.charts.userRegistration) {
            this.charts.userRegistration = chartManager.initUserRegistrationChart('userRegistrationChart');
        }
        if (!this.charts.language) {
            this.charts.language = chartManager.initLanguageChart('languageChart');
        }
    }

    /**
     * Update charts with data
     */
    updateCharts(users, conversations) {
        // Update user registration chart
        if (users.daily_users && users.daily_users.length > 0) {
            const labels = users.daily_users.map(d => d._id);
            const data = users.daily_users.map(d => d.count);
            chartManager.updateChart('userRegistrationChart', labels, data);
        } else {
            chartManager.updateChart('userRegistrationChart', ['No data'], [0]);
        }

        // Update language distribution chart
        if (users.language_stats && users.language_stats.length > 0) {
            const labels = users.language_stats.map(l => l._id || 'Unknown');
            const data = users.language_stats.map(l => l.count);
            chartManager.updateChart('languageChart', labels, data);
        } else {
            chartManager.updateChart('languageChart', ['No data'], [0]);
        }
    }

    /**
     * Update active users table
     */
    updateActiveUsersTable(activeUsers) {
        const tableBody = document.getElementById('activeUsersTable');
        
        if (!activeUsers || activeUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-8 text-center text-gray-500">
                        <i class="fas fa-users text-4xl mb-2"></i>
                        <p>No active users yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = activeUsers.slice(0, 10).map(user => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4">
                    <div class="font-medium text-gray-800">${tableRenderer.escapeHtml(user.name || 'Unknown')}</div>
                </td>
                <td class="py-3 px-4 text-gray-600">${tableRenderer.escapeHtml(user.phone || 'N/A')}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${tableRenderer.getLanguageBadgeClass(user.language)}">
                        ${tableRenderer.escapeHtml(user.language || 'Unknown')}
                    </span>
                </td>
                <td class="py-3 px-4 text-gray-600">${user.conversation_count || 0}</td>
            </tr>
        `).join('');
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tableBody = document.getElementById('activeUsersTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-8 text-center text-gray-500">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Loading...</p>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Loading hidden by data update
    }
}
