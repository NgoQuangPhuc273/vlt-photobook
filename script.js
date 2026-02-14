// Photo storage
let photos = [];
let currentPageIndex = 0;
let pageData = []; // Store which photos are on which pages
let db = null;

// Year decorations paths
const yearDecorations = {
    2020: 'decorations/2020/decoration.png',
    2021: 'decorations/2021/decoration.png',
    2022: 'decorations/2022/decoration.png',
    2023: 'decorations/2023/decoration.png',
    2024: 'decorations/2024/decoration.png',
    2025: 'decorations/2025/decoration.png',
    2026: 'decorations/2026/decoration.png'
};

// Preload decoration images
const preloadedImages = {};
Object.keys(yearDecorations).forEach(year => {
    const img = new Image();
    img.src = yearDecorations[year];
    preloadedImages[year] = img;
});

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PhotoAlbumDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
            }
        };
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadPhotos();
    renderBook();
    updateControls();
    updateDecorations();
    
    // Modal controls
    const modal = document.getElementById('uploadModal');
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    const closeBtn = document.querySelector('.close');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const photoInput = document.getElementById('photoInput');
    
    addPhotoBtn.addEventListener('click', () => {
        resetModal(); // Clear modal before opening
        modal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetModal();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetModal();
        }
        
        const editModal = document.getElementById('editDateModal');
        if (e.target === editModal) {
            closeEditDateModal();
        }
        
        const previewModal = document.getElementById('photoPreviewModal');
        if (e.target === previewModal) {
            closePhotoPreview();
        }
    });
    
    // ESC key to close preview modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const previewModal = document.getElementById('photoPreviewModal');
            if (previewModal.style.display === 'block') {
                closePhotoPreview();
            }
        }
    });
    
    selectFileBtn.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', showPreview);
    document.getElementById('uploadBtn').addEventListener('click', uploadPhoto);
    document.getElementById('prevBtn').addEventListener('click', previousPage);
    document.getElementById('nextBtn').addEventListener('click', nextPage);
    document.getElementById('saveDateBtn').addEventListener('click', saveEditedDate);
});

