import type { PropsWithChildren, ReactNode } from 'react';

export const Card = ({
  children,
  title,
  description,
  actions,
}: PropsWithChildren<{ title?: string; description?: string; actions?: ReactNode }>) => (
  <section className="card">
    {(title || actions) && (
      <header className="card-header">
        <div>
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {actions}
      </header>
    )}
    {children}
  </section>
);
