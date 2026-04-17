export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-8">Last updated: April 13, 2024</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using GW3, you agree to be bound by these Terms of Use and all applicable laws and regulations.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Crowdfunding Risks</h2>
          <p>Crowdfunding involves risks. Backers understand that rewards are not guaranteed and that creators are responsible for fulfilling their promises.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. User Conduct</h2>
          <p>Users must not post fraudulent campaigns, harass others, or violate intellectual property rights.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Fees</h2>
          <p>GW3 charges a platform fee on successfully funded campaigns. Payment processing fees also apply.</p>
        </section>
      </div>
    </div>
  );
}
