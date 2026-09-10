import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NER GeoWatch | AI Landslide Early Warning System — MDoNER",
  description:
    "AI-Based Early Warning & Landslide Risk Monitoring System for the North Eastern Region of India. Real-time risk assessment, CAP alert broadcast, and emergency command operations for MDoNER, SDRF, NHIDCL/BRO, and District Magistrates.",
  keywords: [
    "landslide monitoring",
    "NER India",
    "early warning system",
    "Smart India Hackathon",
    "MDoNER",
    "GIS",
    "AI risk assessment",
  ],
  authors: [{ name: "SIH Team — NER GeoWatch" }],
  openGraph: {
    title: "NER GeoWatch | AI Landslide Early Warning System",
    description: "Emergency operations center for landslide risk in North Eastern India.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
