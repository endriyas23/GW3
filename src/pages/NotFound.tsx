import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-6 bg-primary/10 rounded-full mb-6">
        <AlertCircle className="w-16 h-16 text-primary" />
      </div>
      <h1 className="text-6xl font-black mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8 text-lg">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      <Link to="/">
        <Button size="lg" className="rounded-2xl font-black px-8 h-14 shadow-xl shadow-primary/20">
          <Home className="mr-2 h-5 w-5" />
          Back to GW3
        </Button>
      </Link>
    </div>
  );
}
