import { runSeed } from "../src/lib/seed";

runSeed()
  .then((counts) => {
    console.log("Seed complete:");
    console.table(counts);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
