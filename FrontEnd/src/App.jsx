import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import ContributionsHome from "./pages/ContributionsHome";
import LoansHome from "./pages/LoansHome";
import ReportsHome from "./pages/ReportsHome";
import GroupDetail from "./pages/GroupDetail";
import Loans from "./pages/Loans";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Contributions from "./pages/Contributions";
import Approvals from "./pages/Approvals";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/contributions" element={<ContributionsHome />} />
            <Route path="/contributions/:groupId" element={<Contributions />} />
            <Route path="/loans" element={<LoansHome />} />
            <Route path="/groups/:groupId/loans" element={<Loans />} />
            <Route path="/reports" element={<ReportsHome />} />
            <Route path="/groups/:groupId/reports" element={<Reports />} />
            <Route path="/approvals" element={<Approvals />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
