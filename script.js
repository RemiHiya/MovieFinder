const GRID_SIZE = 100;

const CELL_WIDTH = 145;
const CELL_HEIGHT = 210;
const CARD_WIDTH = 110;
const CARD_HEIGHT = 165;

const viewport = document.getElementById('viewport');
const container = document.getElementById('grid-container');
const searchBar = document.getElementById('search-bar');
const clearSearchBtn = document.getElementById('clear-search-btn');
const randomBtn = document.getElementById('random-btn');

// Modal Elements
const modal = document.getElementById('movie-modal');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalDuration = document.getElementById('modal-duration');
const modalTrailer = document.getElementById('modal-trailer');
const modalGenres = document.getElementById('modal-genres');
const modalOverview = document.getElementById('modal-overview');
const closeModalBtn = document.querySelector('.close-btn');
const modalPosterPlaceholder = document.querySelector('.modal-poster-placeholder');

// Video Modal Elements
const videoModal = document.getElementById('video-modal');
const youtubeIframe = document.getElementById('youtube-iframe');
const videoCloseBtn = document.querySelector('.video-close-btn');

// Filters elements
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterSidebar = document.getElementById('filter-sidebar');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const genresContainer = document.getElementById('genres-container');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

const yearMinInput = document.getElementById('year-min');
const yearMaxInput = document.getElementById('year-max');
const yearLabel = document.getElementById('year-range-label');

const runtimeMinInput = document.getElementById('runtime-min');
const runtimeMaxInput = document.getElementById('runtime-max');
const runtimeLabel = document.getElementById('runtime-range-label');

let moviesData = [];
let cardsElements = [];

let visible_count = 0;
let last_visible_count = -1;

// Filters states
let activeFilters = {
    genres: new Set(),
    minYear: -1,
    maxYear: -1,
    minRuntime: -1,
    maxRuntime: -1
};

// Dataset extremum values
let datasetBounds = {
    minYear: -1, maxYear: -1,
    minRuntime: -1, maxRuntime: -1
};

let targetPanX = window.innerWidth / 2 - (GRID_SIZE * CELL_WIDTH) / 2;
let targetPanY = window.innerHeight / 2 - (GRID_SIZE * CELL_HEIGHT) / 2;
let currentPanX = targetPanX;
let currentPanY = targetPanY;

let isMouseDown = false;
let isDragging = false;
let hasDragged = false;
let startX, startY;
let mouseDownX, mouseDownY;
const DRAG_THRESHOLD = 5;

let activeMovieRecord = null;
let modalTargetMovie = null;
let modalRect = { width: 0, height: 0 };

(function lockViewportZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
})();

function isMobileViewport() {
    return window.innerWidth <= 768;
}

const adultToggle = document.getElementById('adult-toggle');

let detailsMapCache = null;
let standardGridCache = null;
let adultGridCache = null;

Promise.all([
    fetch('data/movie_details.json').then(res => res.json()),
    fetch('data/movie_grid.json').then(res => res.json()),
    fetch('data/movie_grid_adult.json').then(res => res.json()).catch(() => null)
]).then(([detailsMap, standardGrid, adultGrid]) => {
    detailsMapCache = detailsMap;
    standardGridCache = standardGrid;
    adultGridCache = adultGrid;

    loadGridDataset(false);
    requestAnimationFrame(updateLoop);
}).catch(err => console.error("Unable to load data :", err));

function loadGridDataset(isAdultEnabled) {
    const gridData = (isAdultEnabled && adultGridCache) ? adultGridCache : standardGridCache;

    moviesData = gridData.map(gridItem => {
        const details = detailsMapCache[gridItem.id.toString()];
        return {
            ...gridItem,
            ...details
        };
    });

    analyzeDatasetAndSetupFilters();
    renderGrid();
}

adultToggle.addEventListener('change', (e) => {
    closeMovieModal();
    loadGridDataset(e.target.checked);
});

