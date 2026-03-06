import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SubmitPaper from "./pages/SubmitPaper";
import About from "./pages/About";
import ArticleDetail from "./pages/ArticleDetail";
import MySubmissions from "./pages/MySubmissions";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import ReviewerManagement from "./pages/admin/ReviewerManagement";
import JournalSettings from "./pages/admin/JournalSettings";
import UserManagement from "./pages/admin/UserManagement";
import ReviewerDashboard from "./pages/reviewer/Dashboard";
import ReviewerProfile from "./pages/reviewer/Profile";
import EditorDashboard from "./pages/editor/Dashboard";
import EditorProfile from "./pages/editor/Profile";
import Register from "./pages/Register";
import AuthorRegister from "./pages/AuthorRegister";
import UserProfile from "./pages/UserProfile";
import { AdminRoute } from "./components/admin/AdminRoute";
import { ReviewerRoute } from "./components/reviewer/ReviewerRoute";
import { EditorRoute } from "./components/editor/EditorRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminProfile from "./pages/admin/Profile";
import { queryClient } from "@/lib/react-query";
import { AuthProvider } from "./contexts/AuthContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/submit" element={<SubmitPaper />} />
            <Route path="/about" element={<About />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/my-submissions" element={<MySubmissions />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-author" element={<AuthorRegister />} />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reviewers"
              element={
                <AdminRoute>
                  <ReviewerManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <AdminRoute>
                  <AdminProfile />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <JournalSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/reviewer"
              element={
                <ReviewerRoute>
                  <ReviewerDashboard />
                </ReviewerRoute>
              }
            />
            <Route
              path="/reviewer/profile"
              element={
                <ReviewerRoute>
                  <ReviewerProfile />
                </ReviewerRoute>
              }
            />
            <Route
              path="/editor"
              element={
                <EditorRoute>
                  <EditorDashboard />
                </EditorRoute>
              }
            />
            <Route
              path="/editor/profile"
              element={
                <EditorRoute>
                  <EditorProfile />
                </EditorRoute>
              }
            />
            <Route
              path="/user/profile"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
