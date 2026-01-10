import { Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 text-center text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
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
        <p className="text-xs">
          משהו לא עובד או שיש רעיון לשיפור? אשמח לשמוע
        </p>
      </div>
    </footer>
  );
}



