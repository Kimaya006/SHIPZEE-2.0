# Stage 1 decisions: structure, signup, login, roles

This file explains what each file does and why it was written that way. Read it next to the code.

## Setup (do this once)

1. Go to console.firebase.google.com and create a project (Spark plan, free).
2. Build > Authentication > Get started > turn on **Email/Password**.
3. Build > Firestore Database > Create database > choose **production mode**, pick the nearest region.
4. Firestore > Rules tab > paste the contents of `firestore.rules` > Publish.
5. Project settings > Your apps > add a **Web app** > copy the config values into `js/firebase-config.js`.
6. In VS Code install the **Live Server** extension, right click `index.html` > Open with Live Server.

Why Live Server: our scripts use `type="module"`, and browsers block modules when a page is opened by double clicking the file (`file://`). Live Server serves the folder over `http://`, which fixes that.

## Folder structure

```
courier-app/
  index.html              landing page
  signup.html             create account
  login.html              log in
  driver-dashboard.html   driver home
  sender-dashboard.html   sender home
  css/
    style.css             one stylesheet for all pages
  js/
    firebase-config.js    connects to Firebase, exports auth and db
    validators.js         checks form input, no Firebase inside
    routes.js             which dashboard belongs to which role
    guard.js              blocks the wrong person from a dashboard
    signup.js             logic for signup.html
    login.js              logic for login.html
    driver-dashboard.js   logic for driver-dashboard.html
    sender-dashboard.js   logic for sender-dashboard.html
  firestore.rules         server side security rules
  decision.md             this file
```

**Rule used:** one HTML page has one JS file with the same name. When something breaks on a page, you know which single file to open. Last time's complexity came from logic spread everywhere. Anything needed by more than one page goes into a small shared file (`firebase-config`, `validators`, `routes`, `guard`).

## Why plain HTML, CSS and JavaScript

No npm, no build tool, no framework. You write a file, refresh the browser, and see the result. Firebase is loaded straight from Google's CDN with an `import` line. The tradeoff is more manual work as the app grows, which is acceptable for this size.

## firebase-config.js

- Starts Firebase once with `initializeApp`, then exports `auth` (login system) and `db` (database).
- Every other file imports these two instead of making its own connection. Two connections would cause confusing bugs.
- The Firebase `apiKey` is not a secret. It only identifies your project. Security comes from the rules in `firestore.rules`, not from hiding this key.
- The SDK version is pinned in the URL (10.14.1). If the version changes silently, code can break, so we keep it fixed.

## Auth and Firestore: two different places for user data

- **Firebase Auth** stores only email and password. It handles hashing, sessions and login.
- **Firestore** `users/{uid}` stores everything else: name, role, second email, both phones, `verified`, `createdAt`.
- The document is named after the user's `uid` (their Auth id). That makes lookup direct: "find the profile of the logged in user" is one `getDoc` call with no searching.

Role is stored in Firestore and not in the browser because anything in the browser can be edited by the user.

## validators.js

- Plain functions that take text and return an error message or an empty string.
- Kept separate from Firebase so you can read the rules (10 digit phone, emails differ, password length) without any other code around them.
- Phone pattern `^[6-9]\d{9}$` means 10 digits starting with 6 to 9, which is how Indian mobile numbers work.
- The two emails must differ and the two phones must differ, since the point of having two is a backup contact.
- Validation runs in the browser to give fast feedback. It is not security. The real checks must also exist on the server, which is why the rules file exists.

## signup.js

Order of steps: validate, create the Auth account, save the Firestore profile, redirect.

- `event.preventDefault()` stops the browser from reloading the page when the form is submitted, so our code stays in control.
- The submit button is disabled while the request runs. Without this, a double click can create two requests.
- `friendlyError` turns codes like `auth/email-already-in-use` into sentences a user understands. Unknown errors are printed to the console for you and show a generic message to the user.
- Passwords are not trimmed. A space can be a valid part of a password. Other fields are trimmed.
- `verified: false` is set for everyone. Drivers will need an admin to flip it after document checks in a later stage.
- `serverTimestamp()` uses Google's clock, not the user's phone clock, which can be wrong.
- Known gap: if the Auth account is created but the profile save fails, the user has a login with no profile. `login.js` and `guard.js` detect this and send them back to login. It is a rare case and the simple fix is better than a complicated recovery for now.

