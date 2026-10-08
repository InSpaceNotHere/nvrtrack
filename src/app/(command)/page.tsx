import { redirect } from "next/navigation";

import { POST_AUTH_HOME } from "@/lib/command-center/routes";

export default function RootPage() {
  redirect(POST_AUTH_HOME);
}
