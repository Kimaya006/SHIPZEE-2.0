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

Done in stage 2 below. Stage 3 (app shell and design) comes after it. Parcel requests move to stage 4.

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

---

# Stage 3 decisions: Shipzee app shell and design

## What changed

- The app is now called **Shipzee**. Page titles, the landing page and the logo use the new name.
- The single dashboard window is split into separate screens with tabs.
- The look was redesigned from scratch around one idea (see "Design" below).
- `firestore.rules` did **not** change in this stage, so you do not need to publish rules again.

## Files to delete from your folder

Copying the new files over your folder will not remove old ones. Delete these four by hand, because the tabs replace them:

```
driver-dashboard.html
sender-dashboard.html
js/driver-dashboard.js
js/sender-dashboard.js
```

## Folder structure now

```
shipzee/
  index.html              landing page
  login.html              log in
  signup.html             create account
  driver-home.html        driver: stats and next trip
  driver-post.html        driver: post a trip
  driver-trips.html       driver: all my trips, filters, cancel
  driver-requests.html    driver: parcel requests (placeholder)
  sender-search.html      sender: find a driver
  sender-parcels.html     sender: my parcels (placeholder)
  profile.html            both roles: account details, log out
  assets/
    logo.svg
  css/
    style.css             every style, in one file
  js/
    firebase-config.js    Firebase connection (unchanged)
    cities.js             city list and name cleaning (unchanged)
    trips.js              trips database calls (unchanged)
    validators.js         input checks (unchanged)
    routes.js             role to home page mapping (updated)
    guard.js              login and role check (updated)
    shell.js              NEW: top bar, tabs, startPage()
    ui.js                 NEW: shared card, empty state, toast helpers
    signup.js, login.js   unchanged
    driver-home.js, driver-post.js, driver-trips.js, driver-requests.js
    sender-search.js, sender-parcels.js, profile.js
  firestore.rules
  decision.md
  .gitignore
```

The rule from stage 1 still holds: one page has one JS file with the same name. What is new is that code needed by several pages lives in `shell.js` and `ui.js`.

## Why separate pages and not one page that swaps content

There are two common ways to build a multi screen app:

- **Multi page (what we use):** each screen is its own HTML file with its own address. The browser's back button, refresh and bookmarks all work without extra code. Each file is small enough to read in one sitting. The cost is a page reload when you switch tabs, which is fast here because the files are tiny.
- **Single page app (React, Vue):** one HTML file, and JavaScript swaps the screens. No reloads and smoother transitions, but you need a router, state management and a build tool. That is the complexity that hurt last time.

Multi page is the right size for where you are. When you move to React later, the screens, data model and rules all carry over.

## shell.js: the frame around every screen

Every screen inside the app has the same green top bar and the same tabs. Instead of copying that markup into eight HTML files, `shell.js` builds it once.

A page does this:

```js
startPage({ role: "driver", tab: "trips" }, (profile, user) => {
  // the page's own code
});
```

What `startPage` does, in order:

1. Calls `requireRole` from `guard.js`. That checks login and role.
2. Builds the top bar (logo, role pill, avatar with your initial) and the tabs.
3. Puts them into `<div id="app">`.
4. Runs the page's own code, passing in the profile and the user.

Decisions inside it:

- **`TABS` is a plain list at the top.** Each tab has a key, label, link and icon. Adding a screen later means adding one line there and one new page.
- **Which tabs you see depends on `profile.role`**, not on what the page asked for. This lets `profile.html` use `role: "any"` and still show the right tabs to a driver and a sender.
- **`aria-current="page"`** marks the active tab. Screen readers announce it, and the CSS uses it for the highlight.
- **The one `innerHTML`.** The icons are SVG strings that we wrote ourselves, so putting them in with `innerHTML` is safe. Everything else, including your name in the avatar, uses `textContent`. The rule is: `innerHTML` only for text that no user can influence.
- **Tabs at the bottom on phones, in a sidebar on wide screens.** A thumb reaches the bottom of a phone easily. On a laptop a sidebar uses the space better. It is the same HTML, and only the CSS changes at 800px width.

## guard.js: three changes

1. **It accepts `"any"`** as the expected role, for pages both roles can open.
2. **It unhides `#app`** instead of `#content`, because the frame (top bar and tabs) lives inside `#app` too.
3. **`onReady` now runs outside the `try` block.** Before, if a page's own code had a bug, that error was caught by the same `try` and the user was sent to the login page with a misleading "could not load profile" message. Now only the profile loading is inside the `try`, so a bug in a page shows up as a real error in the console.

## ui.js: shared helpers

Before this stage, `formatDate` and the trip list markup were copied in two files. When the same code appears twice, a fix has to be made twice, and one copy gets forgotten. So it moved here:

- **`buildTripCard(trip, options)`** builds one trip card. Options say whether to show the driver name (sender screens), a status badge (driver screens) and a cancel button.
- **`tripState(trip)`** returns Open, Past or Cancelled. "Past" is worked out by comparing the departure time to now, so no background job is needed to update it.
- **`formatDate`** shows the year only when the trip is not in the current year.
- **`fillEmpty`** fills the "nothing here yet" box. An empty screen should say what to do next, so it takes an optional button.
- **`showToast`** shows a short message that removes itself after 3.5 seconds, used to confirm actions.
- Everything uses `textContent`, never `innerHTML`, for the same XSS reason as before.

