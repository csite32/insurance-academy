import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Course from "./pages/Course.tsx";
import Login from "./pages/Login.tsx";
import Profile from "./pages/Profile.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminCourses from "./pages/admin/AdminCourses.tsx";
import AdminChapters from "./pages/admin/AdminChapters.tsx";
import AdminLessons from "./pages/admin/AdminLessons.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminAssignments from "./pages/admin/AdminAssignments.tsx";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course/:id"
              element={
                <ProtectedRoute>
                  <Course />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <AdminProtectedRoute>
                  <AdminCourses />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/chapters"
              element={
                <AdminProtectedRoute>
                  <AdminChapters />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/lessons"
              element={
                <AdminProtectedRoute>
                  <AdminLessons />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminProtectedRoute>
                  <AdminUsers />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/assignments"
              element={
                <AdminProtectedRoute>
                  <AdminAssignments />
                </AdminProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
