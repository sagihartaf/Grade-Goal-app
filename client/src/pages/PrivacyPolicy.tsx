export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">
            Last updated: {new Date().getFullYear()}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect information you provide directly, such as your email and profile details,
            as well as usage data generated while using the app to help improve our service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your information is used to deliver, maintain, and improve GradeGoal, personalize your
            experience, and communicate important updates or support responses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies and similar technologies for authentication, analytics, and to deliver
            advertising. Third-party services such as Google AdSense may place cookies to serve ads
            based on your interests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at support@gradegoal.app.
          </p>
        </section>
      </div>
    </div>
  );
}

