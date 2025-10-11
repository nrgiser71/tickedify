/**
 * Subscription Confirmation Page - Email Verification Before Payment
 *
 * This page ensures users understand they MUST use the correct email address
 * when paying via Plug&Pay, otherwise the webhook cannot match their payment
 * to their Tickedify account.
 */

// Page state
let paymentData = null;

/**
 * Initialize the confirmation page
 */
function initConfirmPage() {
    console.log('Initializing subscription confirmation page...');

    // Load payment data from session storage
    const paymentDataStr = sessionStorage.getItem('payment_data');

    if (!paymentDataStr) {
        console.error('No payment data found in session storage');
        // Redirect back to subscription page
        window.location.href = '/subscription.html';
        return;
    }

    try {
        paymentData = JSON.parse(paymentDataStr);
        console.log('Payment data loaded:', {
            email: paymentData.email,
            planId: paymentData.planId,
            hasRedirectUrl: !!paymentData.redirectUrl
        });

        // Display the email
        displayEmail(paymentData.email);

        // Enable the proceed button
        document.getElementById('proceed-button').disabled = false;

    } catch (error) {
        console.error('Error parsing payment data:', error);
        window.location.href = '/subscription.html';
    }
}

/**
 * Display the email address on the page
 */
function displayEmail(email) {
    const emailDisplay = document.getElementById('email-display');
    if (emailDisplay) {
        emailDisplay.textContent = email;
    }
}

/**
 * Copy email to clipboard
 */
async function copyEmailToClipboard() {
    if (!paymentData || !paymentData.email) {
        console.error('No email to copy');
        return;
    }

    const copyButton = document.getElementById('copy-button');
    const copyText = document.getElementById('copy-text');

    try {
        // Use Clipboard API
        await navigator.clipboard.writeText(paymentData.email);

        // Visual feedback
        copyButton.classList.add('copied');
        copyText.innerHTML = '<i class="fas fa-check"></i> Gekopieerd!';

        // Reset after 2 seconds
        setTimeout(() => {
            copyButton.classList.remove('copied');
            copyText.innerHTML = 'Kopieer emailadres';
        }, 2000);

        console.log('Email copied to clipboard:', paymentData.email);

    } catch (error) {
        console.error('Failed to copy email:', error);

        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = paymentData.email;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            copyButton.classList.add('copied');
            copyText.innerHTML = '<i class="fas fa-check"></i> Gekopieerd!';

            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyText.innerHTML = 'Kopieer emailadres';
            }, 2000);
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            copyText.innerHTML = 'Kopiëren mislukt';
        }

        document.body.removeChild(textArea);
    }
}

/**
 * Proceed to payment page (Plug&Pay)
 */
function proceedToPayment() {
    if (!paymentData || !paymentData.redirectUrl) {
        console.error('No redirect URL found');
        showError('Geen betaallink gevonden. Probeer het opnieuw.');
        return;
    }

    console.log('Proceeding to payment:', paymentData.redirectUrl);

    // Show loading state on button
    const proceedButton = document.getElementById('proceed-button');
    proceedButton.disabled = true;
    proceedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doorsturen naar betaling...';

    // Redirect to Plug&Pay after brief delay
    setTimeout(() => {
        window.location.href = paymentData.redirectUrl;
    }, 800);
}

/**
 * Go back to subscription selection page
 */
function goBack() {
    // Clear payment data
    sessionStorage.removeItem('payment_data');

    // Go back to subscription page
    window.location.href = '/subscription.html';
}

/**
 * Show error message
 */
function showError(message) {
    // Simple alert for now - could be enhanced with a modal
    alert(message);
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (event) => {
    // Enter key = proceed to payment
    if (event.key === 'Enter' && paymentData && paymentData.redirectUrl) {
        proceedToPayment();
    }

    // Escape key = go back
    if (event.key === 'Escape') {
        goBack();
    }

    // Ctrl+C or Cmd+C when focused on email = copy (already handled by browser, but for consistency)
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selection = window.getSelection().toString();
        if (selection === paymentData.email) {
            console.log('Email copied via keyboard shortcut');
        }
    }
});

/**
 * Prevent accidental navigation away
 */
window.addEventListener('beforeunload', function(e) {
    // Don't show confirmation if we're navigating to payment or back to subscription
    if (paymentData && paymentData.redirectUrl) {
        const currentUrl = window.location.href;
        if (!currentUrl.includes('subscription') && !currentUrl.includes('pay.')) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initConfirmPage);

// Export functions for global access
window.copyEmailToClipboard = copyEmailToClipboard;
window.proceedToPayment = proceedToPayment;
window.goBack = goBack;
