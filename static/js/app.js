// Application State
let state = {
    rawEntries: [],
    updates: [],      // Parsed individual updates
    selectedIds: new Set(),
    activeFilter: 'all',
    searchQuery: '',
    lastChecked: null
};

// Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    statusBadge: document.getElementById('status-badge'),
    totalCount: document.getElementById('total-count'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    selectedCount: document.getElementById('selected-count'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterPills: document.querySelectorAll('.pill'),
    loader: document.getElementById('loader'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    feedList: document.getElementById('feed-list'),
    floatingBar: document.getElementById('floating-bar'),
    floatingBadge: document.getElementById('floating-badge'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    tweetSelectedBtn: document.getElementById('tweet-selected-btn'),
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charLimit: document.getElementById('char-limit'),
    charProgress: document.getElementById('char-progress'),
    tweetWarningMsg: document.getElementById('tweet-warning-msg'),
    tweetPreviewText: document.getElementById('tweet-preview-text'),
    tweetCancel: document.getElementById('tweet-cancel'),
    tweetSubmit: document.getElementById('tweet-submit'),
    toastContainer: document.getElementById('toast-container')
};

// Category styling config
const categoryConfig = {
    'feature': {
        color: '#10b981',
        icon: 'fa-solid fa-circle-plus',
        badgeClass: 'feature'
    },
    'announcement': {
        color: '#0ea5e9',
        icon: 'fa-solid fa-bullhorn',
        badgeClass: 'announcement'
    },
    'issue': {
        color: '#ef4444',
        icon: 'fa-solid fa-circle-exclamation',
        badgeClass: 'issue'
    },
    'deprecation': {
        color: '#f59e0b',
        icon: 'fa-solid fa-triangle-exclamation',
        badgeClass: 'deprecation'
    },
    'update': {
        color: '#8b5cf6',
        icon: 'fa-solid fa-pen-to-square',
        badgeClass: 'update'
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleaseNotes();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh & Retry
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes());
    elements.retryBtn.addEventListener('click', () => fetchReleaseNotes());

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });

    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClear.style.display = 'none';
        applyFiltersAndSearch();
    });

    // Filter Pills
    elements.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            elements.filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.activeFilter = pill.getAttribute('data-type');
            applyFiltersAndSearch();
        });
    });

    // Floating Bar Selection actions
    elements.clearSelectionBtn.addEventListener('click', clearSelection);
    elements.tweetSelectedBtn.addEventListener('click', openTweetComposerForSelection);

    // Modal Events
    elements.modalClose.addEventListener('click', closeTweetModal);
    elements.tweetCancel.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', handleTweetTextareaInput);
    elements.tweetSubmit.addEventListener('click', submitTweet);

    // Close modal on click outside content
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
}

// Fetch Release Notes from Backend
async function fetchReleaseNotes() {
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            state.rawEntries = result.data;
            processEntries(result.data);
            state.lastChecked = new Date();
            updateStats();
            applyFiltersAndSearch();
            showToast('Success', 'Successfully loaded release notes', 'success');
        } else {
            throw new Error(result.message || 'Unknown error fetching feed');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorMessage.textContent = error.message;
        setErrorState(true);
        showToast('Error', 'Failed to fetch release notes', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Process entries into individual updates by parsing <h3> tags
function processEntries(entries) {
    const parser = new DOMParser();
    const allUpdates = [];

    entries.forEach(entry => {
        const doc = parser.parseFromString(entry.content, 'text/html');
        const nodes = Array.from(doc.body.childNodes);
        
        let currentUpdate = null;
        let updateIndex = 0;

        // Sanitize entry.id to be a valid CSS selector and HTML ID attribute
        const safeEntryId = entry.id.replace(/[^a-zA-Z0-9-_]/g, '_');

        nodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            if (node.tagName === 'H3') {
                if (currentUpdate) {
                    allUpdates.push(currentUpdate);
                }
                const type = node.textContent.trim();
                currentUpdate = {
                    id: `${safeEntryId}_${updateIndex++}`,
                    parentId: entry.id,
                    date: entry.title,
                    link: entry.link,
                    type: type,
                    typeNormalized: normalizeType(type),
                    content: ''
                };
            } else {
                if (!currentUpdate) {
                    currentUpdate = {
                        id: `${safeEntryId}_${updateIndex++}`,
                        parentId: entry.id,
                        date: entry.title,
                        link: entry.link,
                        type: 'Update',
                        typeNormalized: 'update',
                        content: ''
                    };
                }
                currentUpdate.content += node.outerHTML;
            }
        });

        if (currentUpdate) {
            allUpdates.push(currentUpdate);
        }
    });

    state.updates = allUpdates;
}

// Map various text categories to standard types
function normalizeType(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('announcement')) return 'announcement';
    if (t.includes('issue') || t.includes('bug')) return 'issue';
    if (t.includes('deprecat')) return 'deprecation';
    return 'update';
}

