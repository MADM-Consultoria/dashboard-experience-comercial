import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataSelecionadaProvider } from '@/context/DataSelecionadaContext';
import { AuthProvider } from '@/context/AuthContext';
import { RelatorioProvider } from '@/context/RelatorioContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { RequireMaster } from '@/components/layout/RequireMaster';
import Login from '@/pages/Login';

// Cada página carrega sob demanda (code-splitting por rota) — no celular,
// entrar em "Visão Geral" não baixa o JS de Comercial, Ranking, Logs etc.
const Logs = lazy(() => import('@/pages/Logs'));
const VisaoGeral = lazy(() => import('@/pages/VisaoGeral'));
const Ranking = lazy(() => import('@/pages/Ranking'));
const Equipe = lazy(() => import('@/pages/Equipe'));
const ColaboradorDetalhe = lazy(() => import('@/pages/ColaboradorDetalhe'));
const Gargalos = lazy(() => import('@/pages/Gargalos'));
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RelatorioProvider>
          <DataSelecionadaProvider>
            <BrowserRouter>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<VisaoGeral />} />
                    <Route path="ranking" element={<Ranking />} />
                    <Route path="equipe" element={<Equipe />} />
                    <Route path="equipe/:supervisor" element={<Equipe />} />
                    <Route path="colaboradores/:id" element={<ColaboradorDetalhe />} />
                    <Route path="gargalos" element={<Gargalos />} />
                    <Route path="configuracoes" element={<Configuracoes />} />
                    <Route
                      path="logs"
                      element={
                        <RequireMaster>
                          <Logs />
                        </RequireMaster>
                      }
                    />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </DataSelecionadaProvider>
        </RelatorioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
