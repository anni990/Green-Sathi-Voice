/**
 * Kiosk Mode Screen Detection and Auto-Scaling
 * Detects actual screen size in WebView and applies appropriate scaling
 * ES5 Compatible - No classes, arrow functions, template literals, or let/const
 */

(function() {
    'use strict';

    function KioskModeManager() {
        this.screenWidth = window.screen.width || window.innerWidth;
        this.screenHeight = window.screen.height || window.innerHeight;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.isWebView = this.detectWebView();
        this.isLargeScreen = this.screenWidth >= 1024;
        this.resizeTimeout = null;
        
        console.log('Kiosk Mode Manager Initialized:');
        console.log('Screen: ' + this.screenWidth + 'x' + this.screenHeight);
        console.log('Device Pixel Ratio: ' + this.devicePixelRatio);
        console.log('WebView: ' + this.isWebView);
        console.log('Large Screen: ' + this.isLargeScreen);
        
        this.init();
    }

    /**
     * Detect if running in WebView (Android/iOS)
     */
    KioskModeManager.prototype.detectWebView = function() {
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Android WebView detection
        var isAndroidWebView = /wv/.test(userAgent) || 
                                /Android.*Version\/\d+\.\d+/.test(userAgent) ||
                                (typeof Android !== 'undefined');
        
        // iOS WebView detection
        var isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent);
        
        // General WebView indicators
        var hasWebViewFlag = window.navigator.standalone !== undefined ||
                              window.matchMedia('(display-mode: standalone)').matches;
        
        return isAndroidWebView || isIOSWebView || hasWebViewFlag;
    };

    /**
     * Calculate optimal scale factor based on screen size
     */
    KioskModeManager.prototype.calculateScaleFactor = function() {
        var width = this.screenWidth;
        
        // Define breakpoints and their scale factors
        var scaleMap = [
            { minWidth: 2560, scale: 0.6 },  // 4K displays
            { minWidth: 1920, scale: 0.7 },  // Full HD large displays
            { minWidth: 1440, scale: 0.75 }, // HD+ displays
            { minWidth: 1280, scale: 0.8 },  // HD displays
            { minWidth: 1024, scale: 0.85 }, // Large tablets/small desktops
            { minWidth: 768, scale: 0.9 },   // Tablets
            { minWidth: 0, scale: 1 }        // Mobile
        ];
        
        for (var i = 0; i < scaleMap.length; i++) {
            if (width >= scaleMap[i].minWidth) {
                return scaleMap[i].scale;
            }
        }
        
        return 1;
    };

    /**
     * Apply kiosk mode styling and scaling
     */
    KioskModeManager.prototype.applyKioskMode = function() {
        var scaleFactor = this.calculateScaleFactor();
        var body = document.body;
        var html = document.documentElement;
        
        // Add kiosk mode class
        body.classList.add('kiosk-mode');
        
        // Apply scale factor to CSS variable
        html.style.setProperty('--kiosk-scale', scaleFactor);
        
        // Add scale class to main containers
        var landingPage = document.getElementById('landing-page');
        var mainUI = document.getElementById('main-ui');
        
        if (landingPage) {
            landingPage.classList.add('kiosk-scale');
        }
        
        if (mainUI) {
            mainUI.classList.add('kiosk-scale');
        }
        
        // Force desktop layout for large screens
        if (this.isLargeScreen) {
            this.forceDesktopLayout();
        }
        
        console.log('Applied scale factor: ' + scaleFactor);
    };

    /**
     * Force desktop layout on large screens
     */
    KioskModeManager.prototype.forceDesktopLayout = function() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
            // Override viewport to force desktop rendering
            meta.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        
        // Add desktop class to body
        document.body.classList.add('force-desktop-layout');
        
        // Override media query detection
        this.overrideMediaQueries();
    };

    /**
     * Override media queries for proper desktop detection
     */
    KioskModeManager.prototype.overrideMediaQueries = function() {
        // Create a style element to override mobile styles
        var style = document.createElement('style');
        style.id = 'kiosk-mode-overrides';
        style.textContent = 
            '@media (min-width: 1024px) {' +
            '    /* Force desktop layout */' +
            '    .lg\\:hidden {' +
            '        display: none !important;' +
            '    }' +
            '    ' +
            '    .hidden.lg\\:flex {' +
            '        display: flex !important;' +
            '    }' +
            '    ' +
            '    .hidden.lg\\:block {' +
            '        display: block !important;' +
            '    }' +
            '    ' +
            '    /* Remove mobile-specific styles */' +
            '    .mobile-layout {' +
            '        display: flex !important;' +
            '    }' +
            '}';
        document.head.appendChild(style);
    };

    /**
     * Adjust font sizes based on screen size
     */
    KioskModeManager.prototype.adjustFontSizes = function() {
        var baseFontSize = this.calculateBaseFontSize();
        document.documentElement.style.fontSize = baseFontSize + 'px';
        console.log('Base font size: ' + baseFontSize + 'px');
    };

    /**
     * Calculate base font size
     */
    KioskModeManager.prototype.calculateBaseFontSize = function() {
        var width = this.screenWidth;
        
        if (width >= 2560) return 12;
        if (width >= 1920) return 13;
        if (width >= 1440) return 14;
        if (width >= 1280) return 15;
        if (width >= 1024) return 16;
        
        return 16; // Default
    };

    /**
     * Handle window resize events
     */
    KioskModeManager.prototype.handleResize = function() {
        var self = this;
        // Debounce resize handler
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(function() {
            self.screenWidth = window.innerWidth;
            self.screenHeight = window.innerHeight;
            self.applyKioskMode();
            self.adjustFontSizes();
            console.log('Resize detected - reapplying kiosk mode');
        }, 250);
    };

    /**
     * Handle orientation change
     */
    KioskModeManager.prototype.handleOrientationChange = function() {
        var self = this;
        console.log('Orientation changed');
        setTimeout(function() {
            self.screenWidth = window.screen.width || window.innerWidth;
            self.screenHeight = window.screen.height || window.innerHeight;
            self.applyKioskMode();
        }, 300);
    };

    /**
     * Initialize kiosk mode
     */
    KioskModeManager.prototype.init = function() {
        var self = this;
        
        // Apply kiosk mode immediately
        this.applyKioskMode();
        this.adjustFontSizes();
        
        // Handle window resize
        window.addEventListener('resize', function() {
            self.handleResize();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', function() {
            self.handleOrientationChange();
        });
        
        // Re-apply on DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                self.applyKioskMode();
            });
        }
        
        // Log device info for debugging
        this.logDeviceInfo();
    };

    /**
     * Log device information for debugging
     */
    KioskModeManager.prototype.logDeviceInfo = function() {
        console.group('Device Information');
        console.log('User Agent:', navigator.userAgent);
        console.log('Platform:', navigator.platform);
        console.log('Screen Width:', this.screenWidth);
        console.log('Screen Height:', this.screenHeight);
        console.log('Window Width:', window.innerWidth);
        console.log('Window Height:', window.innerHeight);
        console.log('Device Pixel Ratio:', this.devicePixelRatio);
        console.log('Available Width:', screen.availWidth);
        console.log('Available Height:', screen.availHeight);
        console.log('Color Depth:', screen.colorDepth);
        
        var orientationType = 'unknown';
        if (screen.orientation && screen.orientation.type) {
            orientationType = screen.orientation.type;
        }
        console.log('Orientation:', orientationType);
        
        console.log('Touch Support:', 'ontouchstart' in window);
        console.log('Is WebView:', this.isWebView);
        console.log('Is Large Screen:', this.isLargeScreen);
        console.groupEnd();
    };

    /**
     * Get current scale factor
     */
    KioskModeManager.prototype.getCurrentScale = function() {
        return this.calculateScaleFactor();
    };

    // Initialize on script load
    window.kioskMode = new KioskModeManager();

    // Export for debugging
    window.getKioskInfo = function() {
        return {
            screenWidth: window.kioskMode.screenWidth,
            screenHeight: window.kioskMode.screenHeight,
            devicePixelRatio: window.kioskMode.devicePixelRatio,
            isWebView: window.kioskMode.isWebView,
            isLargeScreen: window.kioskMode.isLargeScreen,
            currentScale: window.kioskMode.getCurrentScale()
        };
    };

    console.log('Kiosk Mode Manager loaded successfully');
})();
