const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const sass = require("sass");
const path = require("path");

// add markdown support
const mdOptions = {
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
};
const markdownIt = require("markdown-it");

module.exports = (eleventyConfig) => {
  // Copy the "assets" directory to the compiled "_site" folder.
  eleventyConfig.addPassthroughCopy("assets");

  // for prefix path as needed for relative paths
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // taken from https://github.com/GrimLink/eleventy-plugin-sass
  // @todo check if this is overkill
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

  eleventyConfig.addFilter("byCategory", (collection, category) =>
    collection.filter((e) => e.data.categories == category)
  );

  // markdown-it liquid md parser
  const md = new markdownIt(mdOptions);
  eleventyConfig.addLiquidFilter("markdownify", (obj) => {
    return md.render(obj);
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "layouts",
      includes: "includes",
    },
    templateFormats: ["html", "liquid", "md", "njk"],
    markdownTemplateEngine: "njk",
  };
};
