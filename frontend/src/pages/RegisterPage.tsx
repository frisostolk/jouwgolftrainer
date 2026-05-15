import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"player" | "coach">("player");
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.email, data.name, data.password, role);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError("root", { message: err?.response?.data?.detail || "Registration failed" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg">
          <span className="text-3xl">⛳</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-10">Join Golf Trainer</h1>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create account</h2>

          {/* Role toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setRole("player")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${role === "player" ? "bg-green-700 text-white" : "bg-white text-gray-600"}`}
            >
              I'm a Player
            </button>
            <button
              type="button"
              onClick={() => setRole("coach")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${role === "coach" ? "bg-green-700 text-white" : "bg-white text-gray-600"}`}
            >
              I'm a Coach
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Full name" placeholder="John Smith" {...register("name")} error={errors.name?.message} />
            <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
            <Input label="Password" type="password" placeholder="Min 8 characters" {...register("password")} error={errors.password?.message} />
            {errors.root && <p className="text-sm text-red-600 text-center">{errors.root.message}</p>}
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">Create account</Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-green-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
