import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { GoalDetailPage } from "@/pages/GoalDetailPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { LoginPage } from "@/pages/LoginPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={<GoalsPage />} />
                <Route path="goals/:id" element={<GoalDetailPage />} />
              </Route>
            </Route>
          </Routes>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
