import { startPage } from "./shell.js";
import { getMyTrips } from "./trips.js";
import { buildTripCard, fillEmpty, firstName, tripState } from "./ui.js";

startPage({ role: "driver", tab: "home" }, async (profile, user) => {
  document.getElementById("greeting").textContent = "Hi, " + firstName(profile.name);

  const nextTrip = document.getElementById("next-trip");
  const nextEmpty = document.getElementById("next-empty");

  try {
    const trips = await getMyTrips(user.uid);

    // getMyTrips sorts soonest first, so the first open trip is the next one to leave.
    const open = trips.filter((trip) => tripState(trip) === "Open");

    document.getElementById("stat-open").textContent = open.length;
    document.getElementById("stat-kg").textContent = open.reduce((sum, trip) => sum + trip.remainingKg, 0);
    document.getElementById("stat-total").textContent = trips.length;

    if (open.length > 0) {
      nextTrip.replaceChildren(buildTripCard(open[0]));
    } else {
      fillEmpty(
        nextEmpty,
        "No upcoming trips",
        "Post a trip so senders on your route can find you.",
        "driver-post.html",
        "Post a trip"
      );
    }
  } catch (error) {
    console.error(error);
    fillEmpty(nextEmpty, "Could not load your trips", "Check your connection and refresh the page.");
  }
});
