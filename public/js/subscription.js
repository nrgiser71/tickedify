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
    let allPlans = subscriptionState.plans;

    // Hide trial plan if user already had trial
    const showTrial = !(subscriptionState.userStatus && subscriptionState.userStatus.had_trial);

    if (!showTrial) {
        console.log('Trial plan hidden - user already had trial');
    }

    // Separate trial, standard paid, and premium plus plans
    const trialPlan = allPlans.find(p => p.id === 'trial_14_days');
    const standardPlans = allPlans.filter(p => p.id === 'monthly_7' || p.id === 'yearly_70');
    const premiumPlusPlans = allPlans.filter(p => p.id === 'monthly_8' || p.id === 'yearly_80');

    // Render trial option if available
    if (showTrial && trialPlan) {
        const trialElement = createPlanElement(trialPlan, true); // true = clickable
        plansGrid.appendChild(trialElement);
    }

    // Render combined Standard plan option (€7/€70)
    if (standardPlans.length > 0) {
        const standardElement = createCombinedStandardPlanElement(standardPlans);
        plansGrid.appendChild(standardElement);
    }

    // Render combined No Limit plan option (€8/€80)
    if (premiumPlusPlans.length > 0) {
        const premiumPlusElement = createCombinedPremiumPlusPlanElement(premiumPlusPlans);
        plansGrid.appendChild(premiumPlusElement);
    }

    // Update selection state
    updateSelectionUI();
}

/**
 * Create a plan element
 */
function createPlanElement(plan, clickable = true) {
    const planDiv = document.createElement('div');
    planDiv.className = 'plan-option';
    planDiv.setAttribute('data-plan-id', plan.id);

    // Special styling for different plans
    if (plan.id === 'yearly_70') {
        planDiv.classList.add('plan-recommended');
    }

    // Determine button text and icon based on plan type
    const isTrial = plan.id === 'trial_14_days';
    const buttonText = isTrial ? 'Start Gratis Proefperiode' : 'Kies dit plan';
    const buttonIcon = isTrial ? 'fa-rocket' : 'fa-check';

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
        <button class="plan-action-button" id="select-${plan.id}" style="
            width: 100%;
            padding: 14px 24px;
            margin-top: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(102, 126, 234, 0.4)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <i class="fas ${buttonIcon}"></i>
            ${buttonText}
        </button>
    `;

    // Add click event listener to button only
    if (clickable) {
        const button = planDiv.querySelector(`#select-${plan.id}`);
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            selectPlan(plan.id);
            // Immediately confirm selection
            await confirmSelection();
        });
    }

    return planDiv;
}

/**
 * Create combined Standard plan element showing both monthly and yearly options
 */
function createCombinedStandardPlanElement(standardPlans) {
    const planDiv = document.createElement('div');
    planDiv.className = 'plan-option';
    planDiv.setAttribute('data-plan-id', 'standard');

    // Find monthly and yearly plans
    const monthlyPlan = standardPlans.find(p => p.id === 'monthly_7');
    const yearlyPlan = standardPlans.find(p => p.id === 'yearly_70');

    planDiv.innerHTML = `
        <div class="plan-header">
            <h3 class="plan-name">Standard Abonnement</h3>
            <div class="plan-price">€7/maand of €70/jaar</div>
        </div>
        <div class="plan-description">Kies bij het afrekenen tussen maandelijks of jaarlijks</div>
        <div class="plan-highlight">💡 Bespaar €14 per jaar met het jaarlijkse abonnement</div>
        <ul class="plan-features">
            <li><strong>Maandelijks:</strong> €7/maand - Stop wanneer je wilt</li>
            <li><strong>Jaarlijks:</strong> €70/jaar - 2 maanden gratis</li>
            <li>Alle functies</li>
            <li>Onbeperkte taken</li>
            <li>Email import</li>
            <li>Premium support</li>
            <li>100MB opslag, 5MB per bestand, 1 bijlage per taak</li>
        </ul>
        <button class="plan-action-button" id="select-standard-plan" style="
            width: 100%;
            padding: 14px 24px;
            margin-top: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(102, 126, 234, 0.4)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <i class="fas fa-credit-card"></i>
            Kies Standard Abonnement
        </button>
        <small style="display: block; text-align: center; color: #6b7280; margin-top: 10px; font-size: 13px;">
            <i class="fas fa-info-circle"></i> Je maakt je definitieve keuze voor maand- of jaarabonnement op de betaalpagina
        </small>
    `;

    // Add click event listener to button
    const button = planDiv.querySelector('#select-standard-plan');
    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Select monthly_7 as default, but user will choose on Plug&Pay page
        selectPlan('monthly_7');
        // Immediately confirm selection to trigger payment redirect
        await confirmSelection();
    });

    return planDiv;
}

