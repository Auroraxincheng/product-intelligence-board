import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/cbi/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CBI Product Team — Weekly Update" },
      { name: "description", content: "Weekly Kanban-style product intelligence board for CBI & CBP — track updates, announcements, and PM capacity." },
      { property: "og:title", content: "CBI Product Team — Weekly Update" },
      { property: "og:description", content: "Internal product intelligence board for CBI & CBP." },
    ],
  }),
  component: Dashboard,
});
