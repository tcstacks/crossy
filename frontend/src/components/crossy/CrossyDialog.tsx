'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CrossyDialog = Dialog;
const CrossyDialogTrigger = DialogTrigger;
const CrossyDialogFooter = DialogFooter;
const CrossyDialogTitle = DialogTitle;
const CrossyDialogDescription = DialogDescription;

const CrossyDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <DialogHeader
    ref={ref}
    className={cn('border-b-2 border-crossy-dark-purple pb-4', className)}
    {...props}
  />
));
CrossyDialogHeader.displayName = 'CrossyDialogHeader';

const CrossyDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(
      'crossy-card border-4 border-crossy-dark-purple',
      'bg-white rounded-3xl',
      className
    )}
    {...props}
  />
));
CrossyDialogContent.displayName = 'CrossyDialogContent';

export {
  CrossyDialog,
  CrossyDialogTrigger,
  CrossyDialogContent,
  CrossyDialogHeader,
  CrossyDialogTitle,
  CrossyDialogDescription,
  CrossyDialogFooter,
};
