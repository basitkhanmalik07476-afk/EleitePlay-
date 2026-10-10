/* =========================================
   ELITEPLAY NAVBAR DROPDOWNS
========================================= */

(function () {

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const closeNotificationPanel =
        document.getElementById("closeNotificationPanel");

    const profileBtn =
        document.getElementById("profileBtn");

    const profileMenu =
        document.getElementById("profileMenu");

    const profileClose =
        document.getElementById("profileClose");


    /* ================================
       NOTIFICATION
    ================================= */

    if (notificationBtn && notificationPanel) {

        notificationBtn.addEventListener("click", function (e) {

            e.stopPropagation();

            /* Close profile */
            if (profileMenu) {
                profileMenu.classList.remove("show");
            }

            /* Toggle notification */
            notificationPanel.classList.toggle("show");

        });

    }


    /* ================================
       CLOSE NOTIFICATION
    ================================= */

    if (closeNotificationPanel) {

        closeNotificationPanel.addEventListener(
            "click",
            function (e) {

                e.stopPropagation();

                notificationPanel.classList.remove("show");

            }
        );

    }


    /* ================================
       PROFILE
    ================================= */

    if (profileBtn && profileMenu) {

        profileBtn.addEventListener("click", function (e) {

            e.stopPropagation();

            /* Close notification */
            if (notificationPanel) {
                notificationPanel.classList.remove("show");
            }

            /* Toggle profile */
            profileMenu.classList.toggle("show");

        });

    }


    /* ================================
       CLOSE PROFILE
    ================================= */

    if (profileClose) {

        profileClose.addEventListener(
            "click",
            function (e) {

                e.stopPropagation();

                profileMenu.classList.remove("show");

            }
        );

    }


    /* ================================
       CLICK OUTSIDE
    ================================= */

    document.addEventListener("click", function (e) {

        if (
            notificationPanel &&
            !notificationPanel.contains(e.target) &&
            notificationBtn &&
            !notificationBtn.contains(e.target)
        ) {

            notificationPanel.classList.remove("show");

        }


        if (
            profileMenu &&
            !profileMenu.contains(e.target) &&
            profileBtn &&
            !profileBtn.contains(e.target)
        ) {

            profileMenu.classList.remove("show");

        }

    });


    /* ================================
       ESC
    ================================= */

    document.addEventListener("keydown", function (e) {

        if (e.key === "Escape") {

            if (notificationPanel) {
                notificationPanel.classList.remove("show");
            }

            if (profileMenu) {
                profileMenu.classList.remove("show");
            }

        }

    });


})();
// ------------

/* =========================================
   ELITEPLAY RIGHT NAVBAR FUNCTIONALITY
========================================= */

