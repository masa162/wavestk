/**
 * wavestk Library Script
 */

const API_BASE = '/api';
let audioFiles = [];

// DOM Elements
const loading = document.getElementById('loading');
const audioList = document.getElementById('audioList');
const emptyState = document.getElementById('emptyState');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const searchInput = document.getElementById('searchInput');
const clearFilters = document.getElementById('clearFilters');
const resultCount = document.getElementById('resultCount');

// Load audio files on page load
window.addEventListener('DOMContentLoaded', () => {
  loadAudio();
  setupFilters();
});

/**
 * Load audio files from API
 */
async function loadAudio() {
  try {
    showLoading();
    hideError();

    const search = searchInput.value.trim();
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE}/audio?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load audio files');
    }

    const data = await response.json();
    audioFiles = data.audio;

    hideLoading();
    resultCount.textContent = audioFiles.length;

    if (audioFiles.length === 0) {
      showEmptyState();
    } else {
      renderAudio();
      showAudioList();
    }

  } catch (error) {
    console.error('Load error:', error);
    hideLoading();
    showError(error.message || 'Failed to load audio files');
  }
}

/**
 * Render audio files as cards
 */
function renderAudio() {
  audioList.innerHTML = '';

  audioFiles.forEach((audio) => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md p-6';

    const sizeMB = (audio.bytes / 1024 / 1024).toFixed(2);
    const uploadDate = new Date(audio.uploaded_at).toLocaleString('ja-JP');

    card.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-800 mb-1">${escapeHtml(audio.original_filename || audio.filename)}</h3>
          <p class="text-sm text-gray-500">${uploadDate}</p>
        </div>
        <button
          class="delete-btn text-red-600 hover:text-red-800 transition-colors"
          data-id="${audio.id}"
          data-filename="${escapeHtml(audio.original_filename || audio.filename)}"
          title="Delete"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>

      <!-- Audio Player -->
      <audio controls class="w-full mb-4">
        <source src="${audio.url}" type="${audio.mime}">
        Your browser does not support audio playback.
      </audio>

      <div class="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span class="text-gray-500">Filename:</span>
          <span class="font-mono ml-1">${audio.filename}</span>
        </div>
        <div>
          <span class="text-gray-500">Size:</span>
          <span class="font-semibold ml-1">${sizeMB} MB</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          class="copy-url-btn flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-md text-sm transition-colors"
          data-url="${audio.url}"
        >
          📎 Copy URL
        </button>
        <button
          class="copy-markdown-btn flex-1 bg-green-50 text-green-600 hover:bg-green-100 py-2 px-4 rounded-md text-sm transition-colors"
          data-url="${audio.url}"
        >
          📝 Copy Markdown
        </button>
      </div>
    `;

    audioList.appendChild(card);
  });

  // Attach event listeners
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteAudio(btn.dataset.id, btn.dataset.filename));
  });

  document.querySelectorAll('.copy-url-btn').forEach((btn) => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.url, btn, 'URL'));
  });

  document.querySelectorAll('.copy-markdown-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const markdown = `![audio](${btn.dataset.url})`;
      copyToClipboard(markdown, btn, 'Markdown');
    });
  });
}

/**
 * Delete audio file
 */
async function deleteAudio(audioId, filename) {
  if (!confirm(`Delete "${filename}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/audio/${audioId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete audio file');
    }

    alert('Audio file deleted successfully');
    loadAudio(); // Reload list

  } catch (error) {
    console.error('Delete error:', error);
    alert(error.message || 'Failed to delete audio file');
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, button, label) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = `✓ ${label} Copied!`;
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (error) {
    alert('Failed to copy to clipboard');
  }
}

/**
 * Setup search filters
 */
function setupFilters() {
  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadAudio(), 300);
  });

  clearFilters.addEventListener('click', () => {
    searchInput.value = '';
    loadAudio();
  });

  // Enter key to search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      loadAudio();
    }
  });
}

/**
 * UI State Management
 */
function showLoading() {
  loading.classList.remove('hidden');
  audioList.classList.add('hidden');
  emptyState.classList.add('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showAudioList() {
  audioList.classList.remove('hidden');
  emptyState.classList.add('hidden');
}

function showEmptyState() {
  emptyState.classList.remove('hidden');
  audioList.classList.add('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  errorDiv.classList.add('hidden');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
