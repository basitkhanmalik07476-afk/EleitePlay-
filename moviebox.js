// ============================================
// CineVerse - TMDB + Supabase Movie System
// ============================================


// ============================================
// CONFIG
// ============================================

const SUPABASE_URL =
    window.CINEVERSE_CONFIG.SUPABASE_URL;

const SUPABASE_ANON_KEY =
    window.CINEVERSE_CONFIG.SUPABASE_ANON_KEY;

const TMDB_API_KEY =
    window.CINEVERSE_CONFIG.TMDB_API_KEY;


// ============================================
// SUPABASE
// ============================================

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================
// TMDB CONFIG
// ============================================

const TMDB_BASE_URL =
    "https://api.themoviedb.org/3";

const TMDB_IMAGE_BASE_URL =
    "https://image.tmdb.org/t/p";

const TMDB_POSTER_SIZE =
    "w500";

const TMDB_BACKDROP_SIZE =
    "w1280";


// ============================================
// DOM ELEMENTS
// ============================================

const movieGrid =
    document.getElementById("movieGrid");

const searchInput =
    document.getElementById("searchInput");

const filters =
    document.getElementById("filters");

const sectionTitle =
    document.getElementById("sectionTitle");

const resultsCount =
    document.getElementById("resultsCount");

const emptyState =
    document.getElementById("emptyState");

const modal =
    document.getElementById("movieModal");

const modalPoster =
    document.getElementById("modalPoster");

const modalTitle =
    document.getElementById("modalTitle");

const modalMeta =
    document.getElementById("modalMeta");

const modalDescription =
    document.getElementById("modalDescription");

const modalFavorite =
    document.getElementById("modalFavorite");

const modalClose =
    document.getElementById("modalClose");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const profileButton =
    document.querySelector(".profile-btn");


// ============================================
// APP STATE
// ============================================

let movies = [];

let supabaseMovies = [];

let selectedGenre = "All";

let favorites = JSON.parse(
    localStorage.getItem("cineverseFavorites") || "[]"
);

let watchHistory = JSON.parse(
    localStorage.getItem("cineverseWatchHistory") || "[]"
);

let continueWatching = JSON.parse(
    localStorage.getItem("cineverseContinueWatching") || "[]"
);

let currentMovie = null;

let favoritesOnly = false;

let searchTimeout;

let currentPage = 1;

let totalPages = 1;


// ============================================
// TMDB FETCH HELPER
// ============================================

async function tmdbFetch(
    endpoint,
    params = {}
) {

    if (!TMDB_API_KEY) {

        throw new Error(
            "TMDB API key is missing. Add TMDB_API_KEY to config.js."
        );
    }


    const url =
        new URL(
            `${TMDB_BASE_URL}${endpoint}`
        );


    Object.entries({
        language: "en-US",
        ...params
    }).forEach(
        ([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                url.searchParams.set(
                    key,
                    value
                );
            }
        }
    );


    url.searchParams.set(
        "api_key",
        TMDB_API_KEY
    );


    const response =
        await fetch(
            url.toString()
        );


    if (!response.ok) {

        let errorMessage =
            `TMDB request failed (${response.status})`;

        try {

            const errorData =
                await response.json();

            if (
                errorData.status_message
            ) {

                errorMessage =
                    errorData.status_message;
            }

        } catch (error) {

            console.error(
                "TMDB error parsing failed:",
                error
            );
        }


        throw new Error(
            errorMessage
        );
    }


    return response.json();
}


// ============================================
// TMDB IMAGE URL
// ============================================

function getTMDBImage(
    path,
    size = TMDB_POSTER_SIZE
) {

    if (!path) {
        return "";
    }


    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}


// ============================================
// LOAD SUPABASE MOVIES
// ============================================

async function loadSupabaseMovies() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("movies")
                .select("*")
                .order(
                    "id",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        supabaseMovies =
            (data || []).map(
                movie =>
                    formatSupabaseMovie(
                        movie
                    )
            );


        console.log(
            "Supabase movies loaded:",
            supabaseMovies.length
        );


    } catch (error) {

        console.error(
            "Supabase movies error:",
            error
        );


        supabaseMovies = [];
    }
}


// ============================================
// FORMAT SUPABASE MOVIE
// ============================================

function formatSupabaseMovie(
    movie
) {

    return {

        id:
            `supabase-${movie.id}`,

        supabaseId:
            movie.id,

        tmdbId:
            movie.tmdb_id ||
            null,

        title:
            movie.title ||
            "Untitled",

        year:
            movie.year
                ? String(movie.year)
                : "N/A",

        rating:
            Number(
                movie.rating || 0
            ).toFixed(1),

        genreIds:
            [],

        genre:
            movie.genre ||
            "Movie",

        duration:
            movie.duration ||
            "N/A",

        poster:
            movie.poster_url ||
            "",

        backdrop:
            movie.backdrop_url ||
            "",

        description:
            movie.description ||
            "No description available.",

        trailer:
            movie.trailer_url ||
            "",

        movieUrl:
            movie.movie_url ||
            "",

        source:
            "supabase"
    };
}


// ============================================
// MERGE TMDB + SUPABASE
// ============================================

function mergeTMDBWithSupabase(
    tmdbMovie
) {

    const tmdbTitle =
        (
            tmdbMovie.title ||
            tmdbMovie.name ||
            ""
        )
            .toLowerCase()
            .trim();


    const tmdbYear =
        tmdbMovie.release_date
            ? tmdbMovie.release_date
                .substring(0, 4)
            : "";


    const matched =
        supabaseMovies.find(
            supabaseMovie => {

                if (
                    supabaseMovie.tmdbId &&
                    Number(
                        supabaseMovie.tmdbId
                    ) ===
                    Number(tmdbMovie.id)
                ) {

                    return true;
                }


                const supabaseTitle =
                    (
                        supabaseMovie.title ||
                        ""
                    )
                        .toLowerCase()
                        .trim();


                return (
                    supabaseTitle ===
                        tmdbTitle &&
                    (
                        !tmdbYear ||
                        supabaseMovie.year ===
                            tmdbYear
                    )
                );
            }
        );


    return {

        id:
            tmdbMovie.id,

        tmdbId:
            tmdbMovie.id,

        supabaseId:
            matched?.supabaseId ||
            null,

        title:
            tmdbMovie.title ||
            matched?.title ||
            "Untitled",

        year:
            tmdbYear ||
            matched?.year ||
            "N/A",

        rating:
            Number(
                tmdbMovie.vote_average ??
                matched?.rating ??
                0
            ).toFixed(1),

        genreIds:
            tmdbMovie.genre_ids ||
            matched?.genreIds ||
            [],

        genre:
            matched?.genre ||
            getGenreNames(
                tmdbMovie.genre_ids || []
            ),

        duration:
            matched?.duration ||
            "N/A",

        poster:
            tmdbMovie.poster_path
                ? getTMDBImage(
                    tmdbMovie.poster_path,
                    TMDB_POSTER_SIZE
                )
                : (
                    matched?.poster ||
                    ""
                ),

        backdrop:
            tmdbMovie.backdrop_path
                ? getTMDBImage(
                    tmdbMovie.backdrop_path,
                    TMDB_BACKDROP_SIZE
                )
                : (
                    matched?.backdrop ||
                    ""
                ),

        description:
            tmdbMovie.overview ||
            matched?.description ||
            "No description available.",

        trailer:
            matched?.trailer ||
            "",

        movieUrl:
            matched?.movieUrl ||
            "",

        source:
            "tmdb"
    };
}


// ============================================
// TMDB GENRES
// ============================================

const genreMap = {

    28: "Action",

    12: "Adventure",

    16: "Animation",

    35: "Comedy",

    80: "Crime",

    99: "Documentary",

    18: "Drama",

    10751: "Family",

    14: "Fantasy",

    36: "History",

    27: "Horror",

    10402: "Music",

    9648: "Mystery",

    10749: "Romance",

    878: "Sci-Fi",

    10770: "TV Movie",

    53: "Thriller",

    10752: "War",

    37: "Western"
};


function getGenreNames(
    genreIds
) {

    if (
        !Array.isArray(genreIds) ||
        genreIds.length === 0
    ) {

        return "Movie";
    }


    return genreIds
        .map(
            id =>
                genreMap[id]
        )
        .filter(Boolean)
        .slice(0, 2)
        .join(" • ") ||
        "Movie";
}


// ============================================
// LOAD POPULAR MOVIES FROM TMDB
// ============================================

// ============================================
// LOAD MOVIES FROM SUPABASE + TMDB
// ============================================

async function loadPopularMovies(page = 1) {

    showLoading();

    try {

        // ========================================
        // LOAD ADMIN MOVIES FROM SUPABASE
        // ========================================

        await loadSupabaseMovies();


        // ========================================
        // LOAD POPULAR MOVIES FROM TMDB
        // ========================================

        const data = await tmdbFetch(
            "/movie/popular",
            {
                page,
                include_adult: false
            }
        );


        currentPage = data.page || page;

        totalPages = data.total_pages || 1;


        const tmdbMovies = (data.results || [])
            .map(movie =>
                mergeTMDBWithSupabase(movie)
            );


        // ========================================
        // COMBINE SUPABASE + TMDB MOVIES
        // ========================================

        const existingIds = new Set(
            supabaseMovies.map(movie =>
                movie.tmdbId
                    ? Number(movie.tmdbId)
                    : null
            )
        );


        const uniqueTMDBMovies = tmdbMovies.filter(
            movie => {

                // If this TMDB movie already belongs
                // to a Supabase movie, don't duplicate it

                if (
                    movie.tmdbId &&
                    existingIds.has(
                        Number(movie.tmdbId)
                    )
                ) {
                    return false;
                }

                return true;
            }
        );


        // ========================================
        // ADMIN MOVIES FIRST
        // THEN TMDB MOVIES
        // ========================================

        movies = [
            ...supabaseMovies,
            ...uniqueTMDBMovies
        ];


        sectionTitle.textContent =
            "Movies";


        displayMovies();


        // ========================================
        // UPDATE HERO
        // ========================================

        if (movies.length > 0) {

            updateHero(
                movies[0]
            );

        }


    } catch (error) {

        console.error(
            "Movie loading error:",
            error
        );


        // ========================================
        // SUPABASE FALLBACK
        // ========================================

        if (
            supabaseMovies.length > 0
        ) {

            movies = [
                ...supabaseMovies
            ];


            sectionTitle.textContent =
                "Movies";


            displayMovies();


            if (
                movies.length > 0
            ) {

                updateHero(
                    movies[0]
                );

            }

        } else {

            showError(
                error.message ||
                "Unable to load movies."
            );

        }

    }

}



// ============================================
// SEARCH TMDB MOVIES
// ============================================

async function searchMovies(
    query
) {

    showLoading();


    try {

        const data =
            await tmdbFetch(
                "/search/movie",
                {
                    query,
                    page: 1,
                    include_adult: false
                }
            );


        movies =
            (data.results || [])
                .map(
                    movie =>
                        mergeTMDBWithSupabase(
                            movie
                        )
                );


        sectionTitle.textContent =
            `Search Results for "${query}"`;


        displayMovies();


    } catch (error) {

        console.error(
            "TMDB search error:",
            error
        );


        /*
         * Supabase fallback search
         */

        try {

            const {
                data,
                error:
                    supabaseError
            } =
                await supabaseClient
                    .from("movies")
                    .select("*")
                    .ilike(
                        "title",
                        `%${query}%`
                    )
                    .order(
                        "id",
                        {
                            ascending: false
                        }
                    );


            if (supabaseError) {
                throw supabaseError;
            }


            movies =
                (data || []).map(
                    movie =>
                        formatSupabaseMovie(
                            movie
                        )
                );


            sectionTitle.textContent =
                `Search Results for "${query}"`;


            displayMovies();


        } catch (fallbackError) {

            console.error(
                "Supabase search fallback error:",
                fallbackError
            );


            showError(
                "Movie search failed. Please try again."
            );
        }
    }
}


// ============================================
// LOAD MOVIE DETAILS FROM TMDB
// ============================================

async function loadTMDBMovieDetails(
    movie
) {

    if (
        !movie ||
        !movie.tmdbId
    ) {

        return movie;
    }


    try {

        const data =
            await tmdbFetch(
                `/movie/${movie.tmdbId}`,
                {
                    append_to_response:
                        "videos"
                }
            );


        const runtime =
            data.runtime
                ? `${Math.floor(
                    data.runtime / 60
                )}h ${data.runtime % 60}m`
                : movie.duration;


        const trailer =
            findYouTubeTrailer(
                data.videos?.results ||
                []
            );


        return {

            ...movie,

            title:
                data.title ||
                movie.title,

            description:
                data.overview ||
                movie.description,

            year:
                data.release_date
                    ? data.release_date.substring(
                        0,
                        4
                    )
                    : movie.year,

            rating:
                Number(
                    data.vote_average ??
                    movie.rating ??
                    0
                ).toFixed(1),

            duration:
                runtime ||
                "N/A",

            genre:
                data.genres &&
                data.genres.length > 0
                    ? data.genres
                        .slice(0, 2)
                        .map(
                            genre =>
                                genre.name
                        )
                        .join(" • ")
                    : movie.genre,

            poster:
                data.poster_path
                    ? getTMDBImage(
                        data.poster_path,
                        TMDB_POSTER_SIZE
                    )
                    : movie.poster,

            backdrop:
                data.backdrop_path
                    ? getTMDBImage(
                        data.backdrop_path,
                        TMDB_BACKDROP_SIZE
                    )
                    : movie.backdrop,

            trailer:
                trailer ||
                movie.trailer ||
                ""
        };


    } catch (error) {

        console.error(
            "TMDB details error:",
            error
        );


        return movie;
    }
}


// ============================================
// FIND YOUTUBE TRAILER
// ============================================

function findYouTubeTrailer(
    videos
) {

    if (
        !Array.isArray(videos)
    ) {

        return "";
    }


    const trailer =
        videos.find(
            video =>
                video.site ===
                    "YouTube" &&
                video.type ===
                    "Trailer" &&
                video.official ===
                    true
        ) ||
        videos.find(
            video =>
                video.site ===
                    "YouTube" &&
                video.type ===
                    "Trailer"
        ) ||
        videos.find(
            video =>
                video.site ===
                    "YouTube"
        );


    if (
        !trailer ||
        !trailer.key
    ) {

        return "";
    }


    return `https://www.youtube.com/watch?v=${trailer.key}`;
}


// ============================================
// DISPLAY MOVIES
// ============================================

