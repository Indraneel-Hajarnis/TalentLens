import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "../context/HistoryContext";

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
    <div className="flex flex-col items-center justify-center min-h-[85vh] animate-[fadeIn_0.5s_ease-out] gap-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6] flex items-center justify-center font-black text-white text-3xl shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          ATS
        </div>
        <div className="text-center">
           <h1 className="text-4xl font-black text-white tracking-tighter uppercase">ATS <span className="text-[#8b5cf6]">Analyzer</span></h1>
           <p className="text-[#64748b] font-bold text-xs uppercase tracking-[0.4em] mt-1 ml-1">AI-Powered Resume Optimization</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-[#131b26] border border-[#1e293b] rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
        {/* Decorative backdrop */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ab5d0]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#0ab5d0]/10 transition-colors"></div>
        
        <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="text-sm text-[#94a3b8] mb-8 font-medium">Please enter your details to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-[#0d1624] border border-[#1e293b] rounded-lg p-3 text-white focus:outline-none focus:border-[#0ab5d0] transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-[#0d1624] border border-[#1e293b] rounded-lg p-3 text-white focus:outline-none focus:border-[#0ab5d0] transition-all"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#0d1624] border border-[#1e293b] rounded-lg p-3 text-white focus:outline-none focus:border-[#0ab5d0] transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-[#0ab5d0] text-white font-bold text-sm hover:bg-[#009bba] shadow-[0_0_20px_rgba(10,181,208,0.2)] transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1e293b] text-center">
          <p className="text-sm text-[#94a3b8] font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#0ab5d0] hover:underline font-bold"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
