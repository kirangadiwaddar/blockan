import { Suspense } from "react";
import TwoFactorAuthForm from "@/components/shadcn-space/blocks/two-factor-authentication/two-factor-auth";

export default function Page() {
  return (
    <Suspense>
      <TwoFactorAuthForm />
    </Suspense>
  );
}