function showPreview() {
    const fileInput = document.getElementById('photoInput');
    const preview = document.getElementById('preview');
    const dateInputsContainer = document.getElementById('dateInputsContainer');
    
    // Clear previous content first
    preview.innerHTML = '';
    dateInputsContainer.innerHTML = '';
    
    if (fileInput.files.length > 0) {
        preview.classList.remove('empty');
        preview.classList.add('multiple');
        
        Array.from(fileInput.files).forEach((file, index) => {
            // Create preview image
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <div class="preview-filename">${file.name}</div>
                `;
                preview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
            
            // Create date input for this photo
            const dateInputGroup = document.createElement('div');
            dateInputGroup.className = 'date-input-group';
            dateInputGroup.innerHTML = `
                <label>${file.name}</label>
                <input type="date" class="photo-date-input" data-file-index="${index}" required>
            `;
            dateInputsContainer.appendChild(dateInputGroup);
        });
    } else {
        preview.classList.add('empty');
        preview.classList.remove('multiple');
    }
}

function resetModal() {
    const photoInput = document.getElementById('photoInput');
    const preview = document.getElementById('preview');
    const dateInputsContainer = document.getElementById('dateInputsContainer');
    
    photoInput.value = '';
    preview.innerHTML = '';
    dateInputsContainer.innerHTML = '';
    preview.classList.add('empty');
    preview.classList.remove('multiple');
}

async function uploadPhoto() {
    const fileInput = document.getElementById('photoInput');
    const dateInputsContainer = document.getElementById('dateInputsContainer');
    const dateInputs = dateInputsContainer.querySelectorAll('.photo-date-input');
    const modal = document.getElementById('uploadModal');
    
    if (fileInput.files.length === 0) {
        alert('Please select photos');
        return;
    }
    
    // Validate all dates are filled
    let allDatesValid = true;
    dateInputs.forEach(input => {
        if (!input.value) allDatesValid = false;
    });
    
    if (!allDatesValid) {
        alert('Please select a date for each photo');
        return;
    }
    
    const filesToUpload = Array.from(fileInput.files);
    const totalFiles = filesToUpload.length;
    let uploadedCount = 0;
    
    // Show progress
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    // Process files one at a time
    for (let i = 0; i < totalFiles; i++) {
        try {
            const file = filesToUpload[i];
            const dateInput = document.querySelector(`.photo-date-input[data-file-index="${i}"]`);
            const selectedDate = dateInput.value;
            const selectedYear = new Date(selectedDate).getFullYear();
            
            uploadBtn.textContent = `Processing ${i + 1}/${totalFiles}...`;
            
            // Get original image for preview
            const originalSrc = await getOriginalImage(file);
            // Create compressed thumbnail for album view
            const thumbnailSrc = await compressImage(file);
            
            const existingPhotoIndex = photos.findIndex(p => p.filename === file.name);
            
            const photo = {
                id: existingPhotoIndex >= 0 ? photos[existingPhotoIndex].id : Date.now() + i * 10,
                src: thumbnailSrc,
                originalSrc: originalSrc,
                date: selectedDate,
                year: selectedYear,
                filename: file.name
            };
            
            if (existingPhotoIndex >= 0) {
                photos[existingPhotoIndex] = photo;
            } else {
                photos.push(photo);
            }
            
            uploadedCount++;
            uploadBtn.textContent = `Uploading ${uploadedCount}/${totalFiles}...`;
        } catch (error) {
            // Skip failed files silently
        }
    }
    
    // All done - sort and save
    photos.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare === 0) {
            return a.id - b.id;
        }
        return dateCompare;
    });
    
    try {
        await savePhotos();
        renderBook();
        updateControls();
        updateDecorations();
        modal.style.display = 'none';
        resetModal();
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Add to Album';
    } catch (error) {
        alert('Error saving photos: ' + error.message);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Add to Album';
    }
}

async function deletePhoto(photoId) {
    if (confirm('Are you sure you want to delete this photo?')) {
        photos = photos.filter(p => p.id !== photoId);
        await savePhotos();
        renderBook();
        updateControls();
        updateDecorations();
    }
}

function savePhotos() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        
        // Clear existing photos
        store.clear();
        
        // Add all photos
        photos.forEach(photo => {
            store.put(photo);
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

function loadPhotos() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.getAll();
        
        request.onsuccess = () => {
            photos = request.result || [];
            
            // Sort photos by date
            photos.sort((a, b) => {
                const dateCompare = new Date(a.date) - new Date(b.date);
                if (dateCompare === 0) {
                    return a.id - b.id;
                }
                return dateCompare;
            });
            
            resolve();
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Compress image before storing (for thumbnails)
function compressImage(file, maxWidth = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if too large
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                // Use better image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed base64
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Get original image without compression
function getOriginalImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderBook() {
    const book = document.getElementById('book');
    book.innerHTML = '';
    pageData = [];
    
    if (photos.length === 0) {
        // Show empty state
        pageData.push({ photos: [], year: null });
        pageData.push({ photos: [], year: null });
    } else {
        // Group photos strictly by year - ONE YEAR PER PAGE
        const photosByYear = {};
        
        photos.forEach(photo => {
            if (!photosByYear[photo.year]) {
                photosByYear[photo.year] = [];
            }
            photosByYear[photo.year].push(photo);
        });
        
        // Create pages for each year (max 4 photos per page)
        Object.keys(photosByYear).sort().forEach(year => {
            const yearPhotos = photosByYear[year];
            
            // Split into pages of 4 if more than 4 photos
            for (let i = 0; i < yearPhotos.length; i += 4) {
                const pagePhotos = yearPhotos.slice(i, i + 4);
                pageData.push({
                    photos: pagePhotos,
                    year: parseInt(year)
                });
            }
        });
        
        // Ensure even number of pages
        if (pageData.length % 2 !== 0) {
            pageData.push({ photos: [], year: null });
        }
    }
    
    // Create page elements
    pageData.forEach((data, index) => {
        const pageType = index % 2 === 0 ? 'left' : 'right';
        const page = createPage(data, index, pageType);
        book.appendChild(page);
    });
    
    // Show current pages
    showCurrentPages();
}

function createPage(data, index, pageType) {
    const page = document.createElement('div');
    page.className = `page ${pageType}`;
    page.dataset.pageIndex = index;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'page-content';
    
    // Always create exactly 4 slots in a 2x2 grid
    for (let i = 0; i < 4; i++) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        if (data.photos[i]) {
            // Existing photo
            const photo = data.photos[i];
            
            photoItem.innerHTML = `
                <div class="photo-container">
                    <div class="edit-icon" onclick="event.stopPropagation(); openEditDateModal(${photo.id})">✎</div>
                    <div class="photo-wrapper" onclick="openPhotoPreview(${photo.id})">
                        <img src="${photo.src}" alt="Photo from ${photo.date}">
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deletePhoto(${photo.id})">×</button>
                    <div class="photo-date" onclick="openPhotoPreview(${photo.id})">${formatDate(photo.date)}</div>
                </div>
            `;
        } else {
            // Empty slot
            photoItem.innerHTML = `
                <div class="photo-container" style="background: #FFF0F5; border-style: dashed;"></div>
            `;
        }
        
        contentDiv.appendChild(photoItem);
    }
    
    page.appendChild(contentDiv);
    return page;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showCurrentPages() {
    const pages = document.querySelectorAll('.page');
    
    // Hide all pages first
    pages.forEach(page => {
        page.classList.remove('visible');
    });
    
    // Show current left and right pages
    if (pages[currentPageIndex]) {
        pages[currentPageIndex].classList.add('visible');
    }
    if (pages[currentPageIndex + 1]) {
        pages[currentPageIndex + 1].classList.add('visible');
    }
}

function nextPage() {
    const pages = document.querySelectorAll('.page');
    const totalPages = pages.length;
    
    if (currentPageIndex < totalPages - 2) {
        currentPageIndex += 2;
        showCurrentPages();
        updateControls();
        updateDecorations();
    }
}

function previousPage() {
    if (currentPageIndex > 0) {
        currentPageIndex -= 2;
        showCurrentPages();
        updateControls();
        updateDecorations();
    }
}

function updateControls() {
    const pages = document.querySelectorAll('.page');
    const totalPages = pages.length;
    const pageNumber = document.getElementById('pageNumber');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    const displayPage = Math.floor(currentPageIndex / 2) + 1;
    const totalDisplayPages = Math.ceil(totalPages / 2);
    
    pageNumber.textContent = `Page ${displayPage} of ${Math.max(1, totalDisplayPages)}`;
    prevBtn.disabled = currentPageIndex === 0;
    nextBtn.disabled = currentPageIndex >= totalPages - 2 || totalPages === 0;
}

function updateDecorations() {
    const leftPageData = pageData[currentPageIndex];
    const rightPageData = pageData[currentPageIndex + 1];
    
    // Update left decoration
    const leftDecorationImg = document.getElementById('leftDecorationImg');
    const leftYearLabel = document.getElementById('leftYearLabel');
    
    if (leftPageData && leftPageData.year && yearDecorations[leftPageData.year]) {
        const newSrc = yearDecorations[leftPageData.year];
        if (leftDecorationImg.src.indexOf(newSrc) === -1) {
            leftDecorationImg.src = newSrc;
        }
        leftDecorationImg.classList.add('loaded');
        leftDecorationImg.style.cursor = 'pointer';
        leftDecorationImg.onclick = () => openDecorationPreview(newSrc, leftPageData.year);
        leftYearLabel.textContent = leftPageData.year;
        leftYearLabel.style.display = 'block';
    } else {
        leftDecorationImg.classList.remove('loaded');
        leftDecorationImg.style.cursor = 'default';
        leftDecorationImg.onclick = null;
        leftYearLabel.style.display = 'none';
    }
    
    // Update right decoration
    const rightDecorationImg = document.getElementById('rightDecorationImg');
    const rightYearLabel = document.getElementById('rightYearLabel');
    
    if (rightPageData && rightPageData.year && yearDecorations[rightPageData.year]) {
        const newSrc = yearDecorations[rightPageData.year];
        if (rightDecorationImg.src.indexOf(newSrc) === -1) {
            rightDecorationImg.src = newSrc;
        }
        rightDecorationImg.classList.add('loaded');
        rightDecorationImg.style.cursor = 'pointer';
        rightDecorationImg.onclick = () => openDecorationPreview(newSrc, rightPageData.year);
        rightYearLabel.textContent = rightPageData.year;
        rightYearLabel.style.display = 'block';
    } else {
        rightDecorationImg.classList.remove('loaded');
        rightDecorationImg.style.cursor = 'default';
        rightDecorationImg.onclick = null;
        rightYearLabel.style.display = 'none';
    }
}

function openEditDateModal(photoId) {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    
    const modal = document.getElementById('editDateModal');
    const preview = document.getElementById('editPreview');
    const filenameDiv = modal.querySelector('.edit-filename');
    const dateInput = document.getElementById('editDateInput');
    
    preview.innerHTML = `<img src="${photo.src}" alt="Photo">`;
    filenameDiv.textContent = photo.filename;
    dateInput.value = photo.date;
    modal.dataset.photoId = photoId;
    modal.style.display = 'block';
}

function closeEditDateModal() {
    const modal = document.getElementById('editDateModal');
    modal.style.display = 'none';
    document.getElementById('editDateInput').value = '';
    document.getElementById('editPreview').innerHTML = '';
    delete modal.dataset.photoId;
}

async function saveEditedDate() {
    const modal = document.getElementById('editDateModal');
    const photoId = parseInt(modal.dataset.photoId);
    const dateInput = document.getElementById('editDateInput');
    
    if (!dateInput.value) {
        alert('Please select a date');
        return;
    }
    
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
        photo.date = dateInput.value;
        photo.year = new Date(dateInput.value).getFullYear();
        
        // Re-sort photos
        photos.sort((a, b) => {
            const dateCompare = new Date(a.date) - new Date(b.date);
            if (dateCompare === 0) {
                return a.id - b.id;
            }
            return dateCompare;
        });
        
        await savePhotos();
        renderBook();
        updateControls();
        updateDecorations();
        closeEditDateModal();
    }
}

function openPhotoPreview(photoId) {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    
    const modal = document.getElementById('photoPreviewModal');
    const previewImage = document.getElementById('previewImage');
    const infoDiv = document.getElementById('previewInfo');
    
    // Use original high-quality image for preview, fallback to thumbnail
    previewImage.src = photo.originalSrc || photo.src;
    infoDiv.innerHTML = `
        <div class="preview-filename">${photo.filename}</div>
        <div class="preview-date">${formatDate(photo.date)}</div>
    `;
    
    modal.style.display = 'block';
}

function closePhotoPreview() {
    const modal = document.getElementById('photoPreviewModal');
    modal.style.display = 'none';
    document.getElementById('previewImage').src = '';
    document.getElementById('previewInfo').innerHTML = '';
}

function openDecorationPreview(imageSrc, year) {
    const modal = document.getElementById('photoPreviewModal');
    const previewImage = document.getElementById('previewImage');
    const infoDiv = document.getElementById('previewInfo');
    
    previewImage.src = imageSrc;
    infoDiv.innerHTML = `
        <div class="preview-filename">Year ${year} Decoration</div>
        <div class="preview-date">Bubu & Dudu Illustration</div>
    `;
    
    modal.style.display = 'block';
}
