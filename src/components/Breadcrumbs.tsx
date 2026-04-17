import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm font-bold text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap pb-2">
      <Link to="/" className="hover:text-primary flex items-center gap-1 transition-colors">
        <Home className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;

        return (
          <div key={to} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 shrink-0" />
            {last ? (
              <span className="text-foreground capitalize truncate max-w-[150px]">
                {value.replace(/-/g, " ")}
              </span>
            ) : (
              <Link to={to} className="hover:text-primary transition-colors capitalize">
                {value.replace(/-/g, " ")}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