function displayMovies() {

    const searchTerm =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const filteredMovies =
        movies.filter(
            movie => {

                const matchesSearch =
                    movie.title
                        .toLowerCase()
                        .includes(
                            searchTerm
                        );


                const matchesGenre =
                    selectedGenre ===
                        "All" ||
                    movie.genre
                        .toLowerCase()
                        .includes(
                            selectedGenre
                                .toLowerCase()
                        );


                const matchesFavorites =
                    !favoritesOnly ||
                    favorites.includes(
                        movie.id
                    );


                return (
                    matchesSearch &&
                    matchesGenre &&
                    matchesFavorites
                );
            }
        );


    movieGrid.innerHTML =
        "";


    filteredMovies.forEach(
        movie => {

            const isFavorite =
                favorites.includes(
                    movie.id
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "movie-card";


            const poster =
                movie.poster ||
                "";


            card.innerHTML = `

                <div class="poster-wrap">

                    <img
                        class="poster"
                        src="${escapeHtml(
                            poster
                        )}"
                        alt="${escapeHtml(
                            movie.title
                        )} poster"
                        loading="lazy"
                    >

                    <span class="rating">
                        ★ ${escapeHtml(
                            movie.rating
                        )}
                    </span>

                    <button
                        class="favorite-btn ${
                            isFavorite
                                ? "saved"
                                : ""
                        }"
                        aria-label="${
                            isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                        }"
                    >
                        ${
                            isFavorite
                                ? "♥"
                                : "♡"
                        }
                    </button>

                </div>


                <div class="movie-info">

                    <h3>
                        ${escapeHtml(
                            movie.title
                        )}
                    </h3>

                    <div class="movie-subtitle">

                        <span>
                            ${escapeHtml(
                                movie.year
                            )}
                        </span>

                        <span>
                            ${escapeHtml(
                                movie.genre
                            )}
                        </span>

                    </div>

                </div>

            `;


            const posterElement =
                card.querySelector(
                    ".poster"
                );


            if (
                posterElement
            ) {

                posterElement.addEventListener(
                    "error",
                    event => {

                        event.currentTarget.style.display =
                            "none";

                        event.currentTarget
                            .parentElement
                            .style.background =
                            "linear-gradient(145deg, #30234d, #12151e)";
                    }
                );
            }


            card.addEventListener(
                "click",
                () => {

                    openMovieDetails(
                        movie
                    );
                }
            );


            const favoriteButton =
                card.querySelector(
                    ".favorite-btn"
                );


            if (
                favoriteButton
            ) {

                favoriteButton.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        toggleFavorite(
                            movie.id
                        );
                    }
                );
            }


            movieGrid.appendChild(
                card
            );
        }
    );


    resultsCount.textContent =
        `${filteredMovies.length} movies`;


    emptyState.hidden =
        filteredMovies.length !== 0;


    movieGrid.hidden =
        filteredMovies.length === 0;
}


// ============================================
// FAVORITES
// ============================================

function toggleFavorite(
    movieId
) {

    if (
        favorites.includes(
            movieId
        )
    ) {

        favorites =
            favorites.filter(
                id =>
                    id !== movieId
            );

    } else {

        favorites.push(
            movieId
        );
    }


    localStorage.setItem(
        "cineverseFavorites",
        JSON.stringify(
            favorites
        )
    );


    displayMovies();


    if (
        currentMovie &&
        currentMovie.id ===
            movieId
    ) {

        updateModalFavorite();
    }
}


// ============================================
// OPEN MOVIE DETAILS
// ============================================

async function openMovieDetails(
    movie
) {

    currentMovie =
        movie;


    modalPoster.src =
        movie.poster || "";


    modalPoster.alt =
        `${movie.title} poster`;


    modalTitle.textContent =
        movie.title;


    modalDescription.textContent =
        movie.description;


    modalMeta.innerHTML = `

        <span>
            ★ ${escapeHtml(
                movie.rating
            )}
        </span>

        <span>
            ${escapeHtml(
                movie.year
            )}
        </span>

        <span>
            ${escapeHtml(
                movie.duration
            )}
        </span>

        <span class="tag">
            ${escapeHtml(
                movie.genre
            )}
        </span>

    `;


    updateModalFavorite();


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    removeMediaAreas();


    /*
     * Load fresh TMDB details
     */

    const detailedMovie =
        await loadTMDBMovieDetails(
            movie
        );


    if (
        currentMovie &&
        currentMovie.id ===
            movie.id
    ) {

        currentMovie =
            detailedMovie;


        modalPoster.src =
            detailedMovie.poster ||
            movie.poster ||
            "";


        modalTitle.textContent =
            detailedMovie.title;


        modalDescription.textContent =
            detailedMovie.description;


        modalMeta.innerHTML = `

            <span>
                ★ ${escapeHtml(
                    detailedMovie.rating
                )}
            </span>

            <span>
                ${escapeHtml(
                    detailedMovie.year
                )}
            </span>

            <span>
                ${escapeHtml(
                    detailedMovie.duration
                )}
            </span>

            <span class="tag">
                ${escapeHtml(
                    detailedMovie.genre
                )}
            </span>

        `;


        if (
            detailedMovie.movieUrl
        ) {

            createMoviePlayer(
                detailedMovie.movieUrl,
                detailedMovie.title
            );

        } else {

            createMovieMessage(
                "Full movie is not available for this movie."
            );
        }


        if (
            detailedMovie.trailer
        ) {

            const youtubeId =
                getYouTubeId(
                    detailedMovie.trailer
                );


            if (
                youtubeId
            ) {

                createTrailerArea(
                    "Watch Trailer",
                    youtubeId
                );

            } else {

                createTrailerArea(
                    "Invalid YouTube trailer URL."
                );
            }

        } else {

            createTrailerArea(
                "No YouTube trailer available for this movie."
            );
        }
    }
}


// ============================================
// CREATE FULL MOVIE PLAYER
// ============================================

function createMoviePlayer(
    movieUrl,
    movieTitle
) {

    const modalInfo =
        document.querySelector(
            ".modal-info"
        );


    if (!modalInfo) {
        return;
    }


    const movieContainer =
        document.createElement(
            "div"
        );


    movieContainer.id =
        "moviePlayerArea";


    movieContainer.style.marginTop =
        "20px";


    const videoType =
        getVideoMimeType(
            movieUrl
        );


    movieContainer.innerHTML = `

        <h3
            style="
                margin-bottom:12px;
                font-size:18px;
            "
        >
            🎬 Watch ${escapeHtml(
                movieTitle
            )}
        </h3>


        <div
            style="
                position:relative;
                width:100%;
                background:#000;
                border-radius:14px;
                overflow:hidden;
            "
        >

            <video
                id="cineverseMoviePlayer"
                controls
                playsinline
                preload="metadata"
                style="
                    width:100%;
                    height:auto;
                    max-height:70vh;
                    display:block;
                    background:#000;
                "
            >

                <source
                    src="${escapeHtml(
                        movieUrl
                    )}"
                    type="${videoType}"
                >

                Your browser does not support
                HTML5 video.

            </video>

        </div>


        <p
            style="
                margin-top:10px;
                color:#999;
                font-size:13px;
            "
        >
            Full movie player
        </p>

    `;


    modalInfo.appendChild(
        movieContainer
    );


    const video =
        document.getElementById(
            "cineverseMoviePlayer"
        );


    if (video) {

        video.addEventListener(
            "error",
            () => {

                console.error(
                    "Movie video failed to load:",
                    movieUrl
                );


                const errorMessage =
                    document.createElement(
                        "p"
                    );


                errorMessage.style.color =
                    "#ff9b9b";


                errorMessage.style.marginTop =
                    "10px";


                errorMessage.textContent =
                    "Unable to play this movie file. Please check the video URL, format, or Storage/R2 configuration.";


                movieContainer.appendChild(
                    errorMessage
                );
            }
        );


        setupMoviePlayerTracking();

        restoreMoviePosition();
    }
}


// ============================================
// VIDEO MIME TYPE
// ============================================

function getVideoMimeType(
    url
) {

    const cleanUrl =
        String(url || "")
            .split("?")[0]
            .toLowerCase();


    if (
        cleanUrl.endsWith(".webm")
    ) {

        return "video/webm";
    }


    if (
        cleanUrl.endsWith(".ogg") ||
        cleanUrl.endsWith(".ogv")
    ) {

        return "video/ogg";
    }


    return "video/mp4";
}


// ============================================
// CREATE MOVIE MESSAGE
// ============================================

function createMovieMessage(
    messageText
) {

    const modalInfo =
        document.querySelector(
            ".modal-info"
        );


    if (!modalInfo) {
        return;
    }


    const movieContainer =
        document.createElement(
            "div"
        );


    movieContainer.id =
        "moviePlayerArea";


    movieContainer.style.marginTop =
        "20px";


    movieContainer.innerHTML = `

        <div
            style="
                padding:16px;
                border-radius:12px;
                background:rgba(255,255,255,.06);
                color:#aaa;
            "
        >
            🎬 ${escapeHtml(
                messageText
            )}
        </div>

    `;


    modalInfo.appendChild(
        movieContainer
    );
}


// ============================================
// GET YOUTUBE VIDEO ID
// ============================================

function getYouTubeId(
    url
) {

    if (!url) {
        return null;
    }


    try {

        const parsedUrl =
            new URL(url);


        if (
            parsedUrl.hostname.includes(
                "youtu.be"
            )
        ) {

            return parsedUrl
                .pathname
                .slice(1)
                .split("/")[0];
        }


        if (
            parsedUrl.hostname.includes(
                "youtube.com"
            )
        ) {

            const videoId =
                parsedUrl.searchParams.get(
                    "v"
                );


            if (
                videoId
            ) {

                return videoId;
            }


            if (
                parsedUrl.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                return parsedUrl
                    .pathname
                    .split("/")[2];
            }


            if (
                parsedUrl.pathname.startsWith(
                    "/embed/"
                )
            ) {

                return parsedUrl
                    .pathname
                    .split("/")[2];
            }
        }

    } catch (error) {

        console.error(
            "Invalid YouTube URL:",
            error
        );
    }


    return null;
}


// ============================================
// CREATE TRAILER AREA
// ============================================

function createTrailerArea(
    title,
    youtubeKey = null
) {

    const modalInfo =
        document.querySelector(
            ".modal-info"
        );


    if (!modalInfo) {
        return;
    }


    const trailerContainer =
        document.createElement(
            "div"
        );


    trailerContainer.id =
        "trailerArea";


    trailerContainer.style.marginTop =
        "20px";


    if (
        youtubeKey
    ) {

        trailerContainer.innerHTML = `

            <h3
                style="
                    margin-bottom:12px;
                    font-size:18px;
                "
            >
                🎞️ ${escapeHtml(
                    title
                )}
            </h3>


            <div
                style="
                    position:relative;
                    width:100%;
                    aspect-ratio:16/9;
                    border-radius:14px;
                    overflow:hidden;
                    background:#000;
                "
            >

                <iframe
                    src="https://www.youtube.com/embed/${encodeURIComponent(
                        youtubeKey
                    )}?rel=0"
                    title="${escapeHtml(
                        title
                    )}"
                    style="
                        width:100%;
                        height:100%;
                        border:0;
                    "
                    allow="
                        accelerometer;
                        autoplay;
                        clipboard-write;
                        encrypted-media;
                        gyroscope;
                        picture-in-picture;
                        web-share
                    "
                    allowfullscreen
                ></iframe>

            </div>

        `;

    } else {

        trailerContainer.innerHTML = `

            <div
                style="
                    padding:16px;
                    border-radius:12px;
                    background:rgba(255,255,255,.06);
                    color:#aaa;
                "
            >
                ${escapeHtml(
                    title
                )}
            </div>

        `;
    }


    modalInfo.appendChild(
        trailerContainer
    );
}


// ============================================
// REMOVE MEDIA AREAS
// ============================================

function removeMediaAreas() {

    const moviePlayer =
        document.getElementById(
            "moviePlayerArea"
        );


    if (
        moviePlayer
    ) {

        const video =
            moviePlayer.querySelector(
                "video"
            );


        if (
            video
        ) {

            video.pause();

            video.removeAttribute(
                "src"
            );

            video.load();
        }


        moviePlayer.remove();
    }


    const trailer =
        document.getElementById(
            "trailerArea"
        );


    if (
        trailer
    ) {

        trailer.remove();
    }
}


// ============================================
// OLD FUNCTION COMPATIBILITY
// ============================================

function removeTrailerArea() {

    removeMediaAreas();
}


// ============================================
// MODAL FAVORITE
// ============================================

function updateModalFavorite() {

    if (
        !currentMovie
    ) {

        return;
    }


    const isFavorite =
        favorites.includes(
            currentMovie.id
        );


    modalFavorite.textContent =
        isFavorite
            ? "♥ Remove from Favorites"
            : "♡ Add to Favorites";
}


// ============================================
// CLOSE MODAL
// ============================================

function closeModal() {

    const video =
        document.getElementById(
            "cineverseMoviePlayer"
        );


    if (
        video
    ) {

        saveWatchHistory(
            currentMovie,
            video.currentTime,
            video.duration
        );


        video.pause();

        video.removeAttribute(
            "src"
        );

        video.load();
    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    removeMediaAreas();


    currentMovie =
        null;
}


// ============================================
// MODAL EVENTS
// ============================================

if (
    modalClose
) {

    modalClose.addEventListener(
        "click",
        closeModal
    );
}


if (
    modalBackdrop
) {

    modalBackdrop.addEventListener(
        "click",
        closeModal
    );
}


// ============================================
// ESC KEY
// ============================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();
        }
    }
);


// ============================================
// SEARCH
// ============================================

if (
    searchInput
) {

    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimeout
            );


            const query =
                searchInput.value
                    .trim();


            if (!query) {

                sectionTitle.textContent =
                    "Popular Movies";


                loadPopularMovies();

                return;
            }


            searchTimeout =
                setTimeout(
                    () => {

                        searchMovies(
                            query
                        );

                    },
                    500
                );
        }
    );
}


// ============================================
// GENRE FILTERS
// ============================================

if (
    filters
) {

    filters.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".filter-btn"
                );


            if (!button) {
                return;
            }


            document
                .querySelectorAll(
                    ".filter-btn"
                )
                .forEach(
                    btn =>
                        btn.classList.remove(
                            "active"
                        )
                );


            button.classList.add(
                "active"
            );


            selectedGenre =
                button.dataset.genre ||
                button.textContent.trim();


            if (
                selectedGenre ===
                "Favorites"
            ) {

                favoritesOnly =
                    true;

                selectedGenre =
                    "All";

            } else {

                favoritesOnly =
                    false;
            }


            displayMovies();
        }
    );
}


// ============================================
// MODAL FAVORITE BUTTON
// ============================================

if (
    modalFavorite
) {

    modalFavorite.addEventListener(
        "click",
        () => {

            if (
                !currentMovie
            ) {

                return;
            }


            toggleFavorite(
                currentMovie.id
            );
        }
    );
}


// ============================================
// NAVIGATION
// ============================================

document
    .querySelectorAll(
        ".nav-links a"
    )
    .forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    const href =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        href &&
                        href.startsWith(
                            "#"
                        )
                    ) {

                        event.preventDefault();


                        const target =
                            document.querySelector(
                                href
                            );


                        if (
                            target
                        ) {

                            target.scrollIntoView({
                                behavior:
                                    "smooth"
                            });
                        }
                    }
                }
            );
        }
    );


// ============================================
// EXPLORE BUTTON
// ============================================

const exploreBtn =
    document.getElementById(
        "exploreBtn"
    );


if (
    exploreBtn
) {

    exploreBtn.addEventListener(
        "click",
        () => {

            const moviesSection =
                document.getElementById(
                    "movies"
                );


            if (
                moviesSection
            ) {

                moviesSection.scrollIntoView({
                    behavior:
                        "smooth"
                });
            }
        }
    );
}


// ============================================
// HERO DETAILS BUTTON
// ============================================

const heroDetails =
    document.getElementById(
        "heroDetails"
    );


if (
    heroDetails
) {

    heroDetails.addEventListener(
        "click",
        () => {

            if (
                movies.length > 0
            ) {

                openMovieDetails(
                    movies[0]
                );
            }
        }
    );
}


