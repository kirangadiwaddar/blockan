import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blockan",
    short_name: "Blockan",
    description: "Project tracker and issue management for modern teams",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "View your dashboard",
      },
      {
        name: "Projects",
        url: "/projects",
        description: "View all projects",
      },
      {
        name: "Team",
        url: "/team",
        description: "Manage your team",
      },
    ],
  };
}