(function () {

    /* =====================================
       GET ELEMENTS
    ===================================== */

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const closeNotificationPanel =
        document.getElementById("closeNotificationPanel");

    const profileBtn =
        document.getElementById("profileBtn");

    const profileMenu =
        document.getElementById("profileMenu");

    const profileClose =
        document.getElementById("profileClose");

    const profileFavorites =
        document.getElementById("profileFavorites");

    const profileHistory =
        document.getElementById("profileHistory");

    const profileContinue =
        document.getElementById("profileContinue");

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const eliteNav =
        document.querySelector(".elite-nav");


    /* =====================================
       NOTIFICATION OPEN
    ===================================== */

    if (notificationBtn && notificationPanel) {

        notificationBtn.addEventListener("click", function (event) {

            event.preventDefault();
            event.stopPropagation();

            /* Close profile */

            if (profileMenu) {
                profileMenu.classList.remove("active");
            }

            /* Toggle notification */

            notificationPanel.classList.toggle("active");

        });

    }


    /* =====================================
       CLOSE NOTIFICATION
    ===================================== */

    if (closeNotificationPanel) {

        closeNotificationPanel.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                notificationPanel.classList.remove("active");

            }
        );

    }


    /* =====================================
       PROFILE OPEN
    ===================================== */

    if (profileBtn && profileMenu) {

        profileBtn.addEventListener("click", function (event) {

            event.preventDefault();
            event.stopPropagation();

            /* Close notification */

            if (notificationPanel) {
                notificationPanel.classList.remove("active");
            }

            /* Toggle profile */

            profileMenu.classList.toggle("active");

        });

    }


    /* =====================================
       CLOSE PROFILE
    ===================================== */

    if (profileClose) {

        profileClose.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                profileMenu.classList.remove("active");

            }
        );

    }


    /* =====================================
       MY FAVORITES
    ===================================== */

    if (profileFavorites) {

        profileFavorites.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                profileMenu.classList.remove("active");

                /* Try existing Favorites section */

                const favoritesSection =
                    document.getElementById("favoritesSection");

                if (favoritesSection) {

                    favoritesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;
                }


                /* Try favorites grid */

                const favoritesGrid =
                    document.getElementById("favoritesGrid");

                if (favoritesGrid) {

                    favoritesGrid.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;
                }


                /* Existing function */

                if (typeof window.showFavorites === "function") {

                    window.showFavorites();
                    return;

                }


                if (typeof window.loadFavorites === "function") {

                    window.loadFavorites();
                    return;

                }


                console.log("Favorites section not found.");

            }
        );

    }


    /* =====================================
       WATCH HISTORY
    ===================================== */

    if (profileHistory) {

        profileHistory.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                profileMenu.classList.remove("active");


                const historySection =
                    document.getElementById("historySection");

                if (historySection) {

                    historySection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;

                }


                const historyGrid =
                    document.getElementById("historyGrid");

                if (historyGrid) {

                    historyGrid.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;

                }


                if (typeof window.showHistory === "function") {

                    window.showHistory();
                    return;

                }


                if (typeof window.loadHistory === "function") {

                    window.loadHistory();
                    return;

                }


                console.log("History section not found.");

            }
        );

    }


    /* =====================================
       CONTINUE WATCHING
    ===================================== */

    if (profileContinue) {

        profileContinue.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                profileMenu.classList.remove("active");


                const continueSection =
                    document.getElementById(
                        "continueWatchingSection"
                    );

                if (continueSection) {

                    continueSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;

                }


                const continueGrid =
                    document.getElementById(
                        "continueWatchingGrid"
                    );

                if (continueGrid) {

                    continueGrid.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;

                }


                const continueElement =
                    document.getElementById(
                        "continueWatching"
                    );

                if (continueElement) {

                    continueElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;

                }


                console.log(
                    "Continue Watching section not found."
                );

            }
        );

    }


    /* =====================================
       OUTSIDE CLICK
    ===================================== */

    document.addEventListener("click", function (event) {

        /*
         * Notification
         */

        if (
            notificationPanel &&
            notificationBtn &&
            !notificationPanel.contains(event.target) &&
            !notificationBtn.contains(event.target)
        ) {

            notificationPanel.classList.remove("active");

        }


        /*
         * Profile
         */

        if (
            profileMenu &&
            profileBtn &&
            !profileMenu.contains(event.target) &&
            !profileBtn.contains(event.target)
        ) {

            profileMenu.classList.remove("active");

        }

    });


    /* =====================================
       ESCAPE KEY
    ===================================== */

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {

            if (notificationPanel) {
                notificationPanel.classList.remove("active");
            }

            if (profileMenu) {
                profileMenu.classList.remove("active");
            }

        }

    });


    /* =====================================
       MOBILE MENU
    ===================================== */

    if (mobileMenuBtn && eliteNav) {

        mobileMenuBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                eliteNav.classList.toggle("mobile-open");

            }
        );

    }


    /* =====================================
       DEBUG
    ===================================== */

    console.log(
        "ElitePlay Navbar Loaded Successfully"
    );

})();

// =========================================\\

// FOR MOBILE DROPDOWN MENU \\

