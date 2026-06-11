import { Suspense } from "react";
import ForgotPassword from "@/components/shadcn-space/blocks/forgot-password/forgot-password";

export default function Page() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
