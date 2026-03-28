import { getDb } from "./index";
import { tenants } from "./schema/core";

async function main() {
  const db = getDb();
  await db
    .insert(tenants)
    .values({
      slug: "dev",
      name: "Development tenant",
      plan: "free",
    })
    .onConflictDoNothing({ target: tenants.slug });

  console.log("Seed OK: tenant slug=dev (inserted or already present).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
