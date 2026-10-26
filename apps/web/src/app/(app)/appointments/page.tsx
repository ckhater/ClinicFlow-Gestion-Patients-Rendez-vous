import type { Metadata } from "next";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function AppointmentsPage() {
  return <AppointmentsView />;
}
