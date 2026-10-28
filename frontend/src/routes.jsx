import { Navigate, Route, Routes } from 'react-router'
import AdminAccountsPage from './features/admin/AdminAccountsPage.jsx'
import AuditLogPage from './features/admin/audit/AuditLogPage.jsx'
import AdminLoginPage from './features/admin/AdminLoginPage.jsx'
import AdminPasswordPage from './features/admin/AdminPasswordPage.jsx'
import DashboardPage from './features/admin/DashboardPage.jsx'
import EmployeeDetailPage from './features/admin/EmployeeDetailPage.jsx'
import EmployeeListPage from './features/admin/EmployeeListPage.jsx'
import HomePage from './features/home/HomePage.jsx'
import MfaLoginPage from './features/admin/mfa/MfaLoginPage.jsx'
import MySecurityPage from './features/admin/mfa/MySecurityPage.jsx'
import NotificationsPage from './features/admin/notifications/NotificationsPage.jsx'
import OpeningDetailPage from './features/admin/openings/OpeningDetailPage.jsx'
import OpeningFormPage from './features/admin/openings/OpeningFormPage.jsx'
import OpeningsPage from './features/admin/openings/OpeningsPage.jsx'
import ReferentialPage from './features/admin/referential/ReferentialPage.jsx'
import ErrorReportQueuePage from './features/admin/reports/ErrorReportQueuePage.jsx'
import ValidationQueuePage from './features/admin/validation/ValidationQueuePage.jsx'
import ReviewCertificatePage from './features/admin/validation/ReviewCertificatePage.jsx'
import PieceDepositPage from './features/pieces/PieceDepositPage.jsx'
import PiecesPage from './features/pieces/PiecesPage.jsx'
import PerPage from './features/per/PerPage.jsx'
import EmployeeHomePage from './features/dashboard/EmployeeHomePage.jsx'
import MyOpeningsPage from './features/openings/MyOpeningsPage.jsx'
import MyNotificationsPage from './features/notifications/MyNotificationsPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import ConsentPage from './features/dossier/ConsentPage.jsx'
import ContactEducationPage from './features/dossier/ContactEducationPage.jsx'
import CoordinatesPage from './features/dossier/CoordinatesPage.jsx'
import HrInformationPage from './features/dossier/HrInformationPage.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/connexion" element={<LoginPage />} />
      {/* US-1003 : plus de mot de passe employé ; les anciens liens ramènent à la connexion. */}
      <Route path="/connexion/premiere" element={<Navigate to="/connexion" replace />} />
      <Route path="/connexion/homonyme" element={<Navigate to="/connexion" replace />} />
      <Route path="/accueil" element={<EmployeeHomePage />} />
      <Route path="/profil" element={<ProfilePage />} />
      <Route path="/avant-de-commencer" element={<ConsentPage />} />
      <Route path="/profil/coordonnees" element={<CoordinatesPage />} />
      <Route path="/profil/contact-etudes" element={<ContactEducationPage />} />
      <Route path="/profil/informations-rh" element={<HrInformationPage />} />
      {/* US-1008 : les pièces viennent de Carrières ; l'ancien dépôt sera retiré avec US-1010. */}
      <Route path="/certificats" element={<PiecesPage />} />
      <Route path="/certificats/deposer" element={<PieceDepositPage />} />
      <Route path="/certificats/merci" element={<Navigate to="/certificats" replace />} />
      <Route path="/carriere" element={<MyOpeningsPage />} />
      <Route path="/per" element={<PerPage />} />
      <Route path="/notifications" element={<MyNotificationsPage />} />
      {/* US-114 : « Mon parcours » est fondu dans « Ma carrière ». */}
      <Route path="/parcours/*" element={<Navigate to="/carriere" replace />} />
      {/* US-206 : les adresses de l'ancien parcours du MVP ramènent à « Mon dossier ». */}
      <Route path="/documents" element={<Navigate to="/profil" replace />} />
      <Route path="/mise-a-jour/*" element={<Navigate to="/profil" replace />} />
      <Route path="/admin/connexion" element={<AdminLoginPage />} />
      <Route path="/admin/double-authentification" element={<MfaLoginPage />} />
      <Route path="/admin/securite" element={<MySecurityPage />} />
      <Route path="/admin/referentiel" element={<ReferentialPage />} />
      <Route path="/admin" element={<DashboardPage />} />
      <Route path="/admin/validation" element={<ValidationQueuePage />} />
      <Route path="/admin/validation/:id" element={<ReviewCertificatePage />} />
      <Route path="/admin/signalements" element={<ErrorReportQueuePage />} />
      <Route path="/admin/employes" element={<EmployeeListPage />} />
      <Route path="/admin/employes/:id" element={<EmployeeDetailPage />} />
      <Route path="/admin/postes" element={<OpeningsPage />} />
      <Route path="/admin/postes/nouveau" element={<OpeningFormPage />} />
      <Route path="/admin/postes/:id" element={<OpeningDetailPage />} />
      <Route path="/admin/postes/:id/modifier" element={<OpeningFormPage />} />
      <Route path="/admin/comptes" element={<AdminAccountsPage />} />
      <Route path="/admin/audit" element={<AuditLogPage />} />
      <Route path="/admin/notifications" element={<NotificationsPage />} />
      <Route path="/admin/administrateurs" element={<AdminAccountsPage />} />
      <Route path="/admin/mot-de-passe" element={<AdminPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
