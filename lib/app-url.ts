/** Een adres in deze app: poort 3000 met `npm run dev`, 3999 in de desktop-app. */
export function appUrl(pad: string): string {
  return `http://localhost:${process.env.PORT ?? "3000"}${pad}`;
}
