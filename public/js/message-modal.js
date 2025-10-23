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
  if (contentElement) contentElement.textContent = message.message;

  // Apply type-specific styling to modal
  const modalElement = document.querySelector('.message-modal');
  if (modalElement) {
    modalElement.className = `message-modal message-${message.message_type || 'information'}`;
  }

  // Show modal
  modal.style.display = 'flex';
  console.log(`📢 Showing message: "${message.title}" (${message.message_type})`);

  // Handle dismiss button
  const dismissBtn = document.querySelector('.btn-message-dismiss');
  if (dismissBtn) {
    dismissBtn.onclick = async () => {
      await dismissMessage(message.id);
    };
  }
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

// Expose functions globally for potential external use
window.checkForMessages = checkForMessages;
window.showMessage = showMessage;
window.dismissMessage = dismissMessage;