// Apply Active Filters and Search Query
function applyFiltersAndSearch() {
    let filtered = state.updates;

    // Filter
    if (state.activeFilter !== 'all') {
        filtered = filtered.filter(u => u.typeNormalized === state.activeFilter);
    }

    // Search
    if (state.searchQuery) {
        filtered = filtered.filter(u => {
            const typeMatch = u.type.toLowerCase().includes(state.searchQuery);
            const dateMatch = u.date.toLowerCase().includes(state.searchQuery);
            const contentMatch = stripHtml(u.content).toLowerCase().includes(state.searchQuery);
            return typeMatch || dateMatch || contentMatch;
        });
    }

    renderUpdates(filtered);
}

// Render the updates list
function renderUpdates(updatesList) {
    elements.feedList.innerHTML = '';
    
    if (updatesList.length === 0) {
        elements.feedList.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }

    elements.emptyState.style.display = 'none';
    elements.feedList.style.display = 'flex';

    updatesList.forEach(update => {
        const config = categoryConfig[update.typeNormalized] || categoryConfig['update'];
        const isSelected = state.selectedIds.has(update.id);
        
        const card = document.createElement('article');
        card.className = `feed-card ${isSelected ? 'selected' : ''}`;
        card.id = `card-${update.id}`;
        card.style.setProperty('--badge-color', config.color);

        // Date short display (e.g. June 17, 2026)
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-header-left">
                    <span class="category-badge ${config.badgeClass}">
                        <i class="${config.icon}"></i> ${update.type}
                    </span>
                    <span class="card-date">
                        <i class="fa-regular fa-calendar"></i> ${update.date}
                    </span>
                </div>
                <div class="card-header-right">
                    <input type="checkbox" id="check-${update.id}" class="card-select-input" ${isSelected ? 'checked' : ''}>
                    <label for="check-${update.id}" class="card-select-label" title="Select for combined post">
                        <i class="fa-solid fa-check"></i>
                    </label>
                </div>
            </div>
            
            <div class="feed-card-content">
                ${update.content}
            </div>
            
            <div class="card-footer">
                <a href="${update.link}" target="_blank" class="card-action-btn" title="View original release notes page">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Source
                </a>
                <button class="card-action-btn btn-copy" data-id="${update.id}" title="Copy raw update details">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
                <button class="card-action-btn btn-tweet-action" data-id="${update.id}" title="Draft post for X / Twitter">
                    <i class="fa-brands fa-x-twitter"></i> Post
                </button>
            </div>
        `;

        // Event handler for selecting via custom checkbox
        const checkbox = card.querySelector('.card-select-input');
        checkbox.addEventListener('change', (e) => {
            toggleSelectUpdate(update.id, e.target.checked);
        });

        // Event handler for direct post
        const tweetBtn = card.querySelector('.btn-tweet-action');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetComposerForSingle(update);
        });

        // Event handler for copy button
        const copyBtn = card.querySelector('.btn-copy');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyUpdateToClipboard(update);
        });

        elements.feedList.appendChild(card);
    });
}

// Handle Single Card Selection
function toggleSelectUpdate(id, isSelected) {
    if (isSelected) {
        state.selectedIds.add(id);
        document.getElementById(`card-${id}`).classList.add('selected');
    } else {
        state.selectedIds.delete(id);
        document.getElementById(`card-${id}`).classList.remove('selected');
    }
    
    updateSelectionUI();
}

// Clear all card selections
function clearSelection() {
    state.selectedIds.clear();
    
    // Uncheck all checkboxes on screen
    const checkboxes = elements.feedList.querySelectorAll('.card-select-input');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Remove selected class from cards
    const cards = elements.feedList.querySelectorAll('.feed-card');
    cards.forEach(c => c.classList.remove('selected'));

    updateSelectionUI();
    showToast('Cleared', 'Selection cleared', 'info');
}

// Update UI related to selection count and actions
function updateSelectionUI() {
    const count = state.selectedIds.size;
    elements.selectedCount.textContent = count;
    elements.floatingBadge.textContent = count;

    if (count > 0) {
        elements.floatingBar.classList.add('active');
    } else {
        elements.floatingBar.classList.remove('active');
    }
}

// Single Update Tweet Composition
function openTweetComposerForSingle(update) {
    const text = generateTweetText(update);
    openTweetModal(text);
}

// Multiple Selected Updates Tweet Composition
function openTweetComposerForSelection() {
    const selectedUpdates = state.updates.filter(u => state.selectedIds.has(u.id));
    if (selectedUpdates.length === 0) return;
    
    let text = '';
    if (selectedUpdates.length === 1) {
        text = generateTweetText(selectedUpdates[0]);
    } else {
        text = generateCombinedTweetText(selectedUpdates);
    }
    openTweetModal(text);
}

// Generate X-Post content for a single note
function generateTweetText(update) {
    const plainText = stripHtml(update.content);
    const date = update.date;
    const type = update.type.toUpperCase();
    
    let emoji = '📢';
    if (type.includes('FEATURE')) emoji = '🚀';
    if (type.includes('ISSUE') || type.includes('BUG')) emoji = '⚠️';
    if (type.includes('DEPRECATION') || type.includes('DEPRECATED')) emoji = '🛑';
    if (type.includes('ANNOUNCEMENT')) emoji = '📣';
    
    let header = `${emoji} BigQuery Update (${date}) - ${update.type}:\n`;
    let footer = `\n\nOriginal details: ${update.link}`;
    
    const maxBodyLen = 280 - header.length - footer.length;
    let body = plainText;
    
    if (body.length > maxBodyLen) {
        body = body.substring(0, maxBodyLen - 3) + '...';
    }
    
    return `${header}${body}${footer}`;
}

// Generate X-Post content for multiple notes
function generateCombinedTweetText(updates) {
    let header = `🚀 BigQuery Updates Summary:\n`;
    let footer = `\n\nRead details: https://docs.cloud.google.com/bigquery/docs/release-notes`;
    
    let items = '';
    updates.forEach(u => {
        let datePart = u.date.split(',')[0];
        let plainText = stripHtml(u.content);
        if (plainText.length > 55) {
            plainText = plainText.substring(0, 52) + '...';
        }
        items += `• [${datePart}] ${u.type}: ${plainText}\n`;
    });
    
    const maxItemsLen = 280 - header.length - footer.length;
    if (items.length > maxItemsLen) {
        items = items.substring(0, maxItemsLen - 3) + '...';
    }
    
    return `${header}${items}${footer}`;
}

// Copy update contents to clipboard
async function copyUpdateToClipboard(update) {
    const text = `BigQuery Release Notes (${update.date}) - [${update.type}]\n\n${stripHtml(update.content)}\n\nLink: ${update.link}`;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied', 'Update copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Error', 'Failed to copy to clipboard', 'error');
    }
}

// Open/Close Tweet Composer Modal
function openTweetModal(text) {
    elements.tweetTextarea.value = text;
    handleTweetTextareaInput();
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
}

// Handle characters limit counting and styling
function handleTweetTextareaInput() {
    const text = elements.tweetTextarea.value;
    const length = text.length;
    const limit = 280;
    
    elements.charCount.textContent = length;
    elements.tweetPreviewText.textContent = text;
    
    // Progress bar calculation
    const percentage = Math.min((length / limit) * 100, 100);
    elements.charProgress.style.width = `${percentage}%`;
    
    // Theme triggers based on limits
    if (length > limit) {
        elements.charProgress.className = 'progress-bar-fill danger';
        elements.charCount.style.color = '#ef4444';
        elements.tweetWarningMsg.style.display = 'flex';
    } else if (length > limit - 30) {
        elements.charProgress.className = 'progress-bar-fill warning';
        elements.charCount.style.color = '#f59e0b';
        elements.tweetWarningMsg.style.display = 'none';
    } else {
        elements.charProgress.className = 'progress-bar-fill';
        elements.charCount.style.color = 'var(--text-secondary)';
        elements.tweetWarningMsg.style.display = 'none';
    }
}

// Open Tweet intent URL in external tab
function submitTweet() {
    const text = elements.tweetTextarea.value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
    closeTweetModal();
    showToast('Shared', 'Opened Twitter sharing intent!', 'success');
}

// Set Loading UI State
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.loader.style.display = 'flex';
        elements.feedList.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.errorState.style.display = 'none';
        
        elements.refreshIcon.classList.add('spinning');
        elements.statusBadge.className = 'status-indicator loading';
        elements.statusBadge.querySelector('.status-text').textContent = 'Fetching...';
        elements.refreshBtn.disabled = true;
    } else {
        elements.loader.style.display = 'none';
        elements.refreshIcon.classList.remove('spinning');
        elements.statusBadge.className = 'status-indicator online';
        elements.statusBadge.querySelector('.status-text').textContent = 'Connected';
        elements.refreshBtn.disabled = false;
    }
}

// Set Error UI State
function setErrorState(isError) {
    if (isError) {
        elements.loader.style.display = 'none';
        elements.feedList.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.errorState.style.display = 'flex';
    } else {
        elements.errorState.style.display = 'none';
    }
}

// Stats dashboard update
function updateStats() {
    elements.totalCount.textContent = state.updates.length;
    
    if (state.lastChecked) {
        const timeStr = state.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        elements.lastUpdatedTime.textContent = timeStr;
    } else {
        elements.lastUpdatedTime.textContent = 'Never';
    }
}

// HTML Strip Utility
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Add spaces for block level elements and line breaks for lists to structure output nicely
    const blocks = tempDiv.querySelectorAll('p, li, br, h3, h4');
    blocks.forEach(block => {
        block.textContent = block.textContent + ' ';
    });

    let text = tempDiv.textContent || tempDiv.innerText || "";
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

// Toast notification helper
function showToast(title, desc, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${desc}</div>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    
    elements.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Auto dismiss
    setTimeout(() => {
        removeToast(toast);
    }, 4000);
}

function removeToast(toast) {
    toast.classList.add('toast-fadeout');
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}
