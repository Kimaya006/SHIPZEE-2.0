// Small helpers that several screens share, so the same card or message is
// built in exactly one place. Everything dynamic goes in with textContent,
// never innerHTML, because names and cities are typed by users.

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function firstName(fullName) {
  return fullName.trim().split(/\s+/)[0];
}

export function formatDate(date) {
  const options = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
  // Show the year only when the trip is not in the current year.
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return date.toLocaleString("en-IN", options);
}

// The label to show for a trip: Open, Cancelled or Past.
// "Past" is worked out here by comparing times, so no background job is needed.
export function tripState(trip) {
  if (trip.status === "cancelled") return "Cancelled";
  if (trip.departAt < new Date()) return "Past";
  return "Open";
}

function fact(label, value) {
  const wrapper = el("div");
  wrapper.append(el("dt", "", label), el("dd", "", value));
  return wrapper;
}

// options:
//   showDriver  show the driver's name (sender screens)
//   showStatus  show an Open / Past / Cancelled badge (driver screens)
//   onCancel    if given, open trips get a Cancel button that calls onCancel(trip, button)
export function buildTripCard(trip, { showDriver = false, showStatus = false, onCancel = null } = {}) {
  const state = tripState(trip);
  const card = el("li", "trip-card");

  const sign = el("div", "sign");
  const lane = el("span", "lane");
  lane.setAttribute("aria-hidden", "true");
  sign.append(el("span", "city", trip.fromDisplay), lane, el("span", "city", trip.toDisplay));

  const body = el("div", "trip-body");

  const top = el("div", "trip-top");
  top.appendChild(el("p", "trip-when", formatDate(trip.departAt)));
  if (showStatus) top.appendChild(el("span", "badge badge-" + state.toLowerCase(), state));

  const facts = el("dl", "trip-facts");
  if (showDriver) facts.appendChild(fact("Driver", trip.driverName));
  facts.appendChild(
    fact("Free space", showDriver ? trip.remainingKg + " kg" : trip.remainingKg + " of " + trip.capacityKg + " kg")
  );
  facts.appendChild(fact("Rate", "Rs " + trip.ratePerKg + " per kg"));

  body.append(top, facts);

  if (onCancel && state === "Open") {
    const actions = el("div", "trip-actions");
    const button = el("button", "btn btn-danger btn-small", "Cancel trip");
    button.type = "button";
    button.addEventListener("click", () => onCancel(trip, button));
    actions.appendChild(button);
    body.appendChild(actions);
  }

  card.append(sign, body);
  return card;
}

// Fills an empty-state box (a div with class "empty") and shows it.
// An empty screen should tell the user what to do next, so a link is optional but encouraged.
export function fillEmpty(container, title, text, href, linkLabel) {
  const children = [el("p", "empty-title", title), el("p", "empty-text", text)];

  if (href) {
    const link = el("a", "btn btn-small", linkLabel);
    link.href = href;
    children.push(link);
  }

  container.replaceChildren(...children);
  container.hidden = false;
}

// A short message that fades away by itself. Used to confirm an action.
export function showToast(message) {
  const toast = el("div", "toast", message);
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
