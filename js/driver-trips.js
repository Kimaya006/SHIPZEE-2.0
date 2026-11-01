import { startPage } from "./shell.js";
import { getMyTrips, cancelTrip } from "./trips.js";
import { buildTripCard, fillEmpty, showToast, tripState } from "./ui.js";

const list = document.getElementById("trip-list");
const empty = document.getElementById("trips-empty");
const filterButtons = document.querySelectorAll("#filters .chip");

// Which trip state each filter shows. "all" shows everything.
const FILTER_STATE = { upcoming: "Open", past: "Past", cancelled: "Cancelled" };

// [title, text, show a "Post a trip" link?]
const EMPTY_TEXT = {
  upcoming: ["No upcoming trips", "Post a trip so senders on your route can find you.", true],
  past: ["No past trips", "Trips that have already left will show up here.", false],
  cancelled: ["No cancelled trips", "Trips you cancel will show up here.", false],
  all: ["No trips yet", "Post your first trip to get started.", true]
};

let allTrips = [];
let currentFilter = "upcoming";
let driverId = null;

function render() {
  let shown = allTrips.filter(
    (trip) => currentFilter === "all" || tripState(trip) === FILTER_STATE[currentFilter]
  );

  // Trips arrive soonest first. For past trips the most recent should be on top.
  if (currentFilter === "past") shown = shown.reverse();

  list.replaceChildren();
  empty.hidden = true;

  if (shown.length === 0) {
    const [title, text, withLink] = EMPTY_TEXT[currentFilter];
    fillEmpty(empty, title, text, withLink ? "driver-post.html" : null, "Post a trip");
    return;
  }

  for (const trip of shown) {
    list.appendChild(buildTripCard(trip, { showStatus: true, onCancel: handleCancel }));
  }
}

async function loadTrips() {
  allTrips = await getMyTrips(driverId);
  render();
}

async function handleCancel(trip, button) {
  if (!confirm("Cancel the trip from " + trip.fromDisplay + " to " + trip.toDisplay + "?")) return;

  button.disabled = true;

  try {
    await cancelTrip(trip.id);
    showToast("Trip cancelled.");
    await loadTrips();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    showToast("Could not cancel the trip. Try again.");
  }
}

startPage({ role: "driver", tab: "trips" }, async (profile, user) => {
  driverId = user.uid;

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      for (const other of filterButtons) {
        other.setAttribute("aria-pressed", String(other === button));
      }
      render();
    });
  }

  // After posting a trip we arrive here with ?posted=1. Show the message once,
  // then clean the address so a refresh does not show it again.
  if (new URLSearchParams(location.search).get("posted") === "1") {
    showToast("Trip posted.");
    history.replaceState(null, "", "driver-trips.html");
  }

  try {
    await loadTrips();
  } catch (error) {
    console.error(error);
    fillEmpty(empty, "Could not load your trips", "Check your connection and refresh the page.");
  }
});
