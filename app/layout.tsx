import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { cookies } from "next/headers";
import { LoginScherm } from "@/components/LoginScherm";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { config } from "@/config/dashboard";
import { loadDashboard } from "@/lib/dashboard";
import { toNavPlatforms } from "@/lib/navigation";
import {
  MENU_COOKIE,
  OVERIGE_COOKIE,
  parseGroepStand,
  parseMenuStand,
} from "@/lib/preferences";
import { currentUser, LOGIN_MELDING_COOKIE, LoginMelding } from "@/lib/session";
import "./globals.css";
import styles from "./layout.module.css";

/** Terugval voor Apercu Condensed Pro tot de lettertypebestanden er zijn. */
const barlow = Barlow_Condensed({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "PM-dashboard",
  description: "Overzicht van platforms en projecten",
};

function parseLoginMelding(value: string | undefined): LoginMelding | null {
  return value === "geen-norday-account" || value === "mislukt" ? value : null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const user = await currentUser();
  if (!user) {
    return (
      <html lang="nl" className={barlow.variable}>
        <body>
          <LoginScherm
            melding={parseLoginMelding(
              cookieStore.get(LOGIN_MELDING_COOKIE)?.value,
            )}
          />
        </body>
      </html>
    );
  }

  const stand = parseMenuStand(cookieStore.get(MENU_COOKIE)?.value);
  const overige = parseGroepStand(cookieStore.get(OVERIGE_COOKIE)?.value);
  const dashboard = await loadDashboard();
  const platforms =
    dashboard.status === "ok" ? toNavPlatforms(dashboard.platforms) : [];

  return (
    <html lang="nl" className={barlow.variable}>
      <body>
        <a className={styles.skipLink} href="#inhoud">
          Naar de inhoud
        </a>
        <div className={styles.shell}>
          <Sidebar
            platforms={platforms}
            inboxUrl={config.links.inbox}
            todoUrl={config.links.todo}
            initialStand={stand}
            initialOverige={overige}
            user={user}
          />
          <main id="inhoud" className={styles.main}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
