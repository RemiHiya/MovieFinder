adultToggle.addEventListener('change', (e) => {
    closeMovieModal();
    loadGridDataset(e.target.checked);
});

genreMatchAllToggle.addEventListener('change', (e) => {
    activeFilters.matchAllGenres = e.target.checked;
    closeMovieModal();
});

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
        if (!movie.genres) return false;

        if (activeFilters.matchAllGenres) {
            const hasAllGenres = Array.from(activeFilters.genres).every(g => movie.genres.includes(g));
            if (!hasAllGenres) return false;
        } else {
            const hasAnyGenre = movie.genres.some(g => activeFilters.genres.has(g));
            if (!hasAnyGenre) return false;
        }
    }

    if (movie.year && (movie.year < activeFilters.minYear || movie.year > activeFilters.maxYear)) {
        return false;
    }
    return !(movie.runtime < activeFilters.minRuntime || movie.runtime > activeFilters.maxRuntime);

}