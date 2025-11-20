/**
 * Subscription Plans Data Model
 *
 * Static subscription plans configuration for frontend use.
 * This data mirrors the backend SUBSCRIPTION_PLANS in server.js
 */

// Export subscription plans data
const SUBSCRIPTION_PLANS = [
    {
        id: 'trial_14_days',
        name: '14 days free',
        description: 'Try all features for free',
        price: 0,
        billing_cycle: 'trial',
        trial_days: 14,
        features: ['All features', 'Unlimited tasks', 'Email import']
    },
    {
        id: 'monthly_7',
        name: 'Monthly',
        description: 'Per month, cancel anytime',
        price: 7,
        billing_cycle: 'monthly',
        trial_days: 0,
        features: ['All features', 'Unlimited tasks', 'Email import', 'Premium support']
    },
    {
        id: 'yearly_70',
        name: 'Yearly',
        description: 'Save €14 per year',
        price: 70,
        billing_cycle: 'yearly',
        trial_days: 0,
        features: ['All features', 'Unlimited tasks', 'Email import', 'Premium support', '2 months free']
    },
    {
        id: 'monthly_8',
        name: 'No Limit Monthly',
        description: 'Unlimited attachments per month',
        price: 8,
        billing_cycle: 'monthly',
        trial_days: 0,
        features: ['All features', 'Unlimited tasks', 'Email import', 'Premium support', 'Unlimited attachments', 'No file size limit']
    },
    {
        id: 'yearly_80',
        name: 'No Limit Yearly',
        description: 'Unlimited attachments - save €16 per year',
        price: 80,
        billing_cycle: 'yearly',
        trial_days: 0,
        features: ['All features', 'Unlimited tasks', 'Email import', 'Premium support', 'Unlimited attachments', 'No file size limit', '2 months free']
    }
];

// Validation functions
const SUBSCRIPTION_VALIDATION = {
    /**
     * Check if a plan ID is valid
     * @param {string} planId - Plan ID to validate
     * @returns {boolean} - True if valid
     */
    isValidPlanId: function(planId) {
        return SUBSCRIPTION_PLANS.some(plan => plan.id === planId);
    },

    /**
     * Check if a source is valid
     * @param {string} source - Source to validate
     * @returns {boolean} - True if valid
     */
    isValidSource: function(source) {
        const validSources = ['beta', 'upgrade', 'registration'];
        return validSources.includes(source);
    },

    /**
     * Get plan by ID
     * @param {string} planId - Plan ID to find
     * @returns {object|null} - Plan object or null if not found
     */
    getPlanById: function(planId) {
        return SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
    },

    /**
     * Get formatted price string
     * @param {string} planId - Plan ID
     * @returns {string} - Formatted price (e.g., "€7/maand", "Gratis")
     */
    getFormattedPrice: function(planId) {
        const plan = this.getPlanById(planId);
        if (!plan) return '';

        if (plan.price === 0) {
            return 'Free';
        }

        if (plan.billing_cycle === 'monthly') {
            return `€${plan.price}/month`;
        }

        if (plan.billing_cycle === 'yearly') {
            return `€${plan.price}/year`;
        }

        return `€${plan.price}`;
    },

    /**
     * Get plan features as HTML list
     * @param {string} planId - Plan ID
     * @returns {string} - HTML string with features
     */
    getFeaturesHtml: function(planId) {
        const plan = this.getPlanById(planId);
        if (!plan || !plan.features) return '';

        return plan.features.map(feature => `<li>${feature}</li>`).join('');
    },

    /**
     * Get plan highlight text
     * @param {string} planId - Plan ID
     * @returns {string} - Highlight text for the plan
     */
    getPlanHighlight: function(planId) {
        const plan = this.getPlanById(planId);
        if (!plan) return '';

        switch (planId) {
            case 'trial_14_days':
                return 'Popular choice for new users';
            case 'monthly_7':
                return 'Flexible monthly subscription';
            case 'yearly_70':
                return 'Best value - save €14 per year';
            case 'monthly_8':
                return 'No Limit - Unlimited storage';
            case 'yearly_80':
                return 'No Limit - Best value with unlimited storage';
            default:
                return '';
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        SUBSCRIPTION_PLANS,
        SUBSCRIPTION_VALIDATION
    };
} else {
    // Browser environment
    window.SUBSCRIPTION_PLANS = SUBSCRIPTION_PLANS;
    window.SUBSCRIPTION_VALIDATION = SUBSCRIPTION_VALIDATION;
}

// Helper functions for DOM manipulation
const SubscriptionHelpers = {
    /**
     * Create plan option HTML element
     * @param {object} plan - Plan object
     * @param {boolean} selected - Whether this plan is selected
     * @returns {string} - HTML string for plan option
     */
    createPlanOptionHtml: function(plan, selected = false) {
        const selectedClass = selected ? 'plan-selected' : '';
        const priceDisplay = SUBSCRIPTION_VALIDATION.getFormattedPrice(plan.id);
        const highlight = SUBSCRIPTION_VALIDATION.getPlanHighlight(plan.id);

        return `
            <div class="plan-option ${selectedClass}" data-plan-id="${plan.id}">
                <div class="plan-header">
                    <h3 class="plan-name">${plan.name}</h3>
                    <div class="plan-price">${priceDisplay}</div>
                </div>
                <div class="plan-description">${plan.description}</div>
                ${highlight ? `<div class="plan-highlight">${highlight}</div>` : ''}
                <ul class="plan-features">
                    ${SUBSCRIPTION_VALIDATION.getFeaturesHtml(plan.id)}
                </ul>
                <div class="plan-selection-indicator">
                    <span class="selection-check">✓</span>
                </div>
            </div>
        `;
    },

    /**
     * Get URL parameter value
     * @param {string} name - Parameter name
     * @returns {string|null} - Parameter value or null
     */
    getUrlParameter: function(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    /**
     * Show loading state for element
     * @param {HTMLElement} element - Element to show loading for
     */
    showLoading: function(element) {
        element.classList.add('loading');
        element.disabled = true;
    },

    /**
     * Hide loading state for element
     * @param {HTMLElement} element - Element to hide loading for
     */
    hideLoading: function(element) {
        element.classList.remove('loading');
        element.disabled = false;
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError: function(message) {
        // This can be enhanced with a proper toast/notification system
        alert('Error: ' + message);
    },

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess: function(message) {
        // This can be enhanced with a proper toast/notification system
        alert('Success: ' + message);
    }
};

// Export helpers for browser environment
if (typeof window !== 'undefined') {
    window.SubscriptionHelpers = SubscriptionHelpers;
}