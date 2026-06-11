import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="size-20 rounded-2xl bg-muted flex items-center justify-center">
          <FileQuestion size={36} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight">404</h1>
          <p className="text-xl font-semibold mt-2">Page not found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={buttonVariants({ className: "cursor-pointer gap-2" })}>
          <ArrowLeft size={14} /> Go to Dashboard
        </Link>
        <Link href="/projects" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
          View Projects
        </Link>
      </div>
    </div>
  );
}
