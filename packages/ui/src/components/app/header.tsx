import * as React from 'react';
import { cn } from '../../lib/utils';

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {}

const Header = React.forwardRef<HTMLElement, HeaderProps>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    className={cn('flex h-14 items-center border-b bg-background px-4', className)}
    {...props}
  />
));
Header.displayName = 'Header';

const HeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
HeaderTitle.displayName = 'HeaderTitle';

const HeaderNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn('flex items-center space-x-4', className)} {...props} />
  )
);
HeaderNav.displayName = 'HeaderNav';

const HeaderActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('ml-auto flex items-center space-x-2', className)} {...props} />
  )
);
HeaderActions.displayName = 'HeaderActions';

export { Header, HeaderTitle, HeaderNav, HeaderActions };
