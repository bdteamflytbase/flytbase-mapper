import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

const HomePage = lazy(() => import('./pages/HomePage'));
const HomePageAlt = lazy(() => import('./pages/HomePageAlt'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SitePage = lazy(() => import('./pages/SitePage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, color: 'var(--ak-text-3)', fontSize: 13,
      height: '100vh', background: 'var(--ak-bg)',
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Homepage — full-screen, no layout chrome */}
        <Route path="/" element={<HomePage />} />
        <Route path="/alt" element={<HomePageAlt />} />

        {/* App routes — wrapped in sidebar layout */}
        <Route path="/dashboard" element={
          <Layout><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></Layout>
        } />
        <Route path="/analytics" element={
          <Layout><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></Layout>
        } />
        <Route path="/sites/:siteId" element={
          <Layout><Suspense fallback={<PageLoader />}><SitePage /></Suspense></Layout>
        } />
        <Route path="/sites/:siteId/projects/:projectId" element={
          <Layout><Suspense fallback={<PageLoader />}><ProjectPage /></Suspense></Layout>
        } />
        <Route path="/sites/:siteId/projects/:projectId/view" element={<Navigate to=".." replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
