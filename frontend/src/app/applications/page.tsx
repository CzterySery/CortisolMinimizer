import { redirect } from "next/navigation";

// Keep calculator handoffs and bookmarks working after merging documents into the account page.
export default function Applications() {
  redirect("/me#dokumenty");
}
