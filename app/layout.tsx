import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM-dashboard",
  description: "Overzicht van accounts en projecten",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
