import { Navigate, Route, Routes } from 'react-router'
import AdminLoginPage from './features/admin/AdminLoginPage.jsx'
import EmployeeListPage from './features/admin/EmployeeListPage.jsx'
import AmbiguousIdentityPage from './features/auth/AmbiguousIdentityPage.jsx'
import IdentifyPage from './features/auth/IdentifyPage.jsx'
import PasswordPage from './features/auth/PasswordPage.jsx'
import DocumentsStep from './features/documents/DocumentsStep.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'
import ConfirmationStep from './features/update/ConfirmationStep.jsx'
import InformationsStep from './features/update/InformationsStep.jsx'
import ReviewStep from './features/update/ReviewStep.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IdentifyPage />} />
      <Route path="/connexion/mot-de-passe" element={<PasswordPage />} />
      <Route path="/connexion/homonyme" element={<AmbiguousIdentityPage />} />
      <Route path="/profil" element={<ProfilePage />} />
      <Route path="/mise-a-jour/informations" element={<InformationsStep />} />
      <Route path="/mise-a-jour/documents" element={<DocumentsStep />} />
      <Route path="/mise-a-jour/verification" element={<ReviewStep />} />
      <Route path="/mise-a-jour/confirmation" element={<ConfirmationStep />} />
      <Route path="/admin/connexion" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/employes" replace />} />
      <Route path="/admin/employes" element={<EmployeeListPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
