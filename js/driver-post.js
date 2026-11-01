import { startPage } from "./shell.js";
import { fillCityList } from "./cities.js";
import { validateTrip } from "./validators.js";
import { createTrip } from "./trips.js";

const form = document.getElementById("trip-form");
const message = document.getElementById("trip-message");
const postButton = form.querySelector("button[type='submit']");

startPage({ role: "driver", tab: "post" }, (profile, user) => {
  fillCityList(document.getElementById("cities"));

  // Stop the date picker from offering times in the past. toISOString() gives
  // UTC, so we first shift the clock by the user's time zone offset.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById("departAt").min = now.toISOString().slice(0, 16);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const fields = {
      from: document.getElementById("from").value,
      to: document.getElementById("to").value,
      departAt: document.getElementById("departAt").value,
      capacityKg: document.getElementById("capacityKg").value,
      ratePerKg: document.getElementById("ratePerKg").value
    };

    const problem = validateTrip(fields);
    if (problem) {
      message.textContent = problem;
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

      // Go to the list and let it show a "Trip posted" message. The button stays
      // disabled, so a double tap cannot post the same trip twice.
      location.assign("driver-trips.html?posted=1");
    } catch (error) {
      console.error(error);
      message.textContent = "Could not post the trip. Check your connection and try again.";
      postButton.disabled = false;
    }
  });
});
