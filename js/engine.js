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