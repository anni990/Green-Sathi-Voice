/**
 * ModalManager - Handles modal dialogs for user/device details
 */
class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    /**
     * Show user conversations modal
     */
    async showUserConversations(userId, userName, page = 1) {
        try {
            const response = await adminApiService.getUserConversations(userId, page, 10);
            
            if (!response.success) {
                showNotification('Failed to load conversations', 'error');
                return;
            }

            const { conversations, total, pages } = response.data;

            let conversationsHtml = '';
            if (conversations.length === 0) {
                conversationsHtml = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>No conversations yet</p>
                    </div>
                `;
            } else {
                conversationsHtml = conversations.map(conv => `
                    <div class="border-b border-gray-200 pb-4 mb-4">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <p class="text-sm text-gray-600 mb-1">${tableRenderer.formatDateTime(conv.timestamp)}</p>
                                <div class="bg-blue-50 rounded-lg p-3 mb-2">
                                    <p class="text-sm font-medium text-blue-900">User:</p>
                                    <p class="text-sm text-blue-800">${tableRenderer.escapeHtml(conv.user_input)}</p>
                                </div>
                                <div class="bg-green-50 rounded-lg p-3">
                                    <p class="text-sm font-medium text-green-900">Bot:</p>
                                    <p class="text-sm text-green-800">${tableRenderer.escapeHtml(conv.bot_response)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // Pagination
            let paginationHtml = '';
            if (pages > 1) {
                paginationHtml = `
                    <div class="flex justify-center items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                        ${this.generateModalPagination(page, pages, userId, userName)}
                    </div>
                `;
            }

            const modalHtml = `
                <div id="userConversationsModal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
                    <div class="glass-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div class="p-6 border-b border-gray-200 flex-shrink-0">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-800">Conversations - ${tableRenderer.escapeHtml(userName)}</h3>
                                    <p class="text-sm text-gray-600">${total} total conversations</p>
                                </div>
                                <button onclick="modalManager.closeModal()" class="p-2 rounded-lg hover:bg-gray-100">
                                    <i class="fas fa-times text-gray-500"></i>
                                </button>
                            </div>
                        </div>
                        <div class="p-6 overflow-y-auto flex-1">
                            ${conversationsHtml}
                            ${paginationHtml}
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            this.closeModal();

            // Add new modal
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            this.currentModal = document.getElementById('userConversationsModal');

            // Close on outside click
            this.currentModal.addEventListener('click', (e) => {
                if (e.target === this.currentModal) {
                    this.closeModal();
                }
            });

        } catch (error) {
            console.error('Error showing user conversations:', error);
            showNotification('Failed to load conversations', 'error');
        }
    }

    /**
     * Show device details modal with pipeline configuration
     */
    async showDeviceDetails(deviceId) {
        try {
            const response = await adminApiService.getDeviceDetails(deviceId);
            
            if (!response.success) {
                showNotification('Failed to load device details', 'error');
                return;
            }

            const device = response.data;

            const modalHtml = `
                <div id="deviceDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
                    <div class="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div class="p-6 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-gray-800">Device Configuration</h3>
                                <button onclick="modalManager.closeModal()" class="p-2 rounded-lg hover:bg-gray-100">
                                    <i class="fas fa-times text-gray-500"></i>
                                </button>
                            </div>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p class="text-sm text-gray-600">Device ID</p>
                                    <p class="font-semibold">${device.device_id}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Device Name</p>
                                    <p class="font-semibold">${tableRenderer.escapeHtml(device.device_name)}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Registered Users</p>
                                    <p class="font-semibold">${device.user_count || 0}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Last Login</p>
                                    <p class="font-semibold">${tableRenderer.formatDateTime(device.last_login)}</p>
                                </div>
                            </div>

                            <div class="border-t border-gray-200 pt-6">
                                <h4 class="font-semibold text-gray-800 mb-4">Pipeline Configuration</h4>
                                <form id="devicePipelineForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Pipeline Type</label>
                                        <select id="pipelineType" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                            <option value="library" ${device.pipeline_type === 'library' ? 'selected' : ''}>Library (SpeechRecognition)</option>
                                            <option value="api" ${device.pipeline_type === 'api' ? 'selected' : ''}>API (External Service)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">LLM Service</label>
                                        <select id="llmService" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                            <option value="azure_openai" ${device.llm_service === 'azure_openai' ? 'selected' : ''}>Azure OpenAI (Default)</option>
                                            <option value="gemini" ${device.llm_service === 'gemini' ? 'selected' : ''}>Gemini</option>
                                            <option value="openai" ${device.llm_service === 'openai' ? 'selected' : ''}>OpenAI</option>
                                            <option value="vertex" ${device.llm_service === 'vertex' ? 'selected' : ''}>Vertex AI</option>
                                            <option value="dhenu" ${device.llm_service === 'dhenu' ? 'selected' : ''}>Dhenu</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700">
                                        <i class="fas fa-save mr-2"></i>Update Configuration
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            this.closeModal();

            // Add new modal
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            this.currentModal = document.getElementById('deviceDetailsModal');

            // Handle form submission
            document.getElementById('devicePipelineForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateDevicePipeline(
                    device.device_id,
                    document.getElementById('pipelineType').value,
                    document.getElementById('llmService').value
                );
            });

            // Close on outside click
            this.currentModal.addEventListener('click', (e) => {
                if (e.target === this.currentModal) {
                    this.closeModal();
                }
            });

        } catch (error) {
            console.error('Error showing device details:', error);
            showNotification('Failed to load device details', 'error');
        }
    }

    /**
     * Update device pipeline configuration
     */
    async updateDevicePipeline(deviceId, pipelineType, llmService) {
        try {
            const response = await adminApiService.updateDevicePipeline(deviceId, pipelineType, llmService);
            
            if (response.success) {
                showNotification('Pipeline configuration updated successfully', 'success');
                this.closeModal();
                // Trigger page refresh if needed
                if (typeof devicesController !== 'undefined') {
                    devicesController.loadData();
                }
            } else {
                showNotification(response.message || 'Update failed', 'error');
            }
        } catch (error) {
            console.error('Error updating device pipeline:', error);
            showNotification('Failed to update configuration', 'error');
        }
    }

    /**
     * Generate pagination for modal
     */
    generateModalPagination(currentPage, totalPages, userId, userName) {
        let html = '';

        if (currentPage > 1) {
            html += `<button onclick="modalManager.showUserConversations('${userId}', '${tableRenderer.escapeHtml(userName)}', ${currentPage - 1})" class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"><i class="fas fa-chevron-left"></i></button>`;
        }

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `<button class="px-3 py-1 rounded-lg bg-green-600 text-white">${i}</button>`;
            } else {
                html += `<button onclick="modalManager.showUserConversations('${userId}', '${tableRenderer.escapeHtml(userName)}', ${i})" class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">${i}</button>`;
            }
        }

        if (currentPage < totalPages) {
            html += `<button onclick="modalManager.showUserConversations('${userId}', '${tableRenderer.escapeHtml(userName)}', ${currentPage + 1})" class="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"><i class="fas fa-chevron-right"></i></button>`;
        }

        return html;
    }

    /**
     * Close current modal
     */
    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    /**
     * Show delete device confirmation modal
     */
    showDeleteDeviceConfirmation(deviceId, deviceName, userCount) {
        const modalHtml = `
            <div id="deleteDeviceModal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
                <div class="glass-card rounded-xl max-w-md w-full">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-red-600 flex items-center">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Confirm Delete Device
                            </h3>
                            <button onclick="modalManager.closeModal()" class="p-2 rounded-lg hover:bg-gray-100">
                                <i class="fas fa-times text-gray-500"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p class="text-sm text-red-800 font-semibold mb-2">⚠️ WARNING: This action cannot be undone!</p>
                            <p class="text-sm text-red-700">You are about to permanently delete:</p>
                        </div>
                        
                        <div class="space-y-3 mb-6">
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <span class="text-sm font-medium text-gray-700">Device:</span>
                                <span class="text-sm font-semibold text-gray-900">${tableRenderer.escapeHtml(deviceName)}</span>
                            </div>
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <span class="text-sm font-medium text-gray-700">Users:</span>
                                <span class="text-sm font-semibold text-gray-900">${userCount} user(s)</span>
                            </div>
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <span class="text-sm font-medium text-gray-700">Conversations:</span>
                                <span class="text-sm font-semibold text-gray-900">All associated conversations</span>
                            </div>
                        </div>

                        <div class="flex space-x-3">
                            <button onclick="modalManager.closeModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                                <i class="fas fa-times mr-2"></i>Cancel
                            </button>
                            <button onclick="devicesController.deleteDevice('${deviceId}'); modalManager.closeModal();" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                                <i class="fas fa-trash mr-2"></i>Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        this.closeModal();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.currentModal = document.getElementById('deleteDeviceModal');

        // Close on outside click
        this.currentModal.addEventListener('click', (e) => {
            if (e.target === this.currentModal) {
                this.closeModal();
            }
        });
    }

    /**
     * Show export devices modal
     */
    showExportDevicesModal() {
        const modalHtml = `
            <div id="exportDevicesModal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
                <div class="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-800">
                                <i class="fas fa-file-export mr-2"></i>Export Devices Data
                            </h3>
                            <button onclick="modalManager.closeModal()" class="p-2 rounded-lg hover:bg-gray-100">
                                <i class="fas fa-times text-gray-500"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <form id="exportDevicesForm" class="space-y-6">
                            <!-- Filter by Source -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-filter mr-1"></i>Filter by Source
                                </label>
                                <select id="exportSourceFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                    <option value="all">All Devices</option>
                                    <option value="android-webview">Android WebView Only</option>
                                    <option value="web">Web Only</option>
                                </select>
                            </div>

                            <!-- Filter by Pipeline Type -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-cogs mr-1"></i>Filter by Pipeline Type
                                </label>
                                <select id="exportPipelineFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                    <option value="all">All Pipeline Types</option>
                                    <option value="library">Library (SpeechRecognition)</option>
                                    <option value="api">API (External Service)</option>
                                </select>
                            </div>

                            <!-- Filter by LLM Service -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-robot mr-1"></i>Filter by LLM Service
                                </label>
                                <select id="exportLLMFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                    <option value="all">All LLM Services</option>
                                    <option value="gemini">Gemini</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="azure_openai">Azure OpenAI</option>
                                    <option value="vertex">Vertex AI</option>
                                    <option value="dhenu">Dhenu</option>
                                </select>
                            </div>

                            <!-- Select Columns -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-columns mr-1"></i>Select Columns to Export
                                </label>
                                <div class="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="device_id" checked>
                                        <span class="text-sm">Device ID</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="device_name" checked>
                                        <span class="text-sm">Device Name</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="pipeline_type" checked>
                                        <span class="text-sm">Pipeline Type</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="llm_service" checked>
                                        <span class="text-sm">LLM Service</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="source" checked>
                                        <span class="text-sm">Source</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="user_count" checked>
                                        <span class="text-sm">User Count</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="created_at" checked>
                                        <span class="text-sm">Created At</span>
                                    </label>
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="export-column" value="last_login">
                                        <span class="text-sm">Last Login</span>
                                    </label>
                                </div>
                            </div>

                            <div class="flex space-x-3 pt-4 border-t border-gray-200">
                                <button type="button" onclick="modalManager.closeModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                                    <i class="fas fa-times mr-2"></i>Cancel
                                </button>
                                <button type="submit" class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                                    <i class="fas fa-eye mr-2"></i>Preview & Export
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        this.closeModal();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.currentModal = document.getElementById('exportDevicesModal');

        // Handle form submission
        document.getElementById('exportDevicesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const filters = {
                source: document.getElementById('exportSourceFilter').value,
                pipeline_type: document.getElementById('exportPipelineFilter').value,
                llm_service: document.getElementById('exportLLMFilter').value,
                columns: Array.from(document.querySelectorAll('.export-column:checked')).map(cb => cb.value)
            };

            if (filters.columns.length === 0) {
                showNotification('Please select at least one column to export', 'warning');
                return;
            }

            devicesController.exportDevices(filters);
        });

        // Close on outside click
        this.currentModal.addEventListener('click', (e) => {
            if (e.target === this.currentModal) {
                this.closeModal();
            }
        });
    }

    /**
     * Show export preview modal
     */
    showExportPreview(devices, total, filters) {
        const previewRows = devices.slice(0, 10); // Show first 10 rows
        const columns = Object.keys(devices[0] || {});

        const previewTableHtml = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-xs">
                    <thead class="bg-gray-100">
                        <tr>
                            ${columns.map(col => `<th class="px-2 py-2 text-left font-semibold text-gray-700">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map(device => `
                            <tr class="border-b border-gray-200">
                                ${columns.map(col => `<td class="px-2 py-2">${tableRenderer.escapeHtml(String(device[col] || ''))}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${devices.length > 10 ? `<p class="text-sm text-gray-600 text-center mt-2">... and ${devices.length - 10} more rows</p>` : ''}
        `;

        const modalHtml = `
            <div id="exportPreviewModal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
                <div class="glass-card rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-gray-200 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800">Export Preview</h3>
                                <p class="text-sm text-gray-600">${total} devices will be exported</p>
                            </div>
                            <button onclick="modalManager.closeModal()" class="p-2 rounded-lg hover:bg-gray-100">
                                <i class="fas fa-times text-gray-500"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 overflow-y-auto flex-1">
                        ${previewTableHtml}
                    </div>
                    <div class="p-6 border-t border-gray-200 flex-shrink-0">
                        <div class="flex space-x-3">
                            <button onclick="modalManager.closeModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                                <i class="fas fa-times mr-2"></i>Cancel
                            </button>
                            <button onclick="devicesController.downloadExportData(${JSON.stringify(devices).replace(/"/g, '&quot;')}, ${JSON.stringify(filters).replace(/"/g, '&quot;')}); modalManager.closeModal();" class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                                <i class="fas fa-download mr-2"></i>Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        this.closeModal();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.currentModal = document.getElementById('exportPreviewModal');

        // Close on outside click
        this.currentModal.addEventListener('click', (e) => {
            if (e.target === this.currentModal) {
                this.closeModal();
            }
        });
    }
}

// Export singleton instance
const modalManager = new ModalManager();
