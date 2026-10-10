// ============================================
// CINEVERSE ADMIN PANEL
// ============================================


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL =
  window.CINEVERSE_CONFIG.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  window.CINEVERSE_CONFIG.SUPABASE_ANON_KEY;

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ============================================
// DOM
// ============================================

const loginPanel =
  document.getElementById("loginPanel");

const adminPanel =
  document.getElementById("adminPanel");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const logoutBtn =
  document.getElementById("logoutBtn");

const movieForm =
  document.getElementById("movieForm");

const movieList =
  document.getElementById("movieList");

const message =
  document.getElementById("message");

const cancelEdit =
  document.getElementById("cancelEdit");


// ============================================
// CHECK LOGIN
// ============================================

async function checkUser() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();


  if (session) {

    showAdmin();

  } else {

    showLogin();
  }
}


// ============================================
// SHOW LOGIN
// ============================================

function showLogin() {

  loginPanel.classList.remove("hidden");

  adminPanel.classList.add("hidden");
}


// ============================================
// SHOW ADMIN
// ============================================

function showAdmin() {

  loginPanel.classList.add("hidden");

  adminPanel.classList.remove("hidden");

  loadMovies();
}


// ============================================
// LOGIN
// ============================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    loginMessage.textContent =
      "Logging in...";


    const email =
      document
        .getElementById("email")
        .value
        .trim();


    const password =
      document
        .getElementById("password")
        .value;


    const {
      error
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });


    if (error) {

      loginMessage.textContent =
        error.message;

      return;
    }


    loginMessage.textContent =
      "";

    showAdmin();
  }
);


// ============================================
// LOGOUT
// ============================================

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

    showLogin();
  }
);
// ---------------------

// ============================================
// UPLOAD FULL MOVIE TO BUNNY STREAM
// ============================================

