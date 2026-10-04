import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import styles from "./layout.module.css";

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
      <body>
        <a className={styles.skipLink} href="#inhoud">
          Naar de inhoud
        </a>
        <SiteHeader />
        <main id="inhoud" className={styles.main}>
          {children}
        </main>
      </body>
    </html>
  );
}
