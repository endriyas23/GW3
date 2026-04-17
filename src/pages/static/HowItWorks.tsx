import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Heart, PartyPopper } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <Search className="w-12 h-12 text-primary" />,
      title: "Discover",
      description: "Browse thousands of campaigns across technology, design, film, and more. Find projects that inspire you."
    },
    {
      icon: <Heart className="w-12 h-12 text-orange-500" />,
      title: "Back",
      description: "Support creators by pledging money in exchange for unique rewards. Your contribution helps bring ideas to life."
    },
    {
      icon: <PartyPopper className="w-12 h-12 text-green-500" />,
      title: "Celebrate",
      description: "Follow the journey as the project comes to life. Receive your rewards and be part of the success story."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold mb-4">How GW3 Works</h1>
        <p className="text-xl text-muted-foreground">
          From a spark of an idea to a finished product, we're with you every step of the way.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12 mb-20">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-center p-8 bg-card rounded-2xl shadow-sm border">
            <div className="mb-6 p-4 bg-muted rounded-full">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-primary text-primary-foreground rounded-3xl p-12 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to start your own campaign?</h2>
        <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
          Join thousands of creators who have successfully funded their projects on GW3.
        </p>
        <Link to="/create">
          <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold">
            Start a Campaign
          </Button>
        </Link>
      </div>
    </div>
  );
}
