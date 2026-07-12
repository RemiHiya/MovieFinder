modalBackdrop.addEventListener('click', closeMovieModal);
sidebarBackdrop.addEventListener('click', closeSidebar);
closeModalBtn.addEventListener('click', closeMovieModal);
videoCloseBtn.addEventListener('click', closeVideoModal);

videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeVideoModal();
});

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