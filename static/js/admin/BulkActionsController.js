/**
 * BulkActionsController.js
 * Handles bulk delete and configure operations for devices
 */

class BulkActionsController {
    constructor() {
        this.apiService = new AdminApiService();
        this.availableSources = [];
        this.previewData = null;
        this.loadingIndicator = null;
    }

    /**
     * Initialize the controller
     */
    async init() {
        this.setupEventListeners();
        await this.loadSources();
        await this.loadStatistics();
    }

    /**
     * Setup event listeners for form elements
     */
    setupEventListeners() {
        // Delete form checkbox listeners
        const deleteBySource = document.getElementById('deleteBySource');
        const deleteSourceValue = document.getElementById('deleteSourceValue');
        
        if (deleteBySource && deleteSourceValue) {
            deleteBySource.addEventListener('change', (e) => {
                deleteSourceValue.disabled = !e.target.checked;
                if (!e.target.checked) deleteSourceValue.value = '';
            });
        }

        // Configure form checkbox listeners
        const configBySource = document.getElementById('configBySource');
        const configSourceValue = document.getElementById('configSourceValue');
        
        if (configBySource && configSourceValue) {
            configBySource.addEventListener('change', (e) => {
                configSourceValue.disabled = !e.target.checked;
                if (!e.target.checked) configSourceValue.value = '';
            });
        }

        const configByUserCount = document.getElementById('configByUserCount');
        const configMinUsers = document.getElementById('configMinUsers');
        
        if (configByUserCount && configMinUsers) {
            configByUserCount.addEventListener('change', (e) => {
                configMinUsers.disabled = !e.target.checked;
                if (!e.target.checked) configMinUsers.value = '';
            });
        }

        // Form submit listeners
        const bulkDeleteForm = document.getElementById('bulkDeleteForm');
        if (bulkDeleteForm) {
            bulkDeleteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeBulkDelete();
            });
        }

        const bulkConfigureForm = document.getElementById('bulkConfigureForm');
        if (bulkConfigureForm) {
            bulkConfigureForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeBulkConfigure();
            });
        }
    }

    /**
     * Load available sources from API
     */
    async loadSources() {
        try {
            const response = await this.apiService.getDeviceSources();
            
            if (response.success) {
                this.availableSources = response.sources || [];
                this.populateSourceDropdowns();
            } else {
                console.error('Failed to load sources:', response.error);
            }
        } catch (error) {
            console.error('Error loading sources:', error);
            showNotification('Failed to load device sources', 'error');
        }
    }

    /**
     * Populate source dropdowns with available sources
     */
    populateSourceDropdowns() {
        const deleteSourceSelect = document.getElementById('deleteSourceValue');
        const configSourceSelect = document.getElementById('configSourceValue');

        // Clear existing options (except first one)
        if (deleteSourceSelect) {
            while (deleteSourceSelect.options.length > 1) {
                deleteSourceSelect.remove(1);
            }
        }
        if (configSourceSelect) {
            while (configSourceSelect.options.length > 1) {
                configSourceSelect.remove(1);
            }
        }

        // Add source options
        this.availableSources.forEach(source => {
            if (deleteSourceSelect) {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                deleteSourceSelect.appendChild(option);
            }
            
            if (configSourceSelect) {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                configSourceSelect.appendChild(option);
            }
        });
    }

    /**
     * Load statistics for the page
     */
    async loadStatistics() {
        try {
            const response = await this.apiService.getDevices({ page: 1, limit: 1 });
            
            if (response.success && response.data) {
                document.getElementById('totalDevices').textContent = 
                    response.data.total || 0;
            }

            // Get user count
            const userResponse = await this.apiService.getUsers(1, 1);
            if (userResponse.success && userResponse.data) {
                document.getElementById('totalUsers').textContent = 
                    userResponse.data.total || 0;
            }

            // Update sources count
            document.getElementById('totalSources').textContent = 
                this.availableSources.length || 0;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Build delete criteria from form
     */
    buildDeleteCriteria() {
        const criteria = {};
        
        const bySource = document.getElementById('deleteBySource').checked;
        const sourceValue = document.getElementById('deleteSourceValue').value;
        
        if (bySource && sourceValue) {
            criteria.by_source = sourceValue;
        }

        const byUserCount = document.getElementById('deleteByUserCount').checked;
        if (byUserCount) {
            criteria.by_user_count = 'zero_users';
        }

        return criteria;
    }

    /**
     * Build configure criteria from form
     */
    buildConfigureCriteria() {
        const criteria = {};
        
        const bySource = document.getElementById('configBySource').checked;
        const sourceValue = document.getElementById('configSourceValue').value;
        
        if (bySource && sourceValue) {
            criteria.by_source = sourceValue;
        }

        const byUserCount = document.getElementById('configByUserCount').checked;
        const minUsers = document.getElementById('configMinUsers').value;
        
        if (byUserCount && minUsers) {
            criteria.by_user_count = 'min_users';
            criteria.min_users = parseInt(minUsers);
        }

        return criteria;
    }

    /**
     * Build configuration settings from form
     */
    buildConfigSettings() {
        const config = {};
        
        const pipelineType = document.getElementById('configPipelineType').value;
        if (pipelineType) {
            config.pipeline_type = pipelineType;
        }

        const llmService = document.getElementById('configLLMService').value;
        if (llmService) {
            config.llm_service = llmService;
        }

        return config;
    }

    /**
     * Preview delete operation
     */
    async previewDelete() {
        const criteria = this.buildDeleteCriteria();
        
        if (Object.keys(criteria).length === 0) {
            showNotification('Please select at least one filter criteria', 'warning');
            return;
        }

        try {
            this.showLoading('Fetching matching devices...');
            
            const response = await this.apiService.getDevices({
                page: 1,
                limit: 100,
                ...criteria
            });

            this.hideLoading();

            if (response.success && response.data) {
                this.showPreviewResults('Delete', response.data.devices, criteria);
            } else {
                showNotification(response.error || 'Failed to fetch preview', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error previewing delete:', error);
            showNotification('Failed to preview delete operation', 'error');
        }
    }

    /**
     * Preview configure operation
     */
    async previewConfigure() {
        const criteria = this.buildConfigureCriteria();
        const config = this.buildConfigSettings();
        
        if (Object.keys(criteria).length === 0) {
            showNotification('Please select at least one filter criteria', 'warning');
            return;
        }

        if (Object.keys(config).length === 0) {
            showNotification('Please select at least one configuration setting to change', 'warning');
            return;
        }

        try {
            this.showLoading('Fetching matching devices...');
            
            const response = await this.apiService.getDevices({
                page: 1,
                limit: 100,
                ...criteria
            });

            this.hideLoading();

            if (response.success && response.data) {
                this.showPreviewResults('Configure', response.data.devices, criteria, config);
            } else {
                showNotification(response.error || 'Failed to fetch preview', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error previewing configure:', error);
            showNotification('Failed to preview configure operation', 'error');
        }
    }

    /**
     * Show preview results
     */
    showPreviewResults(type, devices, criteria, config = null) {
        const previewDiv = document.getElementById('previewResults');
        const previewTitle = document.getElementById('previewTitle');
        const previewContent = document.getElementById('previewContent');

        if (!previewDiv || !previewTitle || !previewContent) return;

        previewTitle.textContent = `${type} Preview`;
        
        let html = '';

        // Show impact summary at the top
        if (type === 'Delete') {
            html += '<div class="bg-red-50 border-2 border-red-300 rounded-lg p-5 mb-4">';
            html += '<div class="flex items-center mb-3">';
            html += '<i class="fas fa-exclamation-triangle text-red-600 text-3xl mr-4"></i>';
            html += '<div>';
            html += `<h4 class="text-lg font-bold text-red-800">⚠️ ${devices.length} Devices Will Be Permanently Deleted</h4>`;
            html += '<p class="text-sm text-red-700 mt-1">This action will cascade delete all associated users and conversations. This cannot be undone!</p>';
            html += '</div>';
            html += '</div>';
            
            // Calculate total impact
            let totalUsers = 0;
            devices.forEach(device => {
                totalUsers += (device.user_count || 0);
            });
            
            html += '<div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-red-200">';
            html += '<div class="text-center">';
            html += '<p class="text-2xl font-bold text-red-800">' + devices.length + '</p>';
            html += '<p class="text-xs text-red-600">Devices to Delete</p>';
            html += '</div>';
            html += '<div class="text-center">';
            html += '<p class="text-2xl font-bold text-red-800">' + totalUsers + '</p>';
            html += '<p class="text-xs text-red-600">Users to Delete</p>';
            html += '</div>';
            html += '<div class="text-center">';
            html += '<p class="text-2xl font-bold text-red-800">~' + (totalUsers * 5) + '</p>';
            html += '<p class="text-xs text-red-600">Est. Conversations</p>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        } else if (type === 'Configure') {
            html += '<div class="bg-green-50 border-2 border-green-300 rounded-lg p-5 mb-4">';
            html += '<div class="flex items-center mb-3">';
            html += '<i class="fas fa-cog text-green-600 text-3xl mr-4"></i>';
            html += '<div>';
            html += `<h4 class="text-lg font-bold text-green-800">📝 ${devices.length} Devices Will Be Updated</h4>`;
            html += '<p class="text-sm text-green-700 mt-1">The following configuration changes will be applied to all matching devices:</p>';
            html += '</div>';
            html += '</div>';
            
            html += '<div class="mt-4 pt-4 border-t border-green-200">';
            html += '<div class="grid grid-cols-2 gap-4">';
            if (config.pipeline_type) {
                html += '<div class="bg-white rounded-lg p-3 border border-green-200">';
                html += '<p class="text-xs text-gray-600 mb-1">Pipeline Type</p>';
                html += `<p class="text-base font-semibold text-green-800">${config.pipeline_type}</p>`;
                html += '</div>';
            }
            if (config.llm_service) {
                html += '<div class="bg-white rounded-lg p-3 border border-green-200">';
                html += '<p class="text-xs text-gray-600 mb-1">LLM Service</p>';
                html += `<p class="text-base font-semibold text-green-800">${config.llm_service}</p>`;
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }

        // Show criteria
        html += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">';
        html += '<p class="font-semibold text-sm text-blue-800 mb-2">Applied Filters:</p>';
        html += '<ul class="text-sm text-blue-700 space-y-1">';
        
        if (criteria.by_source) {
            html += `<li><i class="fas fa-check-circle mr-2"></i>Source: <strong>${criteria.by_source}</strong></li>`;
        }
        if (criteria.by_user_count === 'zero_users') {
            html += '<li><i class="fas fa-check-circle mr-2"></i>Only devices with <strong>0 users</strong></li>';
        }
        if (criteria.by_user_count === 'min_users') {
            html += `<li><i class="fas fa-check-circle mr-2"></i>Devices with at least <strong>${criteria.min_users} users</strong></li>`;
        }
        
        html += '</ul>';
        html += '</div>';

        // Show devices list
        if (devices.length === 0) {
            html += '<div class="text-center py-8 text-gray-500">';
            html += '<i class="fas fa-inbox text-4xl mb-2"></i>';
            html += '<p>No devices match the selected criteria</p>';
            html += '</div>';
        } else {
            html += '<div class="overflow-x-auto">';
            html += '<table class="min-w-full divide-y divide-gray-200">';
            html += '<thead class="bg-gray-50">';
            html += '<tr>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipeline</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LLM</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody class="bg-white divide-y divide-gray-200">';
            
            devices.forEach(device => {
                html += '<tr>';
                html += `<td class="px-4 py-3 text-sm text-gray-900">${device.device_id || 'N/A'}</td>`;
                html += `<td class="px-4 py-3 text-sm text-gray-900">${device.device_name || 'Unnamed'}</td>`;
                html += `<td class="px-4 py-3 text-sm text-gray-600">${device.source || 'N/A'}</td>`;
                html += `<td class="px-4 py-3 text-sm">${device.user_count || 0}</td>`;
                
                // Show pipeline change if applicable
                if (config && config.pipeline_type && device.pipeline_type !== config.pipeline_type) {
                    html += `<td class="px-4 py-3 text-sm"><span class="line-through text-gray-400">${device.pipeline_type || 'N/A'}</span> → <span class="font-semibold text-green-600">${config.pipeline_type}</span></td>`;
                } else {
                    html += `<td class="px-4 py-3 text-sm">${device.pipeline_type || 'N/A'}</td>`;
                }
                
                // Show LLM change if applicable
                if (config && config.llm_service && device.llm_service !== config.llm_service) {
                    html += `<td class="px-4 py-3 text-sm"><span class="line-through text-gray-400">${device.llm_service || 'N/A'}</span> → <span class="font-semibold text-green-600">${config.llm_service}</span></td>`;
                } else {
                    html += `<td class="px-4 py-3 text-sm">${device.llm_service || 'N/A'}</td>`;
                }
                
                html += '</tr>';
            });
            
            html += '</tbody>';
            html += '</table>';
            html += '</div>';

            // Warning if more than 100 devices
            if (devices.length === 100) {
                html += '<div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">';
                html += '<p class="text-sm text-yellow-800"><i class="fas fa-exclamation-triangle mr-2"></i>Showing first 100 devices. There may be more matching your criteria.</p>';
                html += '</div>';
            }
        }

        previewContent.innerHTML = html;
        previewDiv.classList.remove('hidden');
        
        // Scroll to preview
        previewDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Close preview results
     */
    closePreview() {
        const previewDiv = document.getElementById('previewResults');
        if (previewDiv) {
            previewDiv.classList.add('hidden');
        }
    }

    /**
     * Execute bulk delete operation
     */
    async executeBulkDelete() {
        const criteria = this.buildDeleteCriteria();
        
        if (Object.keys(criteria).length === 0) {
            showNotification('Please select at least one filter criteria', 'warning');
            return;
        }

        // Confirmation dialog
        let criteriaDesc = [];
        if (criteria.by_source) criteriaDesc.push(`Source: ${criteria.by_source}`);
        if (criteria.by_user_count === 'zero_users') criteriaDesc.push('Only devices with 0 users');
        
        const confirmMsg = `🗑️ BULK DELETE CONFIRMATION\n\n⚠️ WARNING: This action CANNOT be undone!\n\nFilters Applied:\n${criteriaDesc.join(', ')}\n\nThis will permanently delete:\n• All matching devices\n• All users registered on those devices\n• All conversation history\n\nAre you absolutely sure?`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            this.showLoading('Deleting devices...');
            
            console.log('Bulk Delete Request:', criteria); // Debug log
            
            const response = await this.apiService.bulkDeleteDevices(criteria);

            this.hideLoading();

            if (response.success) {
                const summary = response.summary;
                const msg = `Successfully deleted: ${summary.devices_deleted} devices, ${summary.users_deleted} users, ${summary.conversations_deleted} conversations`;
                
                showNotification(msg, 'success');
                
                // Reload statistics and close preview
                this.closePreview();
                await this.loadStatistics();
                
                // Reset form
                document.getElementById('bulkDeleteForm').reset();
                document.getElementById('deleteSourceValue').disabled = true;
            } else {
                showNotification(response.error || 'Failed to delete devices', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error executing bulk delete:', error);
            showNotification('Failed to execute bulk delete operation', 'error');
        }
    }

    /**
     * Execute bulk configure operation
     */
    async executeBulkConfigure() {
        const criteria = this.buildConfigureCriteria();
        const config = this.buildConfigSettings();
        
        if (Object.keys(criteria).length === 0) {
            showNotification('Please select at least one filter criteria', 'warning');
            return;
        }

        if (Object.keys(config).length === 0) {
            showNotification('Please select at least one configuration setting to change', 'warning');
            return;
        }

        // Confirmation dialog
        let configChanges = [];
        if (config.pipeline_type) configChanges.push(`• Pipeline Type → ${config.pipeline_type}`);
        if (config.llm_service) configChanges.push(`• LLM Service → ${config.llm_service}`);
        
        let criteriaDesc = [];
        if (criteria.by_source) criteriaDesc.push(`Source: ${criteria.by_source}`);
        if (criteria.by_user_count === 'zero_users') criteriaDesc.push('Devices with 0 users');
        if (criteria.by_user_count === 'min_users') criteriaDesc.push(`Devices with ${criteria.min_users}+ users`);
        
        const confirmMsg = `⚙️ BULK CONFIGURE CONFIRMATION\n\nFilters Applied:\n${criteriaDesc.join(', ')}\n\nConfiguration Changes:\n${configChanges.join('\n')}\n\nAre you sure you want to proceed?`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            this.showLoading('Configuring devices...');
            
            console.log('Bulk Configure Request:', { criteria, config }); // Debug log
            
            const response = await this.apiService.bulkConfigureDevices(criteria, config);

            this.hideLoading();

            if (response.success) {
                let details = [];
                if (config.pipeline_type) details.push(`Pipeline: ${config.pipeline_type}`);
                if (config.llm_service) details.push(`LLM: ${config.llm_service}`);
                
                const msg = `✅ Successfully updated ${response.devices_updated} devices (${details.join(', ')})`;
                showNotification(msg, 'success');
                
                // Close preview
                this.closePreview();
                
                // Reset form
                document.getElementById('bulkConfigureForm').reset();
                document.getElementById('configSourceValue').disabled = true;
                document.getElementById('configMinUsers').disabled = true;
            } else {
                showNotification(response.error || 'Failed to configure devices', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error executing bulk configure:', error);
            showNotification('Failed to execute bulk configure operation', 'error');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        this.hideLoading(); // Remove any existing loader
        
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
        this.loadingIndicator.innerHTML = `
            <div class="bg-white rounded-lg p-6 shadow-xl">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
                    <span class="text-gray-800 font-medium">${message}</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.loadingIndicator);
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.loadingIndicator && this.loadingIndicator.parentNode) {
            this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
            this.loadingIndicator = null;
        }
    }
}
