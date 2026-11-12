import { Suspense } from "react";
import AutoregistrationFlow from "@/components/autoregistro/autoregistration-flow";

function LoadingRegistration() {
  return (
    <main className="autoregistration-loading">
      <p>Preparando el registro seguro del evento…</p>
    </main>
  );
}

export default function AutoRegistroPage() {
  return (
    <Suspense fallback={<LoadingRegistration />}>
      <AutoregistrationFlow />
    </Suspense>
  );
}
