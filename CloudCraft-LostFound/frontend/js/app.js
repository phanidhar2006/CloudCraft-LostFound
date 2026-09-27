/* =========================================================
   CLOUDCRAFT LOST & FOUND
   FINAL MASTER JAVASCRIPT
========================================================= */

const API_BASE = "";


/* =========================================================
   GLOBAL DATA
========================================================= */

let allApprovedItems = [];
let allAdminItems = [];
let adminKey = "";


/* =========================================================
   COMMON HELPERS
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "Not specified";
    }

    try {

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return value;

    }
}


function showMessage(element, message, type = "info") {

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        "message " + type;

    element.style.display = "block";
}


function hideMessage(element) {

    if (!element) {
        return;
    }

    element.style.display = "none";
}


/* =========================================================
   HOME PAGE
========================================================= */

function initializeHomePage() {

    console.log("CloudCraft: Home page initialized.");

}


/* =========================================================
   REPORT ITEM
========================================================= */

function initializeReportPage() {

    const form =
        document.getElementById("reportForm");

    if (!form) {
        return;
    }

    const message =
        document.getElementById("reportMessage");

    const submitButton =
        document.getElementById("submitReportBtn");

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    "Submitting...";
            }

            hideMessage(message);

            try {

                const formData =
                    new FormData(form);

                const response =
                    await fetch(
                        API_BASE + "/api/items",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Unable to submit report."
                    );

                }

                showMessage(
                    message,
                    data.message ||
                    "Report submitted successfully.",
                    "success"
                );

                form.reset();

            } catch (error) {

                console.error(
                    "Report submission error:",
                    error
                );

                showMessage(
                    message,
                    error.message ||
                    "Something went wrong.",
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Submit Report";

                }

            }

        }
    );

}


/* =========================================================
   SEARCH PAGE
========================================================= */

async function initializeSearchPage() {

    const itemGrid =
        document.getElementById("itemGrid");

    if (!itemGrid) {
        return;
    }

    await loadApprovedItems();

    initializeSearchFilters();

    initializeItemModal();

}


/* =========================================================
   LOAD APPROVED ITEMS
========================================================= */

async function loadApprovedItems() {

    const itemGrid =
        document.getElementById("itemGrid");

    const loading =
        document.getElementById("searchLoading");

    const empty =
        document.getElementById("emptyState");

    if (loading) {
        loading.style.display = "block";
    }

    if (empty) {
        empty.style.display = "none";
    }

    try {

        const response =
            await fetch(
                API_BASE + "/api/items"
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to load items."
            );

        }

        allApprovedItems =
            Array.isArray(data)
                ? data
                : (data.items || []);

        renderItems(allApprovedItems);

    } catch (error) {

        console.error(
            "Search loading error:",
            error
        );

        allApprovedItems = [];

        if (itemGrid) {

            itemGrid.innerHTML =
                '<div class="info-message">' +
                escapeHTML(error.message) +
                "</div>";

        }

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }

}


/* =========================================================
   RENDER SEARCH ITEMS
========================================================= */

