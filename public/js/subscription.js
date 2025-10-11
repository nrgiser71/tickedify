/**
 * Subscription Selection JavaScript Logic
 *
 * Handles the user interface and interactions for subscription plan selection.
 * Works with subscription-data.js and subscription-api.js
 */

// Global state management
let subscriptionState = {
    selectedPlanId: null,
    selectionSource: null,
    plans: [],
    userStatus: null,
    isLoading: false
};

/**
 * Initialize the subscription page
 */
async function initializeSubscriptionPage() {
    try {
        console.log('Initializing subscription page...');

        // Show loading state
        showLoadingOverlay('Laden van abonnementsopties...');

        // Get selection source from URL parameters
        subscriptionState.selectionSource = SubscriptionHelpers.getUrlParameter('source') || 'upgrade';

        // Load subscription plans
        await loadSubscriptionPlans();

        // Load user subscription status
        await loadUserSubscriptionStatus();

        // Render plans UI
        renderSubscriptionPlans();

        // Setup event listeners
        setupEventListeners();

        // Hide loading state
        hideLoadingOverlay();

        console.log('Subscription page initialized successfully');

    } catch (error) {
        console.error('Error initializing subscription page:', error);
        hideLoadingOverlay();
        showErrorModal('Er is een fout opgetreden bij het laden van de pagina. Probeer het opnieuw.');
    }
}

/**
 * Load subscription plans from API
 */
async function loadSubscriptionPlans() {
    try {
        const response = await SubscriptionAPI.getPlans();

        if (response.success) {
            subscriptionState.plans = response.plans;
            console.log('Loaded', response.plans.length, 'subscription plans');
        } else {
            throw new Error(response.error || 'Failed to load plans');
        }
    } catch (error) {
        console.error('Error loading subscription plans:', error);
        // Fallback to static data if API fails
        subscriptionState.plans = SUBSCRIPTION_PLANS;
        console.log('Using fallback subscription plans data');
    }
}

/**
 * Load user subscription status
 */
async function loadUserSubscriptionStatus() {
    try {
        const response = await SubscriptionAPI.getUserStatus();

        if (response.success) {
            subscriptionState.userStatus = response;
            subscriptionState.selectedPlanId = response.selected_plan;
            console.log('User subscription status loaded:', response);
        } else {
            console.log('User not authenticated or status unavailable');
        }
    } catch (error) {
        console.error('Error loading user status:', error);
        // Continue without user status - user might not be authenticated
    }
}

/**
 * Render subscription plans in the UI
 */
function renderSubscriptionPlans() {
    const plansGrid = document.getElementById('plans-grid');
    if (!plansGrid) {
        console.error('Plans grid element not found');
        return;
    }

    // Clear existing content
    plansGrid.innerHTML = '';

    // Filter plans based on user status
    let plansToRender = subscriptionState.plans;

    // Hide trial plan if user already had trial
    if (subscriptionState.userStatus && subscriptionState.userStatus.had_trial) {
        plansToRender = subscriptionState.plans.filter(plan => plan.id !== 'trial_14_days');
        console.log('Trial plan hidden - user already had trial');
    }

    // Render each plan
    plansToRender.forEach(plan => {
        const planElement = createPlanElement(plan);
        plansGrid.appendChild(planElement);
    });

    // Update selection state
    updateSelectionUI();
}

/**
 * Create a plan element
 */
function createPlanElement(plan) {
    const planDiv = document.createElement('div');
    planDiv.className = 'plan-option';
    planDiv.setAttribute('data-plan-id', plan.id);

    // Special styling for different plans
    if (plan.id === 'yearly_70') {
        planDiv.classList.add('plan-recommended');
    }

    planDiv.innerHTML = `
        <div class="plan-header">
            <h3 class="plan-name">${plan.name}</h3>
            <div class="plan-price">${SUBSCRIPTION_VALIDATION.getFormattedPrice(plan.id)}</div>
        </div>
        <div class="plan-description">${plan.description}</div>
        <div class="plan-highlight">${SUBSCRIPTION_VALIDATION.getPlanHighlight(plan.id)}</div>
        <ul class="plan-features">
            ${SUBSCRIPTION_VALIDATION.getFeaturesHtml(plan.id)}
        </ul>
        <div class="plan-selection-indicator">
            <i class="fas fa-check-circle"></i>
        </div>
    `;

    // Add click event listener
    planDiv.addEventListener('click', () => selectPlan(plan.id));

    return planDiv;
}

/**
 * Select a subscription plan
 */
function selectPlan(planId) {
    if (subscriptionState.isLoading) return;

    console.log('Selecting plan:', planId);

    // Update selection state
    subscriptionState.selectedPlanId = planId;

    // Update hidden form fields
    document.getElementById('selected-plan-id').value = planId;
    document.getElementById('selection-source').value = subscriptionState.selectionSource;

    // Update UI
    updateSelectionUI();

    // Enable confirm button
    const confirmButton = document.getElementById('confirm-selection');
    if (confirmButton) {
        confirmButton.disabled = false;
    }
}

/**
 * Update selection UI state
 */
function updateSelectionUI() {
    const planOptions = document.querySelectorAll('.plan-option');

    planOptions.forEach(option => {
        const planId = option.getAttribute('data-plan-id');

        if (planId === subscriptionState.selectedPlanId) {
            option.classList.add('plan-selected');
        } else {
            option.classList.remove('plan-selected');
        }
    });
}

