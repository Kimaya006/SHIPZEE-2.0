// Protects every page inside the app. A page calls requireRole("driver", ...),
// requireRole("sender", ...) or requireRole("any", ...). The page stays hidden
// until we confirm:
//   1. someone is logged in
//   2. their saved role is allowed on this page
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

    let profile;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        // Logged in but no profile saved. Treat as broken and start over.
        await signOut(auth);
        location.replace("login.html");
        return;
      }

      profile = snap.data();
    } catch (error) {
      console.error("Could not load profile:", error);
      location.replace("login.html");
      return;
    }

    if (expectedRole !== "any" && profile.role !== expectedRole) {
      location.replace(dashboardFor(profile.role));
      return;
    }

    document.getElementById("app").hidden = false;

    // onReady runs outside the try block on purpose. If the page's own code
    // has a bug, we want to see that error in the console, not get bounced
    // to the login page with a misleading message.
    onReady(profile, user);
  });
}

export async function logout() {
  await signOut(auth);
  location.replace("login.html");
}
