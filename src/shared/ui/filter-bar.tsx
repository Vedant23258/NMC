import type { PropsWithChildren, ReactNode } from 'react';

export const FilterBar = ({
  children,
  aside,
}: PropsWithChildren<{ aside?: ReactNode }>) => (
  <div className="filter-bar">
    <div className="filter-bar-fields">{children}</div>
    {aside ? <div className="filter-bar-aside">{aside}</div> : null}
  </div>
);
