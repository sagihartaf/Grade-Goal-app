export function Footer() {
  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} GradeGoal. כל הזכויות שמורות.</p>
        <div className="flex items-center gap-4">
          <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}



