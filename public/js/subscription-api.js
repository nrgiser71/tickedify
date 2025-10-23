/**
 * Subscription API Integration
 *
 * Handles all API communication for subscription functionality.
 * Provides clean interface between UI and backend endpoints.
 */

/**
 * API client for subscription operations
 */
const SubscriptionAPI = {
    /**
     * Base configuration for API requests
     */
    config: {
        baseURL: '',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    },

    /**
     * Generic API request handler with error handling
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Request options (method, body, etc.)
     * @returns {Promise<object>} - API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.config.baseURL}${endpoint}`;

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                ...this.config.headers,
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        // Add body for non-GET requests
        if (options.body && requestOptions.method !== 'GET') {
            if (typeof options.body === 'object') {
                requestOptions.body = JSON.stringify(options.body);
            } else {
                requestOptions.body = options.body;
            }
        }

        try {
            console.log(`API Request: ${requestOptions.method} ${endpoint}`, options.body || '');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            requestOptions.signal = controller.signal;

            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            console.log(`API Response: ${response.status} ${response.statusText}`);

            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.error || data || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;

        } catch (error) {
            console.error(`API Error for ${endpoint}:`, error);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout - probeer het opnieuw');
            }

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Netwerkfout - controleer je internetverbinding');
            }

            throw error;
        }
    },

    /**
     * Get available subscription plans
     * @returns {Promise<object>} - Plans response with success flag and plans array
     */
    async getPlans() {
        try {
            const response = await this.request('/api/subscription/plans');

            return {
                success: true,
                plans: response.plans || response,
                message: 'Plans loaded successfully'
            };
        } catch (error) {
            console.error('Error getting subscription plans:', error);
            return {
                success: false,
                error: error.message,
                plans: []
            };
        }
    },

    /**
     * Select a subscription plan for the user
     * Feature: 011-in-de-app payment system
     * @param {string} planId - Selected plan ID (e.g., 'trial_14', 'monthly_7', 'yearly_70')
     * @param {string} source - Selection source ('beta', 'registration', 'upgrade')
     * @returns {Promise<object>} - Selection response with success flag and redirect URL if paid plan
     */
    async selectPlan(planId, source = 'upgrade') {
        try {
            // Validate inputs
            if (!planId) {
                throw new Error('Plan ID is required');
            }

            if (!['beta', 'registration', 'upgrade'].includes(source)) {
                console.warn(`Unknown source: ${source}, defaulting to 'upgrade'`);
                source = 'upgrade';
            }

            const requestBody = {
                planId: planId  // Backend expects 'planId' not 'plan_id'
            };

            const response = await this.request('/api/subscription/select', {
                method: 'POST',
                body: requestBody
            });

            // 🔍 DEBUG: Log full API response
            console.log('📡 API Response from /api/subscription/select:', {
                success: response.success,
                trial: response.trial,
                paid: response.paid,
                redirectUrl: response.redirectUrl,
                email: response.email,
                planId: planId,
                fullResponse: response
            });

            // Handle trial vs paid plan response
            if (response.trial) {
                // Trial activated - no payment needed
                console.log('✅ Trial plan selected - no payment needed');
                return {
                    success: true,
                    trial: true,
                    trialEndDate: response.trialEndDate,
                    message: response.message || 'Trial geactiveerd!',
                    plan_id: planId
                };
            } else if (response.paid && response.redirectUrl) {
                // Paid plan - redirect to checkout
                console.log('💳 Paid plan selected - redirectUrl:', response.redirectUrl);
                return {
                    success: true,
                    paid: true,
                    redirectUrl: response.redirectUrl,
                    email: response.email,
                    message: 'Doorsturen naar betaling...',
                    plan_id: planId
                };
            }

            // Fallback response
            return {
                success: true,
                data: response,
                message: `Plan ${planId} successfully selected`,
                plan_id: planId,
                source: source
            };
        } catch (error) {
            console.error('Error selecting subscription plan:', error);
            return {
                success: false,
                error: error.message,
                plan_id: planId,
                source: source
            };
        }
    },

    /**
     * Get current user's subscription status
     * @returns {Promise<object>} - User status response
     */
    async getUserStatus() {
        try {
            const response = await this.request('/api/subscription/status');

            return {
                success: true,
                ...response,
                message: 'User status loaded successfully'
            };
        } catch (error) {
            console.error('Error getting user subscription status:', error);

            // Handle authentication errors specifically
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                return {
                    success: false,
                    error: 'Not authenticated',
                    authenticated: false
                };
            }

            return {
                success: false,
                error: error.message,
                authenticated: true // Assume authenticated but other error
            };
        }
    },

    /**
     * Validate plan selection before submission
     * @param {string} planId - Plan ID to validate
     * @returns {object} - Validation result
     */
    validatePlan(planId) {
        const validPlans = ['trial_14_days', 'monthly_7', 'yearly_70'];

        if (!planId) {
            return {
                valid: false,
                error: 'Selecteer een abonnement'
            };
        }

        if (!validPlans.includes(planId)) {
            return {
                valid: false,
                error: 'Ongeldig abonnement geselecteerd'
            };
        }

        return {
            valid: true,
            plan_id: planId
        };
    },

    /**
     * Handle API errors and convert to user-friendly messages
     * @param {Error} error - Original error
     * @returns {string} - User-friendly error message
     */
    formatErrorMessage(error) {
        const message = error.message || error;

        // Common error patterns and their user-friendly versions
        const errorMappings = {
            'timeout': 'De server reageert niet. Probeer het opnieuw.',
            'network': 'Controleer je internetverbinding en probeer opnieuw.',
            'unauthorized': 'Je bent niet ingelogd. Log opnieuw in.',
            'forbidden': 'Je hebt geen toegang tot deze functie.',
            'not found': 'De gevraagde pagina bestaat niet.',
            'server error': 'Er is een probleem met de server. Probeer het later opnieuw.',
            'bad request': 'Er is iets mis met je aanvraag. Probeer opnieuw.'
        };

        // Check for pattern matches
        for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
            if (message.toLowerCase().includes(pattern)) {
                return friendlyMessage;
            }
        }

        // Return original message if no pattern matched
        return message;
    },

    /**
     * Check if API is available
     * @returns {Promise<boolean>} - API availability status
     */
    async healthCheck() {
        try {
            await this.request('/api/subscription/plans');
            return true;
        } catch (error) {
            console.warn('API health check failed:', error);
            return false;
        }
    }
};