function renderItems(items) {

    const itemGrid =
        document.getElementById("itemGrid");

    const empty =
        document.getElementById("emptyState");

    const resultsCount =
        document.getElementById("resultsCount");

    if (!itemGrid) {
        return;
    }

    if (resultsCount) {

        resultsCount.textContent =
            items.length +
            (items.length === 1
                ? " item found"
                : " items found");

    }

    if (!items.length) {

        itemGrid.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;
    }

    if (empty) {
        empty.style.display = "none";
    }


    itemGrid.innerHTML =
        items.map(
            function (item) {

                const image =
                    item.imageUrl ||
                    item.imageURL ||
                    "";


                const type =
                    (item.type || "lost")
                        .toLowerCase();


                const possibleMatch =
                    item.possibleMatch === true ||
                    item.possibleMatch === "true";


                return `
                    <article
                        class="item-card item-card-photo"
                        data-item-id="${escapeHTML(item.itemId)}"
                        tabindex="0"
                        role="button"
                        aria-label="View details for ${escapeHTML(item.title)}"
                    >

                        <div class="item-card-image-wrapper">

                            ${
                                image
                                    ? `
                                        <img
                                            src="${escapeHTML(image)}"
                                            alt="${escapeHTML(item.title || "Item image")}"
                                            class="item-card-image"
                                            loading="lazy"
                                        >
                                      `
                                    : `
                                        <div class="item-image-placeholder">
                                            📦
                                        </div>
                                      `
                            }

                            <span
                                class="item-type-badge ${type}"
                            >
                                ${escapeHTML(
                                    type.charAt(0).toUpperCase() +
                                    type.slice(1)
                                )}
                            </span>

                        </div>


                        <div class="item-card-content">

                            <div class="item-card-top">

                                <h3>
                                    ${escapeHTML(item.title)}
                                </h3>

                                ${
                                    possibleMatch
                                        ? `
                                            <span class="match-badge">
                                                Possible Match
                                            </span>
                                          `
                                        : ""
                                }

                            </div>


                            <p class="item-card-description">

                                ${escapeHTML(
                                    item.description ||
                                    "No description provided."
                                )}

                            </p>


                            <div class="item-card-meta">

                                <span>
                                    📍
                                    ${escapeHTML(
                                        item.location ||
                                        "Not specified"
                                    )}
                                </span>

                                <span>
                                    📅
                                    ${formatDate(item.date)}
                                </span>

                            </div>


                            <div class="item-card-footer">

                                <span>
                                    ${escapeHTML(
                                        item.category ||
                                        "Other"
                                    )}
                                </span>

                                <span>
                                    View Details →
                                </span>

                            </div>

                        </div>

                    </article>
                `;

            }
        ).join("");

}


/* =========================================================
   SEARCH FILTERS
========================================================= */

function initializeSearchFilters() {

    const searchInput =
        document.getElementById("searchInput");

    const typeFilter =
        document.getElementById("typeFilter");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const locationFilter =
        document.getElementById("locationFilter");

    const searchButton =
        document.getElementById("searchBtn");

    const clearButton =
        document.getElementById("clearSearchBtn");


    function applyFilters() {

        const query =
            (searchInput?.value || "")
                .trim()
                .toLowerCase();

        const type =
            (typeFilter?.value || "all")
                .toLowerCase();

        const category =
            (categoryFilter?.value || "all")
                .toLowerCase();

        const location =
            (locationFilter?.value || "")
                .trim()
                .toLowerCase();


        const filtered =
            allApprovedItems.filter(
                function (item) {

                    const title =
                        String(item.title || "")
                            .toLowerCase();

                    const description =
                        String(item.description || "")
                            .toLowerCase();

                    const itemCategory =
                        String(item.category || "")
                            .toLowerCase();

                    const itemLocation =
                        String(item.location || "")
                            .toLowerCase();

                    const itemType =
                        String(item.type || "")
                            .toLowerCase();


                    const matchesQuery =
                        !query ||
                        title.includes(query) ||
                        description.includes(query) ||
                        itemCategory.includes(query) ||
                        itemLocation.includes(query);


                    const matchesType =
                        type === "all" ||
                        itemType === type;


                    const matchesCategory =
                        category === "all" ||
                        itemCategory === category;


                    const matchesLocation =
                        !location ||
                        itemLocation.includes(location);


                    return (
                        matchesQuery &&
                        matchesType &&
                        matchesCategory &&
                        matchesLocation
                    );

                }
            );


        renderItems(filtered);

    }


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            applyFilters
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    applyFilters();

                }

            }
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (locationFilter) {

        locationFilter.addEventListener(
            "input",
            function () {

                applyFilters();

            }
        );

    }


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            function () {

                if (searchInput) {
                    searchInput.value = "";
                }

                if (typeFilter) {
                    typeFilter.value = "all";
                }

                if (categoryFilter) {
                    categoryFilter.value = "all";
                }

                if (locationFilter) {
                    locationFilter.value = "";
                }

                renderItems(
                    allApprovedItems
                );

            }
        );

    }

}


/* =========================================================
   ITEM MODAL
========================================================= */

