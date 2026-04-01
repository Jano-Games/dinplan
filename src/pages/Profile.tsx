import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function Profile() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
      setName(data.user?.user_metadata?.full_name || "");
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>

      <div className="rounded-2xl bg-card border border-border/50 p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{(name || email).charAt(0).toUpperCase()}</span>
          </div>
          <div>
            {name && <p className="font-bold">{name}</p>}
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-amber-500" />}
            <p className="text-sm font-medium">Dark Mode</p>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`relative h-7 w-12 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-secondary"}`}
          >
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <Button variant="destructive" onClick={handleLogout} className="w-full h-14 rounded-2xl font-bold text-base">
        <LogOut className="h-5 w-5 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