/**
 * Create combined No Limit plan element showing both monthly and yearly options
 */
function createCombinedPremiumPlusPlanElement(premiumPlusPlans) {
    const planDiv = document.createElement('div');
    planDiv.className = 'plan-option plan-recommended';
    planDiv.setAttribute('data-plan-id', 'premium_plus');

    // Find monthly and yearly plans
    const monthlyPlan = premiumPlusPlans.find(p => p.id === 'monthly_8');
    const yearlyPlan = premiumPlusPlans.find(p => p.id === 'yearly_80');

    planDiv.innerHTML = `
        <div class="plan-header">
            <h3 class="plan-name">No Limit Abonnement</h3>
            <div class="plan-price">€8/maand of €80/jaar</div>
        </div>
        <div class="plan-description">Ongelimiteerde bijlagen - kies bij het afrekenen tussen maandelijks of jaarlijks</div>
        <div class="plan-highlight">⭐ Ongelimiteerde bijlagen - geen limieten op grootte of aantal!</div>
        <ul class="plan-features">
            <li><strong>Maandelijks:</strong> €8/maand - Stop wanneer je wilt</li>
            <li><strong>Jaarlijks:</strong> €80/jaar - 2 maanden gratis</li>
            <li>Alle functies</li>
            <li>Onbeperkte taken</li>
            <li>Email import</li>
            <li>Premium support</li>
            <li><strong>Ongelimiteerde bijlagen</strong> - Upload zoveel als je wilt</li>
            <li><strong>Geen limiet op bestandsgrootte</strong> - Ook grote bestanden</li>
            <li><strong>Meerdere bijlagen per taak</strong> - Geen beperkingen</li>
        </ul>
        <button class="plan-action-button" id="select-premium-plus-plan" style="
            width: 100%;
            padding: 14px 24px;
            margin-top: 20px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(245, 158, 11, 0.4)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <i class="fas fa-star"></i>
            Kies No Limit
        </button>
        <small style="display: block; text-align: center; color: #6b7280; margin-top: 10px; font-size: 13px;">
            <i class="fas fa-info-circle"></i> Je maakt je definitieve keuze voor maand- of jaarabonnement op de betaalpagina
        </small>
    `;

    // Add click event listener to button
    const button = planDiv.querySelector('#select-premium-plus-plan');
    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Select monthly_8 as default, but user will choose on Plug&Pay page
        selectPlan('monthly_8');
        // Immediately confirm selection to trigger payment redirect
        await confirmSelection();
    });

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
                console.log('Redirecting to email confirmation page first');

                // Store payment data in session storage for confirmation page
                sessionStorage.setItem('payment_data', JSON.stringify({
                    redirectUrl: response.redirectUrl,
                    email: response.email || subscriptionState.userStatus?.email || 'onbekend@email.com',
                    planId: subscriptionState.selectedPlanId,
                    timestamp: Date.now()
                }));

                // Redirect to email confirmation page (NOT directly to Plug&Pay)
                window.location.href = '/subscription-confirm';

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