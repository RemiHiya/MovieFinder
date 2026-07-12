(function lockViewportZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
})();

// Load the datas
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