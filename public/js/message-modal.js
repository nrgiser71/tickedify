// ===================================================================
// Message Modal System voor Tickedify
// Feature: 026-lees-messaging-system
// Phase 1: Core Foundation
// ===================================================================
// Handles message display, carousel navigation, dismiss actions

let currentMessages = [];
let currentMessageIndex = 0;
let pollingInterval = null;
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Auto-check on page load and start polling
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📢 Message modal system initialized');
  await checkForMessages();
  startPolling();
  console.log('📢 Polling started - checking every 5 minutes');
});

// Check for unread messages from backend
async function checkForMessages() {
  try {
    const response = await fetch('/api/messages/unread');
    if (!response.ok) {
      console.log('No messages or auth required');
      return;
    }

    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      console.log(`📢 ${data.messages.length} unread message(s) found`);
      currentMessages = data.messages;
      currentMessageIndex = 0;
      showMessage(currentMessages[0]);
    } else {
      console.log('📢 No unread messages');
    }
  } catch (error) {
    console.error('Check messages error:', error);
  }
}

// Check if modal/popup is currently open (blocking message display)
function isModalOpen() {
  // Check for edit modal (taak-modal)
  const editModal = document.querySelector('.taak-modal');
  if (editModal && editModal.style.display === 'flex') {
    console.log('📢 Edit modal is open - skipping message check');
    return true;
  }

  // Check for recurring popup (herhaling-popup)
  const recurringPopup = document.querySelector('.herhaling-popup');
  if (recurringPopup && recurringPopup.style.display === 'flex') {
    console.log('📢 Recurring popup is open - skipping message check');
    return true;
  }

  return false;
}

// Start polling for messages every 5 minutes
function startPolling() {
  // Prevent multiple intervals
  if (pollingInterval) {
    console.log('📢 Polling already active');
    return;
  }

  pollingInterval = setInterval(async () => {
    // Only check if tab is visible
    if (document.visibilityState !== 'visible') {
      console.log('📢 Tab not visible - skipping poll');
      return;
    }

    // Don't check if modal/popup is open
    if (isModalOpen()) {
      return; // Message already logged by isModalOpen()
    }

    console.log('📢 Polling: checking for messages...');
    await checkForMessages();
  }, POLLING_INTERVAL);

  console.log(`📢 Polling interval set: every ${POLLING_INTERVAL / 1000 / 60} minutes`);
}

// Stop polling (cleanup function)
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('📢 Polling stopped');
  }
}

// Display a message in the modal
function showMessage(message) {
  const modal = document.getElementById('message-modal-overlay');
  if (!modal) {
    console.error('Message modal element not found in DOM');
    return;
  }

  // Update icon based on message type
  const iconElement = document.querySelector('.message-icon');
  if (iconElement) {
    const iconClass = getMessageIcon(message.message_type || 'information');
    iconElement.className = `message-icon fas ${iconClass}`;
  }

  // Update content
  const titleElement = document.querySelector('.message-title');
  const contentElement = document.querySelector('.message-content');

  if (titleElement) titleElement.textContent = message.title;
  // Use innerHTML with parsed markdown links
  if (contentElement) contentElement.innerHTML = parseMarkdownLinks(message.message);

  // Apply type-specific styling to modal
  const modalElement = document.querySelector('.message-modal');
  if (modalElement) {
    modalElement.className = `message-modal message-${message.message_type || 'information'}`;
  }

  // Update carousel indicator
  const carouselIndicator = document.querySelector('.carousel-indicator');
  if (currentMessages.length > 1 && carouselIndicator) {
    carouselIndicator.textContent = `${currentMessageIndex + 1} / ${currentMessages.length}`;
    carouselIndicator.style.display = 'block';
  } else if (carouselIndicator) {
    carouselIndicator.style.display = 'none';
  }

  // Show/hide navigation buttons
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  if (btnPrev) btnPrev.style.display = currentMessageIndex > 0 ? 'inline-block' : 'none';
  if (btnNext) btnNext.style.display = currentMessageIndex < currentMessages.length - 1 ? 'inline-block' : 'none';

  // Handle action button
  const buttonContainer = document.querySelector('.message-button');
  if (message.button_label && buttonContainer) {
    buttonContainer.innerHTML = `
      <button class="btn-message-action" data-action="${message.button_action || 'navigate'}"
              data-target="${message.button_target || ''}">
        ${message.button_label}
      </button>
    `;
    buttonContainer.style.display = 'block';

    // Attach click handler
    const actionBtn = buttonContainer.querySelector('.btn-message-action');
    if (actionBtn) {
      actionBtn.onclick = () => handleButtonAction(message);
    }
  } else if (buttonContainer) {
    buttonContainer.style.display = 'none';
  }

  // Handle snooze options
  const snoozeContainer = document.querySelector('.snooze-options');
  if (message.snoozable && snoozeContainer) {
    snoozeContainer.style.display = 'flex';
  } else if (snoozeContainer) {
    snoozeContainer.style.display = 'none';
  }

  // Update dismiss button visibility and text
  const dismissBtn = document.querySelector('.btn-message-dismiss');
  if (dismissBtn) {
    if (message.dismissible) {
      dismissBtn.style.display = 'inline-block';
      dismissBtn.textContent = 'Got it';
    } else if (!message.button_label) {
      // Non-dismissible without action button: show "OK" that just closes
      dismissBtn.style.display = 'inline-block';
      dismissBtn.textContent = 'OK';
    } else {
      // Non-dismissible with action button: hide dismiss button
      dismissBtn.style.display = 'none';
    }

    // Attach click handler
    dismissBtn.onclick = async () => {
      if (message.dismissible) {
        await dismissMessage(message.id);
      } else {
        // Just close modal for non-dismissible
        modal.style.display = 'none';
      }
    };
  }

  // Show modal
  modal.style.display = 'flex';
  console.log(`📢 Showing message: "${message.title}" (${message.message_type})`);
}

