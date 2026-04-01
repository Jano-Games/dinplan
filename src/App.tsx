import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { AlarmOverlay } from "@/components/AlarmOverlay";
import Tasks from "@/pages/Tasks";
import Plans from "@/pages/Plans";
import Routines from "@/pages/Routines";
import Reminders from "@/pages/Reminders";
import Profile from "@/pages/Profile";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <Toaster position="top-center" />
        <AuthGuard>
          <AlarmOverlay />
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Tasks />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/routines" element={<Routines />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </ThemeProvider>
  );
}
