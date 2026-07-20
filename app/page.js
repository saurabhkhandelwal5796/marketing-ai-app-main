import { redirect } from "next/navigation";
import { getSessionFromCookies } from "../lib/authSession";

export default async function Home() {
  const session = await getSessionFromCookies();
  redirect(session ? "/dashboard" : "/auth");
}
