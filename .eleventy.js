const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const sass = require("sass");

module.exports = (eleventyConfig) => {
  module.exports = function (eleventyConfig) {
    eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  };
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