function initializeItemModal() {

    const itemGrid =
        document.getElementById("itemGrid");

    const modal =
        document.getElementById("itemModal");

    const overlay =
        document.getElementById("itemModalOverlay");

    const closeButton =
        document.getElementById("closeItemModal");


    if (!itemGrid || !modal) {
        return;
    }


    itemGrid.addEventListener(
        "click",
        function (event) {

            const card =
                event.target.closest(
                    ".item-card"
                );

            if (!card) {
                return;
            }

            const itemId =
                card.dataset.itemId;

            if (itemId) {

                openItemModal(itemId);

            }

        }
    );


    itemGrid.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {
                return;
            }

            const card =
                event.target.closest(
                    ".item-card"
                );

            if (!card) {
                return;
            }

            event.preventDefault();

            const itemId =
                card.dataset.itemId;

            if (itemId) {

                openItemModal(itemId);

            }

        }
    );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeItemModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeItemModal
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal.classList.contains("show")
            ) {

                closeItemModal();

            }

        }
    );


    console.log(
        "CloudCraft: item modal initialized."
    );

}


/* =========================================================
   OPEN ITEM MODAL
========================================================= */

function openItemModal(itemId) {

    const modal =
        document.getElementById("itemModal");

    if (!modal) {
        return;
    }

    const item =
        allApprovedItems.find(
            function (entry) {

                return String(entry.itemId) ===
                    String(itemId);

            }
        );


    if (!item) {
        return;
    }


    const image =
        document.getElementById(
            "modalItemImage"
        );

    const type =
        document.getElementById(
            "modalItemType"
        );

    const title =
        document.getElementById(
            "modalItemTitle"
        );

    const description =
        document.getElementById(
            "modalItemDescription"
        );

    const category =
        document.getElementById(
            "modalItemCategory"
        );

    const location =
        document.getElementById(
            "modalItemLocation"
        );

    const date =
        document.getElementById(
            "modalItemDate"
        );

    const color =
        document.getElementById(
            "modalItemColor"
        );

    const matchBadge =
        document.getElementById(
            "modalMatchBadge"
        );

    const contactName =
        document.getElementById(
            "modalContactName"
        );

    const contactEmail =
        document.getElementById(
            "modalContactEmail"
        );

    const contactEmailRow =
        document.getElementById(
            "modalContactEmailRow"
        );

    const contactPhone =
        document.getElementById(
            "modalContactPhone"
        );

    const contactPhoneRow =
        document.getElementById(
            "modalContactPhoneRow"
        );


    if (image) {

        if (item.imageUrl) {

            image.src =
                item.imageUrl;

            image.alt =
                item.title ||
                "Item image";

            image.style.display =
                "block";

        } else {

            image.removeAttribute("src");

            image.style.display =
                "none";

        }

    }


    if (type) {

        const itemType =
            String(
                item.type || "lost"
            );

        type.textContent =
            itemType.charAt(0).toUpperCase() +
            itemType.slice(1);

        type.className =
            "item-type-badge " +
            itemType.toLowerCase();

    }


    if (title) {

        title.textContent =
            item.title ||
            "Untitled Item";

    }


    if (description) {

        description.textContent =
            item.description ||
            "No description provided.";

    }


    if (category) {

        category.textContent =
            item.category ||
            "Not specified";

    }


    if (location) {

        location.textContent =
            item.location ||
            "Not specified";

    }


    if (date) {

        date.textContent =
            formatDate(item.date);

    }


    if (color) {

        color.textContent =
            item.color ||
            "Not specified";

    }


    const possibleMatch =
        item.possibleMatch === true ||
        item.possibleMatch === "true";


    if (matchBadge) {

        matchBadge.style.display =
            possibleMatch
                ? "inline-flex"
                : "none";

    }


    if (contactName) {

        contactName.textContent =
            item.contactName ||
            "Not provided";

    }


    if (contactEmailRow) {

        contactEmailRow.style.display =
            item.contactEmail
                ? "flex"
                : "none";

    }


    if (contactEmail) {

        contactEmail.textContent =
            item.contactEmail ||
            "";

    }


    if (contactPhoneRow) {

        contactPhoneRow.style.display =
            item.contactPhone
                ? "flex"
                : "none";

    }


    if (contactPhone) {

        contactPhone.textContent =
            item.contactPhone ||
            "";

    }


    modal.classList.add("show");

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CLOSE ITEM MODAL
========================================================= */

function closeItemModal() {

    const modal =
        document.getElementById(
            "itemModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow =
        "";

}


/* =========================================================
   ADMIN LOGIN — IMPORTANT
========================================================= */

function initializeAdminLogin() {

    const form =
        document.getElementById(
            "adminLoginForm"
        );

    const input =
        document.getElementById(
            "adminKey"
        );

    const button =
        document.getElementById(
            "loginBtn"
        );

    const message =
        document.getElementById(
            "loginMessage"
        );


    if (!form || !input) {
        return;
    }


    console.log(
        "CloudCraft: Admin login initialized."
    );


    /*
       Remove any existing query-string admin key.
       This prevents:
       login.html?adminKey=...
    */

    if (
        window.location.search
    ) {

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

    }


    /*
       IMPORTANT:
       We explicitly prevent normal HTML submission.
    */

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            event.stopPropagation();


            const key =
                input.value.trim();


            if (!key) {

                showLoginMessage(
                    message,
                    "Please enter the admin access key.",
                    "error"
                );

                input.focus();

                return;

            }


            if (button) {

                button.disabled = true;

                button.innerHTML =
                    "<span>⏳</span>" +
                    "<span>Signing In...</span>";

            }


            hideMessage(message);


            try {

                /*
                   Test the key against the backend.
                   The backend admin routes require
                   X-Admin-Key.
                */

                const response =
                    await fetch(
                        API_BASE +
                        "/api/admin/stats",
                        {
                            method: "GET",
                            headers: {
                                "X-Admin-Key": key
                            }
                        }
                    );


                if (response.status === 401) {

                    throw new Error(
                        "Invalid admin access key."
                    );

                }


                if (!response.ok) {

                    let errorMessage =
                        "Unable to verify admin access.";

                    try {

                        const data =
                            await response.json();

                        errorMessage =
                            data.error ||
                            errorMessage;

                    } catch (error) {
                        // Ignore JSON parsing error.
                    }

                    throw new Error(
                        errorMessage
                    );

                }


                /*
                   Login successful.
                   Store only in sessionStorage,
                   not localStorage.
                */

                sessionStorage.setItem(
                    "cloudcraftAdminKey",
                    key
                );


                showLoginMessage(
                    message,
                    "Login successful. Opening dashboard...",
                    "success"
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "/admin.html";

                    },
                    500
                );


            } catch (error) {

                console.error(
                    "Admin login error:",
                    error
                );


                showLoginMessage(
                    message,
                    error.message ||
                    "Login failed.",
                    "error"
                );


                if (button) {

                    button.disabled = false;

                    button.innerHTML =
                        "<span>🔐</span>" +
                        "<span>Sign In to Dashboard</span>";

                }

            }

        }
    );

}


