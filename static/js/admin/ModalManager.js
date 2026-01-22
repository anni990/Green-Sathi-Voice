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
                <div id="userConversationsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                <div id="deviceDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                                            <option value="gemini" ${device.llm_service === 'gemini' ? 'selected' : ''}>Gemini (Default)</option>
                                            <option value="openai" ${device.llm_service === 'openai' ? 'selected' : ''}>OpenAI</option>
                                            <option value="azure_openai" ${device.llm_service === 'azure_openai' ? 'selected' : ''}>Azure OpenAI</option>
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
}

// Export singleton instance
const modalManager = new ModalManager();
