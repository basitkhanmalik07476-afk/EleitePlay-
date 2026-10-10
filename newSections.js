/* =========================================
   ELITEPLAY - EXTRA 10 SECTIONS
   FULL MOVIE DETAILS + TRAILER SUPPORT
   ========================================= */

(function () {
  "use strict";

  /* =========================================
     TMDB CONFIG
     ========================================= */

  const CONFIG = window.CINEVERSE_CONFIG || {};

  const TMDB_API_KEY =
    CONFIG.TMDB_API_KEY ||
    window.TMDB_API_KEY ||
    "";

  const TMDB_BASE =
    "https://api.themoviedb.org/3";

  const IMAGE_BASE =
    "https://image.tmdb.org/t/p/w500";

  const BACKDROP_BASE =
    "https://image.tmdb.org/t/p/original";


  if (!TMDB_API_KEY) {
    console.error(
      "ElitePlay: TMDB API key not found."
    );

    return;
  }


  /* =========================================
     GENRES
     ========================================= */

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
    53: "Thriller",
    10752: "War",
    37: "Western"
  };


  /* =========================================
     SECTION STATE
     ========================================= */

  const sections = {

    elitePicks: {
      row: "elitePicksRow",
      endpoint: "/movie/popular",
      page: 1
    },

    continueWatching: {
      row: "continueWatchingRow",
      endpoint: "/movie/now_playing",
      page: 1
    },

    justAdded: {
      row: "justAddedRow",
      endpoint: "/movie/now_playing",
      page: 1
    },

    hiddenGems: {
      row: "hiddenGemsRow",
      endpoint: "/discover/movie",
      page: 1,
      params: {
        "vote_average.gte": 6.5,
        "vote_average.lte": 7.5,
        "vote_count.gte": 100,
        "sort_by": "popularity.desc"
      }
    },

    highestRated: {
      row: "highestRatedRow",
      endpoint: "/movie/top_rated",
      page: 1
    },

    trendingWeek: {
      row: "trendingWeekRow",
      endpoint: "/trending/movie/week",
      page: 1
    },

    becauseWatched: {
      row: "becauseWatchedRow",
      endpoint: "/movie/popular",
      page: 1
    },

    mood: {
      row: "moodRow",
      endpoint: "/discover/movie",
      page: 1,
      genreId: 28
    },

    eliteAwards: {
      row: "eliteAwardsRow",
      endpoint: "/discover/movie",
      page: 1,
      params: {
        "vote_average.gte": 8,
        "vote_count.gte": 500,
        "sort_by": "vote_average.desc"
      }
    },

    popularMonth: {
      row: "popularMonthRow",
      endpoint: "/discover/movie",
      page: 1,
      params: {
        sort_by: "popularity.desc"
      }
    }

  };


  /* =========================================
     MOODS
     ========================================= */

  const moodGenres = {

    action: 28,

    comedy: 35,

    horror: 27,

    romance: 10749,

    thriller: 53,

    "science-fiction": 878

  };


  /* =========================================
     HELPERS
     ========================================= */

  function getRow(sectionName) {

    const section =
      sections[sectionName];

    if (!section) {
      return null;
    }

    return document.getElementById(
      section.row
    );
  }


  function getLoadMoreButton(
    sectionName
  ) {

    return document.querySelector(
      `.elite-load-more[data-section="${sectionName}"]`
    );

  }


  function escapeHTML(value) {

    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function getYear(date) {

    if (!date) {
      return "N/A";
    }

    return String(date).slice(0, 4);

  }


  /* =========================================
     TMDB REQUEST
     ========================================= */

  async function tmdbFetch(
    endpoint,
    params = {}
  ) {

    const url =
      new URL(
        `${TMDB_BASE}${endpoint}`
      );

    url.searchParams.set(
      "api_key",
      TMDB_API_KEY
    );

    Object.entries(params)
      .forEach(
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


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `TMDB request failed: ${response.status}`
      );

    }


    return response.json();

  }


  /* =========================================
     FORMAT MOVIE
     SAME SHAPE AS MAIN MOVIE SYSTEM
     ========================================= */

  function formatMovie(movie) {

    const genreIds =
      movie.genre_ids ||
      (movie.genres || [])
        .map(genre => genre.id);


    const genreNames =
      movie.genres
        ? movie.genres
            .map(genre => genre.name)
            .join(", ")
        : genreIds
            .map(id => genreMap[id])
            .filter(Boolean)
            .join(", ");


    const releaseDate =
      movie.release_date || "";


    const runtime =
      movie.runtime
        ? `${Math.floor(movie.runtime / 60)}h ${
            movie.runtime % 60
          }m`
        : "N/A";


    return {

      id: movie.id,

      title:
        movie.title ||
        movie.original_title ||
        "Untitled",

      year:
        getYear(releaseDate),

      rating:
        Number(
          movie.vote_average || 0
        ).toFixed(1),

      genreIds,

      genre:
        genreNames ||
        "Movie",

      duration:
        runtime,

      poster:
        movie.poster_path
          ? `${IMAGE_BASE}${movie.poster_path}`
          : "",

      backdrop:
        movie.backdrop_path
          ? `${BACKDROP_BASE}${movie.backdrop_path}`
          : "",

      description:
        movie.overview ||
        "No description available.",

      /*
        Trailer will be filled after
        fetching TMDB videos.
      */

      trailer:
        movie.trailer || "",

      movieUrl:
        movie.movieUrl || ""

    };

  }


  /* =========================================
     GET MOVIE DETAILS + TRAILER
     ========================================= */

  async function getCompleteMovie(
    movieId
  ) {

    try {

      /*
        Details + videos in ONE request.
      */

      const movie =
        await tmdbFetch(
          `/movie/${movieId}`,
          {
            language: "en-US",
            append_to_response: "videos"
          }
        );


      const formatted =
        formatMovie(movie);


      const videos =
        movie.videos &&
        Array.isArray(movie.videos.results)
          ? movie.videos.results
          : [];


      /*
        Find official YouTube trailer first.
      */

      const trailer =
        videos.find(video =>
          video.site === "YouTube" &&
          video.type === "Trailer" &&
          video.official === true
        ) ||

        videos.find(video =>
          video.site === "YouTube" &&
          video.type === "Trailer"
        ) ||

        videos.find(video =>
          video.site === "YouTube" &&
          video.type === "Teaser"
        ) ||

        null;


      if (
        trailer &&
        trailer.key
      ) {

        formatted.trailer =
          `https://www.youtube.com/watch?v=${trailer.key}`;

      }


      return formatted;


    } catch (error) {

      console.error(
        "ElitePlay movie details error:",
        error
      );

      return null;

    }

  }


  /* =========================================
     MOVIE CARD
     ========================================= */

  function createMovieCard(
    movie
  ) {

    const title =
      movie.title ||
      "Untitled";


    const poster =
      movie.poster_path
        ? `${IMAGE_BASE}${movie.poster_path}`
        : "";


    const year =
      getYear(
        movie.release_date
      );


    const rating =
      Number(
        movie.vote_average || 0
      ).toFixed(1);


    return `

      <article
        class="elite-extra-card"
        data-movie-id="${movie.id}"
      >

        <div class="elite-extra-poster">

          ${
            poster
              ? `
                <img
                  src="${poster}"
                  alt="${escapeHTML(title)}"
                  loading="lazy"
                >
              `
              : `
                <div
                  style="
                    width:100%;
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#777d8d;
                  "
                >
                  No Poster
                </div>
              `
          }


          <div class="elite-extra-overlay">

            <button
              type="button"
              class="elite-extra-play"
            >
              ▶
            </button>

          </div>

        </div>


        <div class="elite-extra-info">

          <div class="elite-extra-title">

            ${escapeHTML(title)}

          </div>


          <div class="elite-extra-meta">

            <span>
              ${year}
            </span>

            <span>
              •
            </span>

            <span class="elite-extra-rating">

              ★ ${rating}

            </span>

          </div>

        </div>

      </article>

    `;

  }


  /* =========================================
     ⭐ IMPORTANT
     OPEN SAME MODAL AS MAIN MOVIES
     ========================================= */

  function attachMovieEvents(
    row
  ) {

    if (!row) {
      return;
    }


    row
      .querySelectorAll(
        ".elite-extra-card"
      )
      .forEach(card => {


        if (
          card.dataset.movieBound ===
          "true"
        ) {
          return;
        }


        card.dataset.movieBound =
          "true";


        card.addEventListener(
          "click",
          async function () {


            const movieId =
              Number(
                this.dataset.movieId
              );


            if (!movieId) {
              return;
            }


            /*
              Prevent double clicks.
            */

            if (
              this.dataset.opening ===
              "true"
            ) {
              return;
            }


            this.dataset.opening =
              "true";


            try {

              /*
                Get FULL movie information.
              */

              const completeMovie =
                await getCompleteMovie(
                  movieId
                );


              if (!completeMovie) {

                console.error(
                  "Unable to get movie details."
                );

                return;

              }


              /*
                NOW use the EXACT SAME
                openMovieDetails() used
                by the main movie cards.
              */

              if (
                typeof window.openMovieDetails ===
                "function"
              ) {

                await window.openMovieDetails(
                  completeMovie
                );

                return;

              }


              /*
                If function is not exposed
                globally, find the modal and
                populate it ourselves.
              */

              openFallbackModal(
                completeMovie
              );


            } catch (error) {

              console.error(
                "ElitePlay card click error:",
                error
              );

            } finally {

              this.dataset.opening =
                "false";

            }

          }
        );

      });

  }


  /* =========================================
     FALLBACK MODAL
     ========================================= */

  function openFallbackModal(
    movie
  ) {

    const modal =
      document.getElementById(
        "movieModal"
      );


    if (!modal) {
      return;
    }


    const poster =
      document.getElementById(
        "modalPoster"
      );


    const title =
      document.getElementById(
        "modalTitle"
      );


    const meta =
      document.getElementById(
        "modalMeta"
      );


    const description =
      document.getElementById(
        "modalDescription"
      );


    if (poster) {

      poster.src =
        movie.poster || "";

      poster.alt =
        `${movie.title} poster`;

    }


    if (title) {

      title.textContent =
        movie.title;

    }


    if (description) {

      description.textContent =
        movie.description;

    }


    if (meta) {

      meta.innerHTML = `

        <span>
          ★ ${escapeHTML(
            movie.rating
          )}
        </span>

        <span>
          ${escapeHTML(
            movie.year
          )}
        </span>

        <span>
          ${escapeHTML(
            movie.duration
          )}
        </span>

        <span class="tag">
          ${escapeHTML(
            movie.genre
          )}
        </span>

      `;

    }


    modal.classList.add(
      "open"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.style.overflow =
      "hidden";


    /*
      Create trailer area.
    */

    createFallbackTrailer(
      movie
    );

  }


  /* =========================================
     FALLBACK TRAILER
     ========================================= */

  function createFallbackTrailer(
    movie
  ) {

    const modalInfo =
      document.querySelector(
        ".modal-info"
      );


    if (!modalInfo) {
      return;
    }


    /*
      Remove old trailer.
    */

    const oldTrailer =
      document.getElementById(
        "eliteExtraTrailer"
      );


    if (oldTrailer) {
      oldTrailer.remove();
    }


    if (!movie.trailer) {

      return;

    }


    const youtubeId =
      getYouTubeId(
        movie.trailer
      );


    if (!youtubeId) {
      return;
    }


    const trailer =
      document.createElement(
        "div"
      );


    trailer.id =
      "eliteExtraTrailer";


    trailer.style.marginTop =
      "20px";


    trailer.innerHTML = `

      <h3
        style="
          margin-bottom:12px;
          color:#fff;
          font-size:18px;
        "
      >
        ▶ Watch Trailer
      </h3>

      <div
        style="
          width:100%;
          aspect-ratio:16/9;
          background:#000;
          border-radius:14px;
          overflow:hidden;
        "
      >

        <iframe
          src="https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0"
          title="${escapeHTML(movie.title)} trailer"
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


    modalInfo.appendChild(
      trailer
    );

  }


  /* =========================================
     YOUTUBE ID
     ========================================= */

  function getYouTubeId(
    url
  ) {

    if (!url) {
      return null;
    }


    try {

      const parsed =
        new URL(url);


      if (
        parsed.hostname.includes(
          "youtu.be"
        )
      ) {

        return parsed.pathname
          .slice(1)
          .split("/")[0];

      }


      if (
        parsed.hostname.includes(
          "youtube.com"
        )
      ) {

        const v =
          parsed.searchParams.get(
            "v"
          );


        if (v) {
          return v;
        }


        if (
          parsed.pathname.startsWith(
            "/embed/"
          )
        ) {

          return parsed.pathname
            .split("/")[2];

        }


        if (
          parsed.pathname.startsWith(
            "/shorts/"
          )
        ) {

          return parsed.pathname
            .split("/")[2];

        }

      }

    } catch (error) {

      console.error(
        "YouTube URL error:",
        error
      );

    }


    return null;

  }


  /* =========================================
     LOAD SECTION
     ========================================= */

  async function loadSection(
    sectionName,
    append = false
  ) {

    const section =
      sections[sectionName];


    const row =
      getRow(sectionName);


    const button =
      getLoadMoreButton(
        sectionName
      );


    if (
      !section ||
      !row
    ) {
      return;
    }


    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Loading...";

      button.classList.add(
        "loading"
      );

    }


    if (!append) {

      row.innerHTML = `

        <div class="elite-section-loading">

          Loading movies...

        </div>

      `;

    }


    try {

      const params = {

        language:
          "en-US",

        page:
          section.page

      };


      /*
        Section-specific params.
      */

      if (section.params) {

        Object.assign(
          params,
          section.params
        );

      }


      /*
        Mood genre.
      */

      if (
        sectionName ===
        "mood"
      ) {

        params.with_genres =
          section.genreId;

        params.sort_by =
          "popularity.desc";

      }


      const data =
        await tmdbFetch(
          section.endpoint,
          params
        );


      const movies =
        (data.results || [])
          .filter(
            movie =>
              movie &&
              movie.id &&
              movie.poster_path
          );


      if (!append) {

        row.innerHTML = "";

      }


      if (
        movies.length ===
        0
      ) {

        if (!append) {

          row.innerHTML = `

            <div
              class="elite-section-empty"
            >
              No movies found.
            </div>

          `;

        }


        if (button) {

          button.textContent =
            "No More Movies";

          button.disabled =
            true;

        }


        return;

      }


      row.insertAdjacentHTML(
        "beforeend",
        movies
          .map(
            createMovieCard
          )
          .join("")
      );


      attachMovieEvents(
        row
      );


      /*
        Next TMDB page.
      */

      section.page++;


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Load More";

        button.classList.remove(
          "loading"
        );

      }


    } catch (error) {

      console.error(
        `ElitePlay ${sectionName} error:`,
        error
      );


      if (!append) {

        row.innerHTML = `

          <div
            class="elite-section-empty"
          >
            Unable to load movies.
          </div>

        `;

      }


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Try Again";

        button.classList.remove(
          "loading"
        );

      }

    }

  }


  /* =========================================
     LOAD MORE
     ========================================= */

  function setupLoadMore() {

    document
      .querySelectorAll(
        ".elite-load-more"
      )
      .forEach(button => {

        if (
          button.dataset.bound ===
          "true"
        ) {
          return;
        }


        button.dataset.bound =
          "true";


        button.addEventListener(
          "click",
          function () {

            const sectionName =
              this.dataset.section;


            if (!sectionName) {
              return;
            }


            loadSection(
              sectionName,
              true
            );

          }
        );

      });

  }


  /* =========================================
     MOOD BUTTONS
     ========================================= */

  function setupMoodButtons() {

    document
      .querySelectorAll(
        ".elite-mood-btn"
      )
      .forEach(button => {

        if (
          button.dataset.bound ===
          "true"
        ) {
          return;
        }


        button.dataset.bound =
          "true";


        button.addEventListener(
          "click",
          function () {

            const mood =
              this.dataset.mood;


            const genreId =
              moodGenres[mood];


            if (!genreId) {
              return;
            }


            document
              .querySelectorAll(
                ".elite-mood-btn"
              )
              .forEach(btn => {

                btn.classList.remove(
                  "active"
                );

              });


            this.classList.add(
              "active"
            );


            sections.mood.page =
              1;

            sections.mood.genreId =
              genreId;


            const row =
              getRow("mood");


            if (row) {

              row.innerHTML =
                "";

            }


            const button =
              getLoadMoreButton(
                "mood"
              );


            if (button) {

              button.disabled =
                false;

              button.textContent =
                "Load More";

            }


            loadSection(
              "mood",
              false
            );

          }
        );

      });

  }


  /* =========================================
     INITIALIZE
     ========================================= */

  function initEliteSections() {

    if (
      !document.getElementById(
        "eliteExtraSections"
      )
    ) {

      return;

    }


    console.log(
      "ElitePlay: Extra sections initialized."
    );


    setupLoadMore();

    setupMoodButtons();


    Object.keys(
      sections
    ).forEach(
      sectionName => {

        loadSection(
          sectionName
        );

      }
    );

  }


  /* =========================================
     START
     ========================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initEliteSections,
      { once: true }
    );

  } else {

    initEliteSections();

  }

})();