async function uploadMovieToBunny(
    file,
    title
) {
    if (!file) {
        return null;
    }

    if (
        !window.tus ||
        !window.tus.Upload
    ) {
        throw new Error(
            "TUS upload library is not loaded."
        );
    }

    // ========================================
    // GET CURRENT SUPABASE SESSION
    // ========================================

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    const session =
        data?.session;

    if (!session?.access_token) {
        throw new Error(
            "Your admin session has expired. Please login again."
        );
    }

    // ========================================
    // ASK SERVER TO CREATE BUNNY VIDEO
    // ========================================

    const initResponse =
        await fetch(
            "/api/bunny-upload-init",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${session.access_token}`
                },

                body:
                    JSON.stringify({
                        title
                    })
            }
        );

    const initData =
        await initResponse.json();

    if (!initResponse.ok) {
        throw new Error(
            initData?.error ||
            "Unable to initialize Bunny upload."
        );
    }

    const {
        videoId,
        libraryId,
        endpoint,
        signature,
        expirationTime,
        playbackUrl
    } = initData;

    if (!videoId) {
        throw new Error(
            "Bunny video ID was not created."
        );
    }

    // ========================================
    // CREATE TUS UPLOAD
    // ========================================

    return await new Promise(
        (
            resolve,
            reject
        ) => {

            const upload =
                new tus.Upload(
                    file,
                    {
                        endpoint,

                        retryDelays: [
                            0,
                            3000,
                            5000,
                            10000,
                            20000,
                            30000
                        ],

                        headers: {
                            AuthorizationSignature:
                                signature,

                            AuthorizationExpire:
                                String(
                                    expirationTime
                                ),

                            VideoId:
                                videoId,

                            LibraryId:
                                String(
                                    libraryId
                                )
                        },

                        metadata: {
                            filename:
                                file.name,

                            filetype:
                                file.type ||
                                "video/mp4",

                            title
                        },

                        chunkSize:
                            10 * 1024 * 1024,

                        onError(error) {

                            console.error(
                                "Bunny upload error:",
                                error
                            );

                            reject(
                                error
                            );
                        },

                        onProgress(
                            bytesUploaded,
                            bytesTotal
                        ) {

                            const percentage =
                                (
                                    bytesUploaded /
                                    bytesTotal
                                ) * 100;

                            const rounded =
                                Math.round(
                                    percentage
                                );

                            message.textContent =
                                `Uploading movie to Bunny... ${rounded}%`;

                            console.log(
                                `Bunny upload: ${rounded}%`
                            );
                        },

                        onSuccess() {

                            console.log(
                                "Bunny upload completed:",
                                videoId
                            );

                            message.textContent =
                                "Movie uploaded to Bunny. Processing video...";

                            resolve({
                                videoId,
                                playbackUrl
                            });
                        }
                    }
                );

            // ====================================
            // RESUME PREVIOUS UPLOAD
            // ====================================

            upload
                .findPreviousUploads()
                .then(
                    previousUploads => {

                        if (
                            previousUploads.length
                        ) {

                            upload
                                .resumeFromPreviousUpload(
                                    previousUploads[0]
                                );
                        }

                        upload.start();
                    }
                )
                .catch(
                    reject
                );
        }
    );
}


// ============================================
// UPLOAD FILE
// ============================================

async function uploadFile(file) {

  if (!file) {
    return null;
  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const fileName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;


  const filePath =
    fileName;


  const {
    error
  } =
    await supabaseClient
      .storage
      .from("movie-assets")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );


  if (error) {

    throw error;
  }


  const {
    data
  } =
    supabaseClient
      .storage
      .from("movie-assets")
      .getPublicUrl(filePath);


  return data.publicUrl;
}


// ============================================
// SAVE MOVIE
// ============================================

movieForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    message.textContent =
      "Saving movie...";


    try {

      // ======================================
      // MOVIE ID
      // ======================================

      const movieId =
        document
          .getElementById("movieId")
          .value;


      // ======================================
      // BASIC DATA
      // ======================================

      const title =
        document
          .getElementById("title")
          .value
          .trim();


      const description =
        document
          .getElementById("description")
          .value
          .trim();


      const year =
        Number(
          document
            .getElementById("year")
            .value
        ) || null;


      const rating =
        Number(
          document
            .getElementById("rating")
            .value
        ) || 0;


      const genre =
        document
          .getElementById("genre")
          .value;


      const trailerUrl =
        document
          .getElementById("trailerUrl")
          .value
          .trim();


      // ======================================
      // FILES
      // ======================================

      const posterFile =
        document
          .getElementById("posterFile")
          .files[0];


      const backdropFile =
        document
          .getElementById("backdropFile")
          .files[0];


      const movieFileInput =
        document.getElementById(
          "movieFile"
        );


      const movieFile =
        movieFileInput
          ? movieFileInput.files[0]
          : null;


      // ======================================
      // VALIDATION
      // ======================================

      if (!title) {

        message.textContent =
          "Please enter movie title.";

        return;
      }


      // ======================================
      // GET EXISTING MOVIE
      // ======================================

      let existingMovie = null;


      if (movieId) {

        const {
          data,
          error
        } =
          await supabaseClient
            .from("movies")
            .select("*")
            .eq("id", movieId)
            .single();


        if (error) {
          throw error;
        }


        existingMovie =
          data;
      }


      // ======================================
      // POSTER
      // ======================================

      let posterUrl =
        existingMovie?.poster_url ||
        null;


      if (posterFile) {

        message.textContent =
          "Uploading poster...";


        posterUrl =
          await uploadFile(
            posterFile
          );
      }


      // ======================================
      // BACKDROP
      // ======================================

      let backdropUrl =
        existingMovie?.backdrop_url ||
        null;


      if (backdropFile) {

        message.textContent =
          "Uploading backdrop...";


        backdropUrl =
          await uploadFile(
            backdropFile
          );
      }


      // ======================================
      // FULL MOVIE
      // ======================================

      let movieUrl =
        existingMovie?.movie_url ||
        null;


      if (movieFile) {

        message.textContent =
          "Uploading full movie...";


        movieUrl =
          await uploadFile(
            movieFile
          );
      }


      // ======================================
      // MOVIE DATA
      // ======================================

      const movieData = {

        title,

        description,

        year,

        rating,

        genre,

        trailer_url:
          trailerUrl,

        poster_url:
          posterUrl,

        backdrop_url:
          backdropUrl,

        movie_url:
          movieUrl
      };


      // ======================================
      // UPDATE MOVIE
      // ======================================

      if (movieId) {

        const {
          error
        } =
          await supabaseClient
            .from("movies")
            .update(movieData)
            .eq("id", movieId);


        if (error) {
          throw error;
        }


        message.textContent =
          "Movie updated successfully.";
      }


      // ======================================
      // ADD MOVIE
      // ======================================

      else {

        const {
          error
        } =
          await supabaseClient
            .from("movies")
            .insert([
              movieData
            ]);


        if (error) {
          throw error;
        }


        message.textContent =
          "Movie added successfully.";
      }


      resetForm();

      await loadMovies();


    } catch (error) {

      console.error(
        "Save movie error:",
        error
      );


      message.textContent =
        error.message;
    }
  }
);


// ============================================
// LOAD MOVIES
// ============================================

async function loadMovies() {

  movieList.innerHTML =
    "Loading movies...";


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

    movieList.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;
  }


  if (
    !data ||
    data.length === 0
  ) {

    movieList.innerHTML =
      "<p>No movies added yet.</p>";

    return;
  }


  movieList.innerHTML =
    "";


  data.forEach(movie => {

    const card =
      document.createElement(
        "div"
      );


    card.className =
      "movie-card";


    card.innerHTML = `

      ${
        movie.poster_url
          ? `
            <img
              src="${escapeHtml(movie.poster_url)}"
              alt="${escapeHtml(movie.title)}"
            >
          `
          : `
            <div
              style="
                height:280px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#222;
              "
            >
              No Poster
            </div>
          `
      }


      <div class="movie-info">

        <h3>
          ${escapeHtml(movie.title)}
        </h3>


        <p>
          ${movie.year || "N/A"}
          ·
          ${escapeHtml(
            movie.genre || "Movie"
          )}
        </p>


        <p>
          ⭐ ${movie.rating || "0"}
        </p>


        ${
          movie.movie_url
            ? `
              <p
                style="
                  color:#5cff9d;
                  font-size:13px;
                "
              >
                ✓ Full Movie Uploaded
              </p>
            `
            : `
              <p
                style="
                  color:#ff9b9b;
                  font-size:13px;
                "
              >
                No Full Movie
              </p>
            `
        }


        <div class="actions">

          <button
            class="primary edit-btn"
            data-id="${movie.id}"
          >
            Edit
          </button>


          <button
            class="danger delete-btn"
            data-id="${movie.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `;


    movieList.appendChild(
      card
    );
  });


  // ========================================
  // EDIT BUTTON
  // ========================================

  document
    .querySelectorAll(
      ".edit-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            editMovie(
              button.dataset.id
            );
          }
        );
      }
    );


  // ========================================
  // DELETE BUTTON
  // ========================================

  document
    .querySelectorAll(
      ".delete-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            deleteMovie(
              button.dataset.id
            );
          }
        );
      }
    );
}


