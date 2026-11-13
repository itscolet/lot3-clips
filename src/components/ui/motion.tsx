"use client";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { btn, type BtnProps } from "./ui";
import { cn } from "@/lib/format";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 10,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.38, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, gap = 0.035 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.36, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  value,
  format = "int",
  className,
}: {
  value: number;
  format?: "int" | "money" | "compact" | "money0";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => {
    if (format === "money") return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === "money0") return "$" + Math.round(v).toLocaleString("en-US");
    if (format === "compact")
      return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
    return Math.round(v).toLocaleString("en-US");
  });
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 0.9, ease });
    return () => c.stop();
  }, [inView, value, mv]);
  return (
    <motion.span ref={ref} className={cn("num", className)}>
      {text}
    </motion.span>
  );
}

export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
} & BtnProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      className={cn(btn({ variant, size }), className)}
    >
      {pending ? (
        <>
          <span className="size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
