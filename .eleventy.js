const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const Image = require("@11ty/eleventy-img");
const sass = require("sass");
const path = require("path");
const esbuild = require("esbuild");

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

  // markdown
  eleventyConfig.setLibrary("md", md);
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
        widths: [300, 600],
        urlPath: eleventyConfig.dir.images,
        outputDir: `${eleventyConfig.dir.output}/${eleventyConfig.dir.images}`,
        formats: ["webp", "jpeg", "gif"],
        sharpOptions: {
          animated: true,
        },
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
  eleventyConfig.addPassthroughCopy("admin");

  // for prefix path as needed for relative paths
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // thanks to https://github.com/GrimLink/eleventy-plugin-sass
  eleventyConfig.addTemplateFormats("scss");
  // Creates the extension for use
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: (inputContent, inputPath) => {
      if (inputPath !== "./assets/css/main.scss") return;
      let result = sass.compileString(inputContent, {
        style: "expanded",
        sourceMap: false,
        loadPaths: ["_sass"],
      });
      return async () => result.css;
    },
  });

  // esbuild bundle js
  eleventyConfig.addTemplateFormats("js");
  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile: async (inputContent, inputPath) => {
      if (inputPath !== "./assets/js/index.js") return; // only include entry file
      return async () => {
        let result = await esbuild.build({
          target: "es2020",
          entryPoints: [inputPath],
          minify: true,
          bundle: true,
          write: false,
        });
        return result.outputFiles[0].text;
      };
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
    templateFormats: ["html", "liquid", "md", "njk"],
    markdownTemplateEngine: "njk",
  };
};
