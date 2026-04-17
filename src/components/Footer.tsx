import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-bold text-primary">GW3</Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Empowering creators to bring their ideas to life and backers to support the next big thing.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse" className="hover:text-primary">All Campaigns</Link></li>
              <li><Link to="/browse?category=technology" className="hover:text-primary">Technology</Link></li>
              <li><Link to="/browse?category=creative" className="hover:text-primary">Creative</Link></li>
              <li><Link to="/browse?category=community" className="hover:text-primary">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary">How it Works</Link></li>
              <li><Link to="/terms" className="hover:text-primary">Terms of Use</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-primary">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary">Contact Us</Link></li>
              <li><Link to="/trust" className="hover:text-primary">Trust & Safety</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GW3. All rights reserved.
          </p>
          <div className="flex gap-6">
            {/* Social links placeholder */}
          </div>
        </div>
      </div>
    </footer>
  );
}
