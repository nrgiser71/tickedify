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

        // 🔍 DEBUG: Log complete payment data to console
        console.log('💳 Payment data loaded from sessionStorage:', {
            email: paymentData.email,
            planId: paymentData.planId,
            redirectUrl: paymentData.redirectUrl,
            timestamp: paymentData.timestamp,
            ageMinutes: ((Date.now() - paymentData.timestamp) / 60000).toFixed(2)
        });

        // ⚠️ Validate timestamp - reject data older than 5 minutes
        const dataAgeMs = Date.now() - (paymentData.timestamp || 0);
        const maxAgeMs = 5 * 60 * 1000; // 5 minutes

        if (dataAgeMs > maxAgeMs) {
            console.error('❌ Payment data expired (older than 5 minutes) - clearing and redirecting');
            sessionStorage.removeItem('payment_data');
            window.location.href = '/subscription.html';
            return;
        }

        // ⚠️ Validate redirectUrl exists and is valid
        if (!paymentData.redirectUrl || !paymentData.redirectUrl.startsWith('https://')) {
            console.error('❌ Invalid or missing redirectUrl:', paymentData.redirectUrl);
            alert(`FOUT: Ongeldige betaallink gevonden!\n\nURL: ${paymentData.redirectUrl || 'GEEN URL'}\n\nNeem screenshot van deze melding en stuur naar support.`);
            sessionStorage.removeItem('payment_data');
            window.location.href = '/subscription.html';
            return;
        }

        console.log('✅ Payment data validation passed - redirectUrl:', paymentData.redirectUrl);

        // Display the email
        displayEmail(paymentData.email);

        // Enable the proceed button
        document.getElementById('proceed-button').disabled = false;

    } catch (error) {
        console.error('Error parsing payment data:', error);
        sessionStorage.removeItem('payment_data');
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

    // 🔍 DEBUG: Log exact redirect URL
    console.log('🚀 Proceeding to payment:', {
        redirectUrl: paymentData.redirectUrl,
        planId: paymentData.planId,
        email: paymentData.email,
        fullPaymentData: paymentData
    });

    // ⚠️ Extra safety check - verify URL domain
    const isValidDomain = paymentData.redirectUrl.includes('pay.baasoverjetijd.be') ||
                          paymentData.redirectUrl.includes('plugandpay') ||
                          paymentData.redirectUrl.includes('localhost');

    if (!isValidDomain) {
        console.error('⚠️ WARNING: Suspicious redirect URL detected!', paymentData.redirectUrl);
        const confirmRedirect = confirm(
            `WAARSCHUWING: Ongeldige betaallink!\n\n` +
            `URL: ${paymentData.redirectUrl}\n\n` +
            `Deze URL lijkt niet juist. Wil je toch doorgaan?\n\n` +
            `(Klik ANNULEREN om terug te gaan)`
        );

        if (!confirmRedirect) {
            console.log('User cancelled suspicious redirect');
            sessionStorage.removeItem('payment_data');
            window.location.href = '/subscription.html';
            return;
        }
    }

    // Show loading state on button
    const proceedButton = document.getElementById('proceed-button');
    proceedButton.disabled = true;
    proceedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doorsturen naar betaling...';

    // Redirect to Plug&Pay after brief delay
    setTimeout(() => {
        console.log('✅ Executing redirect to:', paymentData.redirectUrl);
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