/**
 * Enhanced error handling for subscription operations
 */
const SubscriptionErrorHandler = {
    /**
     * Handle specific subscription errors
     * @param {Error} error - Error to handle
     * @param {string} operation - Operation that failed
     */
    handle(error, operation = 'subscription operation') {
        console.error(`Subscription Error during ${operation}:`, error);

        const userMessage = SubscriptionAPI.formatErrorMessage(error);

        // Show error to user (will be used by subscription.js)
        if (typeof showErrorModal === 'function') {
            showErrorModal(userMessage);
        } else {
            console.error('Error modal function not available:', userMessage);
        }

        return userMessage;
    },

    /**
     * Handle network errors specifically
     * @param {Error} error - Network error
     */
    handleNetworkError(error) {
        console.error('Network error in subscription API:', error);

        const message = 'Netwerkfout - controleer je internetverbinding en probeer opnieuw.';

        if (typeof showErrorModal === 'function') {
            showErrorModal(message);
        }

        return message;
    },

    /**
     * Handle authentication errors
     * @param {Error} error - Authentication error
     */
    handleAuthError(error) {
        console.error('Authentication error in subscription API:', error);

        const message = 'Je sessie is verlopen. Log opnieuw in om door te gaan.';

        if (typeof showErrorModal === 'function') {
            showErrorModal(message);
        } else {
            // Fallback - redirect to login
            console.warn('Redirecting to login due to auth error');
            window.location.href = '/';
        }

        return message;
    }
};

/**
 * Local storage utilities for subscription data caching
 */
const SubscriptionCache = {
    /**
     * Cache key prefix
     */
    PREFIX: 'tickedify_subscription_',

    /**
     * Cache subscription plans
     * @param {Array} plans - Plans to cache
     * @param {number} ttl - Time to live in milliseconds (default: 1 hour)
     */
    setPlans(plans, ttl = 3600000) {
        const cacheData = {
            data: plans,
            timestamp: Date.now(),
            expires: Date.now() + ttl
        };

        try {
            localStorage.setItem(this.PREFIX + 'plans', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache subscription plans:', error);
        }
    },

    /**
     * Get cached subscription plans
     * @returns {Array|null} - Cached plans or null if expired/not found
     */
    getPlans() {
        try {
            const cached = localStorage.getItem(this.PREFIX + 'plans');
            if (!cached) return null;

            const cacheData = JSON.parse(cached);

            if (Date.now() > cacheData.expires) {
                this.clearPlans();
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.warn('Failed to get cached subscription plans:', error);
            this.clearPlans();
            return null;
        }
    },

    /**
     * Clear cached plans
     */
    clearPlans() {
        try {
            localStorage.removeItem(this.PREFIX + 'plans');
        } catch (error) {
            console.warn('Failed to clear cached plans:', error);
        }
    },

    /**
     * Clear all subscription cache
     */
    clearAll() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear subscription cache:', error);
        }
    }
};

// Export for global access
window.SubscriptionAPI = SubscriptionAPI;
window.SubscriptionErrorHandler = SubscriptionErrorHandler;
window.SubscriptionCache = SubscriptionCache;

// Debug functions (only in development)
if (window.location.hostname === 'localhost') {
    window.subscriptionApiDebug = {
        api: SubscriptionAPI,
        errorHandler: SubscriptionErrorHandler,
        cache: SubscriptionCache,
        testPlansAPI: () => SubscriptionAPI.getPlans(),
        testUserStatusAPI: () => SubscriptionAPI.getUserStatus(),
        testSelectPlan: (planId) => SubscriptionAPI.selectPlan(planId, 'debug'),
        clearCache: () => SubscriptionCache.clearAll()
    };
}