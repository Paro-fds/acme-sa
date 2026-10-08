import { Navigate, Route, Routes } from 'react-router'
import DemoBanner from './components/DemoBanner.jsx'
import AdminAccountsPage from './features/admin/AdminAccountsPage.jsx'
import AdminLoginPage from './features/admin/AdminLoginPage.jsx'
import AdminPasswordPage from './features/admin/AdminPasswordPage.jsx'
import DashboardPage from './features/admin/DashboardPage.jsx'
import EmployeeDetailPage from './features/admin/EmployeeDetailPage.jsx'
import EmployeeListPage from './features/admin/EmployeeListPage.jsx'
import HomePage from './features/home/HomePage.jsx'
import MfaLoginPage from './features/admin/mfa/MfaLoginPage.jsx'
import MySecurityPage from './features/admin/mfa/MySecurityPage.jsx'
import AmbiguousIdentityPage from './features/auth/AmbiguousIdentityPage.jsx'
import CareerPage from './features/career/CareerPage.jsx'
import CreatePasswordPage from './features/auth/CreatePasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import DocumentsStep from './features/documents/DocumentsStep.jsx'
import MyDocumentsPage from './features/documents/MyDocumentsPage.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'
import ConfirmationStep from './features/update/ConfirmationStep.jsx'
import InformationsStep from './features/update/InformationsStep.jsx'
import ReviewStep from './features/update/ReviewStep.jsx'

export default function AppRoutes() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/connexion/premiere" element={<CreatePasswordPage />} />
        <Route path="/connexion/homonyme" element={<AmbiguousIdentityPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/documents" element={<MyDocumentsPage />} />
        <Route path="/parcours" element={<CareerPage />} />
        <Route path="/mise-a-jour/informations" element={<InformationsStep />} />
        <Route path="/mise-a-jour/documents" element={<DocumentsStep />} />
        <Route path="/mise-a-jour/verification" element={<ReviewStep />} />
        <Route path="/mise-a-jour/confirmation" element={<ConfirmationStep />} />
        <Route path="/admin/connexion" element={<AdminLoginPage />} />
        <Route path="/admin/double-authentification" element={<MfaLoginPage />} />
        <Route path="/admin/securite" element={<MySecurityPage />} />
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/employes" element={<EmployeeListPage />} />
        <Route path="/admin/employes/:id" element={<EmployeeDetailPage />} />
        <Route path="/admin/administrateurs" element={<AdminAccountsPage />} />
        <Route path="/admin/mot-de-passe" element={<AdminPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
