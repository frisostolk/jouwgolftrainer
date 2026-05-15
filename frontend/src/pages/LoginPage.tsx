import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      navigate("/", { replace: true });
    } catch {
      setError("root", { message: "Invalid email or password" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg">
          <span className="text-3xl">⛳</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Golf Trainer</h1>
        <p className="text-green-200 mb-10 text-center">Your personal training companion</p>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
            <Input label="Password" type="password" placeholder="••••••••" {...register("password")} error={errors.password?.message} />
            {errors.root && <p className="text-sm text-red-600 text-center">{errors.root.message}</p>}
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">Sign in</Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{" "}
            <Link to="/register" className="text-green-700 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
