import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: {
    default: "ClinicFlow — Clinic management",
    template: "%s · ClinicFlow",
  },
  description:
    "A secure, modern clinic management workspace for patient records, appointments, and team administration.",
  applicationName: "ClinicFlow",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "ClinicFlow — Clinic management",
    description:
      "Patient records, appointments, and team administration in one calm clinic workspace.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#567C8D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
