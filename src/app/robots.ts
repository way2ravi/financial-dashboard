import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/institutional-intelligence",
        "/api/institutional-intelligence",
      ],
    },
  };
}
