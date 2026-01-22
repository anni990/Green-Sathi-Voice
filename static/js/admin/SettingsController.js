/**
 * SettingsController - Handles settings page logic
 */
class SettingsController {
    constructor() {
        this.setupFormHandler();
    }

    /**
     * Setup password change form handler
     */
    setupFormHandler() {
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }
    }

    /**
     * Handle password change submission
     */
    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showNotification('All fields are required', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            this.showLoading();

            const response = await adminApiService.changePassword(
                currentPassword,
                newPassword,
                confirmPassword
            );

            if (response.success) {
                showNotification(response.message || 'Password changed successfully', 'success');
                
                // Clear form
                document.getElementById('changePasswordForm').reset();
            } else {
                showNotification(response.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Password change error:', error);
            showNotification('Error changing password', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const button = document.querySelector('#changePasswordForm button[type="submit"]');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const button = document.querySelector('#changePasswordForm button[type="submit"]');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save mr-2"></i>Update Password';
        }
    }
}
