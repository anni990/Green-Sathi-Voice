// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.usersCurrentPage = 1;
        this.usersPerPage = 10;
        this.userSearchTerm = '';
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.initializeCharts();
        
        // Determine which section to load based on current URL or default to dashboard
        const currentSection = this.getCurrentSectionFromURL() || 'dashboard';
        await this.loadSection(currentSection);
    }

    bindEvents() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.loadSection(section);
                }
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshCurrentSection());
        }

        // User search
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            let searchTimeout;
            userSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.userSearchTerm = e.target.value;
                    this.usersCurrentPage = 1;
                    this.loadUsers();
                }, 300);
            });
        }

        // Password change form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // User modal
        const closeUserModal = document.getElementById('closeUserModal');
        if (closeUserModal) {
            closeUserModal.addEventListener('click', () => this.closeUserModal());
        }

        // Close modal on outside click
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.addEventListener('click', (e) => {
                if (e.target === userModal) {
                    this.closeUserModal();
                }
            });
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        
        sidebar.classList.add('mobile-open');
        overlay.classList.add('show');
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.remove('show');
    }

    getCurrentSectionFromURL() {
        // Extract section from URL hash or path
        const hash = window.location.hash.replace('#', '');
        const path = window.location.pathname;
        
        if (hash) return hash;
        if (path.includes('/admin/dashboard')) return 'dashboard';
        if (path.includes('/admin/users')) return 'users';
        if (path.includes('/admin/conversations')) return 'conversations';
        if (path.includes('/admin/analytics')) return 'analytics';
        if (path.includes('/admin/settings')) return 'settings';
        
        return 'dashboard'; // default
    }

    async loadSection(section) {
        // Always load data, even if it's the same section (for initial load)
        const forceLoad = section === this.currentSection && this.currentSection === 'dashboard';
        
        if (section === this.currentSection && !forceLoad) return;

        // Update active sidebar item
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const sectionElement = document.querySelector(`[data-section="${section}"]`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        // Hide all sections
        document.querySelectorAll('[id$="Section"]').forEach(el => {
            el.classList.add('hidden');
        });

        // Update header
        this.updateHeader(section);

        // Show loading
        this.showLoading();

        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'conversations':
                    await this.loadConversations();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'settings':
                    this.loadSettings();
                    break;
            }

            // Show section
            document.getElementById(`${section}Section`).classList.remove('hidden');
            document.getElementById(`${section}Section`).classList.add('fade-in');
            
            this.currentSection = section;
        } catch (error) {
            console.error(`Error loading ${section}:`, error);
            this.showNotification('Error loading section', 'error');
        } finally {
            this.hideLoading();
        }

        // Close mobile sidebar
        this.closeMobileSidebar();
    }

    updateHeader(section) {
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            conversations: 'Conversations',
            analytics: 'Analytics',
            settings: 'Settings'
        };

        const subtitles = {
            dashboard: 'Welcome to the admin panel',
            users: 'Manage registered users',
            conversations: 'View conversation history',
            analytics: 'Detailed analytics and insights',
            settings: 'System configuration'
        };

        document.getElementById('pageTitle').textContent = titles[section] || section;
        document.getElementById('pageSubtitle').textContent = subtitles[section] || '';
    }

    async refreshCurrentSection() {
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        icon.classList.add('animate-spin');
        
        try {
            await this.loadSection(this.currentSection);
        } finally {
            setTimeout(() => {
                icon.classList.remove('animate-spin');
            }, 500);
        }
    }

    async loadDashboard() {
        try {
            console.log('Loading dashboard data...');
            const response = await fetch('/admin/api/dashboard');
            const data = await response.json();
            
            console.log('Dashboard API response:', data);

            if (data.success) {
                // Handle the data structure from admin service
                const dashboardData = {
                    total_users: data.data.users?.total_users || 0,
                    total_conversations: data.data.conversations?.total_conversations || 0,
                    recent_users: data.data.users?.recent_users || 0,
                    daily_registrations: data.data.users?.daily_users || [],
                    language_distribution: data.data.users?.language_stats || [],
                    most_active_users: [] // We'll load this separately
                };
                
                console.log('Processed dashboard data:', dashboardData);
                
                this.updateDashboardStats(dashboardData);
                this.updateCharts(dashboardData);
                
                // Load most active users separately
                await this.loadMostActiveUsers();
            } else {
                throw new Error(data.message || 'Failed to load dashboard');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showNotification(`Failed to load dashboard data: ${error.message}`, 'error');
        }
    }

    async loadMostActiveUsers() {
        try {
            const response = await fetch('/admin/api/users?limit=5');
            const data = await response.json();
            
            if (data.success) {
                this.updateActiveUsersTable(data.data.users || []);
            }
        } catch (error) {
            console.error('Error loading most active users:', error);
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalUsers').textContent = data.total_users || 0;
        document.getElementById('totalConversations').textContent = data.total_conversations || 0;
        document.getElementById('recentUsers').textContent = data.recent_users || 0;
        document.getElementById('avgConversations').textContent = 
            data.total_users > 0 ? Math.round((data.total_conversations / data.total_users) * 10) / 10 : 0;
    }

    initializeCharts() {
        // User Registration Chart
        const userCtx = document.getElementById('userRegistrationChart');
        if (userCtx) {
            this.charts.userRegistration = new Chart(userCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'New Users',
                        data: [],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
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
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Language Distribution Chart
        const langCtx = document.getElementById('languageChart');
        if (langCtx) {
            this.charts.language = new Chart(langCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#059669', '#ea580c', '#3b82f6', '#8b5cf6', 
                            '#ef4444', '#f59e0b', '#10b981', '#f97316'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    updateCharts(data) {
        // Update user registration chart
        if (this.charts.userRegistration && data.daily_registrations && data.daily_registrations.length > 0) {
            const dates = data.daily_registrations.map(item => {
                const date = new Date(item._id || item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const counts = data.daily_registrations.map(item => item.count);

            this.charts.userRegistration.data.labels = dates;
            this.charts.userRegistration.data.datasets[0].data = counts;
            this.charts.userRegistration.update();
        } else if (this.charts.userRegistration) {
            // Show empty chart with message
            this.charts.userRegistration.data.labels = ['No Data'];
            this.charts.userRegistration.data.datasets[0].data = [0];
            this.charts.userRegistration.update();
        }

        // Update language distribution chart
        if (this.charts.language && data.language_distribution && data.language_distribution.length > 0) {
            const languages = data.language_distribution.map(item => item._id || 'Unknown');
            const counts = data.language_distribution.map(item => item.count);

            this.charts.language.data.labels = languages;
            this.charts.language.data.datasets[0].data = counts;
            this.charts.language.update();
        } else if (this.charts.language) {
            // Show empty chart with message
            this.charts.language.data.labels = ['No Data'];
            this.charts.language.data.datasets[0].data = [0];
            this.charts.language.update();
        }
    }

    updateActiveUsersTable(users) {
        const tableBody = document.getElementById('activeUsersTable');
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users text-4xl text-gray-300 mb-2"></i>
                            <p>No users found</p>
                            <p class="text-sm">Users will appear here once they register</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4">
                    <div class="font-medium text-gray-800">${this.escapeHtml(user.name || 'Unknown')}</div>
                </td>
                <td class="py-3 px-4 text-gray-600">${this.escapeHtml(user.phone || 'N/A')}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getLanguageBadgeClass(user.language)}">
                        ${this.escapeHtml(user.language || 'Unknown')}
                    </span>
                </td>
                <td class="py-3 px-4 text-gray-600">${user.conversation_count || 0}</td>
            </tr>
        `).join('');
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams({
                page: this.usersCurrentPage,
                limit: this.usersPerPage
            });
            
            // Add search if provided
            if (this.userSearchTerm) {
                params.append('search', this.userSearchTerm);
            }

            const response = await fetch(`/admin/api/users?${params}`);
            const data = await response.json();

            if (data.success) {
                // Handle the actual data structure returned by admin service
                const users = data.data.users || [];
                const total = data.data.total || 0;
                const totalPages = data.data.total_pages || 1;
                
                this.updateUsersTable(users);
                this.updateUsersPagination(total, this.usersCurrentPage, totalPages);
            } else {
                throw new Error(data.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    updateUsersTable(users) {
        const tableBody = document.getElementById('usersTable');
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">No users found</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-800">${this.escapeHtml(user.name || 'Unknown')}</div>
                </td>
                <td class="py-4 px-6 text-gray-600">${this.escapeHtml(user.phone || 'N/A')}</td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getLanguageBadgeClass(user.language)}">
                        ${this.escapeHtml(user.language || 'Unknown')}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-600">
                    ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </td>
                <td class="py-4 px-6">
                    <button 
                        onclick="window.adminDashboard.showUserConversations('${user._id}', '${this.escapeHtml(user.name)}')"
                        class="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                        Conversations
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateUsersPagination(total, currentPage, totalPages) {
        const start = (currentPage - 1) * this.usersPerPage + 1;
        const end = Math.min(currentPage * this.usersPerPage, total);

        document.getElementById('usersShowingStart').textContent = total > 0 ? start : 0;
        document.getElementById('usersShowingEnd').textContent = end;
        document.getElementById('usersTotal').textContent = total;

        // Update pagination buttons
        const pagination = document.getElementById('usersPagination');
        let paginationHTML = '';

        // Previous button
        if (currentPage > 1) {
            paginationHTML += `
                <button 
                    onclick="adminDashboard.goToUsersPage(${currentPage - 1})"
                    class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Previous
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            paginationHTML += `
                <button 
                    onclick="adminDashboard.goToUsersPage(${i})"
                    class="px-3 py-2 text-sm rounded-lg ${isActive 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white border border-gray-300 hover:bg-gray-50'}"
                >
                    ${i}
                </button>
            `;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `
                <button 
                    onclick="adminDashboard.goToUsersPage(${currentPage + 1})"
                    class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Next
                </button>
            `;
        }

        pagination.innerHTML = paginationHTML;
    }

    goToUsersPage(page) {
        this.usersCurrentPage = page;
        this.loadUsers();
    }

    // This method is removed - using the paginated version below

    async viewUser(userId) {
        // Redirect to showUserConversations for backward compatibility
        const userResponse = await fetch(`/admin/api/users/${userId}`);
        const userData = await userResponse.json();
        if (userData.success) {
            this.showUserConversations(userId, userData.data.name);
        }
    }

    // This method is removed - using the paginated modal version below

    async loadMoreConversations(userId) {
        // This method can be implemented later for pagination
        this.showNotification('Loading more conversations...', 'info');
    }

    showUserModal(user) {
        // Keep this method for backward compatibility but redirect to conversations
        if (user && user._id) {
            this.showUserConversations(user._id, user.name);
        }
    }

    closeUserModal() {
        document.getElementById('userModal').classList.add('hidden');
    }

    async loadConversations(page = 1) {
        try {
            const response = await fetch(`/admin/api/conversations?page=${page}&limit=20`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load conversations');
            }
            
            const conversationsData = data.data;
            this.updateConversationsTable(conversationsData.conversations || [], conversationsData);
            this.showNotification('Conversations loaded successfully', 'success');
            
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showNotification('Failed to load conversations', 'error');
        }
    }
    
    updateConversationsTable(conversations, paginationData = null) {
        const conversationsSection = document.getElementById('conversationsSection');
        if (!conversationsSection) {
            console.error('Conversations section not found in HTML');
            return;
        }
        
        // Clear and rebuild the conversations section content
        if (conversations.length === 0) {
            conversationsSection.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <h2 class="text-xl font-bold text-gray-800">Conversations</h2>
                </div>
                <div class="glass-card rounded-xl p-8 text-center">
                    <i class="fas fa-comments text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600 mb-2">No Conversations Found</h3>
                    <p class="text-gray-500">No conversation data is available yet.</p>
                </div>
            `;
            return;
        }

        const totalText = paginationData ? paginationData.total : conversations.length;
        
        conversationsSection.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <h2 class="text-xl font-bold text-gray-800">Conversations</h2>
                <div class="flex items-center space-x-4">
                    <span class="text-sm text-gray-600">Total Conversations: ${totalText}</span>
                    <button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                        Export Data
                    </button>
                </div>
            </div>
            <div class="glass-card rounded-xl overflow-hidden">
                <div class="bg-gradient-to-r from-green-50 to-orange-50 p-6 border-b">
                    <h3 class="text-lg font-bold text-gray-800">Recent Conversations</h3>
                    <p class="text-gray-600 text-sm mt-1">Latest conversations across all users</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full table-auto">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="text-left py-4 px-6 font-medium text-gray-700">User</th>
                                <th class="text-left py-4 px-6 font-medium text-gray-700">User Input</th>
                                <th class="text-left py-4 px-6 font-medium text-gray-700">Bot Response</th>
                                <th class="text-left py-4 px-6 font-medium text-gray-700">Language</th>
                                <th class="text-left py-4 px-6 font-medium text-gray-700">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${conversations.map(conversation => `
                                <tr class="border-b border-gray-100 hover:bg-gray-50">
                                    <td class="py-4 px-6">
                                        <div>
                                            <div class="font-medium text-gray-900">${this.escapeHtml(conversation.user_name || 'Unknown')}</div>
                                            <div class="text-sm text-gray-500">${this.escapeHtml(conversation.user_phone || 'N/A')}</div>
                                        </div>
                                    </td>
                                    <td class="py-4 px-6">
                                        <div class="max-w-xs">
                                            <p class="text-sm text-gray-800 truncate" title="${this.escapeHtml(conversation.user_input || 'No input')}">
                                                ${this.truncateText(conversation.user_input || 'No input', 50)}
                                            </p>
                                        </div>
                                    </td>
                                    <td class="py-4 px-6">
                                        <div class="max-w-xs">
                                            <p class="text-sm text-gray-600 truncate" title="${this.escapeHtml(conversation.bot_response || 'No response')}">
                                                ${this.truncateText(conversation.bot_response || 'No response', 50)}
                                            </p>
                                        </div>
                                    </td>
                                    <td class="py-4 px-6">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            ${this.escapeHtml(conversation.user_language || 'Unknown')}
                                        </span>
                                    </td>
                                    <td class="py-4 px-6 text-sm text-gray-500">
                                        ${conversation.timestamp ? new Date(conversation.timestamp).toLocaleString() : 'Unknown'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div id="conversationsPagination"></div>
            </div>
        `;
        
        // Update pagination if data is provided
        if (paginationData) {
            this.renderConversationsPagination(paginationData);
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/admin/api/analytics');
            const data = await response.json();
            
            if (data.success) {
                const analyticsData = data.data;
                
                // Display analytics data
                this.displayAnalytics(analyticsData);
                this.showNotification('Analytics loaded successfully', 'success');
            } else {
                throw new Error(data.message || 'Failed to load analytics');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showNotification('Failed to load analytics', 'error');
        }
    }
    
    displayAnalytics(analytics) {
        console.log('Analytics data:', analytics);
        
        // Create enhanced analytics display
        const analyticsSection = document.getElementById('analyticsSection');
        if (analyticsSection) {
            analyticsSection.innerHTML = `
                <div class="space-y-6">
                    <!-- Analytics Header -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <h2 class="text-xl font-bold text-gray-800">Analytics Dashboard</h2>
                        <div class="flex items-center space-x-2">
                            <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                Last ${analytics.period_days || 30} Days
                            </span>
                            <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                Export Report
                            </button>
                        </div>
                    </div>

                    <!-- Key Metrics Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="glass-card rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-blue-600">Total Conversations</p>
                                    <p class="text-3xl font-bold text-blue-900">${analytics.total_conversations || 0}</p>
                                </div>
                                <div class="p-3 bg-blue-500 rounded-full">
                                    <i class="fas fa-comments text-white text-xl"></i>
                                </div>
                            </div>
                            <div class="mt-4">
                                <span class="text-xs text-blue-600">📈 Active conversations</span>
                            </div>
                        </div>

                        <div class="glass-card rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-green-600">Avg Response Length</p>
                                    <p class="text-3xl font-bold text-green-900">${analytics.avg_response_length || 0}</p>
                                </div>
                                <div class="p-3 bg-green-500 rounded-full">
                                    <i class="fas fa-chart-line text-white text-xl"></i>
                                </div>
                            </div>
                            <div class="mt-4">
                                <span class="text-xs text-green-600">📝 Characters per response</span>
                            </div>
                        </div>

                        <div class="glass-card rounded-xl p-6 bg-gradient-to-br from-purple-50 to-purple-100">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-purple-600">Peak Activity Hour</p>
                                    <p class="text-3xl font-bold text-purple-900">${this.getPeakHour(analytics.hourly_distribution)}</p>
                                </div>
                                <div class="p-3 bg-purple-500 rounded-full">
                                    <i class="fas fa-clock text-white text-xl"></i>
                                </div>
                            </div>
                            <div class="mt-4">
                                <span class="text-xs text-purple-600">⏰ Most active time</span>
                            </div>
                        </div>

                        <div class="glass-card rounded-xl p-6 bg-gradient-to-br from-orange-50 to-orange-100">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-orange-600">Analysis Period</p>
                                    <p class="text-3xl font-bold text-orange-900">${analytics.period_days || 30}</p>
                                </div>
                                <div class="p-3 bg-orange-500 rounded-full">
                                    <i class="fas fa-calendar text-white text-xl"></i>
                                </div>
                            </div>
                            <div class="mt-4">
                                <span class="text-xs text-orange-600">📅 Days analyzed</span>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Hourly Distribution Chart -->
                        <div class="glass-card rounded-xl p-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-4">Hourly Activity Distribution</h3>
                            ${this.createHourlyDistributionChart(analytics.hourly_distribution)}
                        </div>

                        <!-- Activity Summary -->
                        <div class="glass-card rounded-xl p-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-4">Activity Summary</h3>
                            ${this.createActivitySummary(analytics)}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    getPeakHour(hourlyData) {
        if (!hourlyData || Object.keys(hourlyData).length === 0) {
            return 'N/A';
        }
        
        const peakHour = Object.keys(hourlyData).reduce((peak, hour) => {
            return hourlyData[hour] > (hourlyData[peak] || 0) ? hour : peak;
        });
        
        return `${peakHour}:00`;
    }

    createActivitySummary(analytics) {
        const totalConversations = analytics.total_conversations || 0;
        const avgResponseLength = analytics.avg_response_length || 0;
        const periodDays = analytics.period_days || 30;
        const dailyAvg = totalConversations > 0 ? (totalConversations / periodDays).toFixed(1) : 0;
        
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span class="font-medium text-gray-700">Daily Average</span>
                    </div>
                    <span class="text-lg font-bold text-gray-900">${dailyAvg}</span>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-gray-700">Response Quality</span>
                    </div>
                    <span class="text-lg font-bold text-gray-900">${avgResponseLength > 50 ? 'Detailed' : avgResponseLength > 20 ? 'Moderate' : 'Concise'}</span>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span class="font-medium text-gray-700">Activity Level</span>
                    </div>
                    <span class="text-lg font-bold text-gray-900">${totalConversations > 100 ? 'High' : totalConversations > 20 ? 'Medium' : 'Low'}</span>
                </div>
                
                <div class="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-2">📊 Insights</h4>
                    <ul class="text-sm text-gray-600 space-y-2">
                        <li>• ${totalConversations > 0 ? `${totalConversations} conversations analyzed` : 'No conversations to analyze'}</li>
                        <li>• ${avgResponseLength > 0 ? `Average ${avgResponseLength} characters per response` : 'No response data available'}</li>
                        <li>• ${dailyAvg > 0 ? `${dailyAvg} conversations per day on average` : 'No daily activity recorded'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    createHourlyDistributionChart(hourlyData) {
        if (!hourlyData || Object.keys(hourlyData).length === 0) {
            return `
                <div class="p-8 text-center">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-chart-bar text-4xl"></i>
                    </div>
                    <p class="text-gray-500">No hourly distribution data available</p>
                    <p class="text-sm text-gray-400 mt-2">Data will appear here once conversations are recorded</p>
                </div>
            `;
        }
        
        // Create all 24 hours with default 0 values
        const allHours = Array.from({length: 24}, (_, i) => i);
        const maxCount = Math.max(...Object.values(hourlyData));
        
        return `
            <div class="space-y-3">
                <div class="grid grid-cols-12 gap-1">
                    ${allHours.map(hour => {
                        const count = hourlyData[hour] || 0;
                        const height = maxCount > 0 ? Math.max(10, (count / maxCount) * 100) : 10;
                        const intensity = count > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
                        
                        return `
                            <div class="text-center">
                                <div class="mb-1">
                                    <div class="w-full bg-gray-200 rounded-sm overflow-hidden" style="height: 80px; display: flex; align-items: end;">
                                        <div 
                                            class="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-sm transition-all duration-300"
                                            style="height: ${height}%; opacity: ${intensity / 100}"
                                            title="${hour}:00 - ${count} conversations"
                                        ></div>
                                    </div>
                                </div>
                                <div class="text-xs text-gray-600">${hour}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>11 PM</span>
                </div>
                
                ${maxCount > 0 ? `
                    <div class="flex items-center justify-between text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
                        <span>📈 Peak: ${this.getPeakHour(hourlyData)}</span>
                        <span>📊 Max: ${maxCount} conversations</span>
                        <span>📅 Total Hours: ${Object.keys(hourlyData).length}/24</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    loadSettings() {
        // Settings section is already in HTML, no additional loading needed
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const response = await fetch('/admin/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Password changed successfully', 'success');
                document.getElementById('changePasswordForm').reset();
            } else {
                throw new Error(data.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showNotification(error.message, 'error');
        }
    }

    getLanguageBadgeClass(language) {
        const classes = {
            'hindi': 'bg-green-100 text-green-800',
            'english': 'bg-blue-100 text-blue-800',
            'bengali': 'bg-purple-100 text-purple-800',
            'telugu': 'bg-orange-100 text-orange-800',
            'marathi': 'bg-red-100 text-red-800',
            'tamil': 'bg-yellow-100 text-yellow-800'
        };
        return classes[language?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
            warning: 'bg-yellow-500 text-white'
        };

        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${this.escapeHtml(message)}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    renderConversationsPagination(paginationData) {
        const paginationContainer = document.getElementById('conversationsPagination');
        if (!paginationContainer || !paginationData) {
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        const { page, pages, total } = paginationData;
        
        if (pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div class="flex justify-between flex-1 sm:hidden">
                    <button ${page <= 1 ? 'disabled' : ''} 
                            onclick="window.adminDashboard.loadConversations(${page - 1})" 
                            class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        Previous
                    </button>
                    <button ${page >= pages ? 'disabled' : ''} 
                            onclick="window.adminDashboard.loadConversations(${page + 1})" 
                            class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        Next
                    </button>
                </div>
                <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            Showing <span class="font-medium">${((page - 1) * 20) + 1}</span> to 
                            <span class="font-medium">${Math.min(page * 20, total)}</span> of 
                            <span class="font-medium">${total}</span> conversations
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        `;

        // Previous button
        paginationHTML += `
            <button ${page <= 1 ? 'disabled' : ''} 
                    onclick="window.adminDashboard.loadConversations(${page - 1})" 
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === page;
            paginationHTML += `
                <button onclick="window.adminDashboard.loadConversations(${i})" 
                        class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 ${
                            isActive 
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' 
                                : 'text-gray-700'
                        }">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button ${page >= pages ? 'disabled' : ''} 
                    onclick="window.adminDashboard.loadConversations(${page + 1})" 
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
            </button>
                        </nav>
                    </div>
                </div>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    async showUserConversations(userId, userName, page = 1) {
        try {
            console.log(`Loading conversations for user ${userId} (${userName}), page ${page}`);
            const response = await fetch(`/admin/api/users/${userId}/conversations?page=${page}&limit=10`);
            const data = await response.json();
            
            console.log('Conversations API response:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load user conversations');
            }
            
            const conversationsData = data.data;
            console.log('Showing conversations modal with data:', conversationsData);
            this.showConversationsModal(userName, conversationsData.conversations || [], conversationsData, userId);
            
        } catch (error) {
            console.error('Error loading user conversations:', error);
            this.showNotification(`Failed to load user conversations: ${error.message}`, 'error');
        }
    }

    showConversationsModal(userName, conversations, paginationData = null, userId = null) {
        console.log(`Showing modal for ${userName} with ${conversations.length} conversations`);
        
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const content = document.getElementById('userModalContent');
        
        if (!modal || !title || !content) {
            console.error('Modal elements not found:', { modal: !!modal, title: !!title, content: !!content });
            return;
        }
        
        title.textContent = `${userName}'s Conversations`;
        
        if (conversations.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-500">
                        <i class="fas fa-comments text-4xl mb-4"></i>
                        <p>No conversations found for this user.</p>
                    </div>
                </div>
            `;
        } else {
            let conversationsHTML = `
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    ${conversations.map((conversation, index) => {
                        const timestamp = new Date(conversation.timestamp).toLocaleString();
                        const globalIndex = paginationData ? ((paginationData.page - 1) * 10) + index + 1 : index + 1;
                        return `
                            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="text-sm font-medium text-gray-600">Conversation ${globalIndex}</span>
                                    <span class="text-xs text-gray-500">${timestamp}</span>
                                </div>
                                <div class="space-y-2">
                                    ${conversation.session_id ? `<div class="text-xs text-gray-500 mb-1">Session: ${conversation.session_id.substring(0, 8)}...</div>` : ''}
                                    <div class="p-2 bg-blue-100 rounded">
                                        <strong class="text-blue-800">User:</strong>
                                        <p class="text-blue-700 mt-1">${this.escapeHtml(conversation.user_input || 'N/A')}</p>
                                    </div>
                                    <div class="p-2 bg-green-100 rounded">
                                        <strong class="text-green-800">Bot:</strong>
                                        <p class="text-green-700 mt-1">${this.escapeHtml(conversation.bot_response || 'N/A')}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Add pagination for user conversations
            if (paginationData && paginationData.pages > 1 && userId) {
                conversationsHTML += this.renderUserConversationsPagination(paginationData, userId, userName);
            }
            
            content.innerHTML = conversationsHTML;
        }
        
        console.log('Showing modal by removing hidden class');
        modal.classList.remove('hidden');
    }
    
    renderUserConversationsPagination(paginationData, userId, userName) {
        const { page, pages, total } = paginationData;
        
        let paginationHTML = `
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-700">
                        Showing ${((page - 1) * 10) + 1} to ${Math.min(page * 10, total)} of ${total} conversations
                    </div>
                    <div class="flex space-x-2">
        `;
        
        // Previous button
        if (page > 1) {
            paginationHTML += `
                <button onclick="window.adminDashboard.showUserConversations('${userId}', '${userName}', ${page - 1})" 
                        class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    Previous
                </button>
            `;
        }
        
        // Current page indicator
        paginationHTML += `
            <span class="px-3 py-1 text-sm bg-indigo-500 text-white rounded">
                ${page} / ${pages}
            </span>
        `;
        
        // Next button
        if (page < pages) {
            paginationHTML += `
                <button onclick="window.adminDashboard.showUserConversations('${userId}', '${userName}', ${page + 1})" 
                        class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    Next
                </button>
            `;
        }
        
        paginationHTML += `
                    </div>
                </div>
            </div>
        `;
        
        return paginationHTML;
    }

    async logout() {
        try {
            const response = await fetch('/admin/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear any local data
                this.charts = {};
                
                // Show success message
                this.showNotification('Logged out successfully', 'success');
                
                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1000);
            } else {
                throw new Error(data.message || 'Logout failed');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            this.showNotification('Logout failed', 'error');
            // Still redirect to login page as fallback
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 1500);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Handle authentication errors
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('401') || event.reason?.message?.includes('Unauthorized')) {
        window.location.href = '/admin/login';
    }
});