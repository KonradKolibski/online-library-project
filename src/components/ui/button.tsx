import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display text-sm font-semibold ring-offset-background transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      // Duolingo-style: a solid 3D bottom "lip" that presses down on click.
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_0_0_rgba(0,0,0,0.22)] active:translate-y-[3px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.22)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_0_0_rgba(0,0,0,0.22)] active:translate-y-[3px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.22)]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-[0_3px_0_0_hsl(var(--border))] active:translate-y-[2px] active:shadow-[0_1px_0_0_hsl(var(--border))]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_4px_0_0_hsl(var(--border))] active:translate-y-[3px] active:shadow-[0_1px_0_0_hsl(var(--border))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-12 rounded-full px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
