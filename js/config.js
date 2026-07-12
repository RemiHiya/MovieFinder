const GRID_SIZE = 100;
const CELL_WIDTH = 145;
const CELL_HEIGHT = 210;
const CARD_WIDTH = 110;
const CARD_HEIGHT = 165;
const DRAG_THRESHOLD = 5;

const viewport = document.getElementById('viewport');
const container = document.getElementById('grid-container');
const searchBar = document.getElementById('search-bar');
const clearSearchBtn = document.getElementById('clear-search-btn');
const randomBtn = document.getElementById('random-btn');

const modal = document.getElementById('movie-modal');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalDuration = document.getElementById('modal-duration');
const modalTrailer = document.getElementById('modal-trailer');
const modalGenres = document.getElementById('modal-genres');
const modalOverview = document.getElementById('modal-overview');
const closeModalBtn = document.querySelector('.close-btn');
const modalPosterPlaceholder = document.querySelector('.modal-poster-placeholder');

const videoModal = document.getElementById('video-modal');
const youtubeIframe = document.getElementById('youtube-iframe');
const videoCloseBtn = document.querySelector('.video-close-btn');

const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterSidebar = document.getElementById('filter-sidebar');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const genresContainer = document.getElementById('genres-container');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

const adultToggle = document.getElementById('adult-toggle');
const genreMatchAllToggle = document.getElementById('genre-match-all-toggle');
const yearMinInput = document.getElementById('year-min');
const yearMaxInput = document.getElementById('year-max');
const yearLabel = document.getElementById('year-range-label');
const runtimeMinInput = document.getElementById('runtime-min');
const runtimeMaxInput = document.getElementById('runtime-max');
const runtimeLabel = document.getElementById('runtime-range-label');

const modalBackdrop = document.createElement('div');
modalBackdrop.id = 'modal-backdrop';
document.body.appendChild(modalBackdrop);

const sidebarBackdrop = document.createElement('div');
sidebarBackdrop.id = 'sidebar-backdrop';
document.body.appendChild(sidebarBackdrop);

const modalPosterImg = document.createElement('img');
modalPosterImg.id = 'modal-poster-img';
modalPosterImg.alt = '';
modalPosterImg.draggable = false;
modalPosterPlaceholder.appendChild(modalPosterImg);

let moviesData = [];
let cardsElements = [];
let visible_count = 0;
let last_visible_count = -1;

let activeFilters = {
    genres: new Set(),
    matchAllGenres: false,
    minYear: -1, maxYear: -1,
    minRuntime: -1, maxRuntime: -1
};

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

let activeMovieRecord = null;
let modalTargetMovie = null;
let modalRect = { width: 0, height: 0 };

let detailsMapCache = null;
let standardGridCache = null;
let adultGridCache = null;

function isMobileViewport() {
    return window.innerWidth <= 768;
}