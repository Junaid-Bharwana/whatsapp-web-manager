// Initialize socket connection
const socket = io();

// DOM Elements
const qrContainer = document.getElementById('qrcode');
const connectionMessage = document.getElementById('connection-message');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const contentPages = document.querySelectorAll('.content-page');
const activityLog = document.getElementById('activity-log');

// Global variables
let selectedRecipients = new Set();

// Initialize Bootstrap components
const toastEl = document.getElementById('notification-toast');
const toast = new bootstrap.Toast(toastEl);

// Utility Functions
function showNotification(message, type = 'success') {
    const toastBody = document.querySelector('.toast-body');
    toastBody.textContent = message;
    toastBody.className = `toast-body ${type}`;
    toast.show();
}

function updateConnectionStatus(status, message) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

function addActivityLog(message) {
    const logItem = document.createElement('div');
    logItem.className = 'activity-item';
    logItem.innerHTML = `
        <small class="text-muted">${new Date().toLocaleTimeString()}</small>
        <div>${message}</div>
    `;
    activityLog.insertBefore(logItem, activityLog.firstChild);
}

// Navigation Functions
function showPage(pageId) {
    contentPages.forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Event Listeners
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        showPage(pageId);
    });
});

// Socket Event Handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('connected', 'Connected');
    addActivityLog('Connected to server');
    // Request QR code when socket connects
    socket.emit('requestQR');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('', 'Disconnected');
    addActivityLog('Disconnected from server');
});

socket.on('qr', (qr) => {
    console.log('QR Code received');
    qrContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = qr;
    qrContainer.appendChild(img);
    connectionMessage.textContent = 'Scan this QR code with WhatsApp';
    addActivityLog('QR Code received');
    updateConnectionStatus('waiting', 'Waiting for QR scan');
});

socket.on('ready', () => {
    qrContainer.innerHTML = '<div class="alert alert-success">WhatsApp is ready!</div>';
    connectionMessage.textContent = 'WhatsApp is connected';
    updateConnectionStatus('connected', 'Connected');
    addActivityLog('WhatsApp is ready');
    loadInitialData();
});

socket.on('authenticated', () => {
    addActivityLog('WhatsApp authenticated');
    updateConnectionStatus('connected', 'Authenticated');
});

socket.on('auth_failure', (msg) => {
    showNotification('Authentication failed: ' + msg, 'error');
    addActivityLog('Authentication failed');
    updateConnectionStatus('error', 'Authentication failed');
});

socket.on('disconnected', (reason) => {
    showNotification('Disconnected: ' + reason, 'error');
    updateConnectionStatus('', 'Disconnected');
    addActivityLog('WhatsApp disconnected: ' + reason);
    qrContainer.innerHTML = '<div class="alert alert-warning">Disconnected. Waiting for reconnection...</div>';
});

socket.on('error', (error) => {
    console.error('Error:', error);
    showNotification(error, 'error');
    addActivityLog('Error: ' + error);
    updateConnectionStatus('error', 'Error occurred');
});

// Load Initial Data
function loadInitialData() {
    // Load stats
    socket.emit('getStats', {}, (response) => {
        if (response.success) {
            updateDashboardStats(response.data);
        }
    });

    // Load contacts
    socket.emit('getContacts', {}, (response) => {
        if (response.success) {
            updateContactsList(response.data);
        }
    });

    // Load groups
    socket.emit('getAllGroups', {}, (response) => {
        if (response.success) {
            updateGroupsList(response.data);
        }
    });
}

// Update Dashboard Stats
function updateDashboardStats(stats) {
    document.getElementById('total-contacts').textContent = stats.contacts;
    document.getElementById('total-groups').textContent = stats.groups;
    document.getElementById('total-messages').textContent = stats.messages;
    document.getElementById('total-broadcasts').textContent = stats.broadcasts;
}

