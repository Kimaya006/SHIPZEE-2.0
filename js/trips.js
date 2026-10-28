// Everything that talks to the "trips" collection in Firestore.
// Pages call these functions and never write database code themselves.

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { normalizeCity, displayCity } from "./cities.js";

const tripsCollection = collection(db, "trips");

// trip = { from, to, departAt (Date), capacityKg, ratePerKg }
export async function createTrip(driverId, driverName, trip) {
  await addDoc(tripsCollection, {
    driverId: driverId,
    driverName: driverName,
    fromCity: normalizeCity(trip.from),      // used for matching
    toCity: normalizeCity(trip.to),
    fromDisplay: displayCity(trip.from),     // used for showing on screen
    toDisplay: displayCity(trip.to),
    departAt: Timestamp.fromDate(trip.departAt),
    capacityKg: trip.capacityKg,
    remainingKg: trip.capacityKg,            // goes down as parcels are accepted
    ratePerKg: trip.ratePerKg,
    status: "open",
    createdAt: serverTimestamp()
  });
}

// Returns this driver's trips, soonest first.
export async function getMyTrips(driverId) {
  // Only one filter (driverId) and we sort in JavaScript. Filtering AND
  // sorting on different fields in Firestore needs a manually created index,
  // which is an extra setup step we do not need for a handful of trips.
  const q = query(tripsCollection, where("driverId", "==", driverId));
  const snapshot = await getDocs(q);

  const trips = snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, departAt: data.departAt.toDate() };
  });

  trips.sort((a, b) => a.departAt - b.departAt);
  return trips;
}

// Cancelling changes the status. We never delete, so history stays.
export async function cancelTrip(tripId) {
  await updateDoc(doc(db, "trips", tripId), { status: "cancelled" });
}

// Finds open trips for a route. fromText and toText come from the search form.
// dateText is optional and looks like "2026-11-02" (empty means any day).
export async function searchTrips(fromText, toText, dateText) {
  // Two equality filters need no manual index. Everything else (open status,
  // not in the past, free space, the chosen day) is filtered in JavaScript.
  const q = query(
    tripsCollection,
    where("fromCity", "==", normalizeCity(fromText)),
    where("toCity", "==", normalizeCity(toText))
  );
  const snapshot = await getDocs(q);
  const now = new Date();

  let trips = snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, departAt: data.departAt.toDate() };
  });

  trips = trips.filter(
    (t) => t.status === "open" && t.departAt > now && t.remainingKg > 0
  );

  if (dateText) {
    const [year, month, day] = dateText.split("-").map(Number);
    trips = trips.filter(
      (t) =>
        t.departAt.getFullYear() === year &&
        t.departAt.getMonth() + 1 === month &&
        t.departAt.getDate() === day
    );
  }

  trips.sort((a, b) => a.departAt - b.departAt);
  return trips;
}
