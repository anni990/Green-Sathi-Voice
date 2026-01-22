/**
 * UsersController - Handles users page logic
 */
class UsersController {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
        this.searchTerm = '';
        this.searchTimeout = null;
    }

    /**
     * Initialize page
     */
    init() {
        this.setupSearchHandler();
        this.loadData();
    }

    /**
     * Setup search input handler
     */
    setupSearchHandler() {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                
                // Debounce search
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadData();
                }, 500);
            });
        }
    }

    /**
     * Load users data
     */
    async loadData() {
        try {
            this.showLoading();

            const response = await adminApiService.getUsers(this.currentPage, this.perPage, this.searchTerm);

            if (response.success) {
                const { users, total, page, total_pages } = response.data;

                this.updateTable(users);
                this.updatePagination(total, page, total_pages);
            } else {
                showNotification('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Users load error:', error);
            showNotification('Error loading users', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update users table
     */
    updateTable(users) {
        const tableBody = document.getElementById('usersTable');
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-gray-500">
                        <i class="fas fa-users text-4xl mb-2"></i>
                        <p>${this.searchTerm ? 'No users found' : 'No users registered yet'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-800">${tableRenderer.escapeHtml(user.name || 'Unknown')}</div>
                </td>
                <td class="py-4 px-6 text-gray-600">${tableRenderer.escapeHtml(user.phone || 'N/A')}</td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${tableRenderer.getLanguageBadgeClass(user.language)}">
                        ${tableRenderer.escapeHtml(user.language || 'Unknown')}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-600">
                    ${tableRenderer.formatDate(user.created_at)}
                </td>
                <td class="py-4 px-6">
                    <button 
                        onclick="usersController.showUserConversations('${user._id}', '${tableRenderer.escapeHtml(user.name || 'Unknown')}')"
                        class="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                        <i class="fas fa-comments mr-1"></i>Conversations
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Update pagination
     */
    updatePagination(total, currentPage, totalPages) {
        // Update pagination info
        tableRenderer.renderPaginationInfo(
            'usersShowingStart',
            'usersShowingEnd',
            'usersTotal',
            currentPage,
            this.perPage,
            total
        );

        // Update pagination buttons
        tableRenderer.renderPagination(
            'usersPagination',
            currentPage,
            totalPages,
            'usersController.goToPage'
        );
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadData();
    }

    /**
     * Show user conversations modal
     */
    showUserConversations(userId, userName) {
        modalManager.showUserConversations(userId, userName);
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tableBody = document.getElementById('usersTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-gray-500">
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
