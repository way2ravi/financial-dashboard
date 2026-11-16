import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireOwner, ResearchAccessError } from "./auth";
import { readResearch } from "./repository";
import { researchView } from "./view";
export async function ownerPage() {
  const owner = await requireOwner().catch((error) => {
    if (error instanceof ResearchAccessError && error.status === 401)
      redirect("/institutional-intelligence/login");
    notFound();
  });
  return researchView(
    await readResearch(owner.client, owner.user.id),
    owner.client,
  );
}
