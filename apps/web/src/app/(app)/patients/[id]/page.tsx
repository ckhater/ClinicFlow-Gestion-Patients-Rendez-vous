import type { Metadata } from "next";
import { PatientDetailView } from "@/features/patients/patient-detail-view";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Patient details",
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  return <PatientDetailView id={id} />;
}
