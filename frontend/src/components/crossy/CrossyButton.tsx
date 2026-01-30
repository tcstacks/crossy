'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CrossyButtonProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'variant'> {
  variant?: 'primary' | 'secondary';
}

const CrossyButton = React.forwardRef<HTMLButtonElement, CrossyButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          variant === 'primary' ? 'crossy-button' : 'crossy-button-secondary',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
CrossyButton.displayName = 'CrossyButton';

export { CrossyButton };
