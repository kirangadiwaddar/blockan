import { Suspense } from "react";
import VerifyEmail from "@/components/shadcn-space/blocks/verify-email/verify-email";

export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
