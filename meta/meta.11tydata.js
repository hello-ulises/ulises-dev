module.exports = {
  tags: ["meta"],
  permalink: false,
  eleventyComputed: {
    async imageMetadata(data) {
      const imageMetadata = await this.processImage(data);
      return imageMetadata;
    },
  },
};