function analyzeDatasetAndSetupFilters() {
    const allGenres = new Set();
    moviesData.forEach(movie => {
        movie.year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
        movie.runtime = movie.runtime || 0;

        if (movie.genres) movie.genres.forEach(g => allGenres.add(g));

        if (movie.year && (movie.year < datasetBounds.minYear || datasetBounds.minYear === -1)) datasetBounds.minYear = movie.year;
        if (movie.year && (movie.year > datasetBounds.maxYear || datasetBounds.minYear === -1)) datasetBounds.maxYear = movie.year;
        if (movie.runtime < datasetBounds.minRuntime || datasetBounds.minRuntime === -1) datasetBounds.minRuntime = movie.runtime;
        if (movie.runtime > datasetBounds.maxRuntime || datasetBounds.maxRuntime === -1) datasetBounds.maxRuntime = movie.runtime;
    });

    activeFilters.minYear = datasetBounds.minYear;
    activeFilters.maxYear = datasetBounds.maxYear;
    activeFilters.minRuntime = datasetBounds.minRuntime;
    activeFilters.maxRuntime = datasetBounds.maxRuntime;

    setupSliderElement(yearMinInput, yearMaxInput, datasetBounds.minYear, datasetBounds.maxYear, yearLabel, '');
    setupSliderElement(runtimeMinInput, runtimeMaxInput, datasetBounds.minRuntime, datasetBounds.maxRuntime, runtimeLabel, 'min');

    genresContainer.innerHTML = "";
    Array.from(allGenres).sort().forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'genre-filter-btn';
        btn.textContent = genre;
        btn.addEventListener('click', () => {
            if (activeFilters.genres.has(genre)) {
                activeFilters.genres.delete(genre);
                btn.classList.remove('active');
            } else {
                activeFilters.genres.add(genre);
                btn.classList.add('active');
            }
            closeMovieModal();
        });
        genresContainer.appendChild(btn);
    });
}

function setupSliderElement(minInput, maxInput, minVal, maxVal, labelEl, unit) {
    minInput.min = minVal; minInput.max = maxVal; minInput.value = minVal;
    maxInput.min = minVal; maxInput.max = maxVal; maxInput.value = maxVal;

    const updateLabel = () => {
        labelEl.textContent = `${minInput.value} - ${maxInput.value} ${unit}`;
    };

    minInput.addEventListener('input', () => {
        if (parseInt(minInput.value) > parseInt(maxInput.value)) {
            minInput.value = maxInput.value;
        }
        if (unit === '') activeFilters.minYear = parseInt(minInput.value);
        else activeFilters.minRuntime = parseInt(minInput.value);
        updateLabel();
        closeMovieModal();
    });

    maxInput.addEventListener('input', () => {
        if (parseInt(maxInput.value) < parseInt(minInput.value)) {
            maxInput.value = minInput.value;
        }
        if (unit === '') activeFilters.maxYear = parseInt(maxInput.value);
        else activeFilters.maxRuntime = parseInt(maxInput.value);
        updateLabel();
        closeMovieModal();
    });

    updateLabel();
}

function movieMatchesFilters(movie) {
    if (activeFilters.genres.size > 0) {
        const hasGenre = movie.genres && movie.genres.some(g => activeFilters.genres.has(g));
        if (!hasGenre) return false;
    }
    if (movie.year && (movie.year < activeFilters.minYear || movie.year > activeFilters.maxYear)) {
        return false;
    }
    if (movie.runtime < activeFilters.minRuntime || movie.runtime > activeFilters.maxRuntime) {
        return false;
    }
    return true;
}

function renderGrid() {
    container.innerHTML = '';
    cardsElements = [];

    moviesData.forEach((movie, index) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const safeTitle = (movie.title || "").replace(/"/g, '&quot;');
        card.innerHTML = `<img src="${movie.poster}" alt="${safeTitle}" title="${safeTitle}" draggable="false">`;

        movie.isVisible = false;
        movie.isActiveMovie = false;

        card.addEventListener('click', () => {
            if (hasDragged) return;
            recenterOnMovie(movie);
            openMovieModal(movie, card);
        });

        container.appendChild(card);
        cardsElements.push(card);
    });
}

function recenterOnMovie(movie) {
    const targetX = movie.x * CELL_WIDTH + CELL_WIDTH / 2;
    const targetY = movie.y * CELL_HEIGHT + CELL_HEIGHT / 2;

    const GRID_WIDTH_PX = GRID_SIZE * CELL_WIDTH;
    const GRID_HEIGHT_PX = GRID_SIZE * CELL_HEIGHT;

    let currentWorldCenterX = window.innerWidth / 2 - targetPanX;
    let currentWorldCenterY = window.innerHeight / 2 - targetPanY;

    let dx = targetX - currentWorldCenterX;
    let dy = targetY - currentWorldCenterY;

    dx = ((dx + GRID_WIDTH_PX / 2) % GRID_WIDTH_PX + GRID_WIDTH_PX) % GRID_WIDTH_PX - GRID_WIDTH_PX / 2;
    dy = ((dy + GRID_HEIGHT_PX / 2) % GRID_HEIGHT_PX + GRID_HEIGHT_PX) % GRID_HEIGHT_PX - GRID_HEIGHT_PX / 2;

    targetPanX -= dx;
    targetPanY -= dy;
}