/* =========================================================
   ELITEPLAY MOBILE MENU
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("eliteMobileMenu");

    if (!mobileMenuBtn || !mobileMenu) {
        console.warn("ElitePlay mobile menu elements not found.");
        return;
    }


    /* =========================================
       OPEN / CLOSE MOBILE MENU
    ========================================= */

    function openMobileMenu() {

        mobileMenu.classList.add("active");

        mobileMenuBtn.setAttribute(
            "aria-label",
            "Close menu"
        );

    }


    function closeMobileMenu() {

        mobileMenu.classList.remove("active");

        mobileMenuBtn.setAttribute(
            "aria-label",
            "Open menu"
        );

    }


    mobileMenuBtn.addEventListener("click", function (event) {

        event.stopPropagation();

        if (mobileMenu.classList.contains("active")) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }

    });


    /* Close when clicking outside */

    document.addEventListener("click", function (event) {

        if (
            mobileMenu.classList.contains("active") &&
            !mobileMenu.contains(event.target) &&
            !mobileMenuBtn.contains(event.target)
        ) {
            closeMobileMenu();
        }

    });


    /* ESC */

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            closeMobileMenu();
        }

    });


    /* =========================================
       MOBILE NAVIGATION
       Reuses existing desktop buttons
    ========================================= */

    document.querySelectorAll("[data-mobile-nav]").forEach(function (button) {

        button.addEventListener("click", function () {

            const nav = this.dataset.mobileNav;

            closeMobileMenu();


            if (nav === "home") {

                const homeLogo = document.getElementById("homeLogo");

                if (homeLogo) {
                    homeLogo.click();
                } else {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }

            }


            if (nav === "movies") {

                const movies = document.getElementById("movies");

                if (movies) {
                    movies.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }


            if (nav === "trending") {

                const trending = document.getElementById("trendingSection");

                if (trending) {
                    trending.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }


            if (nav === "popular") {

                const popular = document.getElementById("popularSection");

                if (popular) {
                    popular.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }


            if (nav === "my-list") {

                const favorites = document.getElementById("headerFavoritesBtn");

                if (favorites) {
                    favorites.click();
                }

            }

        });

    });


    /* =========================================
       MOBILE GENRES
       Reuses existing sidebar genre buttons
    ========================================= */

    document.querySelectorAll("[data-mobile-genre]").forEach(function (button) {

        button.addEventListener("click", function () {

            const genre = this.dataset.mobileGenre;

            closeMobileMenu();


            /* Find existing sidebar genre */

            const sidebarGenre = document.querySelector(
                `.sidebar-genre[data-genre="${genre}"]`
            );


            if (sidebarGenre) {

                sidebarGenre.click();

                return;

            }


            /* Fallback to main filter */

            const filterGenre = document.querySelector(
                `.filter-btn[data-genre="${genre}"]`
            );


            if (filterGenre) {
                filterGenre.click();
            }


            /* Scroll to movies */

            setTimeout(function () {

                const movies = document.getElementById("movies");

                if (movies) {
                    movies.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }, 100);

        });

    });


    /* =========================================
       MOBILE COLOR THEMES
       Reuses existing theme buttons
    ========================================= */

    document.querySelectorAll("[data-mobile-theme]").forEach(function (button) {

        button.addEventListener("click", function () {

            const theme = this.dataset.mobileTheme;


            /* Click existing desktop theme button */

            const existingTheme = document.querySelector(
                `.theme-option[data-theme="${theme}"]`
            );


            if (existingTheme) {
                existingTheme.click();
            }


            /* Update mobile active state */

            document.querySelectorAll("[data-mobile-theme]").forEach(function (item) {

                item.classList.toggle(
                    "active",
                    item.dataset.mobileTheme === theme
                );

            });

        });

    });


    /* =========================================
       MOBILE DARK / LIGHT
       Reuses existing mode buttons
    ========================================= */

    document.querySelectorAll("[data-mobile-mode]").forEach(function (button) {

        button.addEventListener("click", function () {

            const mode = this.dataset.mobileMode;


            /* Click existing desktop mode button */

            const existingMode = document.querySelector(
                `.mode-option[data-mode="${mode}"]`
            );


            if (existingMode) {
                existingMode.click();
            }


            /* Update mobile active state */

            document.querySelectorAll("[data-mobile-mode]").forEach(function (item) {

                item.classList.toggle(
                    "active",
                    item.dataset.mobileMode === mode
                );

            });

        });

    });


    /* =========================================
       SYNC MOBILE THEME WITH DESKTOP THEME
    ========================================= */

    function syncMobileTheme() {

        const activeTheme = document.querySelector(
            ".theme-option.active"
        );

        if (!activeTheme) return;


        const currentTheme = activeTheme.dataset.theme;


        document.querySelectorAll("[data-mobile-theme]").forEach(function (button) {

            button.classList.toggle(
                "active",
                button.dataset.mobileTheme === currentTheme
            );

        });

    }


    /* =========================================
       SYNC MOBILE MODE WITH DESKTOP MODE
    ========================================= */

    function syncMobileMode() {

        const activeMode = document.querySelector(
            ".mode-option.active"
        );

        if (!activeMode) return;


        const currentMode = activeMode.dataset.mode;


        document.querySelectorAll("[data-mobile-mode]").forEach(function (button) {

            button.classList.toggle(
                "active",
                button.dataset.mobileMode === currentMode
            );

        });

    }


    syncMobileTheme();
    syncMobileMode();

});