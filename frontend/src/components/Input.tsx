import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent",
          "placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500",
          error && "border-red-400 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";