## login.js

- After signing in it reads the profile to find the role, then sends the user to the right dashboard.
- The wrong email and wrong password cases show the same message. If they differed, someone could test which emails are registered.
- Firebase blocks repeated failed attempts with `auth/too-many-requests`, and we show a clear message for that.

## guard.js

- Every dashboard calls `requireRole("driver", ...)` or `requireRole("sender", ...)`.
- `onAuthStateChanged` is used instead of checking `auth.currentUser` directly. On page load Firebase needs a moment to restore the session, and `currentUser` is empty during that moment. The listener fires once Firebase knows the real state.
- The dashboard content is `hidden` in the HTML and is only shown after the checks pass. This avoids a flash of the wrong page.
- A sender who opens the driver page is redirected to the sender page, not shown an error.
- **Important:** this is only a convenience for the user interface. Someone can open dev tools and unhide the page. The real protection is in `firestore.rules`, and in later stages every piece of data (trips, parcels) will be protected there too.

## routes.js

One tiny function, `dashboardFor(role)`. Signup, login and the guard all need this mapping. Keeping it in one file means adding a role later (an admin, for example) is a one line change.

## dashboards

Both are almost identical for now. They run the guard, show the user's name, and wire up the logout button. Name is placed using `textContent` and not `innerHTML`, so a name like `<script>...` cannot inject code into the page.

## firestore.rules

Rules run on Google's servers and cannot be bypassed from the browser.

- Read: only your own profile.
- Create: only your own profile, role must be `sender` or `driver`, and `verified` must be `false`. This stops someone from signing up as pre verified.
- Update: allowed on your own profile, but `role` and `verified` cannot change. Otherwise a sender could make themselves a driver.
- Delete: not allowed.
- Anything not mentioned is denied by default.

## What is not done yet

- Email verification and password reset.
- Driver document upload and the admin approval step.
- Role is chosen at signup and cannot be changed. One account has one role.

## Next stage

Done in stage 2 below. Stage 3 is the parcel request flow.

---

# Stage 2 decisions: trips (driver posts, sender searches)

## What was added

```
js/cities.js              city list, name cleaning, suggestion dropdown
js/trips.js               every Firestore call for the trips collection
js/validators.js          + validateTrip and validateSearch
js/driver-dashboard.js    post a trip, list my trips, cancel a trip
js/sender-dashboard.js    search trips and show results
firestore.rules           + rules for the trips collection
css/style.css             + styles for trip cards and badges
```

## The trip document

Each trip is one document in the `trips` collection:

| Field | Example | Why |
|---|---|---|
| driverId | uid string | who owns the trip, used by rules and by "my trips" |
| driverName | "Asha" | copied in so senders can see it without reading the driver's private profile |
| fromCity, toCity | "navi mumbai" | cleaned lowercase text used for matching |
| fromDisplay, toDisplay | "Navi Mumbai" | nicely written text used on screen |
| departAt | Timestamp | when the driver leaves |
| capacityKg | 20 | space the driver offered |
| remainingKg | 20 | goes down when parcels are accepted in a later stage |
| ratePerKg | 30 | driver's rate in rupees |
| status | "open" or "cancelled" | trip state |
| createdAt | server time | for history |

## cities.js: why two copies of each city name

A sender typing "mumbai " must match a driver who typed "MUMBAI". So we store one cleaned copy for matching (`normalizeCity`: trim, lowercase, collapse extra spaces) and one pretty copy for display (`displayCity`). Comparing the pretty copy would break on a stray capital letter.

The `<datalist>` gives city suggestions while typing. It is only a suggestion. Users can still type any city. We chose suggestions over a strict dropdown so a driver on a small route is never blocked. The cost is that two spellings ("Bombay" and "Mumbai") will not match. Real city search comes with the maps stage.

