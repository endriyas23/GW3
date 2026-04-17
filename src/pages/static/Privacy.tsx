export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-8">Last updated: April 13, 2024</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, back a project, or communicate with us.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. Sharing of Information</h2>
          <p>We may share information with creators of projects you back and with third-party service providers who perform services on our behalf.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Your Choices</h2>
          <p>You may update your account information at any time by logging into your account settings.</p>
        </section>
      </div>
    </div>
  );
}