// ============================================
// UPDATE HERO
// ============================================

function updateHero(
    movie
) {

    const hero =
        document.querySelector(
            ".hero"
        );


    if (
        !hero ||
        !movie
    ) {

        return;
    }


    if (
        movie.backdrop
    ) {

        hero.style.backgroundImage =
            `
            linear-gradient(
                90deg,
                rgba(10,10,15,.95) 0%,
                rgba(10,10,15,.7) 45%,
                rgba(10,10,15,.25) 100%
            ),
            url("${movie.backdrop}")
            `;


        hero.style.backgroundSize =
            "cover";


        hero.style.backgroundPosition =
            "center";
    }


    const heroTitle =
        hero.querySelector(
            "h1"
        );


    if (
        heroTitle
    ) {

        heroTitle.textContent =
            movie.title;
    }


    const heroDescription =
        hero.querySelector(
            "p"
        );


    if (
        heroDescription
    ) {

        heroDescription.textContent =
            movie.description;
    }


    const heroMeta =
        hero.querySelector(
            ".hero-meta"
        );


    if (
        heroMeta
    ) {

        heroMeta.innerHTML = `

            <span>
                ★ ${escapeHtml(
                    movie.rating
                )}
            </span>

            <span>
                ${escapeHtml(
                    movie.year
                )}
            </span>

            <span class="tag">
                ${escapeHtml(
                    movie.genre
                )}
            </span>

        `;
    }
}


// ============================================
// RESET BUTTON
// ============================================

const resetBtn =
    document.getElementById(
        "resetBtn"
    );


if (
    resetBtn
) {

    resetBtn.addEventListener(
        "click",
        () => {

            searchInput.value =
                "";


            selectedGenre =
                "All";


            favoritesOnly =
                false;


            sectionTitle.textContent =
                "Popular Movies";


            document
                .querySelectorAll(
                    ".filter-btn"
                )
                .forEach(
                    btn =>
                        btn.classList.remove(
                            "active"
                        )
                );


            const allButton =
                document.querySelector(
                    '.filter-btn[data-genre="All"]'
                );


            if (
                allButton
            ) {

                allButton.classList.add(
                    "active"
                );
            }


            loadPopularMovies();
        }
    );
}


// ============================================
// LOADING
// ============================================

function showLoading() {

    movieGrid.hidden =
        false;


    emptyState.hidden =
        true;


    movieGrid.innerHTML = `

        <div
            style="
                grid-column:1/-1;
                text-align:center;
                padding:50px;
                color:#aaa;
            "
        >
            Loading movies...
        </div>

    `;


    resultsCount.textContent =
        "Loading...";
}


// ============================================
// ERROR
// ============================================

function showError(
    message
) {

    movieGrid.innerHTML = `

        <div
            style="
                grid-column:1/-1;
                text-align:center;
                padding:50px;
            "
        >

            <h3>
                Something went wrong
            </h3>

            <p>
                ${escapeHtml(
                    message
                )}
            </p>

        </div>

    `;


    movieGrid.hidden =
        false;


    emptyState.hidden =
        true;


    resultsCount.textContent =
        "Error";
}


// ============================================
// HTML ESCAPE
// ============================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================
// SAVE WATCH HISTORY
// ============================================

function saveWatchHistory(
    movie,
    currentTime = 0,
    duration = 0
) {

    if (!movie) {
        return;
    }


    if (
        !Number.isFinite(
            currentTime
        )
    ) {

        currentTime = 0;
    }


    if (
        !Number.isFinite(
            duration
        )
    ) {

        duration = 0;
    }


    const progress =
        duration > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        currentTime /
                        duration
                    ) * 100
                )
            )
            : 0;


    const historyItem = {

        movieId:
            movie.id,

        title:
            movie.title,

        poster:
            movie.poster,

        currentTime:
            currentTime,

        duration:
            duration,

        progress:
            progress,

        watchedAt:
            Date.now()
    };


    watchHistory =
        watchHistory.filter(
            item =>
                item.movieId !==
                movie.id
        );


    watchHistory.unshift(
        historyItem
    );


    watchHistory =
        watchHistory.slice(
            0,
            50
        );


    localStorage.setItem(
        "cineverseWatchHistory",
        JSON.stringify(
            watchHistory
        )
    );


    // ========================================
    // CONTINUE WATCHING
    // ========================================

    if (
        duration > 0 &&
        progress > 2 &&
        progress < 95
    ) {

        continueWatching =
            continueWatching.filter(
                item =>
                    item.movieId !==
                    movie.id
            );


        continueWatching.unshift(
            historyItem
        );


        continueWatching =
            continueWatching.slice(
                0,
                20
            );


        localStorage.setItem(
            "cineverseContinueWatching",
            JSON.stringify(
                continueWatching
            )
        );


    } else if (
        progress >= 95
    ) {

        continueWatching =
            continueWatching.filter(
                item =>
                    item.movieId !==
                    movie.id
            );


        localStorage.setItem(
            "cineverseContinueWatching",
            JSON.stringify(
                continueWatching
            )
        );
    }
}


// ============================================
// SHOW WATCH HISTORY
// ============================================

function showWatchHistory() {

    const moviesSection =
        document.getElementById(
            "movies"
        );


    if (
        !moviesSection
    ) {

        return;
    }


    moviesSection.scrollIntoView({
        behavior:
            "smooth"
    });


    sectionTitle.textContent =
        "Watch History";


    const historyMovies =
        watchHistory
            .map(
                item =>
                    movies.find(
                        movie =>
                            movie.id ===
                            item.movieId
                    )
            )
            .filter(Boolean);


    displaySpecialMovieList(
        historyMovies,
        "No watch history yet."
    );
}


// ============================================
// SHOW CONTINUE WATCHING
// ============================================

function showContinueWatching() {

    const moviesSection =
        document.getElementById(
            "movies"
        );


    if (
        !moviesSection
    ) {

        return;
    }


    moviesSection.scrollIntoView({
        behavior:
            "smooth"
    });


    sectionTitle.textContent =
        "Continue Watching";


    const continueMovies =
        continueWatching
            .map(
                item =>
                    movies.find(
                        movie =>
                            movie.id ===
                            item.movieId
                    )
            )
            .filter(Boolean);


    displaySpecialMovieList(
        continueMovies,
        "Nothing to continue watching."
    );
}


// ============================================
// SHOW FAVORITES
// ============================================

function showFavoritesPage() {

    const moviesSection =
        document.getElementById(
            "movies"
        );


    if (
        !moviesSection
    ) {

        return;
    }


    moviesSection.scrollIntoView({
        behavior:
            "smooth"
    });


    sectionTitle.textContent =
        "My Favorites";


    const favoriteMovies =
        movies.filter(
            movie =>
                favorites.includes(
                    movie.id
                )
        );


    displaySpecialMovieList(
        favoriteMovies,
        "You have no favorite movies yet."
    );
}


// ============================================
// SPECIAL MOVIE LIST
// ============================================

function displaySpecialMovieList(
    movieList,
    emptyMessage
) {

    movieGrid.innerHTML =
        "";


    if (
        movieList.length === 0
    ) {

        movieGrid.innerHTML = `

            <div
                style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:50px;
                    color:#aaa;
                "
            >

                <h3>
                    ${escapeHtml(
                        emptyMessage
                    )}
                </h3>


                <button
                    class="secondary-btn"
                    id="showAllMoviesBtn"
                    style="margin-top:15px;"
                >
                    Show All Movies
                </button>

            </div>

        `;


        movieGrid.hidden =
            false;


        emptyState.hidden =
            true;


        resultsCount.textContent =
            "0 movies";


        const showAllButton =
            document.getElementById(
                "showAllMoviesBtn"
            );


        if (
            showAllButton
        ) {

            showAllButton.addEventListener(
                "click",
                () => {

                    sectionTitle.textContent =
                        "Popular Movies";


                    selectedGenre =
                        "All";


                    favoritesOnly =
                        false;


                    loadPopularMovies();
                }
            );
        }


        return;
    }


    movieList.forEach(
        movie => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "movie-card";


            card.innerHTML = `

                <div class="poster-wrap">

                    <img
                        class="poster"
                        src="${escapeHtml(
                            movie.poster
                        )}"
                        alt="${escapeHtml(
                            movie.title
                        )} poster"
                        loading="lazy"
                    >

                </div>


                <div class="movie-info">

                    <h3>
                        ${escapeHtml(
                            movie.title
                        )}
                    </h3>


                    <div
                        class="movie-subtitle"
                    >

                        <span>
                            ${escapeHtml(
                                movie.year
                            )}
                        </span>


                        <span>
                            ${escapeHtml(
                                movie.genre
                            )}
                        </span>

                    </div>

                </div>

            `;


            const poster =
                card.querySelector(
                    ".poster"
                );


            if (
                poster
            ) {

                poster.addEventListener(
                    "error",
                    event => {

                        event.currentTarget.style.display =
                            "none";

                        event.currentTarget
                            .parentElement
                            .style.background =
                            "linear-gradient(145deg, #30234d, #12151e)";
                    }
                );
            }


            card.addEventListener(
                "click",
                () => {

                    openMovieDetails(
                        movie
                    );
                }
            );


            movieGrid.appendChild(
                card
            );
        }
    );


    movieGrid.hidden =
        false;


    emptyState.hidden =
        true;


    resultsCount.textContent =
        `${movieList.length} movies`;
}


// ============================================
// TRACK VIDEO WATCHING
// ============================================

function setupMoviePlayerTracking() {

    const video =
        document.getElementById(
            "cineverseMoviePlayer"
        );


    if (
        !video ||
        !currentMovie
    ) {

        return;
    }


    let lastSave =
        0;


    video.addEventListener(
        "timeupdate",
        () => {

            const now =
                Date.now();


            if (
                now - lastSave <
                5000
            ) {

                return;
            }


            lastSave =
                now;


            saveWatchHistory(
                currentMovie,
                video.currentTime,
                video.duration
            );
        }
    );


    video.addEventListener(
        "pause",
        () => {

            saveWatchHistory(
                currentMovie,
                video.currentTime,
                video.duration
            );
        }
    );


    video.addEventListener(
        "ended",
        () => {

            saveWatchHistory(
                currentMovie,
                video.duration,
                video.duration
            );
        }
    );
}


// ============================================
// RESTORE LAST MOVIE POSITION
// ============================================

function restoreMoviePosition() {

    const video =
        document.getElementById(
            "cineverseMoviePlayer"
        );


    if (
        !video ||
        !currentMovie
    ) {

        return;
    }


    const saved =
        continueWatching.find(
            item =>
                item.movieId ===
                currentMovie.id
        );


    if (
        !saved
    ) {

        return;
    }


    video.addEventListener(
        "loadedmetadata",
        () => {

            if (
                saved.currentTime > 0 &&
                saved.currentTime <
                    video.duration
            ) {

                video.currentTime =
                    saved.currentTime;
            }

        },
        {
            once: true
        }
    );
}


// ============================================
// PROFILE MENU
// ============================================

function createProfileMenu() {

    if (
        !profileButton
    ) {

        return;
    }


    if (
        document.getElementById(
            "cineverseProfileMenu"
        )
    ) {

        return;
    }


    const menu =
        document.createElement(
            "div"
        );


    menu.id =
        "cineverseProfileMenu";


    menu.innerHTML = `

        <div class="profile-menu-header">

            <div class="profile-avatar">
                B
            </div>

            <div>

                <h4>
                    ElitePlay User
                </h4>

                <small>
                    Movie Lover
                </small>

            </div>

        </div>


        <div class="profile-menu-divider"></div>


        <button
            class="profile-menu-item"
            data-action="favorites"
        >
            ❤️

            <span>
                My Favorites
            </span>

        </button>


        <button
            class="profile-menu-item"
            data-action="history"
        >
            🕐

            <span>
                Watch History
            </span>

        </button>


        <button
            class="profile-menu-item"
            data-action="continue"
        >
            ▶️

            <span>
                Continue Watching
            </span>

        </button>

    `;


    document.body.appendChild(
        menu
    );


    profileButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            menu.classList.toggle(
                "show"
            );
        }
    );


    menu.addEventListener(
        "click",
        event => {

            const item =
                event.target.closest(
                    ".profile-menu-item"
                );


            if (!item) {
                return;
            }


            const action =
                item.dataset.action;


            if (
                action ===
                "favorites"
            ) {

                showFavoritesPage();
            }


            if (
                action ===
                "history"
            ) {

                showWatchHistory();
            }


            if (
                action ===
                "continue"
            ) {

                showContinueWatching();
            }


            menu.classList.remove(
                "show"
            );
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !menu.contains(
                    event.target
                ) &&
                !profileButton.contains(
                    event.target
                )
            ) {

                menu.classList.remove(
                    "show"
                );
            }
        }
    );
}


// ============================================
// PROFILE MENU STYLES
// ============================================

function addProfileMenuStyles() {

    if (
        document.getElementById(
            "cineverseProfileStyles"
        )
    ) {

        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "cineverseProfileStyles";


    style.textContent = `

        .profile-btn {
            position: relative;
            cursor: pointer;
        }


        #cineverseProfileMenu {

            position: fixed;

            top: 75px;

            right: 30px;

            width: 250px;

            background: #181b24;

            border: 1px solid #303542;

            border-radius: 14px;

            padding: 10px;

            box-shadow:
                0 20px 50px
                rgba(0,0,0,.45);

            z-index: 9999;

            opacity: 0;

            visibility: hidden;

            transform:
                translateY(-8px);

            transition:
                .2s ease;
        }


        #cineverseProfileMenu.show {

            opacity: 1;

            visibility: visible;

            transform:
                translateY(0);
        }


        .profile-menu-header {

            display: flex;

            align-items: center;

            gap: 12px;

            padding: 12px;
        }


        .profile-avatar {

            width: 42px;

            height: 42px;

            border-radius: 50%;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #7c5cff;

            color: white;

            font-weight: 700;
        }


        .profile-menu-header h4 {

            display: block;

            color: white;

            font-size: 14px;

            margin: 0;
        }


        .profile-menu-header small {

            display: block;

            color: #888;

            margin-top: 3px;
        }


        .profile-menu-divider {

            height: 1px;

            background: #303542;

            margin: 6px 0;
        }


        .profile-menu-item {

            width: 100%;

            border: 0;

            background: transparent;

            color: #ddd;

            display: flex;

            align-items: center;

            gap: 12px;

            padding: 12px;

            border-radius: 9px;

            cursor: pointer;

            text-align: left;

            font-size: 14px;
        }


        .profile-menu-item:hover {

            background: #252936;

            color: white;
        }


        .profile-menu-item span {

            flex: 1;
        }


        @media (max-width: 600px) {

            #cineverseProfileMenu {

                right: 15px;

                width:
                    calc(100% - 30px);

            }

        }

    `;


    document.head.appendChild(
        style
    );
}


// ============================================
// TMDB ATTRIBUTION
// ============================================

function addTMDBAttribution() {

    if (
        document.getElementById(
            "tmdb-attribution"
        )
    ) {

        return;
    }


    const footer =
        document.querySelector(
            "footer"
        );


    if (!footer) {
        return;
    }


    const notice =
        document.createElement(
            "p"
        );


    notice.id =
        "tmdb-attribution";
        

    notice.style.cssText = `
        margin-top:15px;
        color:#777;
        font-size:12px;
        text-align:center;
        line-height:1.5;
    `;


    footer.appendChild(
        notice
    );
}


// ============================================
// INITIALIZE
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        addProfileMenuStyles();

        createProfileMenu();

        addTMDBAttribution();

        loadPopularMovies();

    }
);

