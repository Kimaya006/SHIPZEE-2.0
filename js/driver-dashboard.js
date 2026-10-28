import { requireRole, logout } from "./guard.js";
import { fillCityList } from "./cities.js";
import { validateTrip } from "./validators.js";
import { createTrip, getMyTrips, cancelTrip } from "./trips.js";

const tripForm = document.getElementById("trip-form");
const tripMessage = document.getElementById("trip-message");
const tripList = document.getElementById("trip-list");
const tripsEmpty = document.getElementById("trips-empty");
const postButton = tripForm.querySelector("button[type='submit']");

function formatDate(date) {
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// Works out the label to show: Open, Cancelled or Past.
function tripState(trip) {
  if (trip.status === "cancelled") return "Cancelled";
  if (trip.departAt < new Date()) return "Past";
  return "Open";
}

// Builds one list item. We create elements and use textContent, never
// innerHTML, so text typed by users can never run as code.
function buildTripItem(trip, onCancel) {
  const state = tripState(trip);

  const item = document.createElement("li");
  item.className = "trip";

  const route = document.createElement("strong");
  route.textContent = trip.fromDisplay + " to " + trip.toDisplay;

  const when = document.createElement("div");
  when.className = "trip-meta";
  when.textContent = formatDate(trip.departAt);

  const details = document.createElement("div");
  details.className = "trip-meta";
  details.textContent =
    trip.remainingKg + " of " + trip.capacityKg + " kg free, Rs " + trip.ratePerKg + " per kg";

  const badge = document.createElement("span");
  badge.className = "badge badge-" + state.toLowerCase();
  badge.textContent = state;

  item.append(route, when, details, badge);

  if (state === "Open") {
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn-small";
    cancelButton.textContent = "Cancel trip";
    cancelButton.addEventListener("click", () => onCancel(trip.id, cancelButton));
    item.appendChild(cancelButton);
  }

  return item;
}

async function showTrips(driverId) {
  try {
    const trips = await getMyTrips(driverId);

    tripList.replaceChildren(); // clear the old list
    tripsEmpty.hidden = trips.length > 0;

    for (const trip of trips) {
      tripList.appendChild(
        buildTripItem(trip, async (tripId, button) => {
          if (!confirm("Cancel this trip?")) return;
          button.disabled = true;
          try {
            await cancelTrip(tripId);
            await showTrips(driverId);
          } catch (error) {
            console.error(error);
            button.disabled = false;
            alert("Could not cancel the trip. Try again.");
          }
        })
      );
    }
  } catch (error) {
    console.error(error);
    tripsEmpty.hidden = false;
    tripsEmpty.textContent = "Could not load your trips. Refresh the page.";
  }
}

requireRole("driver", (profile, user) => {
  // textContent (not innerHTML) so a name can never inject HTML into the page.
  document.getElementById("welcome").textContent = "Welcome, " + profile.name;
  document.getElementById("logout-btn").addEventListener("click", logout);

  fillCityList(document.getElementById("cities"));

  // Stop the date picker from offering dates in the past.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // shift to local time
  document.getElementById("departAt").min = now.toISOString().slice(0, 16);

  showTrips(user.uid);

  tripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    tripMessage.textContent = "";
    tripMessage.className = "message";

    const fields = {
      from: document.getElementById("from").value,
      to: document.getElementById("to").value,
      departAt: document.getElementById("departAt").value,
      capacityKg: document.getElementById("capacityKg").value,
      ratePerKg: document.getElementById("ratePerKg").value
    };

    const problem = validateTrip(fields);
    if (problem) {
      tripMessage.textContent = problem;
      return;
    }

    postButton.disabled = true;

    try {
      await createTrip(user.uid, profile.name, {
        from: fields.from,
        to: fields.to,
        departAt: new Date(fields.departAt),
        capacityKg: Number(fields.capacityKg),
        ratePerKg: Number(fields.ratePerKg)
      });

      tripForm.reset();
      tripMessage.className = "message info";
      tripMessage.textContent = "Trip posted.";
      await showTrips(user.uid);
    } catch (error) {
      console.error(error);
      tripMessage.textContent = "Could not post the trip. Try again.";
    } finally {
      postButton.disabled = false;
    }
  });
});
