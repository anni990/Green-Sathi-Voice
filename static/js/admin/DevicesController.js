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

            const response = await adminApiService.getDevices({ page: this.currentPage, limit: this.perPage });

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
                    <div class="flex items-center space-x-2">
                        <button 
                            onclick="devicesController.showDeviceDetails('${device.device_id}')"
                            class="text-green-600 hover:text-green-700 font-medium text-sm"
                            title="Configure device"
                        >
                            <i class="fas fa-cog mr-1"></i>
                        </button>
                        <button 
                            onclick="devicesController.confirmDeleteDevice('${device.device_id}', '${tableRenderer.escapeHtml(device.device_name)}', ${device.user_count || 0})"
                            class="text-red-600 hover:text-red-700 font-medium text-sm"
                            title="Delete device and all associated data"
                        >
                            <i class="fas fa-trash mr-1"></i>
                        </button>
                    </div>
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

    /**
     * Confirm delete device with modal
     */
    confirmDeleteDevice(deviceId, deviceName, userCount) {
        if (typeof modalManager !== 'undefined' && modalManager.showDeleteDeviceConfirmation) {
            modalManager.showDeleteDeviceConfirmation(deviceId, deviceName, userCount);
        } else {
            // Fallback to browser confirm dialog
            const message = `⚠️ WARNING: You are about to DELETE device "${deviceName}"!\n\n` +
                `This will permanently remove:\n` +
                `• The device itself\n` +
                `• ${userCount} user(s) associated with this device\n` +
                `• ALL conversations of these users\n\n` +
                `This action CANNOT be undone!\n\n` +
                `Are you absolutely sure you want to continue?`;
            
            if (confirm(message)) {
                this.deleteDevice(deviceId);
            }
        }
    }

    /**
     * Delete device (called after confirmation)
     */
    async deleteDevice(deviceId) {
        try {
            showNotification('Deleting device...', 'info');

            const response = await adminApiService.deleteDevice(deviceId);

            if (response.success) {
                showNotification(`Device deleted successfully! Removed ${response.data.users_deleted} users and ${response.data.conversations_deleted} conversations.`, 'success');
                // Reload data after deletion
                this.loadData();
            } else {
                showNotification(response.message || 'Failed to delete device', 'error');
            }
        } catch (error) {
            console.error('Delete device error:', error);
            showNotification('Error deleting device: ' + error.message, 'error');
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        if (typeof modalManager !== 'undefined' && modalManager.showExportDevicesModal) {
            modalManager.showExportDevicesModal();
        } else {
            alert('Export functionality requires ModalManager');
        }
    }

    /**
     * Export devices with filters
     */
    async exportDevices(filters) {
        try {
            showNotification('Preparing export...', 'info');

            const response = await adminApiService.exportDevices(filters);

            if (response.success) {
                const { devices, total, filters_applied } = response.data;
                
                // Show preview modal
                if (typeof modalManager !== 'undefined' && modalManager.showExportPreview) {
                    modalManager.showExportPreview(devices, total, filters_applied);
                } else {
                    // Fallback: direct download
                    this.downloadExportData(devices, filters_applied);
                }
            } else {
                showNotification(response.message || 'Failed to export devices', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Error exporting devices: ' + error.message, 'error');
        }
    }

    /**
     * Download exported data as CSV
     */
    downloadExportData(devices, filters) {
        try {
            if (!devices || devices.length === 0) {
                showNotification('No data to export', 'warning');
                return;
            }

            // Get column headers from first device object
            const headers = Object.keys(devices[0]);
            
            // Build CSV content
            let csvContent = headers.join(',') + '\n';
            
            devices.forEach(device => {
                const row = headers.map(header => {
                    const value = device[header];
                    // Escape commas and quotes in values
                    if (value === null || value === undefined) return '';
                    const strValue = String(value);
                    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                        return '"' + strValue.replace(/"/g, '""') + '"';
                    }
                    return strValue;
                });
                csvContent += row.join(',') + '\n';
            });

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filterSuffix = filters.source && filters.source !== 'all' ? `_${filters.source}` : '';
            link.download = `devices_export${filterSuffix}_${timestamp}.csv`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showNotification(`Exported ${devices.length} devices successfully!`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            showNotification('Error downloading file', 'error');
        }
    }
}
