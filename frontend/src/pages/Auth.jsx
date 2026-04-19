import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "../context/HistoryContext";
import { Search, Loader2 } from "lucide-react";

export default function Auth() {
  const { refreshHistory } = useHistory();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // If successful, better-auth sets a cookie automatically.
      // Refresh context before navigating
      refreshHistory();
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] gap-8 relative z-10 w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--color-primary-dark)] to-[var(--color-primary)] flex items-center justify-center font-black text-white text-3xl shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          <Search className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
           <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tighter">
             TalentLens
           </h1>
           <p className="text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.4em] mt-1 ml-1">AI Engine Login</p>
        </div>
      </div>

      <div className="w-full glass-panel p-8 relative overflow-hidden group">
        {/* Decorative backdrop */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-secondary)]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[var(--color-secondary)]/10 transition-colors"></div>
        
        <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-8 font-medium">Please enter your details to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                className="w-full glass-input rounded-xl p-3 focus:outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              className="w-full glass-input rounded-xl p-3 focus:outline-none transition-all"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              className="w-full glass-input rounded-xl p-3 focus:outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl relative overflow-hidden group/btn font-bold text-sm text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Access Workspace" : "Create Credentials")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-[var(--color-text-muted)] font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[var(--color-secondary)] hover:text-white transition-colors hover:underline font-bold"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
