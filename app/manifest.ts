import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CampusPilot — Your college life, under control",
    short_name: "CampusPilot",
    description:
      "Track attendance, deadlines and exams — then let AI build a study plan around your real schedule.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#4F46E5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
