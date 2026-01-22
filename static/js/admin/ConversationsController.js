/**
 * ConversationsController - Handles conversations page logic
 */
class ConversationsController {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
    }

    /**
     * Initialize and load data
     */
    init() {
        this.loadData();
    }

    /**
     * Load conversations data
     */
    async loadData() {
        try {
            this.showLoading();

            const response = await adminApiService.getConversations(this.currentPage, this.perPage);

            if (response.success) {
                const { conversations, total, page, pages } = response.data;

                this.updateTable(conversations);
                this.updatePagination(total, page, pages);
            } else {
                showNotification('Failed to load conversations', 'error');
            }
        } catch (error) {
            console.error('Conversations load error:', error);
            showNotification('Error loading conversations', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update conversations table
     */
    updateTable(conversations) {
        const tableBody = document.getElementById('conversationsTable');
        
        if (!conversations || conversations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-gray-500">
                        <i class="fas fa-comments text-4xl mb-2"></i>
                        <p>No conversations yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = conversations.map(conv => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-800">${tableRenderer.escapeHtml(conv.user_name || 'Unknown')}</div>
                    <div class="text-sm text-gray-600">${tableRenderer.escapeHtml(conv.user_phone || 'N/A')}</div>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${tableRenderer.getLanguageBadgeClass(conv.user_language)}">
                        ${tableRenderer.escapeHtml(conv.user_language || 'Unknown')}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-600">
                    ${tableRenderer.escapeHtml(conv.device_name || `Device ${conv.device_id || 'N/A'}`)}
                </td>
                <td class="py-4 px-6">
                    <div class="text-sm text-gray-800">${tableRenderer.truncateText(conv.user_input, 50)}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="text-sm text-gray-600">${tableRenderer.truncateText(conv.bot_response, 50)}</div>
                </td>
                <td class="py-4 px-6 text-gray-600 text-sm">
                    ${tableRenderer.formatDateTime(conv.timestamp)}
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
            'conversationsShowingStart',
            'conversationsShowingEnd',
            'conversationsTotal',
            currentPage,
            this.perPage,
            total
        );

        // Update pagination buttons
        tableRenderer.renderPagination(
            'conversationsPagination',
            currentPage,
            totalPages,
            'conversationsController.goToPage'
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
     * Show loading state
     */
    showLoading() {
        const tableBody = document.getElementById('conversationsTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-gray-500">
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
