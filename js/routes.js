// Which page each role lands on. Keeping this in one place means signup,
// login and the guard all agree.

export function dashboardFor(role) {
  return role === "driver" ? "driver-dashboard.html" : "sender-dashboard.html";
}
