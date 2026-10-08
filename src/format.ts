const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const fractionalMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const date = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export const rupees = (paise: number | null) =>
  paise === null
    ? "Unavailable"
    : (paise % 100 === 0 ? money : fractionalMoney).format(paise / 100);
export const shortDate = (timestamp: string) =>
  date.format(new Date(timestamp));
export const titleCase = (value: string) =>
  value.replace(/(^|[ -])\w/g, (part) => part.toUpperCase());
