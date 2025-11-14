import EnhancedSupplierDashboard from '@/components/supplier-portal/EnhancedDashboard';
import SupplierErrorBoundary from '@/components/ErrorBoundary';

export default function EnhancedPortalPage() {
  return (
    <SupplierErrorBoundary>
      <EnhancedSupplierDashboard />
    </SupplierErrorBoundary>
  );
}

