/**
 * wavestk Upload Script
 */

const API_BASE = '/api';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MAX_RETRIES = 3;
let selectedFiles = [];

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileListContent = document.getElementById('fileListContent');
const uploadBtn = document.getElementById('uploadBtn');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressCount = document.getElementById('progressCount');
const successDiv = document.getElementById('success');
const successCount = document.getElementById('successCount');
const uploadedUrls = document.getElementById('uploadedUrls');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

// Click dropzone to open file picker
dropzone.addEventListener('click', () => {
  fileInput.click();
});

// Drag & drop events
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-blue-500', 'bg-blue-50');
});

dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-blue-500', 'bg-blue-50');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-blue-500', 'bg-blue-50');

  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
});

// File input change
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleFiles(files);
});

// Handle selected files
function handleFiles(files) {
  // Filter audio files only
  const audioFiles = files.filter(f => f.type.startsWith('audio/'));

  if (audioFiles.length === 0) {
    showError('No audio files selected. Please select valid audio files.');
    return;
  }

  // Check file sizes
  const tooLarge = audioFiles.filter(f => f.size > MAX_FILE_SIZE);
  if (tooLarge.length > 0) {
    showError(`Some files are too large (max 100MB): ${tooLarge.map(f => f.name).join(', ')}`);
    return;
  }

  selectedFiles = audioFiles;
  displayFileList();
  uploadBtn.disabled = false;
  hideMessages();
}

// Display selected file list
function displayFileList() {
  fileListContent.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center py-1';
    div.innerHTML = `
      <span class="text-gray-700">${index + 1}. ${file.name}</span>
      <span class="text-gray-500">${sizeMB} MB</span>
    `;
    fileListContent.appendChild(div);
  });

  fileList.classList.remove('hidden');
}

/**
 * Generate unique upload ID
 */
function generateUploadId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Split file into chunks and convert to Base64
 */
async function splitFileIntoChunks(file) {
  const chunks = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    // Convert chunk to Base64
    const base64Chunk = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });

    chunks.push({
      index: i,
      data: base64Chunk,
      size: chunk.size,
    });
  }

  return chunks;
}

/**
 * Upload a single chunk with retry logic
 */
async function uploadChunk(uploadId, chunkIndex, totalChunks, chunkData, fileName, fileType, fileSize) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/upload/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          chunkIndex,
          totalChunks,
          chunkData,
          fileName,
          fileType,
          fileSize,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Chunk upload failed' }));
        throw new Error(errorData.error || 'Chunk upload failed');
      }

      return await response.json();

    } catch (error) {
      lastError = error;
      console.warn(`Chunk ${chunkIndex} upload attempt ${attempt + 1} failed:`, error.message);

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Complete the chunked upload
 */
async function completeUpload(uploadId, totalChunks, fileName, fileType, fileSize) {
  const response = await fetch(`${API_BASE}/upload/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uploadId,
      totalChunks,
      fileName,
      fileType,
      fileSize,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload completion failed' }));
    throw new Error(errorData.error || 'Upload completion failed');
  }

  return await response.json();
}

/**
 * Upload a single file using chunked upload
 */
async function uploadFileChunked(file, fileIndex, totalFiles) {
  progressText.textContent = `Processing file ${fileIndex + 1}/${totalFiles}: ${file.name}`;

  // Split file into chunks
  const chunks = await splitFileIntoChunks(file);
  const uploadId = generateUploadId();
  const totalChunks = chunks.length;

  console.log(`Uploading ${file.name} in ${totalChunks} chunks (${CHUNK_SIZE / 1024 / 1024}MB each)`);

  // Upload each chunk sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    progressText.textContent = `Uploading ${file.name} - Chunk ${i + 1}/${totalChunks}`;
    const progress = ((fileIndex + (i + 1) / totalChunks) / totalFiles) * 100;
    progressBar.style.width = `${Math.min(progress, 95)}%`;
    progressCount.textContent = `${Math.round(progress)}%`;

    await uploadChunk(
      uploadId,
      chunk.index,
      totalChunks,
      chunk.data,
      file.name,
      file.type,
      file.size
    );
  }

  // Complete the upload
  progressText.textContent = `Finalizing ${file.name}...`;
  const result = await completeUpload(uploadId, totalChunks, file.name, file.type, file.size);

  return result;
}

// Upload button click
uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  uploadBtn.disabled = true;
  hideMessages();
  showProgress();

  try {
    const results = [];

    // Upload files one by one with chunking
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const result = await uploadFileChunked(file, i, selectedFiles.length);
      results.push(result);
    }

    // Show success
    progressBar.style.width = '100%';
    progressCount.textContent = '100%';
    progressText.textContent = 'Upload complete!';

    setTimeout(() => {
      hideProgress();
      showSuccess({
        uploaded: results.length,
        files: results,
      });
    }, 500);

    // Clear selection
    selectedFiles = [];
    fileInput.value = '';
    fileList.classList.add('hidden');
    uploadBtn.disabled = true;

  } catch (error) {
    console.error('Upload error:', error);
    hideProgress();
    showError(error.message || 'Upload failed. Please try again.');
    uploadBtn.disabled = false;
  }
});

// Show/hide UI elements
function showProgress() {
  progress.classList.remove('hidden');
  progressBar.style.width = '50%';
}

function hideProgress() {
  progress.classList.add('hidden');
  progressBar.style.width = '0%';
}

function showSuccess(data) {
  successCount.textContent = data.uploaded;

  uploadedUrls.innerHTML = '';
  data.files.forEach((file) => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded p-3 border border-green-200';
    div.innerHTML = `
      <p class="text-sm font-semibold text-gray-800 mb-2">${file.originalFilename}</p>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600 w-12">URL:</span>
          <input type="text" value="${file.url}" readonly class="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">
          <button onclick="copyToClipboard('${file.url}', this)" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap">Copy</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600 w-12">HTML:</span>
          <input type="text" value='<audio controls src="${file.url}"></audio>' readonly class="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">
          <button onclick="copyToClipboard('<audio controls src=&quot;${file.url}&quot;></audio>', this)" class="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 whitespace-nowrap">Copy</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600 w-12">MD:</span>
          <input type="text" value="![audio](${file.url})" readonly class="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">
          <button onclick="copyToClipboard('![audio](${file.url})', this)" class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 whitespace-nowrap">Copy</button>
        </div>
      </div>
    `;
    uploadedUrls.appendChild(div);
  });

  successDiv.classList.remove('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideMessages() {
  successDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
}

// Copy to clipboard
window.copyToClipboard = async function(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (error) {
    alert('Failed to copy to clipboard');
  }
};