// Movies data
const moreMovies = [
  {
    title: "The Dark Knight",
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
  },
  {
    title: "Inception",
    poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
  },
  {
    title: "Interstellar",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  },
  {
    title: "Avengers: Endgame",
    poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
  },
  {
    title: "Spider-Man: No Way Home",
    poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
  },
  {
    title: "Joker",
    poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"
  }
];
// =================================

// ============================================
// WATCH TRAILER BUTTON
// ============================================

const modalTrailer =
    document.getElementById("modalTrailer");

if (modalTrailer) {

    modalTrailer.addEventListener(
        "click",
        () => {

            const trailerArea =
                document.getElementById("trailerArea");

            if (trailerArea) {

                trailerArea.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                const iframe =
                    trailerArea.querySelector("iframe");

                if (iframe) {

                    iframe.focus();

                }

            } else {

                console.log(
                    "Trailer is not available for this movie."
                );

            }

        }
    );
}

// ============================================================
// ELITEPLAY SAFE UI
// Sidebar + Infinite Scroll
// Does NOT replace existing movie loading logic
// ============================================================


// ============================================================
// MOBILE SIDEBAR
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    if (!mobileMenuBtn || !sidebar || !sidebarOverlay) return;


    /* =========================================
       CLOSE SIDEBAR
    ========================================= */

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebar.classList.remove("active");

        sidebarOverlay.classList.remove("active");
    }


    /* =========================================
       OPEN / CLOSE MOBILE SIDEBAR
    ========================================= */

    mobileMenuBtn.addEventListener("click", (event) => {

        event.stopPropagation();

        const isOpen =
            sidebar.classList.contains("open");

        if (isOpen) {
            closeSidebar();
        } else {
            sidebar.classList.add("open");
            sidebarOverlay.classList.add("active");
        }

    });


    /* =========================================
       CLICK OUTSIDE
    ========================================= */

    sidebarOverlay.addEventListener("click", () => {
        closeSidebar();
    });


    /* =========================================
       SIDEBAR CLICKS
       CLOSE AFTER SELECTING MENU / GENRE
    ========================================= */

    sidebar.addEventListener("click", (event) => {

        const clickedGenre =
            event.target.closest(
                "[data-genre]"
            );

        const clickedMenu =
            event.target.closest(
                "[data-section]"
            );

        const clickedAction =
            event.target.closest(
                "#sidebarFavorites, #sidebarHistory, #sidebarContinue"
            );


        if (
            clickedGenre ||
            clickedMenu ||
            clickedAction
        ) {
            closeSidebar();
        }

    });

});



// ============================================================
// INFINITE SCROLL
// ============================================================

const eliteSentinel =
    document.getElementById("loadMoreSentinel");


const eliteLoader =
    document.getElementById("infiniteLoader");


if (eliteSentinel) {

    const eliteObserver =
        new IntersectionObserver(
            async (entries) => {

                const entry = entries[0];


                if (!entry.isIntersecting) {
                    return;
                }


                // Existing JS variables
                if (
                    typeof isPopularMode !== "undefined" &&
                    !isPopularMode
                ) {
                    return;
                }


                if (
                    typeof isLoadingMore !== "undefined" &&
                    isLoadingMore
                ) {
                    return;
                }


                if (
                    typeof currentPage !== "undefined" &&
                    typeof totalPages !== "undefined" &&
                    currentPage >= totalPages
                ) {
                    return;
                }


                if (eliteLoader) {

                    eliteLoader.classList.add("show");

                }


                try {

                    // IMPORTANT:
                    // Use the existing function
                    await loadMoreMovies();

                } catch (error) {

                    console.error(
                        "ElitePlay infinite scroll error:",
                        error
                    );

                } finally {

                    if (eliteLoader) {

                        eliteLoader.classList.remove("show");

                    }

                }

            },
            {
                root: null,

                rootMargin: "300px 0px",

                threshold: 0

            }
        );


    eliteObserver.observe(eliteSentinel);

}



// ============================================================
// SIDEBAR GENRES
// ============================================================

document
    .querySelectorAll(".sidebar-genre")
    .forEach(button => {

        button.addEventListener("click", () => {

            const genre =
                button.dataset.genre || "All";


            // Update sidebar active state

            document
                .querySelectorAll(".sidebar-genre")
                .forEach(item => {

                    item.classList.remove("active");

                });


            button.classList.add("active");


            // Update existing filter

            const matchingFilter =
                document.querySelector(
                    `.filter-btn[data-genre="${genre}"]`
                );


            if (matchingFilter) {

                matchingFilter.click();

            }


            // Close mobile sidebar

            if (eliteSidebar) {

                eliteSidebar.classList.remove("open");

            }

        });

    });



// ============================================================
// GENRE CARDS
// ============================================================

document
    .querySelectorAll(".genre-grid button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const genre =
                button.dataset.genre;


            const sidebarGenre =
                document.querySelector(
                    `.sidebar-genre[data-genre="${genre}"]`
                );


            if (sidebarGenre) {

                sidebarGenre.click();

            }

        });

    });



// ============================================================
// POPULAR / TRENDING / TOP RATED
// Only scrolls to sections.
// Does NOT touch main movie array.
// ============================================================

document
    .querySelectorAll(".view-all-btn")
    .forEach(button => {

        button.addEventListener("click", () => {

            const section =
                button.dataset.section;


            if (section === "popular") {

                document
                    .getElementById("movies")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }


            if (section === "trending") {

                document
                    .getElementById("trendingSection")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }


            if (section === "top-rated") {

                document
                    .getElementById("topRatedSection")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }

        });

    });



// ============================================================
// EXPLORE BUTTON
// ============================================================

const eliteExplore =
    document.getElementById("exploreBtn");


if (eliteExplore) {

    eliteExplore.addEventListener("click", () => {

        document
            .getElementById("movies")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    });

}



// ============================================================
// ELITEPLAY LOGO
// ============================================================

document
    .querySelectorAll(".elite-logo")
    .forEach(logo => {

        logo.addEventListener("click", event => {

            event.preventDefault();


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    });

    // ============================================================
// ELITEPLAY HOME SECTIONS
// Popular + Trending + Top Rated
// ============================================================

(function () {

    // --------------------------------------------------------
    // FIND SECTION
    // --------------------------------------------------------

    function findSectionByText(text) {

        const sections =
            document.querySelectorAll("section");

        for (const section of sections) {

            const heading =
                section.querySelector("h2");

            if (
                heading &&
                heading.textContent
                    .trim()
                    .toLowerCase()
                    .includes(text.toLowerCase())
            ) {
                return section;
            }
        }

        return null;
    }


    // --------------------------------------------------------
    // GET / CREATE MOVIE ROW
    // --------------------------------------------------------

    function getMovieRow(section, rowId) {

        if (!section) {
            return null;
        }

        let row =
            document.getElementById(rowId);

        if (row) {
            return row;
        }

        row =
            document.createElement("div");

        row.id = rowId;

        row.className =
            "elite-section-row";

        section.appendChild(row);

        return row;
    }


    // --------------------------------------------------------
    // CREATE MOVIE CARD
    // --------------------------------------------------------

    function createSectionMovieCard(movie) {

        const card =
            document.createElement("article");

        card.className =
            "elite-section-movie-card";


        card.innerHTML = `

            <div class="elite-section-poster">

                <img
                    src="${escapeHtml(movie.poster || "")}"
                    alt="${escapeHtml(movie.title || "Movie")}"
                    loading="lazy"
                >

                <div class="elite-section-rating">
                    ★ ${escapeHtml(movie.rating || "0.0")}
                </div>

            </div>

            <div class="elite-section-info">

                <h3>
                    ${escapeHtml(movie.title || "Untitled")}
                </h3>

                <div class="elite-section-meta">

                    <span>
                        ${escapeHtml(movie.year || "N/A")}
                    </span>

                    <span>
                        ${escapeHtml(movie.genre || "Movie")}
                    </span>

                </div>

            </div>

        `;


        // ----------------------------------------------------
        // OPEN MOVIE DETAILS
        // ----------------------------------------------------

        card.addEventListener(
            "click",
            () => {

                if (
                    typeof openMovieDetails ===
                    "function"
                ) {

                    openMovieDetails(movie);
                }

            }
        );


        return card;
    }


    // --------------------------------------------------------
    // RENDER MOVIES
    // --------------------------------------------------------

    function renderSectionMovies(
        row,
        movieList,
        loadingText
    ) {

        if (!row) {
            return;
        }


        row.innerHTML = "";


        if (
            !movieList ||
            movieList.length === 0
        ) {

            row.innerHTML = `

                <div class="elite-section-loading">
                    ${loadingText}
                </div>

            `;

            return;
        }


        movieList.forEach(
            movie => {

                row.appendChild(
                    createSectionMovieCard(movie)
                );

            }
        );

    }


    // --------------------------------------------------------
    // LOAD ONE TMDB SECTION
    // --------------------------------------------------------

    async function loadEliteSection(
        endpoint,
        rowId,
        loadingText
    ) {

        const row =
            document.getElementById(rowId);


        if (!row) {
            return;
        }


        row.innerHTML = `

            <div class="elite-section-loading">
                ${loadingText}
            </div>

        `;


        try {

            const data =
                await tmdbFetch(
                    endpoint,
                    {
                        page: 1,
                        include_adult: false
                    }
                );


            const results =
                Array.isArray(data.results)
                    ? data.results
                    : [];


            const sectionMovies =
                results
                    .filter(
                        movie =>
                            movie.poster_path
                    )
                    .map(
                        movie =>
                            mergeTMDBWithSupabase(
                                movie
                            )
                    );


            renderSectionMovies(
                row,
                sectionMovies,
                "No movies found."
            );


        } catch (error) {

            console.error(
                `ElitePlay ${endpoint} error:`,
                error
            );


            row.innerHTML = `

                <div class="elite-section-loading">

                    Unable to load movies.

                    <button
                        class="elite-section-retry"
                        type="button"
                    >
                        Try Again
                    </button>

                </div>

            `;


            const retry =
                row.querySelector(
                    ".elite-section-retry"
                );


            if (retry) {

                retry.addEventListener(
                    "click",
                    () => {

                        loadEliteSection(
                            endpoint,
                            rowId,
                            loadingText
                        );

                    }
                );

            }

        }

    }


    // --------------------------------------------------------
    // SETUP SECTIONS
    // --------------------------------------------------------

    async function setupEliteSections() {

        // Popular section
        const popularSection =
            findSectionByText(
                "Popular Movies"
            );


        // Trending section
        const trendingSection =
            findSectionByText(
                "Trending Now"
            );


        // Top Rated section
        const topRatedSection =
            findSectionByText(
                "Top Rated"
            );


        const popularRow =
            getMovieRow(
                popularSection,
                "elitePopularRow"
            );


        const trendingRow =
            getMovieRow(
                trendingSection,
                "eliteTrendingRow"
            );


        const topRatedRow =
            getMovieRow(
                topRatedSection,
                "eliteTopRatedRow"
            );


        // ----------------------------------------------------
        // LOAD ALL 3 SECTIONS
        // ----------------------------------------------------

        await Promise.all([

            loadEliteSection(
                "/movie/popular",
                "elitePopularRow",
                "Loading popular movies..."
            ),

            loadEliteSection(
                "/trending/movie/week",
                "eliteTrendingRow",
                "Loading trending movies..."
            ),

            loadEliteSection(
                "/movie/top_rated",
                "eliteTopRatedRow",
                "Loading top rated movies..."
            )

        ]);

    }


    // --------------------------------------------------------
    // VIEW ALL BUTTONS
    // --------------------------------------------------------

    function setupViewAllButtons() {

        document
            .querySelectorAll(".view-all-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();


                        const section =
                            button.dataset.section;


                        if (
                            section === "popular"
                        ) {

                            const moviesSection =
                                document.getElementById(
                                    "movies"
                                );

                            if (moviesSection) {

                                moviesSection.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start"
                                });

                            }


                            if (
                                typeof loadPopularMovies ===
                                "function"
                            ) {

                                isPopularMode = true;
                                selectedGenre = "All";
                                favoritesOnly = false;

                                loadPopularMovies();

                            }

                        }


                        if (
                            section === "trending"
                        ) {

                            const trending =
                                document.getElementById(
                                    "trendingSection"
                                ) ||
                                findSectionByText(
                                    "Trending Now"
                                );

                            if (trending) {

                                trending.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start"
                                });

                            }

                        }


                        if (
                            section === "top-rated"
                        ) {

                            const topRated =
                                document.getElementById(
                                    "topRatedSection"
                                ) ||
                                findSectionByText(
                                    "Top Rated"
                                );

                            if (topRated) {

                                topRated.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start"
                                });

                            }

                        }

                    }
                );

            });

    }


    // --------------------------------------------------------
    // POPULAR / TRENDING / TOP RATED QUICK BUTTONS
    // --------------------------------------------------------

    function setupQuickButtons() {

        document
            .querySelectorAll(
                "[data-section]"
            )
            .forEach(button => {

                const section =
                    button.dataset.section;


                if (
                    ![
                        "popular",
                        "trending",
                        "top-rated"
                    ].includes(section)
                ) {
                    return;
                }


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        let target = null;


                        if (
                            section === "popular"
                        ) {

                            target =
                                document.getElementById(
                                    "elitePopularRow"
                                );

                        }


                        if (
                            section === "trending"
                        ) {

                            target =
                                document.getElementById(
                                    "eliteTrendingRow"
                                );

                        }


                        if (
                            section === "top-rated"
                        ) {

                            target =
                                document.getElementById(
                                    "eliteTopRatedRow"
                                );

                        }


                        if (target) {

                            target.scrollIntoView({
                                behavior: "smooth",
                                block: "center"
                            });

                        }

                    }
                );

            });

    }


    // --------------------------------------------------------
    // INITIALIZE
    // --------------------------------------------------------

    function initializeEliteSections() {

        setupEliteSections();

        setupViewAllButtons();

        setupQuickButtons();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeEliteSections
        );

    } else {

        initializeEliteSections();

    }

})
();

// ============================================================
// ELITEPLAY GENRE CATEGORY LOADER
// Clicking a genre loads that genre's movies from TMDB
// ============================================================

