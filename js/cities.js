// List of cities used for the suggestion dropdown on trip forms, and the
// function that cleans a city name before it is stored or compared.
//
// Why this file exists: matching a sender's parcel to a driver's trip means
// comparing city names. "Mumbai", "mumbai " and "MUMBAI" must count as the
// same city, so we always store a normalized copy next to the display name.

export const CITIES = [
  "Mumbai", "Thane", "Navi Mumbai", "Pune", "Nashik", "Nagpur",
  "Aurangabad", "Kolhapur", "Solapur", "Surat", "Ahmedabad", "Vadodara",
  "Rajkot", "Indore", "Bhopal", "Jaipur", "Udaipur", "Delhi", "Gurugram",
  "Chandigarh", "Lucknow", "Kanpur", "Varanasi", "Patna", "Kolkata",
  "Bhubaneswar", "Hyderabad", "Bengaluru", "Mysuru", "Chennai",
  "Coimbatore", "Kochi", "Thiruvananthapuram", "Panaji"
];

// "  Navi   Mumbai " becomes "navi mumbai"
export function normalizeCity(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Turns "navi mumbai" style text from the user into "Navi Mumbai" for display.
export function displayCity(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Fills a <datalist> with the city names so the browser suggests them while typing.
export function fillCityList(datalistElement) {
  for (const city of CITIES) {
    const option = document.createElement("option");
    option.value = city;
    datalistElement.appendChild(option);
  }
}
