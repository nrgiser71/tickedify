// ===================================================================
// Message Modal System voor Tickedify
// Feature: 026-lees-messaging-system
// Phase 1: Core Foundation
// ===================================================================
// Handles message display, carousel navigation, dismiss actions

let currentMessages = [];
let currentMessageIndex = 0;

// Auto-check on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📢 Message modal system initialized');
  await checkForMessages();
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
    iconElement.textContent = getMessageIcon(message.message_type || 'information');
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

// Get icon emoji for message type
function getMessageIcon(type) {
  const icons = {
    information: 'ℹ️',
    educational: '📚',
    warning: '⚠️',
    important: '❗',
    feature: '🆕',
    tip: '💡'
  };
  return icons[type] || 'ℹ️';
}

// Parse markdown links: [text](url) -> <a href="url">text</a>
function parseMarkdownLinks(text) {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
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
});

// Expose functions globally for potential external use
window.checkForMessages = checkForMessages;
window.showMessage = showMessage;
window.dismissMessage = dismissMessage;
window.snoozeMessage = snoozeMessage;
