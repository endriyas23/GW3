import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Home } from "lucide-react";

export default function ServerError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-6 bg-destructive/10 rounded-full mb-6">
        <RefreshCcw className="w-16 h-16 text-destructive" />
      </div>
      <h1 className="text-6xl font-black mb-4 tracking-tighter">500</h1>
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md mb-8 text-lg">
        We're experiencing some technical difficulties. Please try refreshing the page or come back later.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          size="lg" 
          variant="outline" 
          className="rounded-2xl font-black px-8 h-14 border-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCcw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
        <Link to="/">
          <Button size="lg" className="rounded-2xl font-black px-8 h-14 shadow-xl shadow-primary/20">
            <Home className="mr-2 h-5 w-5" />
            Back to GW3
          </Button>
        </Link>
      </div>
    </div>
  );
}