/* =========================================================
   LOGIN MESSAGE
========================================================= */

function showLoginMessage(
    element,
    message,
    type
) {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.style.display =
        "block";

    element.className =
        "login-message " +
        type;

}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

async function initializeAdminPage() {

    const table =
        document.getElementById(
            "adminItemsTable"
        );

    if (!table) {
        return;
    }


    adminKey =
        sessionStorage.getItem(
            "cloudcraftAdminKey"
        ) || "";


    /*
       If there is no session key,
       return to login page.
    */

    if (!adminKey) {

        window.location.href =
            "/login.html";

        return;

    }


    initializeAdminControls();

    await loadAdminDashboard();

}


/* =========================================================
   ADMIN CONTROLS
========================================================= */

function initializeAdminControls() {

    const refreshButton =
        document.getElementById(
            "refreshAdminBtn"
        );

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                await loadAdminDashboard();

            }
        );

    }


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(
                    "cloudcraftAdminKey"
                );

                window.location.href =
                    "/login.html";

            }
        );

    }


    const searchInput =
        document.getElementById(
            "adminSearchInput"
        );

    const statusFilter =
        document.getElementById(
            "adminStatusFilter"
        );

    const typeFilter =
        document.getElementById(
            "adminTypeFilter"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyAdminFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyAdminFilters
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            applyAdminFilters
        );

    }

}


/* =========================================================
   LOAD ADMIN DASHBOARD
========================================================= */