## The screens

| Screen | File | Role | What it does |
|---|---|---|---|
| Home | driver-home.html | driver | Three numbers (open trips, kg free, trips posted) and the next trip to leave |
| Post trip | driver-post.html | driver | The form from stage 2, now on its own screen |
| My trips | driver-trips.html | driver | All trips with filter chips (Upcoming, Past, Cancelled, All) and cancel |
| Requests | driver-requests.html | driver | Placeholder until stage 4 |
| Find a driver | sender-search.html | sender | The search from stage 2 plus results |
| My parcels | sender-parcels.html | sender | Placeholder until stage 4 |
| Profile | profile.html | both | Account details and log out |

Notes on specific decisions:

- **After posting a trip you land on My trips** with a "Trip posted." message. The address carries `?posted=1`, the page shows the message once, and `history.replaceState` removes the `?posted=1` so a refresh does not show it again. This is a simple way to pass a small bit of information to the next page.
- **The submit button stays disabled after a successful post**, because the page is about to change. That stops a second tap from posting the same trip twice.
- **Filters on My trips happen in the browser.** All of the driver's trips are loaded once and the chips just choose which ones to show. A driver has few trips, so this is fast and costs no extra database reads. With thousands of trips this would move into the query.
- **Past trips are shown newest first**, because "what did I do last" matters more than the oldest trip.
- **Home shows "Trips posted", not "Requests".** Requests do not exist yet, and a made up zero would be misleading.
- **The log out button is only on Profile.** Having it on every screen is clutter, and Profile is where people look for it.

## Design

**Concept: Indian road signage.** The app is about roads, so it looks like the road. Highway signs here are deep green with white text, lane markings are yellow dashes, and concrete is grey.

- **Colours** (all defined once in `:root` in `style.css`, so changing the brand is a one place edit):
  - Highway green `#0f4c3a` for the top bar, signs and brand
  - Lane yellow `#ffc400` for the main action and the active tab
  - Concrete grey `#eef0ec` for the page background, with white for surfaces
  - Asphalt `#17201c` for text
- **The one loud element is the green sign** on each trip card, with a thin white inset border like a real highway sign and the yellow dashed lane marking between the two cities. Everything else is quiet on purpose: flat surfaces, thin lines, no shadows.
- **Fonts:** Barlow Condensed for headings, city names and numbers (a family inspired by highway signage), and Barlow for body text. They load from Google Fonts with `@import` at the top of `style.css`, so one line controls it. If the font cannot load, the browser falls back to the system font and the layout still works.
- **Buttons are yellow with dark text, not white text.** White on this yellow fails the contrast guideline (it needs 4.5 to 1 for text, and white on yellow is about 1.6 to 1). Dark text on yellow is about 10 to 1.
- **Long city names wrap** inside the sign instead of breaking mid word. `flex-wrap` on the sign lets the second city drop to the next line.
- **No hover effects on cards and no entrance animations.** Motion is reserved for responses to what the user did (the toast). `prefers-reduced-motion` turns the rest off for people who ask for that.

Quality checks built into the CSS:

- Tap targets are at least 44px tall.
- Form text is above 16px, because iPhones zoom into smaller inputs.
- Every link and button shows a visible focus ring for keyboard users.
- Status badges carry words (Open, Past, Cancelled) and not only colour.
- Muted grey text and form borders were picked to pass contrast against their backgrounds.

CSS notes for when you read `style.css`:

- `[hidden] { display: none !important; }` exists because a class like `.empty { display: flex }` would otherwise override the `hidden` attribute.
- Selectors are single classes wherever possible, so two rules do not fight over which one wins.
- `.panel > form > .field-grid:first-child` pulls the first row up by the height of a label's top margin, so panels do not have a double gap at the top.

## .gitignore

Lists what git must never upload: operating system junk files, `.env` files, private keys and service account files, `node_modules`, logs and editor settings. Nothing in that list exists in the project yet. It is there so a secret can never be added by accident later.

## Known limits

- **The landing page describes features that are not built yet** (one time codes at pickup and delivery). The footer says features are still being built. Stage 5 delivers the codes.
- **Requests and My parcels are placeholders.** Their text says so and points to something the user can do now.
- **Fonts are loaded from the internet.** Offline, you will see the fallback font.
- **The Home tab for senders is the search page.** A sender dashboard with recent parcels arrives with stage 4.

## How to test stage 3

1. Delete the four old files listed above, copy in the new ones, and keep your own `js/firebase-config.js`.
2. Open `index.html` with Live Server. Check the landing page on your laptop, then resize the browser narrow, or open it on your phone with the Live Server address on the same wifi.
3. Log in as the driver. You should see the green top bar, a sidebar on a laptop, and tabs along the bottom on a narrow window.
4. Click through all five tabs. The active one should be highlighted each time.
5. Post a trip on the Post trip tab. You should land on My trips with a "Trip posted." message.
6. Try the filter chips and cancel a trip.
7. Log in as the sender. Check Find a driver, My parcels and Profile.
8. Open `driver-home.html` while logged in as the sender. You should be sent back to Find a driver.
9. Log out from Profile.

If something looks wrong, send a screenshot plus the console error (F12, Console tab).

## Commit it

```
git add .
git commit -m "Stage 3: Shipzee app shell, tabs and new design"
git push
```
