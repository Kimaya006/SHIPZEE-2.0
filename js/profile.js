import { startPage } from "./shell.js";
import { logout } from "./guard.js";

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// "any" means both drivers and senders can open this page.
startPage({ role: "any", tab: "profile" }, (profile) => {
  setText("p-name", profile.name);
  setText("p-role", profile.role === "driver" ? "Driver" : "Sender");
  setText("p-email", profile.email);
  setText("p-email2", profile.email2);
  setText("p-phone1", profile.phone1);
  setText("p-phone2", profile.phone2);
  setText("p-verified", profile.verified ? "Verified" : "Not verified yet");

  // createdAt is a Firestore Timestamp, so it has to be converted to a Date first.
  const created = profile.createdAt ? profile.createdAt.toDate() : null;
  setText("p-since", created ? created.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "");

  document.getElementById("logout-btn").addEventListener("click", logout);
});
