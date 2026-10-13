/** Een adres in deze app: poort 3000 met `npm run dev`, 3999 met `npm run serve`. */
export function appUrl(pad: string): string {
  return `http://localhost:${process.env.PORT ?? "3000"}${pad}`;
}
