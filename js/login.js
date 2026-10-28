// Login flow:
//   validate > sign in (Auth) > read role (Firestore) > go to that dashboard

import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { validateLogin } from "./validators.js";
import { dashboardFor } from "./routes.js";

const form = document.getElementById("login-form");
const message = document.getElementById("message");
const submitButton = form.querySelector("button[type='submit']");

function friendlyError(error) {
  switch (error.code) {
    // Newer Firebase returns one generic code for both wrong email and wrong
    // password. We keep the wording vague on purpose so nobody can use this
    // form to find out which emails are registered.
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No internet connection. Try again.";
    default:
      console.error(error);
      return "Something went wrong. Try again.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const problem = validateLogin(email, password);
  if (problem) {
    message.textContent = problem;
    return;
  }

  submitButton.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", credential.user.uid));

    if (!snap.exists()) {
      await signOut(auth);
      message.textContent = "Your profile is missing. Please sign up again.";
      submitButton.disabled = false;
      return;
    }

    location.replace(dashboardFor(snap.data().role));
  } catch (error) {
    message.textContent = friendlyError(error);
    submitButton.disabled = false;
  }
});