// Get Font Awesome icon class for message type
function getMessageIcon(type) {
  const icons = {
    information: 'fa-info-circle',
    educational: 'fa-graduation-cap',
    warning: 'fa-exclamation-triangle',
    important: 'fa-exclamation-circle',
    feature: 'fa-rocket',
    tip: 'fa-lightbulb'
  };
  return icons[type] || 'fa-info-circle';
}

// Parse markdown to HTML (supports common markdown syntax)
function parseMarkdownLinks(text) {
  if (!text) return '';

  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Horizontal rule: --- (must be on its own line)
  html = html.replace(/^---$/gm, '<hr>');

  // Headers (must be at start of line)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Highlight: ==text==
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not in URLs or bold)
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  html = html.replace(/\b_([^_]+?)_\b/g, '<em>$1</em>');

  // Code: `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Lists: Group consecutive list items properly
  // Match consecutive lines starting with - or *
  html = html.replace(/((?:^[*-] .+$\n?)+)/gm, function(match) {
    // Convert each line to <li>
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^[*-] /, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists: 1. item, 2. item
  html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, function(match) {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^\d+\. /, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ol>${items}</ol>`;
  });

  // Line breaks: double newline = paragraph, single newline = <br>
  // But preserve lists
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';

  // Clean up paragraphs around lists
  html = html.replace(/<p>(<[uo]l>)/g, '$1');
  html = html.replace(/(<\/[uo]l>)<\/p>/g, '$1');

  // Remove <br> tags around lists
  html = html.replace(/<br>(<[uo]l>)/g, '$1');
  html = html.replace(/(<\/[uo]l>)<br>/g, '$1');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '');

  return html;
}

// Dismiss a message (mark as read)
async function dismissMessage(messageId) {
  try {
    const response = await fetch(`/api/messages/${messageId}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to dismiss message');
      return;
    }

    console.log(`📢 Message ${messageId} dismissed`);

    // Close modal
    const modal = document.getElementById('message-modal-overlay');
    if (modal) modal.style.display = 'none';

    // Remove from current messages
    currentMessages = currentMessages.filter(m => m.id !== messageId);

    // Show next message if available
    if (currentMessages.length > 0) {
      currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
      showMessage(currentMessages[currentMessageIndex]);
    }
  } catch (error) {
    console.error('Dismiss error:', error);
  }
}

// Handle action button click
async function handleButtonAction(message) {
  try {
    // Track button click
    await fetch(`/api/messages/${message.id}/button-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`📢 Button clicked on message ${message.id}: ${message.button_action}`);

    if (message.button_action === 'navigate') {
      // Internal navigation
      window.location.href = message.button_target;
    } else if (message.button_action === 'external') {
      // External link in new tab
      window.open(message.button_target, '_blank');
    }

    // Dismiss message after button click if dismissible
    if (message.dismissible) {
      await dismissMessage(message.id);
    } else {
      // For non-dismissible, just close modal
      const modal = document.getElementById('message-modal-overlay');
      if (modal) modal.style.display = 'none';
    }
  } catch (error) {
    console.error('Button action error:', error);
  }
}

// Snooze a message
async function snoozeMessage(messageId, duration) {
  try {
    const response = await fetch(`/api/messages/${messageId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration })
    });

    if (!response.ok) {
      console.error('Failed to snooze message');
      return;
    }

    const data = await response.json();
    console.log(`📢 Message ${messageId} snoozed until ${data.snoozedUntil}`);

    // Remove from current messages
    currentMessages = currentMessages.filter(m => m.id !== messageId);

    // Show next message or close modal
    if (currentMessages.length > 0) {
      currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
      showMessage(currentMessages[currentMessageIndex]);
    } else {
      const modal = document.getElementById('message-modal-overlay');
      if (modal) modal.style.display = 'none';
    }
  } catch (error) {
    console.error('Snooze error:', error);
  }
}

// Carousel navigation - Previous message
function showPreviousMessage() {
  if (currentMessageIndex > 0) {
    currentMessageIndex--;
    showMessage(currentMessages[currentMessageIndex]);
  }
}

// Carousel navigation - Next message
function showNextMessage() {
  if (currentMessageIndex < currentMessages.length - 1) {
    currentMessageIndex++;
    showMessage(currentMessages[currentMessageIndex]);
  }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Close button
  const btnClose = document.querySelector('.btn-close-modal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      const modal = document.getElementById('message-modal-overlay');
      if (modal) modal.style.display = 'none';
    });
  }

  // Carousel navigation
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');

  if (btnPrev) {
    btnPrev.addEventListener('click', showPreviousMessage);
  }

  if (btnNext) {
    btnNext.addEventListener('click', showNextMessage);
  }

  // Snooze buttons
  document.querySelectorAll('.btn-snooze').forEach(btn => {
    btn.addEventListener('click', async () => {
      const duration = parseInt(btn.dataset.duration);
      if (currentMessages[currentMessageIndex]) {
        await snoozeMessage(currentMessages[currentMessageIndex].id, duration);
      }
    });
  });

  // Tab visibility tracking - pause polling when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('📢 Tab became visible - polling will resume on next interval');
    } else {
      console.log('📢 Tab became hidden - polling paused');
    }
  });
});

// Expose functions globally for potential external use
window.checkForMessages = checkForMessages;
window.showMessage = showMessage;
window.dismissMessage = dismissMessage;
window.snoozeMessage = snoozeMessage;
window.startPolling = startPolling;
window.stopPolling = stopPolling;
