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
import ReferentialPage from './features/admin/referential/ReferentialPage.jsx'
import AmbiguousIdentityPage from './features/auth/AmbiguousIdentityPage.jsx'
import CareerPage from './features/career/CareerPage.jsx'
import CertificatesPage from './features/certificates/CertificatesPage.jsx'
import DepositPage from './features/certificates/DepositPage.jsx'
import ThanksPage from './features/certificates/ThanksPage.jsx'
import EmployeeHomePage from './features/dashboard/EmployeeHomePage.jsx'
import CreatePasswordPage from './features/auth/CreatePasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import ConsentPage from './features/dossier/ConsentPage.jsx'
import ContactEducationPage from './features/dossier/ContactEducationPage.jsx'
import CoordinatesPage from './features/dossier/CoordinatesPage.jsx'
import HrInformationPage from './features/dossier/HrInformationPage.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'

export default function AppRoutes() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/connexion/premiere" element={<CreatePasswordPage />} />
        <Route path="/connexion/homonyme" element={<AmbiguousIdentityPage />} />
        <Route path="/accueil" element={<EmployeeHomePage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/avant-de-commencer" element={<ConsentPage />} />
        <Route path="/profil/coordonnees" element={<CoordinatesPage />} />
        <Route path="/profil/contact-etudes" element={<ContactEducationPage />} />
        <Route path="/profil/informations-rh" element={<HrInformationPage />} />
        <Route path="/certificats" element={<CertificatesPage />} />
        <Route path="/certificats/deposer" element={<DepositPage />} />
        <Route path="/certificats/merci" element={<ThanksPage />} />
        <Route path="/parcours" element={<CareerPage />} />
        {/* US-206 : les adresses de l'ancien parcours du MVP ramènent à « Mon profil ». */}
        <Route path="/documents" element={<Navigate to="/profil" replace />} />
        <Route path="/mise-a-jour/*" element={<Navigate to="/profil" replace />} />
        <Route path="/admin/connexion" element={<AdminLoginPage />} />
        <Route path="/admin/double-authentification" element={<MfaLoginPage />} />
        <Route path="/admin/securite" element={<MySecurityPage />} />
        <Route path="/admin/referentiel" element={<ReferentialPage />} />
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