// Message Functions
const messageForm = document.getElementById('messageForm');
if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const number = document.getElementById('recipientNumber').value;
        const message = document.getElementById('messageText').value;
        const mediaFile = document.getElementById('messageFile').files[0];

        try {
            if (mediaFile) {
                const reader = new FileReader();
                reader.onload = () => {
                    socket.emit('sendMessage', {
                        number,
                        message,
                        media: reader.result
                    }, handleMessageResponse);
                };
                reader.readAsDataURL(mediaFile);
            } else {
                socket.emit('sendMessage', { number, message }, handleMessageResponse);
            }
        } catch (error) {
            showNotification('Error sending message: ' + error.message, 'error');
        }
    });
}

function handleMessageResponse(response) {
    if (response.success) {
        showNotification('Message sent successfully');
        document.getElementById('messageForm').reset();
        addActivityLog('Message sent successfully');
    } else {
        showNotification('Failed to send message: ' + response.error, 'error');
        addActivityLog('Message sending failed');
    }
}

// Contact Functions
function updateContactsList(contacts) {
    const contactsList = document.getElementById('contacts-list');
    const bulkContactsList = document.getElementById('bulk-contacts-list');
    
    if (contactsList) {
        contactsList.innerHTML = contacts.map(contact => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${contact.name}</h6>
                    <small class="text-muted">${contact.number}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary me-2" onclick="selectContactForBulkMessage('${contact.id}', '${contact.name}')">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteContact('${contact.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    if (bulkContactsList) {
        bulkContactsList.innerHTML = contacts.map(contact => `
            <div class="list-group-item">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${contact.id}" id="contact-${contact.id}">
                    <label class="form-check-label" for="contact-${contact.id}">
                        ${contact.name} (${contact.number})
                    </label>
                </div>
            </div>
        `).join('');
    }
}

// Group Functions
function updateGroupsList(groups) {
    const groupsList = document.getElementById('groups-list');
    const bulkGroupsList = document.getElementById('bulk-groups-list');

    if (groupsList) {
        groupsList.innerHTML = groups.map(group => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${group.name}</h6>
                        <small class="text-muted">${group.participantsCount} participants</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary me-2" onclick="viewGroupDetails('${group.id}')">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-primary me-2" onclick="selectGroupForBulkMessage('${group.id}', '${group.name}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="leaveGroup('${group.id}')">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
                <div id="group-details-${group.id}" class="group-details" style="display: none;">
                    <div class="mt-3">
                        <p class="mb-2">${group.description || 'No description'}</p>
                        <h6>Participants:</h6>
                        <div class="participants-list">
                            ${group.participants.map(p => `
                                <div class="participant">
                                    ${p.name} ${p.isAdmin ? '<span class="badge bg-primary">Admin</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (bulkGroupsList) {
        bulkGroupsList.innerHTML = groups.map(group => `
            <div class="list-group-item">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${group.id}" id="group-${group.id}">
                    <label class="form-check-label" for="group-${group.id}">
                        ${group.name} (${group.participantsCount} participants)
                    </label>
                </div>
            </div>
        `).join('');
    }
}

function viewGroupDetails(groupId) {
    const detailsDiv = document.getElementById(`group-details-${groupId}`);
    if (detailsDiv) {
        const isVisible = detailsDiv.style.display !== 'none';
        detailsDiv.style.display = isVisible ? 'none' : 'block';
    }
}

function leaveGroup(groupId) {
    if (confirm('Are you sure you want to leave this group?')) {
        socket.emit('leaveGroup', { groupId }, (response) => {
            if (response.success) {
                showNotification('Left group successfully');
                addActivityLog('Left group');
                loadInitialData(); // Reload groups list
            } else {
                showNotification('Failed to leave group: ' + response.error, 'error');
            }
        });
    }
}

// Bulk Message Functions
function selectContactForBulkMessage(contactId, contactName) {
    const checkbox = document.getElementById(`contact-${contactId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSelectedRecipients();
    }
}

function selectGroupForBulkMessage(groupId, groupName) {
    const checkbox = document.getElementById(`group-${groupId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSelectedRecipients();
    }
}

function updateSelectedRecipients() {
    selectedRecipients.clear();
    
    // Add selected contacts
    document.querySelectorAll('#bulk-contacts-list input:checked').forEach(checkbox => {
        selectedRecipients.add(checkbox.value);
    });

    // Add selected groups
    document.querySelectorAll('#bulk-groups-list input:checked').forEach(checkbox => {
        selectedRecipients.add(checkbox.value);
    });

    // Update UI
    const count = selectedRecipients.size;
    const bulkMessageBtn = document.getElementById('send-bulk-btn');
    if (bulkMessageBtn) {
        bulkMessageBtn.disabled = count === 0;
        bulkMessageBtn.textContent = `Send Bulk Message (${count} selected)`;
    }
}

// Bulk Message Form Handler
const bulkMessageForm = document.getElementById('bulkMessageForm');
if (bulkMessageForm) {
    bulkMessageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('bulkMessageText').value;
        const mediaFile = document.getElementById('bulkMessageFile').files[0];
        const recipients = Array.from(selectedRecipients);

        if (recipients.length === 0) {
            showNotification('Please select at least one recipient', 'error');
            return;
        }

        try {
            if (mediaFile) {
                const reader = new FileReader();
                reader.onload = () => {
                    socket.emit('sendBulkMessage', {
                        recipients,
                        message,
                        media: reader.result
                    }, handleBulkMessageResponse);
                };
                reader.readAsDataURL(mediaFile);
            } else {
                socket.emit('sendBulkMessage', { recipients, message }, handleBulkMessageResponse);
            }
        } catch (error) {
            showNotification('Error sending bulk message: ' + error.message, 'error');
        }
    });
}

function handleBulkMessageResponse(response) {
    if (response.success) {
        const { successful, failed } = response.results;
        showNotification(`Bulk message sent successfully to ${successful} recipients. Failed: ${failed}`);
        document.getElementById('bulkMessageForm').reset();
        selectedRecipients.clear();
        updateSelectedRecipients();
        addActivityLog(`Bulk message sent to ${successful} recipients`);
    } else {
        showNotification('Failed to send bulk message: ' + response.error, 'error');
    }
}

// Settings Functions
const profileSettingsForm = document.getElementById('profileSettingsForm');
if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const displayName = document.getElementById('displayName').value;
        const statusMessage = document.getElementById('statusMessage').value;

        socket.emit('updateProfile', { displayName, statusMessage }, (response) => {
            if (response.success) {
                showNotification('Profile updated successfully');
                addActivityLog('Profile settings updated');
            } else {
                showNotification('Failed to update profile: ' + response.error, 'error');
            }
        });
    });
}

// Logout and Session Management
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        socket.emit('logout', (response) => {
            if (response.success) {
                showNotification('Logged out successfully');
                addActivityLog('Logged out');
                // Reset UI state
                qrContainer.innerHTML = '<div class="alert alert-info">Please scan QR code to login</div>';
                updateConnectionStatus('', 'Disconnected');
                // Clear any cached data
                selectedRecipients.clear();
                // Show dashboard
                showPage('dashboard');
            } else {
                showNotification('Failed to logout: ' + response.error, 'error');
            }
        });
    }
});

document.getElementById('clear-data-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to clear all session data? This will log you out and require a new QR code scan.')) {
        socket.emit('clearSession', (response) => {
            if (response.success) {
                showNotification('Session cleared successfully');
                addActivityLog('Session cleared');
                // Reset UI state
                updateConnectionStatus('', 'Disconnected');
                selectedRecipients.clear();
                // Show dashboard
                showPage('dashboard');
            } else {
                showNotification('Failed to clear session: ' + response.error, 'error');
            }
        });
    }
});

// Add notification toast to HTML if not present
if (!document.getElementById('notification-toast')) {
    const toastHTML = `
        <div class="toast-container position-fixed bottom-0 end-0 p-3">
            <div id="notification-toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Notification</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', toastHTML);
}

// Clear Session Handler
document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This will log you out.')) {
        socket.emit('clearSession', {}, (response) => {
            if (response.success) {
                showNotification('Session cleared successfully');
                addActivityLog('Session cleared');
                window.location.reload();
            } else {
                showNotification('Failed to clear session: ' + response.error, 'error');
            }
        });
    }
});

// Initialize QR Code Request
// socket.emit('requestQR');
