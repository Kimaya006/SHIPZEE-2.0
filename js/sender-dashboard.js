import { requireRole, logout } from "./guard.js";
import { fillCityList } from "./cities.js";
import { validateSearch } from "./validators.js";
import { searchTrips } from "./trips.js";

const searchForm = document.getElementById("search-form");
const searchMessage = document.getElementById("search-message");
const searchButton = searchForm.querySelector("button[type='submit']");
const resultsHeading = document.getElementById("results-heading");
const resultsEmpty = document.getElementById("results-empty");
const resultsList = document.getElementById("results-list");

function formatDate(date) {
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// One result card. Elements and textContent only, never innerHTML, because
// the driver's name and the city text were typed by other users.
function buildResult(trip) {
  const item = document.createElement("li");
  item.className = "trip";

  const route = document.createElement("strong");
  route.textContent = trip.fromDisplay + " to " + trip.toDisplay;

  const when = document.createElement("div");
  when.className = "trip-meta";
  when.textContent = formatDate(trip.departAt);

  const driver = document.createElement("div");
  driver.className = "trip-meta";
  driver.textContent = "Driver: " + trip.driverName;

  const details = document.createElement("div");
  details.className = "trip-meta";
  details.textContent = trip.remainingKg + " kg free, Rs " + trip.ratePerKg + " per kg";

  item.append(route, when, driver, details);
  // A "Send request" button is added in the next stage.
  return item;
}

requireRole("sender", (profile) => {
  document.getElementById("welcome").textContent = "Welcome, " + profile.name;
  document.getElementById("logout-btn").addEventListener("click", logout);

  fillCityList(document.getElementById("cities"));

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchMessage.textContent = "";

    const fields = {
      from: document.getElementById("from").value,
      to: document.getElementById("to").value,
      date: document.getElementById("date").value
    };

    const problem = validateSearch(fields);
    if (problem) {
      searchMessage.textContent = problem;
      return;
    }

    searchButton.disabled = true;

    try {
      const trips = await searchTrips(fields.from, fields.to, fields.date);

      resultsList.replaceChildren();
      resultsHeading.hidden = false;
      resultsEmpty.hidden = trips.length > 0;

      for (const trip of trips) {
        resultsList.appendChild(buildResult(trip));
      }
    } catch (error) {
      console.error(error);
      searchMessage.textContent = "Could not search right now. Try again.";
    } finally {
      searchButton.disabled = false;
    }
  });
});