(function () {

    const genreCards =
        document.querySelectorAll(
            ".genre-card"
        );


    if (!genreCards.length) {
        return;
    }


    // --------------------------------------------------------
    // LOAD MOVIES BY GENRE
    // --------------------------------------------------------

    async function loadGenreMovies(
        genreName,
        genreId
    ) {

        // Main movie section
        const moviesSection =
            document.getElementById(
                "movies"
            );


        if (moviesSection) {

            moviesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }


        // Update main heading
        if (sectionTitle) {

            sectionTitle.textContent =
                `${genreName} Movies`;

        }


        // Important:
        // Stop popular infinite-scroll mode
        isPopularMode = false;


        // Reset genre
        selectedGenre =
            genreName;


        favoritesOnly =
            false;


        currentPage =
            1;

        totalPages =
            1;


        // Show loading
        showLoading();


        try {

            // ------------------------------------------------
            // Load genre movies from TMDB
            // ------------------------------------------------

            const data =
                await tmdbFetch(
                    "/discover/movie",
                    {
                        with_genres:
                            genreId,

                        page:
                            1,

                        include_adult:
                            false,

                        sort_by:
                            "popularity.desc"
                    }
                );


            currentPage =
                data.page || 1;


            totalPages =
                data.total_pages || 1;


            // ------------------------------------------------
            // Convert TMDB movies into our app format
            // ------------------------------------------------

            movies =
                (data.results || [])
                    .filter(
                        movie =>
                            movie.poster_path
                    )
                    .map(
                        movie =>
                            mergeTMDBWithSupabase(
                                movie
                            )
                    );


            // ------------------------------------------------
            // IMPORTANT
            // Display all loaded genre movies
            // ------------------------------------------------

            const oldGenre =
                selectedGenre;

            selectedGenre =
                "All";


            displayMovies();


            // Restore genre name for state
            selectedGenre =
                oldGenre;


            // Update result count
            if (resultsCount) {

                resultsCount.textContent =
                    `${movies.length} movies`;

            }


            // Update hero
            if (
                movies.length > 0
            ) {

                updateHero(
                    movies[0]
                );

            }


            updateLoadMoreButton();


        } catch (error) {

            console.error(
                "Genre movies error:",
                error
            );


            if (movieGrid) {

                movieGrid.innerHTML = `

                    <div
                        style="
                            grid-column:1/-1;
                            text-align:center;
                            padding:60px 20px;
                        "
                    >

                        <h3>
                            Unable to load ${escapeHtml(
                                genreName
                            )} movies
                        </h3>

                        <p
                            style="
                                color:#999;
                                margin-top:10px;
                            "
                        >
                            Please try again.
                        </p>

                        <button
                            type="button"
                            id="genreRetryBtn"
                            class="primary-btn"
                            style="
                                margin-top:18px;
                            "
                        >
                            Try Again
                        </button>

                    </div>

                `;


                const retryButton =
                    document.getElementById(
                        "genreRetryBtn"
                    );


                if (retryButton) {

                    retryButton.addEventListener(
                        "click",
                        () => {

                            loadGenreMovies(
                                genreName,
                                genreId
                            );

                        }
                    );

                }

            }

        }

    }


    // --------------------------------------------------------
    // CATEGORY BUTTON CLICK
    // --------------------------------------------------------

    genreCards.forEach(
        card => {

            card.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const genreName =
                        card.dataset.genre;


                    const genreId =
                        Number(
                            card.dataset.genreId
                        );


                    if (
                        !genreName ||
                        !genreId
                    ) {

                        console.error(
                            "Genre information missing:",
                            card
                        );

                        return;
                    }


                    // Remove active
                    // from all categories

                    genreCards.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    // Add active
                    // to clicked category

                    card.classList.add(
                        "active"
                    );


                    // Load movies

                    loadGenreMovies(
                        genreName,
                        genreId
                    );

                }
            );

        }
    );

})();

// ============================================================
// ELITEPLAY - WORKING CATEGORY BUTTONS
// Main Genre Buttons + Sidebar Genre Buttons
// ============================================================

(function () {

    console.log("ElitePlay category system loaded");

    // --------------------------------------------------------
    // TMDB GENRE IDs
    // --------------------------------------------------------

    const eliteGenres = {
        Action: 28,
        Adventure: 12,
        Animation: 16,
        Comedy: 35,
        Crime: 80,
        Drama: 18,
        Fantasy: 14,
        Horror: 27,
        Mystery: 9648,
        Romance: 10749,
        "Sci-Fi": 878,
        Thriller: 53
    };


    // --------------------------------------------------------
    // LOAD CATEGORY MOVIES
    // --------------------------------------------------------

    async function eliteLoadGenre(genreName, genreId) {

        console.log(
            "Loading genre:",
            genreName,
            genreId
        );

        // Scroll to movies
        const moviesSection =
            document.getElementById("movies");

        if (moviesSection) {
            moviesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


        // Update heading
        if (typeof sectionTitle !== "undefined" && sectionTitle) {
            sectionTitle.textContent =
                `${genreName} Movies`;
        }


        // Important:
        // Do not let displayMovies() filter these movies again.
        if (typeof selectedGenre !== "undefined") {
            selectedGenre = "All";
        }

        if (typeof favoritesOnly !== "undefined") {
            favoritesOnly = false;
        }

        if (typeof isPopularMode !== "undefined") {
            isPopularMode = false;
        }


        // Show loading
        if (typeof showLoading === "function") {
            showLoading();
        }


        try {

            const data = await tmdbFetch(
                "/discover/movie",
                {
                    with_genres: genreId,
                    page: 1,
                    sort_by: "popularity.desc",
                    include_adult: false
                }
            );


            const results =
                (data.results || [])
                    .filter(movie => movie.poster_path)
                    .map(movie => {

                        if (
                            typeof mergeTMDBWithSupabase ===
                            "function"
                        ) {
                            return mergeTMDBWithSupabase(movie);
                        }

                        return movie;
                    })
                    .filter(Boolean);


            // Convert data if needed
            if (typeof movies !== "undefined") {

                movies = results.map(movie => {

                    if (movie.genre) {
                        return movie;
                    }

                    return {
                        ...movie,

                        id:
                            movie.id ||
                            movie.tmdbId,

                        tmdbId:
                            movie.tmdbId ||
                            movie.id,

                        title:
                            movie.title ||
                            "Untitled",

                        year:
                            movie.release_date
                                ? movie.release_date.slice(0, 4)
                                : movie.year || "N/A",

                        rating:
                            Number(
                                movie.vote_average ||
                                movie.rating ||
                                0
                            ).toFixed(1),

                        genre:
                            genreName,

                        poster:
                            movie.poster ||
                            (
                                movie.poster_path
                                    ? getTMDBImage(
                                        movie.poster_path,
                                        TMDB_POSTER_SIZE
                                    )
                                    : ""
                            ),

                        backdrop:
                            movie.backdrop ||
                            (
                                movie.backdrop_path
                                    ? getTMDBImage(
                                        movie.backdrop_path,
                                        TMDB_BACKDROP_SIZE
                                    )
                                    : ""
                            ),

                        description:
                            movie.overview ||
                            movie.description ||
                            "No description available."
                    };

                });

            }


            // Display movies
            if (typeof displayMovies === "function") {
                displayMovies();
            }


            // Update result count
            if (typeof resultsCount !== "undefined" &&
                resultsCount) {

                resultsCount.textContent =
                    `${results.length} movies`;
            }


            console.log(
                `${genreName}:`,
                results.length,
                "movies loaded"
            );


        } catch (error) {

            console.error(
                `Failed to load ${genreName}:`,
                error
            );

            if (typeof showError === "function") {

                showError(
                    `Could not load ${genreName} movies.`
                );
            }

        }

    }


    // --------------------------------------------------------
    // MAIN PAGE GENRE BUTTONS
    // --------------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".genre-card"
                );

            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            const genreName =
                button.dataset.genre;

            const genreId =
                Number(
                    button.dataset.genreId
                ) ||
                eliteGenres[genreName];


            if (!genreName || !genreId) {

                console.error(
                    "Genre information missing:",
                    button
                );

                return;
            }


            console.log(
                "MAIN GENRE CLICK:",
                genreName,
                genreId
            );


            // Active state
            document
                .querySelectorAll(".genre-card")
                .forEach(btn => {
                    btn.classList.remove("active");
                });

            button.classList.add("active");


            eliteLoadGenre(
                genreName,
                genreId
            );

        },
        true
    );


    // --------------------------------------------------------
    // SIDEBAR GENRE BUTTONS
    // --------------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".sidebar-genre"
                );

            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            const genreName =
                button.dataset.genre;

            const genreId =
                Number(
                    button.dataset.genreId
                ) ||
                eliteGenres[genreName];


            if (!genreName || !genreId) {

                console.error(
                    "Sidebar genre information missing:",
                    button
                );

                return;
            }


            console.log(
                "SIDEBAR GENRE CLICK:",
                genreName,
                genreId
            );


            // Active state
            document
                .querySelectorAll(".sidebar-genre")
                .forEach(btn => {
                    btn.classList.remove("active");
                });

            button.classList.add("active");


            eliteLoadGenre(
                genreName,
                genreId
            );

        },
        true
    );


    // --------------------------------------------------------
    // SIDEBAR MAIN OPTIONS
    // --------------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".sidebar-item"
                );

            if (!button) {
                return;
            }


            event.preventDefault();


            const action =
                button.dataset.action;


            console.log(
                "Sidebar action:",
                action
            );


            if (action === "home") {

                if (typeof loadPopularMovies === "function") {

                    selectedGenre = "All";
                    favoritesOnly = false;
                    isPopularMode = true;

                    loadPopularMovies();
                }

                return;
            }


            if (action === "popular") {

                if (typeof loadPopularMovies === "function") {

                    selectedGenre = "All";
                    favoritesOnly = false;
                    isPopularMode = true;

                    sectionTitle.textContent =
                        "Popular Movies";

                    loadPopularMovies();
                }

                return;
            }


            if (action === "favorites") {

                if (
                    typeof showFavoritesPage ===
                    "function"
                ) {
                    showFavoritesPage();
                }

                return;
            }


            if (action === "movies") {

                if (typeof loadPopularMovies === "function") {

                    selectedGenre = "All";
                    favoritesOnly = false;
                    isPopularMode = true;

                    sectionTitle.textContent =
                        "All Movies";

                    loadPopularMovies();
                }

                return;
            }

        },
        true
    );


    // --------------------------------------------------------
    // EXPLORE MOVIES BUTTON
    // --------------------------------------------------------

    const exploreBtn =
        document.getElementById(
            "exploreBtn"
        );

    if (exploreBtn) {

        exploreBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const moviesSection =
                    document.getElementById(
                        "movies"
                    );

                if (moviesSection) {

                    moviesSection.scrollIntoView({
                        behavior: "smooth"
                    });

                }

            }
        );

    }


})();
// ===========================================



// ============================================================
// ELITEPLAY NETFLIX-STYLE LIVE SEARCH
// ============================================================

(function () {

    const searchInput = document.getElementById("searchInput");

    if (!searchInput) {
        console.error("ElitePlay: #searchInput not found.");
        return;
    }

    let liveSearchTimer = null;
    let liveSearchRequest = 0;

    // ------------------------------------------------------------
    // CREATE SEARCH DROPDOWN
    // ------------------------------------------------------------

    const searchBox = searchInput.closest(".search-box");

    if (!searchBox) {
        console.error("ElitePlay: .search-box not found.");
        return;
    }

    let searchSuggestions = document.getElementById(
        "eliteSearchSuggestions"
    );

    if (!searchSuggestions) {

        searchSuggestions = document.createElement("div");

        searchSuggestions.id = "eliteSearchSuggestions";

        searchSuggestions.className =
            "elite-search-suggestions";

        searchBox.appendChild(searchSuggestions);
    }


    // ------------------------------------------------------------
    // ESCAPE HTML
    // ------------------------------------------------------------

    function safeText(value) {

        if (typeof escapeHtml === "function") {
            return escapeHtml(String(value ?? ""));
        }

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ------------------------------------------------------------
    // GET SUGGESTIONS
    // ------------------------------------------------------------

    async function getLiveSuggestions(query) {

        const requestId = ++liveSearchRequest;

        try {

            searchSuggestions.innerHTML = `
                <div class="search-loading">
                    <span class="search-spinner"></span>
                    Searching...
                </div>
            `;

            searchSuggestions.classList.add("show");


            const data = await tmdbFetch(
                "/search/movie",
                {
                    query: query,
                    page: 1,
                    include_adult: false
                }
            );


            // Ignore old requests
            if (requestId !== liveSearchRequest) {
                return;
            }


            const results = (data.results || [])
                .filter(movie => movie.poster_path)
                .slice(0, 6)
                .map(movie =>
                    mergeTMDBWithSupabase(movie)
                );


            if (!results.length) {

                searchSuggestions.innerHTML = `
                    <div class="search-no-results">
                        No movies found for
                        <strong>${safeText(query)}</strong>
                    </div>
                `;

                return;
            }


            searchSuggestions.innerHTML = "";


            results.forEach(movie => {

                const item =
                    document.createElement("button");

                item.type = "button";

                item.className =
                    "elite-search-result";


                const year =
                    movie.year || "N/A";

                const rating =
                    movie.rating || "N/A";


                item.innerHTML = `

                    <img
                        src="${safeText(movie.poster || "")}"
                        alt="${safeText(movie.title)}"
                        class="elite-search-poster"
                    >

                    <div class="elite-search-info">

                        <div class="elite-search-title">
                            ${safeText(movie.title)}
                        </div>

                        <div class="elite-search-meta">

                            <span>
                                ${safeText(year)}
                            </span>

                            <span>•</span>

                            <span>
                                ⭐ ${safeText(rating)}
                            </span>

                        </div>

                    </div>

                `;


                // ------------------------------------------------
                // OPEN MOVIE DETAILS
                // ------------------------------------------------

                item.addEventListener("click", () => {

                    searchInput.value = movie.title;

                    searchSuggestions.classList.remove("show");

                    if (typeof openMovieDetails === "function") {
                        openMovieDetails(movie);
                    }

                });


                searchSuggestions.appendChild(item);

            });


            // ------------------------------------------------
            // VIEW ALL RESULTS
            // ------------------------------------------------

            const viewAll =
                document.createElement("button");

            viewAll.type = "button";

            viewAll.className =
                "elite-search-view-all";

            viewAll.innerHTML = `
                View all results for
                <strong>"${safeText(query)}"</strong>
                <span>→</span>
            `;


            viewAll.addEventListener("click", () => {

                performFullSearch(query);

            });


            searchSuggestions.appendChild(viewAll);


        } catch (error) {

            console.error(
                "ElitePlay live search error:",
                error
            );


            searchSuggestions.innerHTML = `
                <div class="search-no-results">
                    Search is temporarily unavailable.
                </div>
            `;
        }
    }


    // ------------------------------------------------------------
    // FULL SEARCH
    // ENTER
    // ------------------------------------------------------------

    async function performFullSearch(query) {

        query = String(query || "").trim();

        if (!query) {
            return;
        }


        searchSuggestions.classList.remove("show");

        searchInput.blur();


        isPopularMode = false;

        selectedGenre = "All";

        favoritesOnly = false;


        if (typeof updateLoadMoreButton === "function") {
            updateLoadMoreButton();
        }


        showLoading();


        try {

            console.log(
                "ElitePlay full search:",
                query
            );


            const data = await tmdbFetch(
                "/search/movie",
                {
                    query: query,
                    page: 1,
                    include_adult: false
                }
            );


            movies = (data.results || [])
                .map(movie =>
                    mergeTMDBWithSupabase(movie)
                )
                .filter(Boolean);


            sectionTitle.textContent =
                `Search Results for "${query}"`;


            displayMovies();


            if (typeof updateLoadMoreButton === "function") {
                updateLoadMoreButton();
            }


            // Scroll to movie results

            const moviesSection =
                document.getElementById("movies");

            if (moviesSection) {

                setTimeout(() => {

                    moviesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }, 100);

            }


        } catch (error) {

            console.error(
                "ElitePlay full search error:",
                error
            );


            // Supabase fallback

            try {

                const {
                    data,
                    error: supabaseError
                } =
                    await supabaseClient
                        .from("movies")
                        .select("*")
                        .ilike(
                            "title",
                            `%${query}%`
                        )
                        .order(
                            "id",
                            {
                                ascending: false
                            }
                        );


                if (supabaseError) {
                    throw supabaseError;
                }


                movies = (data || [])
                    .map(movie =>
                        formatSupabaseMovie(movie)
                    );


                sectionTitle.textContent =
                    `Search Results for "${query}"`;


                displayMovies();


            } catch (fallbackError) {

                console.error(
                    "ElitePlay fallback search error:",
                    fallbackError
                );


                showError(
                    "Movie search failed. Please try again."
                );

            }

        }

    }


    // ------------------------------------------------------------
    // INPUT EVENT
    // ------------------------------------------------------------

    searchInput.addEventListener(
        "input",
        function () {

            clearTimeout(liveSearchTimer);


            const query =
                this.value.trim();


            // Empty search

            if (!query) {

                searchSuggestions.classList.remove(
                    "show"
                );

                isPopularMode = true;

                selectedGenre = "All";

                favoritesOnly = false;

                sectionTitle.textContent =
                    "Popular Movies";


                loadPopularMovies();

                return;
            }


            // Don't search for 1 character

            if (query.length < 2) {

                searchSuggestions.classList.remove(
                    "show"
                );

                return;
            }


            // Wait while user types

            liveSearchTimer = setTimeout(() => {

                getLiveSuggestions(query);

            }, 350);

        }
    );


    // ------------------------------------------------------------
    // ENTER KEY
    // ------------------------------------------------------------

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();


                const query =
                    this.value.trim();


                if (!query) {
                    return;
                }


                clearTimeout(
                    liveSearchTimer
                );


                performFullSearch(query);

            }


            // Escape

            if (event.key === "Escape") {

                searchSuggestions.classList.remove(
                    "show"
                );

                searchInput.blur();

            }

        }
    );


    // ------------------------------------------------------------
    // CLICK OUTSIDE
    // ------------------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            if (
                !searchBox.contains(event.target)
            ) {

                searchSuggestions.classList.remove(
                    "show"
                );

            }

        }
    );


    // ------------------------------------------------------------
    // FOCUS SEARCH AGAIN
    // ------------------------------------------------------------

    searchInput.addEventListener(
        "focus",
        function () {

            const query =
                this.value.trim();


            if (query.length >= 2) {

                getLiveSuggestions(query);

            }

        }
    );


})();

