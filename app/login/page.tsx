import { Suspense } from "react";
import LoginForm from "@/components/shadcn-space/blocks/login/login";

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
