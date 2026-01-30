'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export interface CrossyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const CrossyCard = React.forwardRef<HTMLDivElement, CrossyCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn('crossy-card', className)}
        {...props}
      >
        {children}
      </Card>
    );
  }
);
CrossyCard.displayName = 'CrossyCard';

const CrossyCardHeader = CardHeader;
const CrossyCardTitle = CardTitle;
const CrossyCardDescription = CardDescription;
const CrossyCardContent = CardContent;
const CrossyCardFooter = CardFooter;

export {
  CrossyCard,
  CrossyCardHeader,
  CrossyCardTitle,
  CrossyCardDescription,
  CrossyCardContent,
  CrossyCardFooter,
};
