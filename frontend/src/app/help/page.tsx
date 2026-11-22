import { redirect } from "next/navigation";

// Help (assistant chat and links) now lives at the bottom of the home page; keep old links working.
export default function Help() {
  redirect("/#pomoc");
}
