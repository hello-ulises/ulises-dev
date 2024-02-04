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
 * update active pagination page link
 */
function updateActivePage() {
  const path = window.location.pathname.split("/");
  const pageNumber = path.filter((e) => e)?.[1] - 1 || 0;
  document.querySelectorAll(".pagination__list li").forEach((e, i) => {
    e.classList.remove("active");
    if (i == pageNumber) {
      e.classList.add("active");
      e.querySelector("a").setAttribute("aria-disabled", true);
    }
  });
}

/**
 * Handle paging
 */
async function handlePageTransition(e, to, el, targetSelector, parser) {
  e.preventDefault();
  if (to) {
    let response = await fetch(to);
    let html = await response.text();
    let dom = parser.parseFromString(html, "text/html");
    let next = dom.querySelector(targetSelector);
    const clientHeight =
      targetSelector == ".post-list-past__card-list"
        ? el.clientHeight - 140
        : 0;
    window.scrollTo({ top: clientHeight, behavior: "smooth" });
    el.appendChild(next);
    history.pushState(to, "", to);
  }
}

/**
 * Post transition cleanup
 */
function updateClasses(classes) {
  let classList = document.querySelector("body").classList;
  classes.forEach((c) => classList.add(c));
}

/**
 * Mutation observer callback
 */
function handleMutation(
  mutations,
  el,
  oldNode,
  startCallback = undefined,
  endCallback = undefined,
  args = undefined
) {
  let newNode = mutations[0]?.addedNodes[0];
  // handle transition states
  if (newNode) {
    oldNode.classList.add("leaving");
    newNode.classList.add("entering");

    oldNode.addEventListener(
      "transitionstart",
      () => {
        newNode.classList.remove("entering");
        if (startCallback) {
          startCallback(args);
        } else {
          // we need this for pagination
          el.removeChild(oldNode);
        }
      },
      { once: true }
    );

    newNode.addEventListener(
      "transitionend",
      () => {
        if (endCallback) {
          endCallback(args);
        } else {
          el.removeChild(oldNode);
        }
      },
      {
        once: true,
      }
    );
  }

  return newNode || oldNode;
}

(async () => {
  const route = window.location;
  const mutationObserverOpts = {
    attributes: false,
    childList: true,
    subtree: false,
  };
  // init navigation listeners
  const navMenuToggle = document.getElementById("js-nav-menu-toggle");
  const navMenuClasses = document.getElementById("nav").classList;
  navMenuToggle.addEventListener("click", (e) => {
    e.preventDefault();
    navMenuClasses.toggle("nav--open");
  });

  const searchboxToggle = document.querySelector(".searchbox");
  searchboxToggle.addEventListener("click", (e) =>
    searchboxToggle.classList.add("searchbox--open")
  );

  // add search event listener
  const searchInput = document.getElementById("searchbox__form");
  searchInput.addEventListener("submit", (e) => {
    e.preventDefault();
    let searchUrl = new URL(route.origin);
    searchUrl.searchParams.append("q", e.target[0].value);
    searchUrl.pathname = "search/";
    window.location = searchUrl.toString();
  });

  // handle home route
  if (route.pathname == "/") {
    // handle header madlib
    const madlib = document.querySelector(".madlib__list");
    let nounCount = madlib.children.length;
    let activeIndex = nounCount % 2 ? (nounCount - 1) / 2 : nounCount / 2;
    madlib.children[activeIndex].classList.add("active");

    setInterval(() => {
      for (let n of madlib.children) {
        n.classList.remove("active");
      }
      let oldNode = madlib.removeChild(madlib.children[0]);
      madlib.appendChild(oldNode);
      madlib.children[activeIndex].classList.add("active");
    }, 2000);
  }

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
    // disable active pagination
    updateActivePage();

    // get item type
    const path = window.location.pathname;
    const itemType = path.split("/").filter((e) => e)[0];

    // card list pagination
    const cardListWrapper = document.querySelector(
      ".post-list-past__card-list-wrapper"
    );

    const parser = new DOMParser();
    let oldListNode = document.querySelector(".post-list-past__card-list");
    let oldMainNode = document.querySelector("main");

    // for the back button, mimic history
    addEventListener("popstate", function (e) {
      // if state is empty, we're back at the beginning
      // and we should navigate to our initial window location
      window.location = e.state ? e.state : route.href;
    });

    /**
     * Pagination
     */
    const pagination = document.querySelector(".pagination__list");
    if (pagination) {
      // add pagination listeners
      pagination.addEventListener("click", (e) =>
        handlePageTransition(
          e,
          e.target.href,
          cardListWrapper,
          ".post-list-past__card-list",
          parser
        )
      );

      // init mutation observer
      const paginationObserver = new MutationObserver((mutations) => {
        oldListNode = handleMutation(
          mutations,
          cardListWrapper,
          oldListNode,
          null,
          updateActivePage
        );
      });

      paginationObserver.observe(cardListWrapper, mutationObserverOpts);
    }

    // postpage transition
    const mainWrapper = document.querySelector(".main-wrapper");
    const postcards = document.querySelectorAll(".postcard a");
    if (postcards.length) {
      postcards.forEach((postLink) => {
        postLink.addEventListener("click", (e) =>
          handlePageTransition(
            e,
            postLink.attributes.href.value,
            mainWrapper,
            "main",
            parser
          )
        );
      });

      // init mutation observer
      const postObserver = new MutationObserver((mutations) => {
        oldMainNode = handleMutation(
          mutations,
          mainWrapper,
          oldMainNode,
          updateClasses,
          null,
          ["p-post-page", itemType]
        );
      });

      postObserver.observe(mainWrapper, mutationObserverOpts);
    }
  }
})();