/**
 * Confirm the selected plan
 */
async function confirmSelection() {
    if (!subscriptionState.selectedPlanId) {
        showErrorModal('Selecteer eerst een abonnement.');
        return;
    }

    if (subscriptionState.isLoading) return;

    try {
        subscriptionState.isLoading = true;

        // Show loading on confirm button
        const confirmButton = document.getElementById('confirm-selection');
        if (confirmButton) {
            SubscriptionHelpers.showLoading(confirmButton);
            confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met opslaan...';
        }

        // Send selection to API
        const response = await SubscriptionAPI.selectPlan(
            subscriptionState.selectedPlanId,
            subscriptionState.selectionSource
        );

        if (response.success) {
            console.log('Plan selection confirmed:', response);

            // Handle paid plan redirect
            if (response.paid && response.redirectUrl) {
                console.log('Redirecting to checkout:', response.redirectUrl);
                showSuccessModal('Doorsturen naar betaling...');

                // Redirect to Plug&Pay checkout after brief delay
                setTimeout(() => {
                    window.location.href = response.redirectUrl;
                }, 1500);

                return; // Exit early, redirect will happen
            }

            // Handle trial activation
            if (response.trial) {
                console.log('Trial activated until:', response.trialEndDate);
                showSuccessModal(
                    response.message || `Trial geactiveerd! Je hebt 14 dagen om Tickedify uit te proberen.`
                );

                // Store trial info
                sessionStorage.setItem('subscription_selection', JSON.stringify({
                    planId: subscriptionState.selectedPlanId,
                    trial: true,
                    trialEndDate: response.trialEndDate,
                    timestamp: Date.now()
                }));

                return; // Exit, success modal will redirect
            }

            // Fallback for other success responses
            showSuccessModal(
                `Je hebt succesvol het ${SUBSCRIPTION_VALIDATION.getPlanById(subscriptionState.selectedPlanId).name} abonnement geselecteerd. ` +
                'Je selectie is opgeslagen en je kunt nu doorgaan met Tickedify.'
            );

            // Store successful selection in session storage for immediate feedback
            sessionStorage.setItem('subscription_selection', JSON.stringify({
                planId: subscriptionState.selectedPlanId,
                timestamp: Date.now()
            }));

        } else {
            throw new Error(response.error || 'Failed to save selection');
        }

    } catch (error) {
        console.error('Error confirming selection:', error);
        showErrorModal('Er is een fout opgetreden bij het opslaan van je selectie. Probeer het opnieuw.');
    } finally {
        subscriptionState.isLoading = false;

        // Reset confirm button
        const confirmButton = document.getElementById('confirm-selection');
        if (confirmButton) {
            SubscriptionHelpers.hideLoading(confirmButton);
            confirmButton.innerHTML = '<i class="fas fa-check"></i> Bevestig selectie';
        }
    }
}

/**
 * Handle back navigation
 */
function goBack() {
    // Determine where to go back based on selection source
    switch (subscriptionState.selectionSource) {
        case 'beta':
            // Go back to main app
            window.location.href = '/app';
            break;
        case 'registration':
            // Go back to registration or login
            window.location.href = '/';
            break;
        case 'upgrade':
        default:
            // Go back to main app
            window.location.href = '/';
            break;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Confirm selection button
    const confirmButton = document.getElementById('confirm-selection');
    if (confirmButton) {
        confirmButton.addEventListener('click', confirmSelection);
    }

    // Back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            goBack();
        } else if (event.key === 'Enter' && subscriptionState.selectedPlanId) {
            confirmSelection();
        } else if (event.key >= '1' && event.key <= '3') {
            // Allow number keys to select plans
            const planIndex = parseInt(event.key) - 1;
            if (subscriptionState.plans[planIndex]) {
                selectPlan(subscriptionState.plans[planIndex].id);
            }
        }
    });

    // Handle browser back button
    window.addEventListener('popstate', () => {
        goBack();
    });
}

/**
 * Show loading overlay
 */
function showLoadingOverlay(message = 'Laden...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        const spinner = overlay.querySelector('.loading-spinner span');
        if (spinner) {
            spinner.textContent = message;
        }
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Handle successful modal close
 */
function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';

    // Redirect based on selection source
    setTimeout(() => {
        switch (subscriptionState.selectionSource) {
            case 'beta':
                window.location.href = '/app';
                break;
            case 'registration':
                window.location.href = '/app';
                break;
            case 'upgrade':
            default:
                window.location.href = '/';
                break;
        }
    }, 500);
}

/**
 * Utility function to get readable plan name
 */
function getReadablePlanName(planId) {
    const plan = SUBSCRIPTION_VALIDATION.getPlanById(planId);
    return plan ? plan.name : planId;
}

// Export functions for global access
window.initializeSubscriptionPage = initializeSubscriptionPage;
window.selectPlan = selectPlan;
window.confirmSelection = confirmSelection;
window.goBack = goBack;
window.closeSuccessModal = closeSuccessModal;

// Debug functions (only in development)
if (window.location.hostname === 'localhost') {
    window.subscriptionDebug = {
        state: subscriptionState,
        selectPlan,
        loadPlans: loadSubscriptionPlans,
        loadStatus: loadUserSubscriptionStatus
    };
}