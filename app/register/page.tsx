import { Suspense } from "react";
import RegisterForm from "@/components/shadcn-space/blocks/register/register";

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
