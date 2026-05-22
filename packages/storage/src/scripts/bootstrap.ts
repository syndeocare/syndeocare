import { bootstrapLocalStorage } from "../index.js";

bootstrapLocalStorage()
  .then((result) => {
    console.log("Bootstrapped local storage buckets.");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Local storage bootstrap failed", error);
    process.exitCode = 1;
  });