async function loadAdminDashboard() {

    const loading =
        document.getElementById(
            "adminLoading"
        );

    const table =
        document.getElementById(
            "adminItemsTable"
        );

    const empty =
        document.getElementById(
            "adminEmpty"
        );


    if (loading) {
        loading.style.display = "block";
    }

    if (empty) {
        empty.style.display = "none";
    }


    try {

        const statsResponse =
            await fetch(
                API_BASE +
                "/api/admin/stats",
                {
                    headers: {
                        "X-Admin-Key":
                            adminKey
                    }
                }
            );


        if (statsResponse.status === 401) {

            sessionStorage.removeItem(
                "cloudcraftAdminKey"
            );

            window.location.href =
                "/login.html";

            return;

        }


        const stats =
            await statsResponse.json();


        if (!statsResponse.ok) {

            throw new Error(
                stats.error ||
                "Unable to load statistics."
            );

        }


        updateAdminStats(stats);


        const itemsResponse =
            await fetch(
                API_BASE +
                "/api/admin/items",
                {
                    headers: {
                        "X-Admin-Key":
                            adminKey
                    }
                }
            );


        if (itemsResponse.status === 401) {

            sessionStorage.removeItem(
                "cloudcraftAdminKey"
            );

            window.location.href =
                "/login.html";

            return;

        }


        const itemsData =
            await itemsResponse.json();


        if (!itemsResponse.ok) {

            throw new Error(
                itemsData.error ||
                "Unable to load reports."
            );

        }


        allAdminItems =
            Array.isArray(itemsData)
                ? itemsData
                : (itemsData.items || []);


        renderAdminItems(
            allAdminItems
        );


    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );


        if (table) {

            table.innerHTML =
                `
                <tr>
                    <td
                        colspan="8"
                        style="text-align:center;padding:40px;"
                    >
                        ${escapeHTML(
                            error.message ||
                            "Unable to load dashboard."
                        )}
                    </td>
                </tr>
                `;

        }

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }

}


/* =========================================================
   ADMIN STATISTICS
========================================================= */

function updateAdminStats(responseData) {

    /*
       Backend returns:
       {
           "stats": {
               "total": 3,
               "pending": 0,
               "approved": 2,
               "rejected": 1
           }
       }

       Support both the wrapped response and a direct stats object.
    */

    const stats =
        responseData?.stats ||
        responseData ||
        {};


    const total =
        document.getElementById(
            "totalItems"
        );

    const pending =
        document.getElementById(
            "pendingItems"
        );

    const approved =
        document.getElementById(
            "approvedItems"
        );

    const rejected =
        document.getElementById(
            "rejectedItems"
        );


    if (total) {

        total.textContent =
            stats.total ??
            stats.totalItems ??
            0;

    }


    if (pending) {

        pending.textContent =
            stats.pending ??
            stats.pendingItems ??
            0;

    }


    if (approved) {

        approved.textContent =
            stats.approved ??
            stats.approvedItems ??
            0;

    }


    if (rejected) {

        rejected.textContent =
            stats.rejected ??
            stats.rejectedItems ??
            0;

    }

}


/* =========================================================
   RENDER ADMIN ITEMS
========================================================= */

