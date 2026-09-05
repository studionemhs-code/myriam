import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PendingApproval from '@/components/PendingApproval';
import ScrollToTop from './components/ScrollToTop';
import SplashVideo from '@/components/SplashVideo';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AprovacaoAutoridade from '@/pages/AprovacaoAutoridade';
import AppLayout from '@/components/AppLayout';
import Onboarding from '@/pages/Onboarding';
import Hoje from '@/pages/Hoje';
import Caminho from '@/pages/Caminho';
import DayDetail from '@/pages/DayDetail';
import ModoOracao from '@/pages/ModoOracao';
import Consagracao from '@/pages/Consagracao';
import MinhaConsagracao from '@/pages/MinhaConsagracao';
import Calendario from '@/pages/Calendario';
import ACAMF from '@/pages/ACAMF';
import ACAMFDetalhe from '@/pages/ACAMFDetalhe';
import CourseDetail from '@/pages/CourseDetail';
import Intencoes from '@/pages/Intencoes';
import Jornadas from '@/pages/Jornadas';
import Perfil from '@/pages/Perfil';
import Configuracoes from '@/pages/Configuracoes';
import Myriam from '@/pages/Myriam';
import Notificacoes from '@/pages/Notificacoes';
import ChatConversation from '@/pages/ChatConversation';
import PublicProfile from '@/pages/PublicProfile';
import JourneyDetail from '@/pages/JourneyDetail';
import AdminLayout from '@/components/AdminLayout';
import AdminRoute from '@/components/AdminRoute';
import AdminDashboard from '@/pages/admin/Dashboard';
import Stats from '@/pages/admin/Stats';
import CommunityReports from '@/pages/admin/CommunityReports';
import AtividadeRelatorio from '@/pages/admin/AtividadeRelatorio';
import ACAMFAdmin from '@/pages/admin/ACAMFAdmin';
import CoursesAdmin from '@/pages/admin/CoursesAdmin';
import Reports from '@/pages/admin/Reports';
import UsersAdmin from '@/pages/admin/Users';
import PreparationDaysAdmin from '@/pages/admin/PreparationDaysAdmin';
import CalendarAdmin from '@/pages/admin/CalendarAdmin';
import JourneysAdmin from '@/pages/admin/JourneysAdmin';
import FeaturesAdmin from '@/pages/admin/Features';
import MyriamAdmin from '@/pages/admin/MyriamAdmin';
import CategoriesAdmin from '@/pages/admin/CategoriesAdmin';
import CertificatesAdmin from '@/pages/admin/CertificatesAdmin';
import AssociacaoAdmin from '@/pages/admin/AssociacaoAdmin';
import AgentsAdmin from '@/pages/admin/AgentsAdmin';
import Certificado from '@/pages/Certificado';
import Historico from '@/pages/Historico';
import Associacao from '@/pages/Associacao';
import AgentChat from '@/pages/AgentChat';
import SolicitarCadeiazinha from '@/pages/SolicitarCadeiazinha';
import Oracoes from '@/pages/Oracoes';
import OrcamentosDashboard from '@/pages/admin/OrcamentosDashboard';
import OrcamentosPedidos from '@/pages/admin/OrcamentosPedidos';
import OrcamentosCatalogo from '@/pages/admin/OrcamentosCatalogo';
import OrcamentosMensagens from '@/pages/admin/OrcamentosMensagens';
import OrcamentosConfiguracoes from '@/pages/admin/OrcamentosConfiguracoes';
import OrcamentosLink from '@/pages/admin/OrcamentosLink';
import WebhooksAdmin from '@/pages/admin/WebhooksAdmin';
import GarantiaAdmin from '@/pages/admin/GarantiaAdmin';
import GarantiaConfig from '@/pages/admin/GarantiaConfig';
import OtpWhatsappAdmin from '@/pages/admin/OtpWhatsappAdmin';
import OracoesAdmin from '@/pages/admin/OracoesAdmin';
import OAuthConsent from '@/pages/OAuthConsent';
import Rastreio from '@/pages/Rastreio';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'pending_approval') {
      return <PendingApproval />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/aprovacao/:token" element={<AprovacaoAutoridade />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="/rastreio/:codigo?" element={<Rastreio />} />
      <Route path="/solicitar-cadeiazinha" element={<SolicitarCadeiazinha />} />

      <Route path="/onboarding" element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route index element={<Onboarding />} />
      </Route>

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/oracao/:day" element={<ModoOracao />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Hoje />} />
          <Route path="/caminho" element={<Caminho />} />
          <Route path="/caminho/dia/:day" element={<DayDetail />} />
          <Route path="/consagracao" element={<Consagracao />} />
          <Route path="/minha-consagracao" element={<MinhaConsagracao />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/acamf" element={<ACAMF />} />
          <Route path="/acamf/curso/:id" element={<CourseDetail />} />
          <Route path="/acamf/:id" element={<ACAMFDetalhe />} />
          <Route path="/intencoes" element={<Intencoes />} />
          <Route path="/jornadas" element={<Jornadas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/myriam" element={<Myriam />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/chat" element={<Navigate to="/myriam" replace />} />
          <Route path="/chat/:id" element={<ChatConversation />} />
          <Route path="/perfil/:userId" element={<PublicProfile />} />
          <Route path="/jornadas/:id" element={<JourneyDetail />} />
          <Route path="/certificado" element={<Certificado />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/associacao" element={<Associacao />} />
          <Route path="/agentes" element={<AgentChat />} />
          <Route path="/oracoes" element={<Oracoes />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/estatisticas" element={<Stats />} />
          <Route path="/admin/crescimento" element={<CommunityReports />} />
          <Route path="/admin/atividade" element={<AtividadeRelatorio />} />
          <Route path="/admin/acamf" element={<ACAMFAdmin />} />
          <Route path="/admin/cursos" element={<CoursesAdmin />} />
          <Route path="/admin/dias" element={<PreparationDaysAdmin />} />
          <Route path="/admin/calendario" element={<CalendarAdmin />} />
          <Route path="/admin/jornadas" element={<JourneysAdmin />} />
          <Route path="/admin/funcionalidades" element={<FeaturesAdmin />} />
          <Route path="/admin/myriam" element={<MyriamAdmin />} />
          <Route path="/admin/categorias" element={<CategoriesAdmin />} />
          <Route path="/admin/certificados" element={<CertificatesAdmin />} />
          <Route path="/admin/associacao" element={<AssociacaoAdmin />} />
          <Route path="/admin/agentes" element={<AgentsAdmin />} />
          <Route path="/admin/relatorios" element={<Reports />} />
          <Route path="/admin/usuarios" element={<UsersAdmin />} />
          <Route path="/admin/orcamentos" element={<OrcamentosDashboard />} />
          <Route path="/admin/orcamentos/pedidos" element={<OrcamentosPedidos />} />
          <Route path="/admin/orcamentos/catalogo" element={<OrcamentosCatalogo />} />
          <Route path="/admin/orcamentos/mensagens" element={<OrcamentosMensagens />} />
          <Route path="/admin/orcamentos/configuracoes" element={<OrcamentosConfiguracoes />} />
          <Route path="/admin/orcamentos/link" element={<OrcamentosLink />} />
          <Route path="/admin/automacoes-webhook" element={<WebhooksAdmin />} />
          <Route path="/admin/garantia" element={<GarantiaAdmin />} />
          <Route path="/admin/garantia/config" element={<GarantiaConfig />} />
          <Route path="/admin/otp-whatsapp" element={<OtpWhatsappAdmin />} />
          <Route path="/admin/oracoes" element={<OracoesAdmin />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SplashVideo />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App