// Pure validation functions. They only look at text and return an error
// message, or an empty string when everything is fine. No Firebase here,
// so they are easy to read and easy to test.

import { normalizeCity } from "./cities.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile numbers: 10 digits, first digit 6 to 9.
const PHONE_PATTERN = /^[6-9]\d{9}$/;

export function validateSignup(f) {
  if (f.name.trim().length < 2) return "Enter your full name.";
  if (f.role !== "sender" && f.role !== "driver") return "Choose whether you are a sender or a driver.";

  if (!EMAIL_PATTERN.test(f.email)) return "Enter a valid email.";
  if (!EMAIL_PATTERN.test(f.email2)) return "Enter a valid second email.";
  if (f.email.toLowerCase() === f.email2.toLowerCase()) return "The two emails must be different.";

  if (!PHONE_PATTERN.test(f.phone1)) return "Enter a valid 10 digit phone number.";
  if (!PHONE_PATTERN.test(f.phone2)) return "Enter a valid 10 digit second phone number.";
  if (f.phone1 === f.phone2) return "The two phone numbers must be different.";

  if (f.password.length < 8) return "Password must be at least 8 characters.";
  if (f.password !== f.confirm) return "Passwords do not match.";

  return "";
}

// Fields arrive as text straight from the form.
export function validateTrip(f) {
  if (f.from.trim().length < 2) return "Enter the city you are leaving from.";
  if (f.to.trim().length < 2) return "Enter the city you are going to.";
  if (normalizeCity(f.from) === normalizeCity(f.to)) return "From and To must be different cities.";

  if (!f.departAt) return "Choose the date and time you are leaving.";
  const departAt = new Date(f.departAt);
  if (Number.isNaN(departAt.getTime())) return "Choose a valid departure date and time.";
  if (departAt <= new Date()) return "Departure must be in the future.";

  const capacity = Number(f.capacityKg);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
    return "Space must be a whole number between 1 and 50 kg.";
  }

  const rate = Number(f.ratePerKg);
  if (!Number.isInteger(rate) || rate < 1 || rate > 1000) {
    return "Rate must be a whole number between 1 and 1000 rupees per kg.";
  }

  return "";
}

export function validateLogin(email, password) {
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email.";
  if (password.length === 0) return "Enter your password.";
  return "";
}

// Used by the sender's search form. The date is optional.
export function validateSearch(f) {
  if (f.from.trim().length < 2) return "Enter the city the parcel is going from.";
  if (f.to.trim().length < 2) return "Enter the city the parcel is going to.";
  if (normalizeCity(f.from) === normalizeCity(f.to)) return "From and To must be different cities.";
  return "";
}
