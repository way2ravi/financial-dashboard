import { Studio } from "../components/Studio";
import { requireSession } from "../lib/auth";

export default async function Page() {
  await requireSession();
  return <Studio />;
}
