import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { config } from "@/config/accounts";
import { loadDashboard } from "@/lib/dashboard";
import { toNavAccounts } from "@/lib/navigation";
import {
  dataTheme,
  MENU_COOKIE,
  parseMenuStand,
  parseThema,
  THEMA_COOKIE,
} from "@/lib/preferences";
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
  description: "Overzicht van accounts en projecten",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const thema = parseThema(cookieStore.get(THEMA_COOKIE)?.value);
  const stand = parseMenuStand(cookieStore.get(MENU_COOKIE)?.value);
  const dashboard = await loadDashboard();
  const accounts =
    dashboard.status === "ok" ? toNavAccounts(dashboard.accounts) : [];

  return (
    <html lang="nl" data-theme={dataTheme(thema)} className={barlow.variable}>
      <body>
        <a className={styles.skipLink} href="#inhoud">
          Naar de inhoud
        </a>
        <div className={styles.shell}>
          <Sidebar
            accounts={accounts}
            inboxUrl={config.links.inbox}
            todoUrl={config.links.todo}
            initialStand={stand}
            initialThema={thema}
          />
          <main id="inhoud" className={styles.main}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