## trips.js: the only file that talks to the trips collection

Pages call `createTrip`, `getMyTrips`, `cancelTrip` and `searchTrips`. They never write Firestore code themselves. When something is wrong with the data you look in one file.

- **createTrip** saves the document above. `Timestamp.fromDate` converts a JavaScript date into the type Firestore stores. `serverTimestamp()` uses Google's clock for `createdAt`.
- **getMyTrips** asks for trips where `driverId` equals the logged in user, then sorts by date in JavaScript. Firestore needs a hand-made index when you filter on one field and sort on another. Sorting ourselves avoids that setup step, and a driver will only have a few trips.
- **cancelTrip** changes `status` to "cancelled". We never delete, so the history stays and later stages (payments, disputes) can still refer to the trip.
- **searchTrips** filters on `fromCity` and `toCity` in Firestore (two equal filters work without an index). Then JavaScript removes trips that are not open, already left, full, or on another day than the one chosen. Fine for a small app. With thousands of trips this moves into the query.

## validators.js additions

- `validateTrip` checks: different cities, a departure in the future, capacity a whole number from 1 to 50, rate a whole number from 1 to 1000. The limits are there so a typo like 5000 kg cannot be posted.
- `validateSearch` checks only the two cities. The date is optional.
- Again, these checks are for quick feedback. The server rules repeat the important ones.

## driver-dashboard.js

- The list is built with `document.createElement` and `textContent`, never `innerHTML`. City names and driver names are typed by users, and `innerHTML` would run any HTML or script inside them.
- `tripState` shows Open, Cancelled or Past. "Past" is worked out in the browser by comparing the departure time to now, so we do not need a background job to update it.
- The date picker's `min` is set to the current local time. `toISOString()` gives UTC, which is 5.5 hours behind India, so the code first shifts by `getTimezoneOffset()`. Without that, the minimum would be wrong.
- The post button is disabled while saving so a double tap does not post two trips.
- Cancelling asks `confirm()` first, then refreshes the list.

## sender-dashboard.js

- Shows only open trips that still have space and have not left.
- Results show route, time, driver name, free kg and rate. There is no request button yet. That is stage 3.
- Same `textContent` rule as the driver page.

## firestore.rules for trips

- **Read:** any logged in user. Trips hold no phone numbers or emails, so this is safe, and senders must be able to search.
- **Create:** only a user whose profile role is `driver` (the rule reads the profile with `get`), only with their own `driverId`, status `open`, `remainingKg` equal to `capacityKg`, whole numbers inside the allowed ranges, a real timestamp, and `createdAt` equal to the server's time. `driverName` must match the name in their profile so nobody can post under another name. `keys().hasOnly([...])` rejects any extra field someone tries to sneak in.
- **Update:** only the owner, and only the `status` field, and only to `cancelled`. A driver cannot edit capacity or rate of a posted trip. If the plan changes, cancel and post a new one. This keeps stage 3 simple: a trip a sender has seen does not change under them.
- **Delete:** never.

## Known limits

- Any driver can post, even if `verified` is false. The check for verified drivers comes with the document upload stage.
- City matching is exact text. No spelling help yet.
- Past trips stay in "My trips" forever. A filter can be added later.
- A driver who is full cannot close the trip. `remainingKg` reaching 0 hides it from search, which is enough for now.

## How to test stage 2

1. Publish the new `firestore.rules` (Firestore > Rules > paste > Publish).
2. Log in as the driver. Post a trip from Mumbai to Pune tomorrow, 20 kg, Rs 30.
3. Check Firestore: a `trips` document should appear with all the fields above.
4. Try bad input: same city twice, a past time, 0 kg, 60 kg. Each should show an error.
5. Log in as the sender. Search Mumbai to Pune. The trip should show with the driver's name.
6. Search Pune to Mumbai. Nothing should show.
7. Log in as the driver and cancel the trip. Search again as the sender. It should be gone.
