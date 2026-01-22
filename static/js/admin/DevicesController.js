/**
 * DevicesController - Handles devices page logic
 */
class DevicesController {
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
     * Load devices data
     */
    async loadData() {
        try {
            this.showLoading();

            const response = await adminApiService.getDevices(this.currentPage, this.perPage);

            if (response.success) {
                const { devices, total, page, total_pages } = response.data;

                this.updateTable(devices);
                this.updatePagination(total, page, total_pages);
            } else {
                showNotification('Failed to load devices', 'error');
            }
        } catch (error) {
            console.error('Devices load error:', error);
            showNotification('Error loading devices', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update devices table
     */
    updateTable(devices) {
        const tableBody = document.getElementById('devicesTable');
        
        if (!devices || devices.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-gray-500">
                        <i class="fas fa-mobile-alt text-4xl mb-2"></i>
                        <p>No devices registered yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = devices.map(device => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-800">${device.device_id}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-800">${tableRenderer.escapeHtml(device.device_name)}</div>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getPipelineBadgeClass(device.pipeline_type)}">
                        ${tableRenderer.escapeHtml(device.pipeline_type || 'Library')}
                    </span>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getLLMBadgeClass(device.llm_service)}">
                        ${tableRenderer.escapeHtml(device.llm_service || 'Gemini')}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-600">
                    ${device.user_count || 0}
                </td>
                <td class="py-4 px-6">
                    <button 
                        onclick="devicesController.showDeviceDetails(${device.device_id})"
                        class="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                        <i class="fas fa-cog mr-1"></i>Configure
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
            'devicesShowingStart',
            'devicesShowingEnd',
            'devicesTotal',
            currentPage,
            this.perPage,
            total
        );

        // Update pagination buttons
        tableRenderer.renderPagination(
            'devicesPagination',
            currentPage,
            totalPages,
            'devicesController.goToPage'
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
     * Show device details modal
     */
    showDeviceDetails(deviceId) {
        modalManager.showDeviceDetails(deviceId);
    }

    /**
     * Get pipeline type badge class
     */
    getPipelineBadgeClass(pipelineType) {
        return pipelineType === 'api' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-blue-100 text-blue-800';
    }

    /**
     * Get LLM service badge class
     */
    getLLMBadgeClass(llmService) {
        const badges = {
            'gemini': 'bg-green-100 text-green-800',
            'openai': 'bg-blue-100 text-blue-800',
            'azure_openai': 'bg-indigo-100 text-indigo-800',
            'vertex': 'bg-purple-100 text-purple-800',
            'dhenu': 'bg-orange-100 text-orange-800'
        };
        return badges[llmService?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tableBody = document.getElementById('devicesTable');
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
