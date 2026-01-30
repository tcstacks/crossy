'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface CrossyInputProps extends React.ComponentPropsWithoutRef<typeof Input> {}

const CrossyInput = React.forwardRef<HTMLInputElement, CrossyInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <Input
        type={type}
        className={cn(
          'border-2 border-crossy-dark-purple rounded-xl',
          'focus:ring-2 focus:ring-crossy-purple focus:border-crossy-purple',
          'bg-white text-crossy-dark-purple',
          'placeholder:text-gray-400',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
CrossyInput.displayName = 'CrossyInput';

export { CrossyInput };
