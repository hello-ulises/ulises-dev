module.exports = {
  layout: "post-page",
  tags: ["index"],
  eleventyComputed: {
    eleventyExcludeFromCollections: (data) => !data.published,
    permalink(data) {
      const urlPath = this.urlPath(data);
      return data.published && urlPath ? urlPath : false;
    },
    async predominantColor(data) {
      const predominantColor = await this.getPredominantColor(
        data?.featured_img?.src
      );
      return predominantColor;
    },
    async imageMetadata(data) {
      const imageMetadata = await this.processImage(data);
      return imageMetadata;
    },
  },
};
