import { startPage } from "./shell.js";
import { fillCityList } from "./cities.js";
import { validateSearch } from "./validators.js";
import { searchTrips } from "./trips.js";
import { buildTripCard, fillEmpty } from "./ui.js";

const form = document.getElementById("search-form");
const message = document.getElementById("search-message");
const searchButton = form.querySelector("button[type='submit']");
const heading = document.getElementById("results-heading");
const list = document.getElementById("results-list");
const empty = document.getElementById("results-empty");

startPage({ role: "sender", tab: "search" }, () => {
  fillCityList(document.getElementById("cities"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const fields = {
      from: document.getElementById("from").value,
      to: document.getElementById("to").value,
      date: document.getElementById("date").value
    };

    const problem = validateSearch(fields);
    if (problem) {
      message.textContent = problem;
      return;
    }

    searchButton.disabled = true;

    try {
      const trips = await searchTrips(fields.from, fields.to, fields.date);

      list.replaceChildren();
      empty.hidden = true;
      heading.hidden = false;
      heading.textContent = trips.length === 1 ? "1 trip found" : trips.length + " trips found";

      if (trips.length === 0) {
        fillEmpty(
          empty,
          "No drivers on this route yet",
          "Try another date, or check back later. New trips are posted every day."
        );
        return;
      }

      for (const trip of trips) {
        list.appendChild(buildTripCard(trip, { showDriver: true }));
      }
    } catch (error) {
      console.error(error);
      message.textContent = "Could not search right now. Check your connection and try again.";
    } finally {
      searchButton.disabled = false;
    }
  });
});