const modalBackdrop = document.createElement('div');
modalBackdrop.id = 'modal-backdrop';
document.body.appendChild(modalBackdrop);
modalBackdrop.addEventListener('click', closeMovieModal);

const sidebarBackdrop = document.createElement('div');
sidebarBackdrop.id = 'sidebar-backdrop';
document.body.appendChild(sidebarBackdrop);
sidebarBackdrop.addEventListener('click', closeSidebar);

const modalPosterImg = document.createElement('img');
modalPosterImg.id = 'modal-poster-img';
modalPosterImg.alt = '';
modalPosterImg.draggable = false;
modalPosterPlaceholder.appendChild(modalPosterImg);

// --- FONCTIONS VIDEO ---
function getYouTubeId(url) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function openVideoModal(url) {
    const videoId = getYouTubeId(url);
    if (videoId) {
        youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoModal.classList.add('active');
    } else {
        window.open(url, '_blank');
    }
}

function closeVideoModal() {
    videoModal.classList.remove('active');
    setTimeout(() => {
        youtubeIframe.src = '';
    }, 300);
}

videoCloseBtn.addEventListener('click', closeVideoModal);
videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        closeVideoModal();
    }
});

function openMovieModal(movie, card) {
    if (activeMovieRecord) {
        activeMovieRecord.card.classList.remove('modal-active');
        activeMovieRecord.movie.isActiveMovie = false;
    }

    movie.isActiveMovie = true;
    card.classList.add('modal-active');
    activeMovieRecord = { movie, card };
    modalTargetMovie = movie;

    modalTitle.textContent = movie.title;
    modalOverview.textContent = movie.overview || "Aucun synopsis disponible.";
    modalPosterImg.src = movie.poster || '';

    if (movie.release_date) {
        const dateObj = new Date(movie.release_date);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        modalDate.textContent = `${day}/${month}/${year}`;
    } else {
        modalDate.textContent = "N/C";
    }

    if (movie.runtime && movie.runtime > 0) {
        const hours = Math.floor(movie.runtime / 60);
        const minutes = movie.runtime % 60;
        modalDuration.textContent = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    } else {
        modalDuration.textContent = "N/C";
    }

    if (movie.trailer) {
        modalTrailer.style.display = 'inline-flex';
        modalTrailer.onclick = (e) => {
            e.preventDefault();
            openVideoModal(movie.trailer);
        };
    } else {
        modalTrailer.style.display = 'none';
        modalTrailer.onclick = null;
    }

    modalGenres.innerHTML = '';
    if (movie.genres) {
        movie.genres.forEach(genre => {
            const span = document.createElement('span');
            span.className = 'genre-tag';
            span.textContent = genre;
            modalGenres.appendChild(span);
        });
    }

    modal.classList.add('active');
    modalBackdrop.classList.add('active');

    modalRect.width = modal.offsetWidth;
    modalRect.height = modal.offsetHeight;
}

function closeMovieModal() {
    if (activeMovieRecord) {
        activeMovieRecord.card.classList.remove('modal-active');
        activeMovieRecord.movie.isActiveMovie = false;
        activeMovieRecord = null;
    }
    modal.classList.remove('active');
    modalBackdrop.classList.remove('active');
}

function closeSidebar() {
    filterSidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('open');
}

closeModalBtn.addEventListener('click', closeMovieModal);

randomBtn.addEventListener('click', () => {
    const validMoviesIndices = [];
    moviesData.forEach((movie, idx) => {
        if (movieMatchesFilters(movie)) {
            validMoviesIndices.push(idx);
        }
    });

    if (validMoviesIndices.length === 0) return;
    closeMovieModal();

    const randomIndex = validMoviesIndices[Math.floor(Math.random() * validMoviesIndices.length)];
    const luckyMovie = moviesData[randomIndex];
    recenterOnMovie(luckyMovie);

    setTimeout(() => {
        const card = cardsElements[randomIndex];
        if(card) openMovieModal(luckyMovie, card);
    }, 80);
});

