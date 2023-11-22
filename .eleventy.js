const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const Image = require("@11ty/eleventy-img");
const sass = require("sass");
const path = require("path");
const fs = require("fs-extra");

// add markdown support
const mdOptions = {
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
};
const markdownIt = require("markdown-it");
var markdownItAttrs = require("markdown-it-attrs");
const md = new markdownIt(mdOptions);
md.use(markdownItAttrs);

module.exports = (eleventyConfig) => {
  /**
   * Global options
   */

  // search index
  eleventyConfig.addGlobalData("searchIndex", []);

  // markdown
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.amendLibrary("md", (mdLib) => {
    /* search index */
    md.core.ruler.before("block", "raw", function replace(state) {
      // add prerendered content to search index
      if (state.env.tags && state.env.tags.includes("index")) {
        let raw = state.src.replace(/\n/g, "");
        const post = {
          title: state.env.title,
          slug: state.env.page.fileSlug,
          content: raw,
          event_date: state.env.event_date,
          year: state.env.date.toString().slice(0, 4),
        };
        eleventyConfig.globalData.searchIndex.push(post);
      }
    });

    /* sharp image plugin pipeline  */
    // replace image parser with 11ty image plugin
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
        widths: [300, 600],
        urlPath: eleventyConfig.dir.images,
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
        sizes: [300, 600],
      });

      return imageMarkup;
    };
    return mdLib;
  });

  /**
   * Folders and extensions
   */

  // Copy the "assets" directory to the compiled "_site" folder.
  eleventyConfig.addPassthroughCopy("assets/favicon");
  eleventyConfig.addPassthroughCopy("assets/font");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("admin");

  // for prefix path as needed for relative paths
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // @todo refactor to plugin
  // thanks to https://github.com/GrimLink/eleventy-plugin-sass
  eleventyConfig.addTemplateFormats("scss");
  // Creates the extension for use
  eleventyConfig.addExtension("scss", {
    compileOptions: {
      cache: false,
      permalink: (_inputContent, inputPath) => (_data) => {
        let parsed = path.parse(inputPath);
        if (parsed.name.startsWith("_")) return; // Ignore partials
        return `assets/css/${parsed.name}.css`;
      },
    },
    getData: async () => ({ eleventyExcludeFromCollections: true }),
    compile: (inputContent, inputPath) => {
      let parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) return; // Ignore partials
      let result = sass.compileString(inputContent, {
        style: "expanded",
        sourceMap: false,
        loadPaths: [parsed.dir || ".", eleventyConfig.dir.includes, "_sass"],
      });
      return async (_data) => result.css;
    },
  });

  /**
   * Template rendering
   */

  // add category filter
  eleventyConfig.addFilter("byCategory", (collection, category) =>
    collection.filter((e) => e.data.categories == category)
  );

  // add markdown-it liquid md filter using global md lib
  eleventyConfig.addLiquidFilter("markdownify", (obj) => {
    return md.render(obj);
  });

  // write search index to file
  eleventyConfig.on("eleventy.after", () => {
    fs.writeJsonSync(
      "./_site/search-index.json",
      eleventyConfig.globalData.searchIndex
    );
  });

  /**
   * Global settings object
   */
  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "layouts",
      includes: "includes",
      images: "assets/img",
    },
    templateFormats: ["html", "liquid", "md"],
  };
};