/* =========================================================
   ELITEPLAY PREMIUM HEADER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const navbar = document.querySelector(".elite-navbar");
    const homeLogo = document.getElementById("homeLogo");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.getElementById("sidebar");

    const headerFavoritesBtn =
        document.getElementById("headerFavoritesBtn");

    const notificationBtn =
        document.getElementById("notificationBtn");

    const profileBtn =
        document.getElementById("profileBtn");


    /* =====================================================
       NAVBAR SCROLL EFFECT
    ===================================================== */

    function updateNavbar() {

        if (!navbar) return;

        if (window.scrollY > 20) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", updateNavbar);

    updateNavbar();


    /* =====================================================
       HOME LOGO
    ===================================================== */

    if (homeLogo) {

        homeLogo.addEventListener("click", (event) => {

            event.preventDefault();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            setActiveNav("home");

        });

    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    const navLinks =
        document.querySelectorAll(".elite-nav-link[data-nav]");


    function setActiveNav(section) {

        navLinks.forEach(link => {

            link.classList.remove("active");

            if (link.dataset.nav === section) {
                link.classList.add("active");
            }

        });

    }


    navLinks.forEach(link => {

        link.addEventListener("click", (event) => {

            const section =
                link.dataset.nav;

            if (section === "home") {

                event.preventDefault();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                setActiveNav("home");

                return;
            }


            if (section === "movies") {

                event.preventDefault();

                const movies =
                    document.getElementById("movies");

                if (movies) {

                    movies.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                setActiveNav("movies");

                return;
            }


            if (section === "trending") {

                event.preventDefault();

                const trending =
                    document.getElementById("trendingSection");

                if (trending) {

                    trending.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                setActiveNav("trending");

                return;
            }


            if (section === "popular") {

                event.preventDefault();

                const popular =
                    document.getElementById("popularSection");

                if (popular) {

                    popular.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                setActiveNav("popular");

            }

        });

    });


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    if (mobileMenuBtn && sidebar) {

        mobileMenuBtn.addEventListener("click", () => {

            sidebar.classList.toggle("open");

            mobileMenuBtn.classList.toggle("open");

        });


        /* Close sidebar after selecting item */

        sidebar.addEventListener("click", (event) => {

            const clicked =
                event.target.closest(
                    ".sidebar-link, .sidebar-genre"
                );

            if (!clicked) return;

            sidebar.classList.remove("open");

            mobileMenuBtn.classList.remove("open");

        });

    }


    /* =====================================================
       MY LIST
    ===================================================== */

    if (headerFavoritesBtn) {

        headerFavoritesBtn.addEventListener("click", () => {

            const favorites =
                document.getElementById("sidebarFavorites");

            if (favorites) {

                favorites.click();

            }

        });

    }


    /* =====================================================
       NOTIFICATION
    ===================================================== */

    if (notificationBtn) {

        notificationBtn.addEventListener("click", () => {

            showEliteNotification(
                "You're all caught up! 🎬",
                "No new notifications right now."
            );

        });

    }


    /* =====================================================
       PROFILE
    ===================================================== */

    if (profileBtn) {

        profileBtn.addEventListener("click", () => {

            showEliteNotification(
                "Welcome to ElitePlay 👋",
                "Your personal movie space."
            );

        });

    }


    /* =====================================================
       CUSTOM NOTIFICATION
    ===================================================== */

    function showEliteNotification(title, message) {

        const old =
            document.querySelector(".elite-toast");

        if (old) {
            old.remove();
        }


        const toast =
            document.createElement("div");

        toast.className = "elite-toast";

        toast.innerHTML = `
            <div class="elite-toast-icon">✦</div>

            <div>
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
        `;


        document.body.appendChild(toast);


        requestAnimationFrame(() => {

            toast.classList.add("show");

        });


        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 300);

        }, 3000);

    }

});

/* =========================================
   HEADER NOTIFICATION + PROFILE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const notificationBtn = document.getElementById("notificationBtn");
    const notificationPanel = document.getElementById("notificationPanel");
    const closeNotificationPanel =
        document.getElementById("closeNotificationPanel");

    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");

    const profileFavorites =
        document.getElementById("profileFavorites");

    const profileHistory =
        document.getElementById("profileHistory");

    const profileContinue =
        document.getElementById("profileContinue");

    const profileClose =
        document.getElementById("profileClose");


    /* =========================================
       NOTIFICATION BUTTON
    ========================================= */

    if (notificationBtn && notificationPanel) {

        notificationBtn.addEventListener("click", (event) => {

            event.stopPropagation();

            const isOpen =
                notificationPanel.classList.contains("show");

            // Close profile menu
            if (profileMenu) {
                profileMenu.classList.remove("show");
            }

            if (profileBtn) {
                profileBtn.classList.remove("active");
            }

            // Toggle notification panel
            notificationPanel.classList.toggle("show", !isOpen);

            notificationBtn.classList.toggle("active", !isOpen);
        });
    }


    /* =========================================
       CLOSE NOTIFICATION
    ========================================= */

    if (closeNotificationPanel) {

        closeNotificationPanel.addEventListener("click", () => {

            notificationPanel.classList.remove("show");
            notificationBtn.classList.remove("active");

        });

    }


    /* =========================================
       PROFILE BUTTON
    ========================================= */

    if (profileBtn && profileMenu) {

        profileBtn.addEventListener("click", (event) => {

            event.stopPropagation();

            const isOpen =
                profileMenu.classList.contains("show");

            // Close notification
            if (notificationPanel) {
                notificationPanel.classList.remove("show");
            }

            if (notificationBtn) {
                notificationBtn.classList.remove("active");
            }

            // Toggle profile menu
            profileMenu.classList.toggle("show", !isOpen);

            profileBtn.classList.toggle("active", !isOpen);

        });

    }


    /* =========================================
       MY FAVORITES
    ========================================= */

    if (profileFavorites) {

        profileFavorites.addEventListener("click", () => {

            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");

            const favoritesBtn =
                document.getElementById("sidebarFavorites");

            if (favoritesBtn) {
                favoritesBtn.click();
            }

        });

    }


    /* =========================================
       WATCH HISTORY
    ========================================= */

    if (profileHistory) {

        profileHistory.addEventListener("click", () => {

            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");

            const historyBtn =
                document.getElementById("sidebarHistory");

            if (historyBtn) {
                historyBtn.click();
            }

        });

    }


    /* =========================================
       CONTINUE WATCHING
    ========================================= */

    if (profileContinue) {

        profileContinue.addEventListener("click", () => {

            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");

            const continueBtn =
                document.getElementById("sidebarContinue");

            if (continueBtn) {
                continueBtn.click();
            }

        });

    }


    /* =========================================
       CLOSE PROFILE
    ========================================= */

    if (profileClose) {

        profileClose.addEventListener("click", () => {

            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");

        });

    }


    /* =========================================
       CLICK OUTSIDE
    ========================================= */

    document.addEventListener("click", (event) => {

        if (
            notificationPanel &&
            notificationBtn &&
            !notificationPanel.contains(event.target) &&
            !notificationBtn.contains(event.target)
        ) {

            notificationPanel.classList.remove("show");
            notificationBtn.classList.remove("active");

        }


        if (
            profileMenu &&
            profileBtn &&
            !profileMenu.contains(event.target) &&
            !profileBtn.contains(event.target)
        ) 
        {

            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");

        }

    });

});

/* =========================================
   ELITE INFO CARDS
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const infoCards = document.querySelectorAll(".elite-info-card");

    infoCards.forEach((card) => {

        card.addEventListener("click", () => {

            const action = card.dataset.action;


            /* =================================
               DISCOVER MOVIES
            ================================= */

            if (action === "discover") {

                const moviesSection =
                    document.getElementById("movies");

                if (moviesSection) {

                    moviesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }


            /* =================================
               SAVE FAVORITES
            ================================= */

            if (action === "favorites") {

                const favoritesButton =
                    document.getElementById("sidebarFavorites");

                if (favoritesButton) {

                    favoritesButton.click();

                }

                return;
            }


            /* =================================
               KEEP EXPLORING
            ================================= */

            if (action === "explore") {

                const loadMoreButton =
                    document.getElementById("loadMoreBtn");

                if (loadMoreButton) {

                    loadMoreButton.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    setTimeout(() => {

                        loadMoreButton.click();

                    }, 400);

                }

                return;
            }

        });

    });

});

/* =========================================
   ELITEPLAY SCROLL REVEAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const animatedElements = document.querySelectorAll(
        ".content-section, .movies-section, .genre-explore, .elite-info, .quick-section"
    );

    if (!animatedElements.length) return;


    animatedElements.forEach((element) => {
        element.classList.add("elite-scroll-hidden");
    });


    const observer = new IntersectionObserver(
        (entries, observer) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("elite-scroll-show");

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -50px 0px"
        }
    );


    animatedElements.forEach((element) => {
        observer.observe(element);
    });

});

/* =========================================
   FOOTER NAVIGATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const footerButtons =
        document.querySelectorAll(".footer-action");


    footerButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const action =
                button.dataset.footerAction;


            /* ==============================
               POPULAR
            ============================== */

            if (action === "popular") {

                const popularButton =
                    document.querySelector(
                        '[data-section="popular"]'
                    );

                if (popularButton) {
                    popularButton.click();
                }

                const popularSection =
                    document.getElementById("popularSection");

                if (popularSection) {

                    popularSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }


            /* ==============================
               TRENDING
            ============================== */

            if (action === "trending") {

                const trendingButton =
                    document.querySelector(
                        '[data-section="trending"]'
                    );

                if (trendingButton) {
                    trendingButton.click();
                }

                const trendingSection =
                    document.getElementById("trendingSection");

                if (trendingSection) {

                    trendingSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }


            /* ==============================
               TOP RATED
            ============================== */

            if (action === "top-rated") {

                const topRatedButton =
                    document.querySelector(
                        '[data-section="top-rated"]'
                    );

                if (topRatedButton) {
                    topRatedButton.click();
                }

                const topRatedSection =
                    document.getElementById("topRatedSection");

                if (topRatedSection) {

                    topRatedSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }


            /* ==============================
               GENRES
            ============================== */

            if (action === "genres") {

                const genreSection =
                    document.querySelector(".genre-explore");

                if (genreSection) {

                    genreSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }

        });

    });

});
document.addEventListener("DOMContentLoaded", () => {

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");

    if (!mobileMenuBtn || !sidebar) return;

    mobileMenuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

});

/* =========================================================
   ELITEPLAY HERO MOVIE SLIDER
========================================================= */

