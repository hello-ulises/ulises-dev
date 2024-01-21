import Fuse from "fuse.js";

/**
 * Initialize fuse
 */
async function initFuse() {
  const response = await fetch("/search-index.json");
  const searchIndex = await response.json();

  const fuse = new Fuse(searchIndex, {
    threshold: 0.5,
    minMatchCharLength: 4,
    keys: ["title", "content"],
  });

  return fuse;
}

/**
 * Get result card
 */
function getResultCard(result, card) {
  let resultCard = card.cloneNode(true);
  resultCard.querySelector("[data-href]").href = result.item.urlPath;
  resultCard.querySelector("[data-title]").innerText = result.item.title;
  let thumb = resultCard.querySelector("[data-thumbnail]");
  thumb.alt = result.item?.thumbnail?.alt || "test";
  thumb.src = result.item?.thumbnail?.src || "/assets/img/peace_small.png";
  const predominantColor = result.item.thumbnail.predominantColor;
  if (predominantColor) {
    resultCard
      .querySelector("[data-predominant-color]")
      .style.setProperty(
        "--predominant-color",
        `rgb(${predominantColor[0]},${predominantColor[1]},${predominantColor[2]})`
      );
  }
  return resultCard;
}

/**
 * Render search result cards
 */
function renderSearchResults(results) {
  // render search results
  let resultsCards = document.getElementById("resultsList");
  let card = document.querySelector("[data-search-result]");

  results.forEach((result, i) => {
    let resultCard = getResultCard(result, card);
    if (i == 0) {
      resultsCards.replaceChild(resultCard, card);
    } else {
      resultsCards.appendChild(resultCard);
    }
  });

  if (results.length) {
    document.querySelector(".p-search__wrapper").classList.toggle("no-results");
  }
}

/**
 * Handle paging
 */
async function handlePaging(e, el, parser) {
  e.preventDefault();
  const to = e.target.href;
  if (to) {
    let response = await fetch(to);
    let html = await response.text();
    let dom = parser.parseFromString(html, "text/html");
    let nextCardList = dom.querySelector(".post-list-past__card-list");
    el.appendChild(nextCardList);
    history.pushState(to, "", to);
  }
}

/**
 * Mutation observer callback
 */
function handleMutation(mutations, el, oldNode) {
  let newNode = mutations[0]?.addedNodes[0];
  // handle transition states
  if (newNode) {
    oldNode.classList.add("leaving");
    newNode.classList.add("entering");

    oldNode.addEventListener(
      "transitionstart",
      () => {
        setTimeout(() => {
          newNode.classList.remove("entering");
          el.removeChild(oldNode);
        }, 250);
      },
      { once: true }
    );
  }

  return newNode || oldNode;
}

(async () => {
  const route = window.location;
  let mutationObserver;

  // init navigation listeners
  const navMenuToggle = document.getElementById("js-nav-menu-toggle");
  const navMenuClasses = document.getElementById("nav").classList;
  navMenuToggle.addEventListener("click", (e) => {
    e.preventDefault();
    navMenuClasses.toggle("nav--open");
  });

  // add search event listener
  const searchInput = document.getElementById("search-form");
  searchInput.addEventListener("submit", (e) => {
    e.preventDefault();
    let searchUrl = new URL(route.origin);
    searchUrl.searchParams.append("q", e.target[0].value);
    searchUrl.pathname = "search";
    window.location = searchUrl.toString();
  });

  // handle search route
  if (route.pathname.includes("/search")) {
    const fuse = await initFuse();
    const search = new URLSearchParams(route.search);
    const query = search.get("q");
    const results = query ? fuse.search(query) : [];
    renderSearchResults(results);
    if (query) {
      document.querySelector("[data-search-query]").innerText = query;
    }
  }

  // handle events and projects routes
  if (/(events|projects)(\/\d+)?[\/]?$/.test(route.pathname)) {
    const cardListWrapper = document.querySelector(
      ".post-list-past__card-list-wrapper"
    );
    const parser = new DOMParser();
    let oldNode = document.querySelector(".post-list-past__card-list");

    // for the back button, mimic history
    addEventListener("popstate", function (e) {
      // if state is empty, we're back at the beginning
      // and we should navigate to our initial window location
      window.location = e.state ? e.state : route.href;
    });

    // init mutation observer
    mutationObserver = new MutationObserver((mutations) => {
      oldNode = handleMutation(mutations, cardListWrapper, oldNode);
    });

    mutationObserver.observe(cardListWrapper, {
      attributes: false,
      childList: true,
      subtree: false,
    });

    // add pagination listeners
    document
      .querySelector(".pagination__list")
      .addEventListener("click", (e) =>
        handlePaging(e, cardListWrapper, parser)
      );
  }
})();
