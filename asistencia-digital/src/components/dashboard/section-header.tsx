import type { LucideIcon } from "lucide-react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
};

export function SectionHeader({
  eyebrow = "ESPACIO ADMINISTRATIVO",
  title,
  description,
  icon: Icon,
  action,
}: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-heading-copy">
        <div className="section-heading-icon">
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </div>
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="section-description">{description}</p>
        </div>
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </header>
  );
}