(function initEliteHeroSlider() {

    const hero = document.getElementById("hero");
    const heroSlider = document.getElementById("heroSlider");
    const heroTitle = document.getElementById("heroTitle");
    const heroMeta = document.getElementById("heroMeta");
    const heroDescription = document.getElementById("heroDescription");
    const heroDots = document.getElementById("heroDots");

    const heroPrev = document.getElementById("heroPrev");
    const heroNext = document.getElementById("heroNext");

    const heroCurrent = document.getElementById("heroCurrent");
    const heroTotal = document.getElementById("heroTotal");

    const heroContent = document.getElementById("heroContent");

    if (!hero || !heroSlider) {
        console.warn("ElitePlay Hero Slider: Hero element not found.");
        return;
    }

    let heroMovies = [];
    let heroIndex = 0;
    let heroTimer = null;

    const HERO_INTERVAL = 5000;


    /* ---------------------------------------------------------
       CREATE HERO SLIDES
    --------------------------------------------------------- */

    function createHeroSlider(movieList) {

        if (!movieList || !movieList.length) {
            return;
        }

        heroMovies = movieList
            .filter(movie => movie && movie.backdrop)
            .slice(0, 10);

        if (!heroMovies.length) {
            return;
        }

        heroSlider.innerHTML = "";
        heroDots.innerHTML = "";

        heroTotal.textContent =
            String(heroMovies.length).padStart(2, "0");


        heroMovies.forEach((movie, index) => {

            /* Background slide */

            const slide =
                document.createElement("div");

            slide.className = "hero-slide";

            if (index === 0) {
                slide.classList.add("active");
            }

            slide.style.backgroundImage =
                `url("${movie.backdrop}")`;

            slide.setAttribute(
                "aria-label",
                movie.title || "Movie"
            );

            heroSlider.appendChild(slide);


            /* Dot */

            const dot =
                document.createElement("button");

            dot.type = "button";

            dot.className = "hero-dot";

            if (index === 0) {
                dot.classList.add("active");
            }

            dot.setAttribute(
                "aria-label",
                `Show ${movie.title || "movie"}`
            );

            dot.addEventListener(
                "click",
                () => {

                    goToHeroSlide(index);

                    restartHeroTimer();

                }
            );

            heroDots.appendChild(dot);

        });


        heroIndex = 0;

        updateHeroContent();

        startHeroTimer();
    }


    /* ---------------------------------------------------------
       UPDATE HERO CONTENT
    --------------------------------------------------------- */

    function updateHeroContent() {

        const movie =
            heroMovies[heroIndex];

        if (!movie) {
            return;
        }


        /*
         * Restart text animation
         */

        if (heroContent) {

            heroContent.classList.remove(
                "hero-changing"
            );

            void heroContent.offsetWidth;

            heroContent.classList.add(
                "hero-changing"
            );
        }


        /* Title */

        if (heroTitle) {

            heroTitle.textContent =
                movie.title || "Untitled";
        }


        /* Meta */

        if (heroMeta) {

            heroMeta.innerHTML = `
                <span>⭐ ${movie.rating || "N/A"}</span>

                <span>${movie.year || "N/A"}</span>

                <span class="tag">
                    ${movie.genre || "Featured"}
                </span>
            `;
        }


        /* Description */

        if (heroDescription) {

            const description =
                movie.description ||
                "Discover this movie on ElitePlay.";

            heroDescription.textContent =
                description.length > 190
                    ? description.substring(0, 187) + "..."
                    : description;
        }


        /* Current counter */

        if (heroCurrent) {

            heroCurrent.textContent =
                String(heroIndex + 1).padStart(2, "0");
        }
    }


    /* ---------------------------------------------------------
       GO TO SLIDE
    --------------------------------------------------------- */

    function goToHeroSlide(index) {

        if (!heroMovies.length) {
            return;
        }

        const slides =
            heroSlider.querySelectorAll(
                ".hero-slide"
            );

        const dots =
            heroDots.querySelectorAll(
                ".hero-dot"
            );


        slides.forEach(slide => {

            slide.classList.remove("active");

        });


        dots.forEach(dot => {

            dot.classList.remove("active");

        });


        heroIndex =
            (index + heroMovies.length)
            % heroMovies.length;


        if (slides[heroIndex]) {

            slides[heroIndex]
                .classList.add("active");
        }


        if (dots[heroIndex]) {

            dots[heroIndex]
                .classList.add("active");
        }


        updateHeroContent();
    }


    /* ---------------------------------------------------------
       NEXT
    --------------------------------------------------------- */

    function nextHeroSlide() {

        goToHeroSlide(
            heroIndex + 1
        );

    }


    /* ---------------------------------------------------------
       PREVIOUS
    --------------------------------------------------------- */

    function previousHeroSlide() {

        goToHeroSlide(
            heroIndex - 1
        );

    }


    /* ---------------------------------------------------------
       AUTO SLIDE
    --------------------------------------------------------- */

    function startHeroTimer() {

        clearInterval(heroTimer);

        heroTimer =
            setInterval(
                nextHeroSlide,
                HERO_INTERVAL
            );
    }


    function stopHeroTimer() {

        clearInterval(heroTimer);

    }


    function restartHeroTimer() {

        stopHeroTimer();

        startHeroTimer();

    }


    /* ---------------------------------------------------------
       BUTTONS
    --------------------------------------------------------- */

    if (heroNext) {

        heroNext.addEventListener(
            "click",
            () => {

                nextHeroSlide();

                restartHeroTimer();

            }
        );
    }


    if (heroPrev) {

        heroPrev.addEventListener(
            "click",
            () => {

                previousHeroSlide();

                restartHeroTimer();

            }
        );
    }


    /* ---------------------------------------------------------
       PAUSE WHEN MOUSE IS OVER HERO
    --------------------------------------------------------- */

    hero.addEventListener(
        "mouseenter",
        stopHeroTimer
    );


    hero.addEventListener(
        "mouseleave",
        startHeroTimer
    );


    /* ---------------------------------------------------------
       MOBILE TOUCH SWIPE
    --------------------------------------------------------- */

    let touchStartX = 0;
    let touchEndX = 0;


    hero.addEventListener(
        "touchstart",
        event => {

            touchStartX =
                event.changedTouches[0].screenX;

        },
        { passive: true }
    );


    hero.addEventListener(
        "touchend",
        event => {

            touchEndX =
                event.changedTouches[0].screenX;

            const difference =
                touchStartX - touchEndX;


            if (Math.abs(difference) < 50) {
                return;
            }


            if (difference > 0) {

                nextHeroSlide();

            } else {

                previousHeroSlide();

            }

            restartHeroTimer();

        },
        { passive: true }
    );


    /* ---------------------------------------------------------
       CONNECT TO EXISTING TMDB MOVIES
    --------------------------------------------------------- */

    function waitForMovies() {

        if (
            typeof movies !== "undefined" &&
            Array.isArray(movies) &&
            movies.length > 0
        ) {

            const moviesWithBackdrops =
                movies.filter(
                    movie =>
                        movie &&
                        movie.backdrop
                );

            if (moviesWithBackdrops.length > 0) {

                createHeroSlider(
                    moviesWithBackdrops
                );

                return;
            }
        }


        setTimeout(
            waitForMovies,
            500
        );
    }


    waitForMovies();


    /* ---------------------------------------------------------
       EXPOSE SLIDER
       So existing updateHero() can also refresh it.
    --------------------------------------------------------- */

    window.EliteHeroSlider = {

        setMovies(movieList) {

            createHeroSlider(
                movieList
            );

        },

        next() {

            nextHeroSlide();

            restartHeroTimer();

        },

        previous() {

            previousHeroSlide();

            restartHeroTimer();

        }

    };

})();

/* =========================================
   HERO SLIDER MOVIE CLICK
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const heroSlider = document.getElementById("heroSlider");

    if (!heroSlider) return;

    heroSlider.addEventListener("click", (event) => {

        const slide = event.target.closest(".hero-slide");

        if (!slide) return;

        const index = Number(slide.dataset.index);

        if (!Number.isFinite(index)) return;

        // Hero slider ki movies
        const heroMovies = Array.isArray(window.EliteHeroMovies)
            ? window.EliteHeroMovies
            : (Array.isArray(window.movies) ? window.movies.filter(movie => movie.backdrop).slice(0, 10) : []);

        const movie = heroMovies[index];

        if (!movie) return;

        /* 
           Existing movie-card click system ko trigger karne ki koshish
           agar aapke current JS mein movie modal function available hai.
        */

        if (typeof window.openMovieModal === "function") {
            window.openMovieModal(movie);
            return;
        }

        if (typeof window.showMovieDetails === "function") {
            window.showMovieDetails(movie);
            return;
        }

        if (typeof window.openMovieDetails === "function") {
            window.openMovieDetails(movie);
            return;
        }

        /* =========================================
           FALLBACK:
           Directly fill existing movie modal
        ========================================= */

        const modal = document.getElementById("movieModal");
        const poster = document.getElementById("modalPoster");
        const title = document.getElementById("modalTitle");
        const meta = document.getElementById("modalMeta");
        const description = document.getElementById("modalDescription");

        if (!modal) return;

        if (poster) {
            poster.src = movie.poster || "";
            poster.alt = movie.title || "Movie poster";
        }

        if (title) {
            title.textContent = movie.title || "Untitled Movie";
        }

        if (meta) {
            meta.innerHTML = `
                <span>⭐ ${movie.rating || "N/A"}</span>
                <span>${movie.year || "N/A"}</span>
            `;
        }

        if (description) {
            description.textContent =
                movie.overview ||
                movie.description ||
                "No description available.";
        }

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    });

});
// animation background color change karne ke liye
/* =========================================================
   ELITEPLAY FLOATING NETWORK BACKGROUND
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("eliteBackground");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;

    let particles = [];

    let mouse = {
        x: null,
        y: null
    };


    /* =========================================
       SETTINGS
    ========================================= */

    const settings = {
        particleCount: window.innerWidth <= 768 ? 35 : 70,

        connectionDistance: 150,

        particleSpeed: 0.25,

        mouseDistance: 180
    };


    /* =========================================
       RESIZE
    ========================================= */

    function resizeCanvas() {

        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;

        particles = [];

        createParticles();
    }


    /* =========================================
       PARTICLE
    ========================================= */

    class Particle {

        constructor() {

            this.x = Math.random() * width;
            this.y = Math.random() * height;

            this.size = Math.random() * 2.5 + 1;

            this.vx =
                (Math.random() - 0.5) *
                settings.particleSpeed;

            this.vy =
                (Math.random() - 0.5) *
                settings.particleSpeed;

            this.square =
                Math.random() > 0.72;
        }


        update() {

            this.x += this.vx;
            this.y += this.vy;


            /* Screen wrap */

            if (this.x < -20) {
                this.x = width + 20;
            }

            if (this.x > width + 20) {
                this.x = -20;
            }

            if (this.y < -20) {
                this.y = height + 20;
            }

            if (this.y > height + 20) {
                this.y = -20;
            }


            /* Mouse interaction */

            if (mouse.x !== null && mouse.y !== null) {

                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;

                const distance =
                    Math.sqrt(dx * dx + dy * dy);

                if (distance < settings.mouseDistance) {

                    const force =
                        (settings.mouseDistance - distance)
                        / settings.mouseDistance;

                    this.x +=
                        (dx / distance) *
                        force *
                        0.5;

                    this.y +=
                        (dy / distance) *
                        force *
                        0.5;
                }
            }
        }


        draw() {

            ctx.save();

            ctx.shadowBlur = 8;
            ctx.shadowColor =
                "rgba(167,139,250,0.65)";

            ctx.strokeStyle =
                "rgba(167,139,250,0.65)";

            ctx.fillStyle =
                "rgba(167,139,250,0.75)";


            if (this.square) {

                const size = this.size * 4;

                ctx.strokeRect(
                    this.x - size / 2,
                    this.y - size / 2,
                    size,
                    size
                );

            } else {

                ctx.beginPath();

                ctx.arc(
                    this.x,
                    this.y,
                    this.size,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }

            ctx.restore();
        }
    }


    /* =========================================
       CREATE PARTICLES
    ========================================= */

    function createParticles() {

        for (
            let i = 0;
            i < settings.particleCount;
            i++
        ) {

            particles.push(
                new Particle()
            );
        }
    }


    /* =========================================
       CONNECT PARTICLES
    ========================================= */

    function connectParticles() {

        for (
            let i = 0;
            i < particles.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < particles.length;
                j++
            ) {

                const p1 = particles[i];
                const p2 = particles[j];

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;

                const distance =
                    Math.sqrt(dx * dx + dy * dy);


                if (
                    distance <
                    settings.connectionDistance
                ) {

                    const opacity =
                        1 -
                        distance /
                        settings.connectionDistance;


                    ctx.beginPath();

                    ctx.moveTo(
                        p1.x,
                        p1.y
                    );

                    ctx.lineTo(
                        p2.x,
                        p2.y
                    );

                    ctx.strokeStyle =
                        `rgba(139,92,246,${opacity * 0.25})`;

                    ctx.lineWidth = 0.7;

                    ctx.stroke();
                }
            }
        }
    }


    /* =========================================
       ANIMATION
    ========================================= */

    function animate() {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        particles.forEach(particle => {

            particle.update();

        });


        connectParticles();


        particles.forEach(particle => {

            particle.draw();

        });


        requestAnimationFrame(animate);
    }


    /* =========================================
       MOUSE
    ========================================= */

    window.addEventListener(
        "mousemove",
        event => {

            mouse.x = event.clientX;
            mouse.y = event.clientY;

        },
        { passive: true }
    );


    window.addEventListener(
        "mouseleave",
        () => {

            mouse.x = null;
            mouse.y = null;

        }
    );


    /* =========================================
       RESIZE
    ========================================= */

    window.addEventListener(
        "resize",
        resizeCanvas
    );


    /* =========================================
       START
    ========================================= */

    resizeCanvas();

    animate();

});

/* =========================================
   ELITEPLAY - MY LIBRARY BUTTONS
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const favoritesBtn = document.getElementById("sidebarFavorites");
    const historyBtn = document.getElementById("sidebarHistory");
    const continueBtn = document.getElementById("sidebarContinue");

    function setActive(button) {
        document.querySelectorAll("#sidebar .sidebar-link")
            .forEach(btn => btn.classList.remove("active"));

        if (button) {
            button.classList.add("active");
        }
    }


    /* ================================
       MY FAVORITES
    ================================= */

    if (favoritesBtn) {

        favoritesBtn.addEventListener("click", function (e) {

            e.preventDefault();
            e.stopPropagation();

            setActive(favoritesBtn);

            /* Existing favorites function */
            if (typeof showFavorites === "function") {
                showFavorites();
                return;
            }

            if (typeof displayFavorites === "function") {
                displayFavorites();
                return;
            }

            /* Fallback */
            const favoriteMovies =
                JSON.parse(
                    localStorage.getItem("cineverseFavorites") || "[]"
                );

            if (typeof movies !== "undefined") {

                const savedMovies = movies.filter(movie =>
                    favoriteMovies.includes(movie.id)
                );

                if (typeof displayMovies === "function") {
                    displayMovies(savedMovies);
                }
            }

        });
    }


    /* ================================
       WATCH HISTORY
    ================================= */

    if (historyBtn) {

        historyBtn.addEventListener("click", function (e) {

            e.preventDefault();
            e.stopPropagation();

            setActive(historyBtn);

            if (typeof showHistory === "function") {
                showHistory();
                return;
            }

            if (typeof displayHistory === "function") {
                displayHistory();
                return;
            }

            console.log("Watch History clicked");

        });
    }


    /* ================================
       CONTINUE WATCHING
    ================================= */

    if (continueBtn) {

        continueBtn.addEventListener("click", function (e) {

            e.preventDefault();
            e.stopPropagation();

            setActive(continueBtn);

            if (typeof showContinueWatching === "function") {
                showContinueWatching();
                return;
            }

            if (typeof displayContinueWatching === "function") {
                displayContinueWatching();
                return;
            }

            console.log("Continue Watching clicked");

        });
    }

});
// ------------------
/* =========================================================
   ELITEPLAY HERO SLIDER - CORRECT MOVIE CLICK FIX
   Paste this code at the VERY END of moviebox-updated.js
========================================================= */

