export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">
            Last updated: {new Date().getFullYear()}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using GradeGoal, you agree to these Terms. If you do not agree, please
            discontinue use of the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Use License</h2>
          <p className="text-muted-foreground leading-relaxed">
            We grant you a limited, non-transferable license to use the app for personal,
            non-commercial purposes in accordance with these Terms and applicable laws.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            The service is provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee accuracy of calculations or uninterrupted availability.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Limitations</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent permitted by law, GradeGoal and its team shall not be liable for
            any indirect, incidental, or consequential damages arising from your use of the app.
          </p>
        </section>
      </div>
    </div>
  );
}

