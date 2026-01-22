/**
 * TableRenderer - Reusable table and pagination rendering
 */
class TableRenderer {
    /**
     * Render pagination controls
     */
    renderPagination(containerId, currentPage, totalPages, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';

        // Previous button
        if (currentPage > 1) {
            html += `
                <button onclick="${onPageChange}(${currentPage - 1})" 
                    class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        } else {
            html += `
                <button disabled class="px-3 py-1 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `
                    <button class="px-3 py-1 rounded-lg bg-green-600 text-white">
                        ${i}
                    </button>
                `;
            } else {
                html += `
                    <button onclick="${onPageChange}(${i})" 
                        class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">
                        ${i}
                    </button>
                `;
            }
        }

        // Next button
        if (currentPage < totalPages) {
            html += `
                <button onclick="${onPageChange}(${currentPage + 1})" 
                    class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        } else {
            html += `
                <button disabled class="px-3 py-1 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * Render pagination info (Showing X to Y of Z)
     */
    renderPaginationInfo(startId, endId, totalId, page, perPage, total) {
        const start = Math.min((page - 1) * perPage + 1, total);
        const end = Math.min(page * perPage, total);

        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        const totalEl = document.getElementById(totalId);

        if (startEl) startEl.textContent = total > 0 ? start : 0;
        if (endEl) endEl.textContent = end;
        if (totalEl) totalEl.textContent = total;
    }

    /**
     * Get language badge class
     */
    getLanguageBadgeClass(language) {
        const badges = {
            'hindi': 'bg-green-100 text-green-800',
            'english': 'bg-blue-100 text-blue-800',
            'bengali': 'bg-orange-100 text-orange-800',
            'tamil': 'bg-purple-100 text-purple-800',
            'telugu': 'bg-pink-100 text-pink-800',
            'gujarati': 'bg-yellow-100 text-yellow-800',
            'marathi': 'bg-indigo-100 text-indigo-800'
        };
        return badges[language?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Truncate text with ellipsis
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    /**
     * Format datetime for display
     */
    formatDateTime(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}

// Export singleton instance
const tableRenderer = new TableRenderer();
