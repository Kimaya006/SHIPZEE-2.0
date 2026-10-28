// Signup flow:
//   validate > create login (Auth) > save profile (Firestore) > go to dashboard

import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { validateSignup } from "./validators.js";
import { dashboardFor } from "./routes.js";

const form = document.getElementById("signup-form");
const message = document.getElementById("message");
const submitButton = form.querySelector("button[type='submit']");

function value(id) {
  return document.getElementById(id).value.trim();
}

// Firebase error codes are not friendly, so translate the common ones.
function friendlyError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/network-request-failed":
      return "No internet connection. Try again.";
    case "permission-denied":
      return "Could not save your profile. Check the Firestore rules.";
    default:
      console.error(error);
      return "Something went wrong. Try again.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const fields = {
    name: value("name"),
    role: document.getElementById("role").value,
    email: value("email"),
    email2: value("email2"),
    phone1: value("phone1"),
    phone2: value("phone2"),
    // Passwords are not trimmed. A space can be part of a password.
    password: document.getElementById("password").value,
    confirm: document.getElementById("confirm").value
  };

  const problem = validateSignup(fields);
  if (problem) {
    message.textContent = problem;
    return;
  }

  // Stop double clicks creating two accounts.
  submitButton.disabled = true;

  try {
    const credential = await createUserWithEmailAndPassword(auth, fields.email, fields.password);

    // The Auth account only stores email and password.
    // Everything else lives in a Firestore document named after the user's id.
    await setDoc(doc(db, "users", credential.user.uid), {
      name: fields.name,
      role: fields.role,
      email: fields.email,
      email2: fields.email2,
      phone1: fields.phone1,
      phone2: fields.phone2,
      verified: false, // an admin will flip this later for drivers
      createdAt: serverTimestamp()
    });

    location.replace(dashboardFor(fields.role));
  } catch (error) {
    message.textContent = friendlyError(error);
    submitButton.disabled = false;
  }
});
