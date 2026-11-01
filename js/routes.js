// Which page each role lands on after login. Signup, login and the guard
// all use this, so a role's home page is defined in exactly one place.

export function dashboardFor(role) {
  return role === "driver" ? "driver-home.html" : "sender-search.html";
}
