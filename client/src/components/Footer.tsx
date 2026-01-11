import { Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
          {/* Created by credit */}
          <div>
            <a
              href="https://www.linkedin.com/in/sagi-hartaf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:text-primary transition-colors"
            >
              Created by Sagi Hartaf
              <Linkedin className="w-4 h-4 ml-2 inline" />
            </a>
          </div>
          
          {/* Legal links */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}