function updateLoop() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const mobile = isMobileViewport();
    const effectRadius = mobile ? Math.min(280, screenWidth * 0.6) : 550;
    const maxScale = mobile ? 2.2 : 2.8;
    const cullingMargin = mobile ? 120 : 200;

    const GRID_WIDTH_PX = GRID_SIZE * CELL_WIDTH;
    const GRID_HEIGHT_PX = GRID_SIZE * CELL_HEIGHT;

    const easeFactor = isMouseDown ? 0.25 : 0.08;
    currentPanX += (targetPanX - currentPanX) * easeFactor;
    currentPanY += (targetPanY - currentPanY) * easeFactor;

    visible_count = 0;

    moviesData.forEach((movie, index) => {
        const card = cardsElements[index];
        if (!card) return;

        const isFilteredOut = !movieMatchesFilters(movie);
        const movieCenterX = movie.x * CELL_WIDTH + CELL_WIDTH / 2;
        const movieCenterY = movie.y * CELL_HEIGHT + CELL_HEIGHT / 2;
        const rawX = currentPanX + movieCenterX;
        const rawY = currentPanY + movieCenterY;

        let relX = rawX - centerX;
        let relY = rawY - centerY;

        relX = ((relX + GRID_WIDTH_PX / 2) % GRID_WIDTH_PX + GRID_WIDTH_PX) % GRID_WIDTH_PX - GRID_WIDTH_PX / 2;
        relY = ((relY + GRID_HEIGHT_PX / 2) % GRID_HEIGHT_PX + GRID_HEIGHT_PX) % GRID_HEIGHT_PX - GRID_HEIGHT_PX / 2;

        const undistortedScreenX = centerX + relX;
        const undistortedScreenY = centerY + relY;

        const distX = undistortedScreenX - centerX;
        const distY = undistortedScreenY - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        let scale = 1;
        let pushFactor = 1;
        let brightness = 0.25;

        if (distance < effectRadius) {
            const ratio = distance / effectRadius;
            const zoomFactor = Math.pow(1 - ratio, 2.2);
            scale = 1 + (maxScale - 1) * zoomFactor;
            pushFactor = 1 + (maxScale - 1) * Math.pow(1 - ratio, 3.2);
            brightness = 0.25 + 0.75 * Math.pow(1 - ratio, 1.2);
        }

        const distortedScreenX = centerX + distX * pushFactor;
        const distortedScreenY = centerY + distY * pushFactor;

        if (movie === modalTargetMovie) {
            const modalScale = scale / maxScale;
            if (mobile) {
                const w = modalRect.width || (window.innerWidth * 0.9);
                const h = modalRect.height || 400;
                const mx = distortedScreenX - w / 2;
                const my = distortedScreenY - h / 2;
                modal.style.transform = `translate3d(${mx}px, ${my}px, 0) scale(${modalScale})`;
            } else {
                const mx = distortedScreenX - 154;
                const my = distortedScreenY - 231;
                modal.style.transform = `translate3d(${mx}px, ${my}px, 0) scale(${modalScale})`;
            }
        }

        if (isFilteredOut) {
            if (movie.isVisible) {
                card.style.display = 'none';
                movie.isVisible = false;
            }
            return;
        }
        visible_count++;

        const inViewport = (
            distortedScreenX >= -cullingMargin &&
            distortedScreenX <= screenWidth + cullingMargin &&
            distortedScreenY >= -cullingMargin &&
            distortedScreenY <= screenHeight + cullingMargin
        );

        if (inViewport) {
            if (!movie.isVisible) {
                card.style.display = 'flex';
                movie.isVisible = true;
            }

            const finalX = distortedScreenX - CARD_WIDTH / 2;
            const finalY = distortedScreenY - CARD_HEIGHT / 2;

            card.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) scale(${scale})`;
            card.style.filter = `brightness(${brightness})`;

            if (movie.isActiveMovie) {
                card.style.zIndex = 25000;
            } else {
                card.style.zIndex = Math.round(scale * 1000);
            }

        } else {
            if (movie.isVisible) {
                card.style.display = 'none';
                movie.isVisible = false;
            }
        }
    });

    if (visible_count !== last_visible_count) {
        last_visible_count = visible_count;
        searchBar.placeholder = `Search in ${visible_count} movies...`;
    }

    requestAnimationFrame(updateLoop);
}

filterToggleBtn.addEventListener('click', () => {
    if (filterSidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        filterSidebar.classList.add('open');
        sidebarBackdrop.classList.add('open');
    }
});

sidebarCloseBtn.addEventListener('click', closeSidebar);

resetFiltersBtn.addEventListener('click', () => {
    activeFilters.genres.clear();
    document.querySelectorAll('.genre-filter-btn').forEach(btn => btn.classList.remove('active'));

    yearMinInput.value = datasetBounds.minYear;
    yearMaxInput.value = datasetBounds.maxYear;
    activeFilters.minYear = datasetBounds.minYear;
    activeFilters.maxYear = datasetBounds.maxYear;
    yearMinInput.dispatchEvent(new Event('input'));

    runtimeMinInput.value = datasetBounds.minRuntime;
    runtimeMaxInput.value = datasetBounds.maxRuntime;
    activeFilters.minRuntime = datasetBounds.minRuntime;
    activeFilters.maxRuntime = datasetBounds.maxRuntime;
    runtimeMinInput.dispatchEvent(new Event('input'));

    closeMovieModal();
});

function getPointerPosition(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function handleDragStart(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (e.touches && e.touches.length > 1) {
        isMouseDown = false;
        isDragging = false;
        return;
    }

    const pos = getPointerPosition(e);
    isMouseDown = true;
    hasDragged = false;
    isDragging = false;
    mouseDownX = pos.x;
    mouseDownY = pos.y;
    startX = pos.x - targetPanX;
    startY = pos.y - targetPanY;
}

function handleDragMove(e) {
    if (!isMouseDown) return;
    if (e.touches && e.touches.length > 1) return;

    const pos = getPointerPosition(e);

    if (!isDragging) {
        const dx = pos.x - mouseDownX;
        const dy = pos.y - mouseDownY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            isDragging = true;
            hasDragged = true;
            closeMovieModal();
        }
    }

    if (isDragging) {
        if (e.cancelable) e.preventDefault();
        targetPanX = pos.x - startX;
        targetPanY = pos.y - startY;
    }
}

function handleDragEnd() {
    isMouseDown = false;
    isDragging = false;
}

viewport.addEventListener('mousedown', handleDragStart);
document.addEventListener('mousemove', handleDragMove);
document.addEventListener('mouseup', handleDragEnd);

viewport.addEventListener('touchstart', handleDragStart, { passive: true });
document.addEventListener('touchmove', handleDragMove, { passive: false });
document.addEventListener('touchend', handleDragEnd, { passive: true });
document.addEventListener('touchcancel', handleDragEnd, { passive: true });

let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;
window.addEventListener('resize', () => {
    const deltaX = (window.innerWidth - lastWindowWidth) / 2;
    const deltaY = (window.innerHeight - lastWindowHeight) / 2;
    targetPanX += deltaX;
    targetPanY += deltaY;
    currentPanX += deltaX;
    currentPanY += deltaY;
    lastWindowWidth = window.innerWidth;
    lastWindowHeight = window.innerHeight;

    if (modal.classList.contains('active')) {
        modalRect.width = modal.offsetWidth;
        modalRect.height = modal.offsetHeight;
    }
});

searchBar.addEventListener('input', (e) => {
    const rawVal = e.target.value;

    clearSearchBtn.style.display = rawVal.length > 0 ? 'flex' : 'none';

    closeMovieModal();
    const query = rawVal.toLowerCase().trim();
    cardsElements.forEach(card => card.classList.remove('highlighted'));
    if (query.length < 2) return;

    const matchedIndex = moviesData.findIndex(movie =>
        movieMatchesFilters(movie) && movie.title && movie.title.toLowerCase().includes(query)
    );

    if (matchedIndex !== -1) {
        const matchedMovie = moviesData[matchedIndex];
        const card = cardsElements[matchedIndex];
        card.classList.add('highlighted');
        recenterOnMovie(matchedMovie);

        setTimeout(() => {
            openMovieModal(matchedMovie, card);
        }, 150);
    }
});

clearSearchBtn.addEventListener('click', () => {
    searchBar.value = '';
    clearSearchBtn.style.display = 'none';
    cardsElements.forEach(card => card.classList.remove('highlighted'));
    closeMovieModal();
    searchBar.focus();
});