function renderAdminItems(items) {

    const table =
        document.getElementById(
            "adminItemsTable"
        );

    const empty =
        document.getElementById(
            "adminEmpty"
        );

    const resultCount =
        document.getElementById(
            "adminResultCount"
        );


    if (!table) {
        return;
    }


    if (resultCount) {

        resultCount.textContent =
            items.length +
            (
                items.length === 1
                    ? " item"
                    : " items"
            );

    }


    if (!items.length) {

        table.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;

    }


    if (empty) {
        empty.style.display = "none";
    }


    table.innerHTML =
        items.map(
            function (item) {

                const status =
                    String(
                        item.status ||
                        "pending"
                    ).toLowerCase();


                const type =
                    String(
                        item.type ||
                        "lost"
                    ).toLowerCase();


                const possibleMatch =
                    item.possibleMatch === true ||
                    item.possibleMatch === "true";


                const image =
                    item.imageUrl ||
                    item.imageURL ||
                    "";


                return `
                    <tr>

                        <td>

                            <div class="admin-item-cell">

                                <div class="admin-item-image">

                                    ${
                                        image
                                            ? `
                                                <img
                                                    src="${escapeHTML(image)}"
                                                    alt="${escapeHTML(item.title || "Item")}"
                                                    loading="lazy"
                                                >
                                              `
                                            : "📦"
                                    }

                                </div>


                                <div class="admin-item-info">

                                    <strong>
                                        ${escapeHTML(
                                            item.title ||
                                            "Untitled"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            item.contactName ||
                                            "No contact"
                                        )}
                                    </span>

                                </div>

                            </div>

                        </td>


                        <td>

                            <span
                                class="admin-type ${type}"
                            >
                                ${escapeHTML(type)}
                            </span>

                        </td>


                        <td>
                            ${escapeHTML(
                                item.category ||
                                "Other"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                item.location ||
                                "Not specified"
                            )}
                        </td>


                        <td>
                            ${formatDate(item.date)}
                        </td>


                        <td>

                            <span
                                class="admin-status ${status}"
                            >
                                ${escapeHTML(status)}
                            </span>

                        </td>


                        <td>

                            ${
                                possibleMatch
                                    ? `
                                        <span class="admin-match">
                                            ✓ Possible
                                        </span>
                                      `
                                    : `
                                        <span>
                                            —
                                        </span>
                                      `
                            }

                        </td>


                        <td>

                            <div class="admin-actions">

                                ${
                                    status === "pending"
                                        ? `
                                            <button
                                                type="button"
                                                class="admin-action-btn approve"
                                                onclick="approveAdminItem('${escapeHTML(item.itemId)}')"
                                            >
                                                ✓ Approve
                                            </button>

                                            <button
                                                type="button"
                                                class="admin-action-btn reject"
                                                onclick="rejectAdminItem('${escapeHTML(item.itemId)}')"
                                            >
                                                ✕ Reject
                                            </button>
                                          `
                                        : ""
                                }


                                <button
                                    type="button"
                                    class="admin-action-btn delete"
                                    onclick="deleteAdminItem('${escapeHTML(item.itemId)}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   ADMIN FILTERS
========================================================= */

function applyAdminFilters() {

    const searchInput =
        document.getElementById(
            "adminSearchInput"
        );

    const statusFilter =
        document.getElementById(
            "adminStatusFilter"
        );

    const typeFilter =
        document.getElementById(
            "adminTypeFilter"
        );


    const query =
        (searchInput?.value || "")
            .trim()
            .toLowerCase();


    const status =
        (statusFilter?.value || "all")
            .toLowerCase();


    const type =
        (typeFilter?.value || "all")
            .toLowerCase();


    const filtered =
        allAdminItems.filter(
            function (item) {

                const text =
                    [
                        item.title,
                        item.category,
                        item.location,
                        item.contactName,
                        item.contactEmail
                    ]
                    .join(" ")
                    .toLowerCase();


                const itemStatus =
                    String(
                        item.status ||
                        ""
                    ).toLowerCase();


                const itemType =
                    String(
                        item.type ||
                        ""
                    ).toLowerCase();


                return (
                    (!query ||
                        text.includes(query)) &&

                    (
                        status === "all" ||
                        itemStatus === status
                    ) &&

                    (
                        type === "all" ||
                        itemType === type
                    )
                );

            }
        );


    renderAdminItems(
        filtered
    );

}


/* =========================================================
   CLEAR ADMIN FILTERS
========================================================= */

function clearAdminFilters() {

    const searchInput =
        document.getElementById(
            "adminSearchInput"
        );

    const statusFilter =
        document.getElementById(
            "adminStatusFilter"
        );

    const typeFilter =
        document.getElementById(
            "adminTypeFilter"
        );


    if (searchInput) {
        searchInput.value = "";
    }

    if (statusFilter) {
        statusFilter.value = "all";
    }

    if (typeFilter) {
        typeFilter.value = "all";
    }


    renderAdminItems(
        allAdminItems
    );

}


/* =========================================================
   ADMIN APPROVE
========================================================= */

async function approveAdminItem(itemId) {

    if (!adminKey) {

        adminKey =
            sessionStorage.getItem(
                "cloudcraftAdminKey"
            ) || "";

    }


    if (!adminKey) {

        window.location.href =
            "/login.html";

        return;

    }


    try {

        const response =
            await fetch(
                API_BASE +
                "/api/admin/items/" +
                encodeURIComponent(itemId) +
                "/approve",
                {
                    method: "PUT",
                    headers: {
                        "X-Admin-Key":
                            adminKey
                    }
                }
            );


        const data =
            await response.json();


        if (response.status === 401) {

            sessionStorage.removeItem(
                "cloudcraftAdminKey"
            );

            window.location.href =
                "/login.html";

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to approve item."
            );

        }


        showAdminMessage(
            data.message ||
            "Item approved successfully.",
            "success"
        );


        await loadAdminDashboard();


    } catch (error) {

        console.error(
            error
        );

        showAdminMessage(
            error.message ||
            "Unable to approve item.",
            "error"
        );

    }

}


/* =========================================================
   ADMIN REJECT
========================================================= */

async function rejectAdminItem(itemId) {

    if (!adminKey) {

        adminKey =
            sessionStorage.getItem(
                "cloudcraftAdminKey"
            ) || "";

    }


    if (!adminKey) {

        window.location.href =
            "/login.html";

        return;

    }


    try {

        const response =
            await fetch(
                API_BASE +
                "/api/admin/items/" +
                encodeURIComponent(itemId) +
                "/reject",
                {
                    method: "PUT",
                    headers: {
                        "X-Admin-Key":
                            adminKey
                    }
                }
            );


        const data =
            await response.json();


        if (response.status === 401) {

            sessionStorage.removeItem(
                "cloudcraftAdminKey"
            );

            window.location.href =
                "/login.html";

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to reject item."
            );

        }


        showAdminMessage(
            data.message ||
            "Item rejected successfully.",
            "success"
        );


        await loadAdminDashboard();


    } catch (error) {

        console.error(
            error
        );

        showAdminMessage(
            error.message ||
            "Unable to reject item.",
            "error"
        );

    }

}


/* =========================================================
   ADMIN DELETE
========================================================= */

async function deleteAdminItem(itemId) {

    if (!confirm(
        "Are you sure you want to permanently delete this item?"
    )) {

        return;

    }


    if (!adminKey) {

        adminKey =
            sessionStorage.getItem(
                "cloudcraftAdminKey"
            ) || "";

    }


    if (!adminKey) {

        window.location.href =
            "/login.html";

        return;

    }


    try {

        const response =
            await fetch(
                API_BASE +
                "/api/admin/items/" +
                encodeURIComponent(itemId),
                {
                    method: "DELETE",
                    headers: {
                        "X-Admin-Key":
                            adminKey
                    }
                }
            );


        const data =
            await response.json();


        if (response.status === 401) {

            sessionStorage.removeItem(
                "cloudcraftAdminKey"
            );

            window.location.href =
                "/login.html";

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to delete item."
            );

        }


        showAdminMessage(
            data.message ||
            "Item deleted successfully.",
            "success"
        );


        await loadAdminDashboard();


    } catch (error) {

        console.error(
            error
        );

        showAdminMessage(
            error.message ||
            "Unable to delete item.",
            "error"
        );

    }

}


/* =========================================================
   ADMIN MESSAGE
========================================================= */

function showAdminMessage(
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            "adminMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;

    element.className =
        "message " + type;

    element.style.display =
        "block";


    setTimeout(
        function () {

            element.style.display =
                "none";

        },
        4000
    );

}


/* =========================================================
   HEALTH CHECK
========================================================= */

async function checkBackendHealth() {

    try {

        const response =
            await fetch(
                API_BASE +
                "/api/health"
            );


        const data =
            await response.json();


        console.log(
            "CloudCraft API:",
            data
        );


    } catch (error) {

        console.warn(
            "CloudCraft API health check failed:",
            error
        );

    }

}


/* =========================================================
   GLOBAL FILTER FUNCTIONS
   Needed by buttons in admin.html
========================================================= */

window.applyAdminFilters =
    applyAdminFilters;


window.clearAdminFilters =
    clearAdminFilters;


window.approveAdminItem =
    approveAdminItem;


window.rejectAdminItem =
    rejectAdminItem;


window.deleteAdminItem =
    deleteAdminItem;


window.openItemModal =
    openItemModal;


window.closeItemModal =
    closeItemModal;


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "CloudCraft: JavaScript loaded."
        );


        initializeHomePage();

        initializeReportPage();

        initializeSearchPage();

        initializeAdminLogin();

        initializeAdminPage();

        checkBackendHealth();

    }
);