(function () {

    "use strict";

    console.log("ElitePlay Hero Click Fix Loaded");


    /* =====================================================
       GET CURRENT HERO MOVIE
    ===================================================== */

    function getCurrentHeroMovie() {

        // Get hero section
        const hero =
            document.getElementById("hero");

        if (!hero) {
            console.warn("Hero section not found.");
            return null;
        }


        // Get current hero title
        const heroTitleElement =
            hero.querySelector("h1");


        if (!heroTitleElement) {
            console.warn("Hero title not found.");
            return null;
        }


        const heroTitle =
            heroTitleElement.textContent
                .trim();


        if (!heroTitle) {
            return null;
        }


        // Find exact movie from your existing movies array
        if (
            typeof movies !== "undefined" &&
            Array.isArray(movies)
        ) {

            const matchedMovie =
                movies.find(function (movie) {

                    return (
                        String(movie.title || "")
                            .trim()
                            .toLowerCase()
                        ===
                        heroTitle
                            .trim()
                            .toLowerCase()
                    );

                });


            if (matchedMovie) {

                console.log(
                    "Current Hero Movie:",
                    matchedMovie.title
                );

                return matchedMovie;
            }
        }


        console.warn(
            "Could not find hero movie:",
            heroTitle
        );

        return null;
    }



    /* =====================================================
       OPEN CURRENT HERO MOVIE
    ===================================================== */

    function openCurrentHeroMovie() {

        const movie =
            getCurrentHeroMovie();


        if (!movie) {

            console.warn(
                "No current hero movie found."
            );

            return;
        }


        console.log(
            "Opening Hero Movie:",
            movie.title
        );


        // Your existing movie details function
        if (
            typeof openMovieDetails ===
            "function"
        ) {

            openMovieDetails(
                movie
            );

        } else {

            console.error(
                "openMovieDetails() not found."
            );
        }
    }



    /* =====================================================
       REMOVE OLD HERO DETAILS LISTENER
    ===================================================== */

    function setupHeroDetails() {

        const oldButton =
            document.getElementById(
                "heroDetails"
            );


        if (!oldButton) {

            console.warn(
                "heroDetails button not found."
            );

            return;
        }


        /*
         * IMPORTANT:
         *
         * cloneNode() removes ALL old event
         * listeners from this button.
         *
         * This removes the old:
         *
         * openMovieDetails(movies[0])
         *
         * handler.
         */

        const newButton =
            oldButton.cloneNode(true);


        oldButton.parentNode.replaceChild(
            newButton,
            oldButton
        );


        /*
         * New correct handler
         */

        newButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                openCurrentHeroMovie();

            }
        );


        console.log(
            "Hero More Info button fixed."
        );
    }



    /* =====================================================
       MAKE HERO ITSELF CLICKABLE
    ===================================================== */

    function setupHeroClick() {

        const hero =
            document.getElementById(
                "hero"
            );


        if (!hero) {
            return;
        }


        /*
         * Prevent duplicate listener
         */

        if (
            hero.dataset
                .eliteHeroClickReady
            ===
            "true"
        ) {

            return;
        }


        hero.dataset
            .eliteHeroClickReady
            =
            "true";


        hero.addEventListener(
            "click",
            function (event) {

                /*
                 * Do NOT trigger when clicking
                 * buttons inside hero.
                 */

                if (
                    event.target.closest(
                        "button"
                    )
                ) {

                    return;
                }


                /*
                 * Do NOT trigger when clicking
                 * links.
                 */

                if (
                    event.target.closest(
                        "a"
                    )
                ) {

                    return;
                }


                openCurrentHeroMovie();

            }
        );


        console.log(
            "Hero movie area is clickable."
        );
    }



    /* =====================================================
       WATCH HERO TITLE CHANGES
    ===================================================== */

    function watchHeroChanges() {

        const hero =
            document.getElementById(
                "hero"
            );


        if (!hero) {
            return;
        }


        /*
         * Whenever slider changes the hero title,
         * this keeps everything synchronized.
         */

        const observer =
            new MutationObserver(
                function () {

                    const movie =
                        getCurrentHeroMovie();


                    if (movie) {

                        /*
                         * Store current movie
                         * directly on hero.
                         */

                        hero.__eliteCurrentMovie =
                            movie;

                    }

                }
            );


        observer.observe(
            hero,
            {
                childList: true,
                subtree: true,
                characterData: true
            }
        );


        console.log(
            "Hero slider watcher started."
        );
    }



    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initEliteHeroFix() {

        console.log(
            "Initializing ElitePlay Hero Fix..."
        );


        setupHeroDetails();

        setupHeroClick();

        watchHeroChanges();


        /*
         * Save the first/current movie
         */

        const hero =
            document.getElementById(
                "hero"
            );


        if (hero) {

            const movie =
                getCurrentHeroMovie();


            if (movie) {

                hero.__eliteCurrentMovie =
                    movie;

            }
        }


        console.log(
            "ElitePlay Hero Fix Ready."
        );
    }



    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initEliteHeroFix
        );

    } else {

        initEliteHeroFix();

    }

})();

// -============--NEW MOVIES SECTIONS----=======-=

// /* =========================================
//    ELITEPLAY - EXTRA 10 SECTIONS
//    TMDB + Functional Load More
//    ========================================= */

// (function () {
//   "use strict";

//   const TMDB_BASE = "https://api.themoviedb.org/3";

//   /*
//     IMPORTANT:
//     Apne existing TMDB API key ko yahan put karo.

//     Agar tumhare existing moviebox.js mein API key
//     window.TMDB_API_KEY ke through available hai,
//     ye automatically usko use karega.
//   */

//   const API_KEY =
//     window.TMDB_API_KEY ||
//     window.TMDB_API_KEY_VALUE ||
//     "";

//   const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

//   const sectionState = {
//     elitePicks: {
//       page: 1,
//       endpoint: "/movie/popular",
//       loaded: false
//     },

//     continueWatching: {
//       page: 1,
//       endpoint: "/movie/now_playing",
//       loaded: false
//     },

//     justAdded: {
//       page: 1,
//       endpoint: "/movie/now_playing",
//       loaded: false
//     },

//     hiddenGems: {
//       page: 1,
//       endpoint: "/discover/movie",
//       loaded: false,
//       params: {
//         "vote_average.gte": 6.5,
//         "vote_average.lte": 7.5,
//         "vote_count.gte": 100
//       }
//     },

//     highestRated: {
//       page: 1,
//       endpoint: "/movie/top_rated",
//       loaded: false
//     },

//     trendingWeek: {
//       page: 1,
//       endpoint: "/trending/movie/week",
//       loaded: false
//     },

//     becauseWatched: {
//       page: 1,
//       endpoint: "/movie/popular",
//       loaded: false
//     },

//     mood: {
//       page: 1,
//       endpoint: "/discover/movie",
//       loaded: false,
//       genreId: 28
//     },

//     eliteAwards: {
//       page: 1,
//       endpoint: "/discover/movie",
//       loaded: false,
//       params: {
//         "vote_average.gte": 8,
//         "vote_count.gte": 500
//       }
//     },

//     popularMonth: {
//       page: 1,
//       endpoint: "/discover/movie",
//       loaded: false,
//       params: {
//         sort_by: "popularity.desc"
//       }
//     }
//   };

//   const moodGenres = {
//     action: 28,
//     comedy: 35,
//     horror: 27,
//     romance: 10749,
//     thriller: 53,
//     "science-fiction": 878
//   };

//   function getElement(id) {
//     return document.getElementById(id);
//   }

//   function getRow(sectionName) {
//     const map = {
//       elitePicks: "elitePicksRow",
//       continueWatching: "continueWatchingRow",
//       justAdded: "justAddedRow",
//       hiddenGems: "hiddenGemsRow",
//       highestRated: "highestRatedRow",
//       trendingWeek: "trendingWeekRow",
//       becauseWatched: "becauseWatchedRow",
//       mood: "moodRow",
//       eliteAwards: "eliteAwardsRow",
//       popularMonth: "popularMonthRow"
//     };

//     return getElement(map[sectionName]);
//   }

//   function getButton(sectionName) {
//     return document.querySelector(
//       `.elite-load-more[data-section="${sectionName}"]`
//     );
//   }

//   function escapeHTML(value) {
//     if (value === null || value === undefined) {
//       return "";
//     }

//     return String(value)
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&#039;");
//   }

//   function getYear(date) {
//     if (!date) return "N/A";

//     const year = String(date).slice(0, 4);

//     return /^\d{4}$/.test(year) ? year : "N/A";
//   }

//   function showLoading(row) {
//     if (!row) return;

//     row.innerHTML = `
//       <div class="elite-section-loading">
//         Loading movies...
//       </div>
//     `;
//   }

//   function createMovieCard(movie) {
//     const title = movie.title || movie.name || "Untitled";

//     const poster = movie.poster_path
//       ? `${IMAGE_BASE}${movie.poster_path}`
//       : "";

//     const year = getYear(movie.release_date || movie.first_air_date);

//     const rating =
//       typeof movie.vote_average === "number"
//         ? movie.vote_average.toFixed(1)
//         : "N/A";

//     return `
//       <article
//         class="elite-extra-card"
//         data-movie-id="${movie.id}"
//         data-movie-title="${escapeHTML(title)}"
//       >

//         <div class="elite-extra-poster">

//           ${
//             poster
//               ? `
//                 <img
//                   src="${poster}"
//                   alt="${escapeHTML(title)}"
//                   loading="lazy"
//                   onerror="this.style.display='none'"
//                 >
//               `
//               : `
//                 <div
//                   style="
//                     width:100%;
//                     height:100%;
//                     display:flex;
//                     align-items:center;
//                     justify-content:center;
//                     color:#777d8d;
//                     font-size:12px;
//                     padding:15px;
//                     text-align:center;
//                   "
//                 >
//                   No Poster
//                 </div>
//               `
//           }

//           <div class="elite-extra-overlay">
//             <button
//               type="button"
//               class="elite-extra-play"
//               aria-label="Open ${escapeHTML(title)}"
//             >
//               ▶
//             </button>
//           </div>

//         </div>

//         <div class="elite-extra-info">

//           <div class="elite-extra-title">
//             ${escapeHTML(title)}
//           </div>

//           <div class="elite-extra-meta">
//             <span>${year}</span>
//             <span>•</span>
//             <span class="elite-extra-rating">
//               ★ ${rating}
//             </span>
//           </div>

//         </div>

//       </article>
//     `;
//   }

//   function attachCardEvents(row) {
//     if (!row) return;

//     const cards = row.querySelectorAll(".elite-extra-card");

//     cards.forEach((card) => {
//       if (card.dataset.eliteBound === "true") {
//         return;
//       }

//       card.dataset.eliteBound = "true";

//       card.addEventListener("click", function () {
//         const movieId = Number(this.dataset.movieId);

//         if (!movieId) return;

//         /*
//           Existing moviebox.js ke openMovieDetails()
//           ko use karne ki koshish.

//           Is se tumhara existing modal system preserve
//           rahega.
//         */

//         if (typeof window.openMovieDetails === "function") {
//           const title = this.dataset.movieTitle || "";

//           window.openMovieDetails({
//             id: movieId,
//             title: title
//           });

//           return;
//         }

//         /*
//           Fallback:
//           Agar existing function global nahi hai,
//           to TMDB details fetch karke modal open karne
//           ki koshish karenge.
//         */

//         openFallbackMovie(movieId);
//       });
//     });
//   }

//   async function openFallbackMovie(movieId) {
//     if (!API_KEY) {
//       console.warn("TMDB API key missing.");
//       return;
//     }

//     try {
//       const response = await fetch(
//         `${TMDB_BASE}/movie/${movieId}?api_key=${encodeURIComponent(API_KEY)}`
//       );

//       if (!response.ok) {
//         throw new Error("Movie details request failed.");
//       }

//       const movie = await response.json();

//       if (typeof window.openMovieDetails === "function") {
//         window.openMovieDetails(movie);
//       }
//     } catch (error) {
//       console.error("Movie details error:", error);
//     }
//   }

//   async function fetchMovies(sectionName) {
//     const state = sectionState[sectionName];

//     if (!state) {
//       return [];
//     }

//     if (!API_KEY) {
//       console.error(
//         "ElitePlay: TMDB API key not found. Set window.TMDB_API_KEY."
//       );

//       return [];
//     }

//     const params = new URLSearchParams();

//     params.set("api_key", API_KEY);
//     params.set("language", "en-US");
//     params.set("page", String(state.page));

//     if (state.params) {
//       Object.entries(state.params).forEach(([key, value]) => {
//         params.set(key, String(value));
//       });
//     }

//     if (sectionName === "mood") {
//       params.set("with_genres", String(state.genreId));
//       params.set("sort_by", "popularity.desc");
//     }

//     const url =
//       `${TMDB_BASE}${state.endpoint}?${params.toString()}`;

//     const response = await fetch(url);

//     if (!response.ok) {
//       throw new Error(
//         `TMDB request failed: ${response.status}`
//       );
//     }

//     const data = await response.json();

//     return Array.isArray(data.results)
//       ? data.results
//       : [];
//   }

//   async function loadSection(sectionName, append = false) {
//     const row = getRow(sectionName);
//     const button = getButton(sectionName);

//     if (!row) return;

//     if (button) {
//       button.classList.add("loading");
//       button.disabled = true;
//       button.textContent = "Loading...";
//     }

//     if (!append) {
//       showLoading(row);
//     }

//     try {
//       const movies = await fetchMovies(sectionName);

//       if (!append) {
//         row.innerHTML = "";
//       }

//       if (movies.length === 0) {
//         if (!append) {
//           row.innerHTML = `
//             <div class="elite-section-empty">
//               No movies available right now.
//             </div>
//           `;
//         }

//         if (button) {
//           button.textContent = "No More Movies";
//           button.disabled = true;
//         }

//         return;
//       }

//       const html = movies
//         .filter((movie) => movie.poster_path)
//         .map(createMovieCard)
//         .join("");

//       row.insertAdjacentHTML("beforeend", html);

//       attachCardEvents(row);

//       sectionState[sectionName].loaded = true;
//       sectionState[sectionName].page += 1;

//       if (button) {
//         button.textContent = "Load More";
//         button.disabled = false;
//       }

//     } catch (error) {
//       console.error(
//         `ElitePlay ${sectionName} error:`,
//         error
//       );

//       if (!append) {
//         row.innerHTML = `
//           <div class="elite-section-empty">
//             Unable to load movies. Please try again.
//           </div>
//         `;
//       }

//       if (button) {
//         button.textContent = "Try Again";
//         button.disabled = false;
//       }

//     } finally {
//       if (button) {
//         button.classList.remove("loading");
//       }
//     }
//   }

//   function setupLoadMoreButtons() {
//     document
//       .querySelectorAll(".elite-load-more")
//       .forEach((button) => {

//         if (button.dataset.eliteBound === "true") {
//           return;
//         }

//         button.dataset.eliteBound = "true";

//         button.addEventListener("click", function () {
//           const sectionName = this.dataset.section;

//           if (!sectionName) return;

//           loadSection(sectionName, true);
//         });
//       });
//   }

//   function setupMoodButtons() {
//     document
//       .querySelectorAll(".elite-mood-btn")
//       .forEach((button) => {

//         if (button.dataset.eliteBound === "true") {
//           return;
//         }

//         button.dataset.eliteBound = "true";

//         button.addEventListener("click", function () {

//           document
//             .querySelectorAll(".elite-mood-btn")
//             .forEach((btn) => {
//               btn.classList.remove("active");
//             });

//           this.classList.add("active");

//           const mood = this.dataset.mood;

//           if (!moodGenres[mood]) {
//             return;
//           }

//           const state = sectionState.mood;

//           state.genreId = moodGenres[mood];
//           state.page = 1;

//           const row = getRow("mood");

//           if (row) {
//             row.innerHTML = "";
//           }

//           const buttonMore = getButton("mood");

//           if (buttonMore) {
//             buttonMore.disabled = false;
//             buttonMore.textContent = "Load More";
//           }

//           loadSection("mood", false);
//         });
//       });
//   }

//   function initEliteSections() {

//     if (!getElement("eliteExtraSections")) {
//       return;
//     }

//     setupLoadMoreButtons();
//     setupMoodButtons();

//     /*
//       Initial load.
//       Har section apni TMDB request karta hai.
//     */

//     loadSection("elitePicks");
//     loadSection("continueWatching");
//     loadSection("justAdded");
//     loadSection("hiddenGems");
//     loadSection("highestRated");
//     loadSection("trendingWeek");
//     loadSection("becauseWatched");
//     loadSection("mood");
//     loadSection("eliteAwards");
//     loadSection("popularMonth");
//   }

//   /*
//     Existing JS ke load hone ke baad initialize.
//   */

//   if (document.readyState === "loading") {
//     document.addEventListener(
//       "DOMContentLoaded",
//       initEliteSections,
//       { once: true }
//     );
//   } else {
//     initEliteSections();
//   }

// })();

// --------------------\\
