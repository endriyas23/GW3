import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">About GW3</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-xl text-muted-foreground mb-6">
          GW3 is a global crowdfunding platform dedicated to bringing creative ideas to life.
        </p>
        <p>
          Founded in 2024, our mission is to empower creators and innovators by connecting them with a community of backers who believe in their vision. Whether it's a groundbreaking tech gadget, an independent film, or a community project, GW3 provides the tools and support needed to turn dreams into reality.
        </p>
        <h2 className="text-2xl font-bold mt-12 mb-4">Our Values</h2>
        <ul className="space-y-4">
          <li><strong>Transparency:</strong> We believe in clear communication between creators and backers.</li>
          <li><strong>Innovation:</strong> We support ideas that push boundaries and solve problems.</li>
          <li><strong>Community:</strong> We foster a supportive environment for everyone involved.</li>
        </ul>
        <div className="mt-12 p-8 bg-muted rounded-2xl text-center">
          <h3 className="text-xl font-bold mb-4">Want to learn more?</h3>
          <Link to="/how-it-works">
            <Button size="lg">How It Works</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