// ============================================
// EDIT MOVIE
// ============================================

async function editMovie(id) {

  const {
    data: movie,
    error
  } =
    await supabaseClient
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();


  if (error) {

    alert(
      error.message
    );

    return;
  }


  document.getElementById(
    "movieId"
  ).value =
    movie.id;


  document.getElementById(
    "title"
  ).value =
    movie.title || "";


  document.getElementById(
    "description"
  ).value =
    movie.description || "";


  document.getElementById(
    "year"
  ).value =
    movie.year || "";


  document.getElementById(
    "rating"
  ).value =
    movie.rating || "";


  document.getElementById(
    "genre"
  ).value =
    movie.genre || "Action";


  document.getElementById(
    "trailerUrl"
  ).value =
    movie.trailer_url || "";


  // File inputs cannot be pre-filled
  // for security reasons.


  const movieFileInput =
    document.getElementById(
      "movieFile"
    );


  if (movieFileInput) {

    movieFileInput.value =
      "";
  }


  const posterFileInput =
    document.getElementById(
      "posterFile"
    );


  if (posterFileInput) {

    posterFileInput.value =
      "";
  }


  const backdropFileInput =
    document.getElementById(
      "backdropFile"
    );


  if (backdropFileInput) {

    backdropFileInput.value =
      "";
  }


  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Movie";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ============================================
// DELETE MOVIE
// ============================================

async function deleteMovie(id) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this movie?"
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("movies")
      .delete()
      .eq("id", id);


  if (error) {

    alert(
      error.message
    );

    return;
  }


  await loadMovies();
}


// ============================================
// RESET FORM
// ============================================

function resetForm() {

  movieForm.reset();


  document.getElementById(
    "movieId"
  ).value =
    "";


  document.getElementById(
    "formTitle"
  ).textContent =
    "Add Movie";
}


cancelEdit.addEventListener(
  "click",
  resetForm
);


// ============================================
// HTML ESCAPE
// ============================================

function escapeHtml(value) {

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
// START
// ============================================

checkUser();