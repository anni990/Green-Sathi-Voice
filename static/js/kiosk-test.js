// ES5 Compatible - No arrow functions, const/let, or optional chaining
function addLog(message, type) {
    if (typeof type === 'undefined') {
        type = 'log';
    }
    var consoleElement = document.getElementById('console');
    var timestamp = new Date().toLocaleTimeString();
    var log = document.createElement('div');
    log.className = 'log ' + type;
    log.textContent = '[' + timestamp + '] ' + message;
    consoleElement.appendChild(log);
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function updateDeviceInfo() {
    // Screen dimensions
    document.getElementById('screen-width').textContent = screen.width + 'px';
    document.getElementById('screen-height').textContent = screen.height + 'px';
    document.getElementById('window-width').textContent = window.innerWidth + 'px';
    document.getElementById('window-height').textContent = window.innerHeight + 'px';
    document.getElementById('dpr').textContent = window.devicePixelRatio;
    
    // Handle orientation with fallback for older browsers
    var orientationText = 'unknown';
    if (screen.orientation && screen.orientation.type) {
        orientationText = screen.orientation.type;
    }
    document.getElementById('orientation').textContent = orientationText;

    // Browser info
    document.getElementById('platform').textContent = navigator.platform;
    document.getElementById('language').textContent = navigator.language;
    document.getElementById('touch-support').textContent = 'ontouchstart' in window ? 'Yes' : 'No';
    document.getElementById('online-status').textContent = navigator.onLine ? 'Online' : 'Offline';

    // Kiosk mode info (if available)
    if (window.getKioskInfo) {
        var info = window.getKioskInfo();
        document.getElementById('is-webview').textContent = info.isWebView ? 'Yes ✓' : 'No ✗';
        document.getElementById('is-large').textContent = info.isLargeScreen ? 'Yes ✓' : 'No ✗';
        document.getElementById('scale-factor').textContent = info.currentScale;

        var computedFontSize = window.getComputedStyle(document.body).fontSize;
        document.getElementById('font-size').textContent = computedFontSize;

        var hasKioskClass = document.body.classList.contains('kiosk-mode');
        document.getElementById('kiosk-class').textContent = hasKioskClass ? 'Applied ✓' : 'Not Applied ✗';

        // Update status
        var statusIndicator = document.getElementById('status-indicator');
        var statusText = document.getElementById('status-text');

        if (hasKioskClass && info.currentScale < 1) {
            statusIndicator.className = 'status-indicator success';
            statusText.textContent = '✓ Kiosk Mode Active & Working Correctly';
            addLog('Kiosk mode is active and functioning correctly', 'success');
        } else if (screen.width >= 1024) {
            statusIndicator.className = 'status-indicator warning';
            statusText.textContent = '⚠ Large Screen Detected but Kiosk Mode Not Applied';
            addLog('Warning: Large screen detected but kiosk mode not active', 'error');
        } else {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'ℹ Mobile/Tablet Size - Kiosk Mode Not Required';
            addLog('Mobile/tablet size detected - no scaling needed', 'info');
        }

        addLog('Screen: ' + info.screenWidth + 'x' + info.screenHeight + ', Scale: ' + info.currentScale, 'info');
    } else {
        document.getElementById('is-webview').textContent = 'N/A';
        document.getElementById('is-large').textContent = 'N/A';
        document.getElementById('scale-factor').textContent = 'N/A';
        document.getElementById('font-size').textContent = window.getComputedStyle(document.body).fontSize;
        document.getElementById('kiosk-class').textContent = 'N/A';

        var statusIndicator = document.getElementById('status-indicator');
        var statusText = document.getElementById('status-text');
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = '✗ Kiosk Mode Script Not Loaded';
        addLog('ERROR: Kiosk mode script not found', 'error');
    }
}

function refreshData() {
    addLog('Refreshing data...', 'info');
    updateDeviceInfo();
    addLog('Data refreshed successfully', 'success');
}

function testResize() {
    addLog('Testing resize handling...', 'info');
    var originalWidth = window.innerWidth;

    // Simulate resize (won't actually resize but will log current state)
    setTimeout(function() {
        updateDeviceInfo();
        addLog('Resize test complete. Width: ' + window.innerWidth + 'px', 'success');
    }, 100);
}

function copyToClipboard() {
    var info = window.getKioskInfo ? window.getKioskInfo() : {};
    var text = '\nScreen Size: ' + screen.width + 'x' + screen.height + '\n' +
        'Window Size: ' + window.innerWidth + 'x' + window.innerHeight + '\n' +
        'Device Pixel Ratio: ' + window.devicePixelRatio + '\n' +
        'Platform: ' + navigator.platform + '\n' +
        'User Agent: ' + navigator.userAgent + '\n' +
        'Is WebView: ' + (info.isWebView || 'N/A') + '\n' +
        'Is Large Screen: ' + (info.isLargeScreen || 'N/A') + '\n' +
        'Scale Factor: ' + (info.currentScale || 'N/A');

    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            addLog('Device information copied to clipboard', 'success');
            alert('Device information copied to clipboard!');
        }).catch(function(err) {
            addLog('Failed to copy to clipboard: ' + err, 'error');
        });
    } else {
        // Fallback for older browsers
        addLog('Clipboard API not available', 'error');
        alert('Clipboard not supported. Please copy manually:\n\n' + text);
    }
}

// Initialize on load
window.addEventListener('load', function() {
    addLog('Test page loaded successfully', 'success');
    updateDeviceInfo();
});

// Update on resize
window.addEventListener('resize', function() {
    addLog('Window resized, updating information...', 'info');
    updateDeviceInfo();
});

// Update on orientation change
window.addEventListener('orientationchange', function() {
    addLog('Orientation changed, updating information...', 'info');
    setTimeout(updateDeviceInfo, 300);
});