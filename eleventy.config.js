export default function (eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
    },
    templateFormats: ["html", "njk", "md"],
  };
}
