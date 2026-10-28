// Protects the dashboards. Each dashboard calls requireRole("driver") or
// requireRole("sender"). The page stays hidden until we confirm:
//   1. someone is logged in
//   2. their saved role matches this page
// Otherwise they are sent to the right place.
//
// Note: this only controls what the user SEES. Real protection of the data
// is done by firestore.rules on the server side.

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { dashboardFor } from "./routes.js";

export function requireRole(expectedRole, onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.replace("login.html");
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        // Logged in but no profile saved. Treat as broken and start over.
        await signOut(auth);
        location.replace("login.html");
        return;
      }

      const profile = snap.data();

      if (profile.role !== expectedRole) {
        location.replace(dashboardFor(profile.role));
        return;
      }

      document.getElementById("content").hidden = false;
      onReady(profile, user);
    } catch (error) {
      console.error("Could not load profile:", error);
      location.replace("login.html");
    }
  });
}

export async function logout() {
  await signOut(auth);
  location.replace("login.html");
}
