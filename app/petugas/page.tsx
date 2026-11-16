import PinjaminDemo from "@/app/components/PinjaminDemo";

export const metadata = {
  title: "Petugas · Pinjamin",
  description: "Panel operasional petugas Pinjamin.",
};

export default function PetugasPage() {
  return <PinjaminDemo initialRole="petugas" />;
}
