import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Alquemist",
  description: "Sistema de gestion agricola",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
