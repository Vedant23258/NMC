import type { ReactNode } from 'react';

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) => (
  <header className="page-header">
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {actions ? <div className="page-header-actions">{actions}</div> : null}
  </header>
);
