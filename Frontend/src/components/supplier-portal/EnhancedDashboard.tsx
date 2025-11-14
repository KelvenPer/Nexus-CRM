'use client';

import { useState } from 'react';

import { useSupplierNotifications } from '@/hooks/useSupplierNotifications';
import { SupplierPortalLayout } from './Layout';

const MOCK_DASHBOARD = {
  executive_summary: {
    current_roi: 28,
    total_investment: 150000,
    completion_rate: 78,
  },
  recent_insights: [
    { id: '1', title: 'ROI digital alto', message: 'Considere ampliar investimento em banners.' },
  ],
};

export default function EnhancedSupplierDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'proofs' | 'reports'>('overview');
  const { notifications, unreadCount } = useSupplierNotifications('supplier_demo');

  return (
    <SupplierPortalLayout>
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <MetricCard title='ROI Atual' value={${MOCK_DASHBOARD.executive_summary.current_roi}%} icon='??' />
          <MetricCard title='Investimento Ativo' value={R$ } icon='??' />
          <MetricCard title='Taxa de execucao' value={${MOCK_DASHBOARD.executive_summary.completion_rate}%} icon='?' />
        </div>
        <div className='bg-gray-900 rounded-lg p-4'>
          <div className='flex gap-4 mb-4'>
            {['overview', 'proofs', 'reports'].map((tab) => (
              <button
                key={tab}
                className={px-3 py-2 rounded text-sm }
                onClick={() => setActiveTab(tab as typeof activeTab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeTab === 'overview' ? (
            <div>
              <h3 className='text-lg font-semibold text-white mb-2'>Insights recentes</h3>
              <ul className='space-y-2'>
                {MOCK_DASHBOARD.recent_insights.map((insight) => (
                  <li key={insight.id} className='bg-gray-800 p-3 rounded text-sm text-gray-200'>
                    {insight.title} – {insight.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {activeTab === 'proofs' ? <p className='text-gray-400 text-sm'>Selecione um contrato para enviar comprovacoes.</p> : null}
          {activeTab === 'reports' ? <p className='text-gray-400 text-sm'>Use o gerador para baixar PDFs.</p> : null}
        </div>
        <div className='bg-gray-900 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-white mb-2'>Notificacoes ({unreadCount})</h3>
          <ul className='space-y-2 text-sm text-gray-200'>
            {notifications.slice(0, 5).map((notification) => (
              <li key={notification.id} className='bg-gray-800 p-3 rounded'>
                {notification.title} – {notification.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SupplierPortalLayout>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className='bg-gray-900 rounded-lg p-4 text-white'>
      <p className='text-sm text-gray-400 mb-1'>{title}</p>
      <div className='text-2xl font-bold'>{value}</div>
      <div className='text-2xl mt-2'>{icon}</div>
    </div>
  );
}

