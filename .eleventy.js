const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const Image = require("@11ty/eleventy-img");
const fs = require("fs-extra");
const esbuild = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const ColorThief = require("colorthief");

const EXCLUDE_IMG_TYPE = ["gif"];
// valid collection item "types" set in tags
const ITEM_TYPES = ["events", "projects"];
// which title to skip in rendering navigation
const NAV_TITLES_TO_SKIP = ["home"];

// set markdown it options
const mdOptions = {
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
};
const markdownIt = require("markdown-it");
// adds support for inline html attributes (i.e., {.class} )
let markdownItAttrs = require("markdown-it-attrs");
const md = new markdownIt(mdOptions);
md.use(markdownItAttrs);

// returns validated item type from list of tags
function getItemType(tags) {
  const itemType = ITEM_TYPES.filter((e) => tags && tags.includes(e));
  return itemType[0];
}

module.exports = (eleventyConfig) => {
  // search index
  eleventyConfig.addGlobalData("searchIndex", []);
  eleventyConfig.addGlobalData("predominantColors", {});

  // read in dominant colors data before build
  eleventyConfig.on("eleventy.before", () => {
    const filePath = `${eleventyConfig.dir.input}/predominant-colors.json`;
    if (fs.existsSync(filePath)) {
      const data = fs.readJsonSync(filePath, { flag: "r" });
      eleventyConfig.globalData.predominantColors = data;
    }
  });

  /**
   * Render settings for markdown parser
   */
  // markdown
  eleventyConfig.setLibrary("md", md);
  /* search index */
  md.core.ruler.before("block", "raw", function replace(state) {
    // add prerendered content to search index
    if (
      state.env.published &&
      state.env.tags &&
      state.env.tags.includes("index")
    ) {
      const urlPath = eleventyConfig.getFilter("urlPath")(state.env);
      if (urlPath) {
        let raw = state.src.replace(/\n/g, "");
        eleventyConfig.globalData.searchIndex.map((e) => {
          if (e.urlPath == urlPath) {
            e.content = raw;
          }
          return e;
        });
      }
    }
  });
  // replace image parser with 11ty image plugin
  eleventyConfig.amendLibrary("md", (mdLib) => {
    mdLib.renderer.rules.image = (
      tokens,
      index,
      rendererOptions,
      env,
      renderer
    ) => {
      const img = Object.fromEntries(
        tokens.filter((e) => e.type == "image")[0].attrs
      );
      const imgSrc = eleventyConfig.dir.input + img.src;
      // image plugin options
      const imgOptions = {
        widths: [300, 600, 800],
        urlPath: `/${eleventyConfig.dir.images}`,
        outputDir: `${eleventyConfig.dir.output}/${eleventyConfig.dir.images}`,
      };
      // markdown-it doesn't work with async so use it synchronously
      // https://www.11ty.dev/docs/plugins/image/#synchronous-shortcode
      Image(imgSrc, imgOptions);
      const metadata = Image.statsSync(imgSrc, imgOptions);
      const imageMarkup = Image.generateHTML(metadata, {
        ...img,
        whitespaceMode: "inline",
        // required for multiple width
        sizes: [300, 600, 800],
      });

      return imageMarkup;
    };

    return mdLib;
  });

  /**
   * File processing
   */
  // Copy the "assets" directory to the compiled "_site" folder.
  eleventyConfig.addPassthroughCopy("assets/favicon");
  eleventyConfig.addPassthroughCopy("assets/font");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/img/peace_small.png");
  eleventyConfig.addPassthroughCopy("admin");

  // for prefix path as needed for relative paths
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  /**
   * Process image using sharp plugin and return image metadata
   */
  eleventyConfig.addAsyncFilter("processImage", async (data) => {
    const featuredImg = data.featured_img;
    const urlPath = data.page.url;

    if (!data.published || !featuredImg || !urlPath) {
      return undefined;
    }

    const metadata = await Image(`.${featuredImg}`, {
      widths: [400, 800],
      urlPath: `/${eleventyConfig.dir.images}`,
      outputDir: `./${eleventyConfig.dir.output}/${eleventyConfig.dir.images}`,
      sharpOptions: {
        animated: true,
      },
    });

    // add post to search index
    let post = {
      title: data.title,
      urlPath: urlPath,
      featuredImg: data.featured_img,
      thumbnail: {
        src: metadata.jpeg[0].url,
        width: metadata.jpeg[metadata.jpeg.length - 1].width,
        alt: "test",
        predominantColor:
          eleventyConfig.globalData.predominantColors[data.featured_img],
      },
    };
    eleventyConfig.globalData.searchIndex.push(post);
    return metadata;
  });

  // add predominant color filter
  eleventyConfig.addAsyncFilter("getPredominantColor", async (value) => {
    let predominantColor = [66, 66, 66];

    if (value && !EXCLUDE_IMG_TYPE.includes(value.slice(-3))) {
      // check if we have already have the color data saved
      predominantColor = eleventyConfig.globalData.predominantColors[value];
      if (predominantColor == undefined) {
        predominantColor = await ColorThief.getColor(`./${value}`);
        // add color for new images
        eleventyConfig.globalData.predominantColors[value] = predominantColor;
      }
    }

    return `rgb(${predominantColor[0]},${predominantColor[1]},${predominantColor[2]})`;
  });

  // add category filter
  eleventyConfig.addFilter("byCategory", (collection, category) =>
    collection.filter((e) => e.data.categories == category)
  );

  // add upcoming filter
  eleventyConfig.addFilter("upcoming", (collection) => {
    const now = new Date();
    return collection.filter((e) => {
      const eventDate = new Date(e.data.event_date || e.data.date);
      return now < eventDate;
    });
  });

  // add url path filter for collection item pages
  // returns string "/item_type/YYYY/slug"
  eleventyConfig.addFilter("urlPath", (item) => {
    let urlPath;
    // need to test for null when using filter in directory js data file
    // check for whether this is an allowed collection item "type"
    const itemType = getItemType(item.tags);
    if (itemType) {
      let year = item.event_date || item.date;
      year = new Date(year).getFullYear();
      urlPath = `/${itemType}/${year}/${item.page.fileSlug}.html`;
    }
    return urlPath;
  });

  // add markdown-it liquid md filter using global md lib
  eleventyConfig.addLiquidFilter("markdownify", (data) => {
    return md.render(data);
  });

  // returns item type of current item
  eleventyConfig.addLiquidFilter("itemType", (tags) => {
    return getItemType(tags);
  });

  // whether and which title to display in the nav bar
  eleventyConfig.addLiquidFilter("navTitle", (title, tags) => {
    let navTitle = getItemType(tags) || title;

    return NAV_TITLES_TO_SKIP.includes(title) ? undefined : navTitle;
  });

  // add synthetic collections
  eleventyConfig.addCollection("pastProjects", function (collection) {
    const pastProjects = collection.getFilteredByTags("projects");
    return pastProjects.filter((e) => !e.data.tags.includes("featured"));
  });

  eleventyConfig.addCollection("pastEvents", function (collection) {
    const pastEvents = collection.getFilteredByTags("events");
    const now = new Date();
    return pastEvents.filter((e) => {
      const eventDate = new Date(e.data.event_date || e.data.date);
      return now > eventDate;
    });
  });

  // ty! https://hipsterbrown.com/musings/musing/esbuild-with-11ty/
  eleventyConfig.on("eleventy.after", () => {
    return esbuild.build({
      target: "es2020",
      entryPoints: ["./assets/css/style.scss", "./assets/js/main.js"],
      outdir: "./dist/assets",
      minify: false,
      sourcemap: false,
      bundle: true,
      plugins: [sassPlugin()],
      loader: {
        ".woff2": "file",
        ".woff": "file",
      },
    });
  });

  // write search index to file
  eleventyConfig.on("eleventy.after", () => {
    fs.writeJsonSync(
      `./${eleventyConfig.dir.output}/search-index.json`,
      eleventyConfig.globalData.searchIndex,
      { flag: "w" }
    );

    // when using dev server, reset value after writing
    eleventyConfig.globalData.searchIndex = [];
  });

  // write dominant colors data to file
  // we're bootstrapping this data because it isn't dynamic
  eleventyConfig.on("eleventy.after", () => {
    fs.writeJsonSync(
      `./${eleventyConfig.dir.input}/predominant-colors.json`,
      eleventyConfig.globalData.predominantColors,
      { flag: "w" }
    );

    // when using dev server, reset value after writing
    eleventyConfig.globalData.dominantColors = {};
  });

  eleventyConfig.addWatchTarget("./assets/css/**/*.scss");
  eleventyConfig.addWatchTarget("./assets/js/*.js");
  /**
   * Global settings
   */
  return {
    dir: {
      input: ".",
      output: "dist",
      layouts: "layouts",
      includes: "includes",
      images: "assets/img",
      css: "assets/css",
    },
    templateFormats: ["html", "liquid", "md", "njk"],
    markdownTemplateEngine: "njk",
  };
};
