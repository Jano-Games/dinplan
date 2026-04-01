import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, MapPin, CalendarCheck, Bell, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: ClipboardList, label: "Tasks" },
  { path: "/plans", icon: MapPin, label: "Plans" },
  { path: "/routines", icon: CalendarCheck, label: "Routines" },
  { path: "/reminders", icon: Bell, label: "Remind" },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <h1 className="text-lg font-extrabold tracking-tight text-primary">DinPlan</h1>
          <button
            onClick={() => navigate("/profile")}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              location.pathname === "/profile"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <UserCircle className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 px-5 pt-5 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/40">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary" />
                )}
                <item.icon className={`h-5 w-5 transition-all duration-200 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                <span className={`text-[10px] transition-all duration-200 ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
