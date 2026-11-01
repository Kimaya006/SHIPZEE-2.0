import { startPage } from "./shell.js";

// Nothing to load yet. Parcel requests arrive in the next stage.
startPage({ role: "driver", tab: "requests" }, () => {});
