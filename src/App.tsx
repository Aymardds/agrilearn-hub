import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LessonView from "./pages/LessonView";
import CalendarPage from "./pages/Calendar";
import CoursesManagement from "./pages/admin/CoursesManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import CertificatesManagement from "./pages/admin/CertificatesManagement";
import CertificateSettings from "./pages/admin/CertificateSettings";
import NotFound from "./pages/NotFound";
import ModuleQuizView from "./pages/ModuleQuizView";
import FinalAssessmentView from "./pages/FinalAssessmentView";

// Editor Pages
import MyCourses from "./pages/editor/MyCourses";
import CourseEditor from "./pages/editor/CourseEditor";

const queryClient = new QueryClient();

const ShellLayout = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ShellLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
            <Route path="/courses/:courseId/modules/:moduleId/quiz" element={<ModuleQuizView />} />
            <Route path="/courses/:courseId/final-assessment" element={<FinalAssessmentView />} />

            {/* Admin Routes */}
            <Route path="/admin/courses" element={<CoursesManagement />} />
            <Route path="/admin/users" element={<UsersManagement />} />
            <Route path="/admin/certificates" element={<CertificatesManagement />} />
            <Route path="/admin/certificate-settings" element={<CertificateSettings />} />

            {/* Editor Routes */}
            <Route path="/editor/my-courses" element={<MyCourses />} />
            <Route path="/editor/courses/new" element={<CourseEditor />} />
            <Route path="/editor/courses/:id/edit" element={<CourseEditor />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
