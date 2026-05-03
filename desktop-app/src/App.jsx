import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// IMPORT ALL FILES EXACTLY AS NAMED IN YOUR SCREENSHOT
import HomeDashboard from './pages/HomeDashboard'; 
import SaleInvoice from './pages/SaleInvoice'; 
import InvoiceView from './pages/InvoiceView';
import StockPurchase from './pages/StockPurchase'; 
import Inventory from './pages/Inventory'; 
import DailyProfitReport from './pages/DailyProfitReport';
import CustomerLedger from './pages/CustomerLedger'; 
import CustomerReport from './pages/CustomerReport'; 
import CustomerRegistration from './pages/CustomerRegistration'; 
import SupplierLedger from './pages/SupplierLedger'; 
import SupplierRegistration from './pages/SupplierRegistration'; 
import SupplierReport from './pages/SupplierReport';
import FinancialSummary from './pages/FinancialSummary';

// 🚀 INVISIBLE GLOBAL NAVIGATION ENGINE 🚀
function GlobalShortcuts() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleGlobalNav = (e) => {
            // 1. GLOBAL ESCAPE KEY (Teleport Home)
            if (e.key === 'Escape') {
                e.preventDefault();
                navigate('/');
                return;
            }

            // 2. CTRL + F-KEYS (Teleport to specific screens)
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'F1': e.preventDefault(); navigate('/sale'); break;
                    case 'F2': e.preventDefault(); navigate('/invoice-view'); break;
                    
                    case 'F3': e.preventDefault(); navigate('/customers'); break;
                    case 'F4': e.preventDefault(); navigate('/customer-ledger'); break;
                    case 'F5': e.preventDefault(); navigate('/customer-report'); break;
                    
                    case 'F6': e.preventDefault(); navigate('/suppliers'); break;
                    case 'F7': e.preventDefault(); navigate('/supplier-ledger'); break;
                    case 'F8': e.preventDefault(); navigate('/supplier-report'); break;
                    
                    case 'F9': e.preventDefault(); navigate('/purchase'); break;
                    case 'F10': e.preventDefault(); navigate('/stock'); break;
                    
                    case 'F11': e.preventDefault(); navigate('/daily-profit'); break;
                    case 'F12': e.preventDefault(); navigate('/finance'); break;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalNav);
        return () => window.removeEventListener('keydown', handleGlobalNav);
    }, [navigate]);

    return null; // Stays invisible in the UI
}

function App() {
  return (
    <Router>
      {/* Run the shortcuts continuously over the whole app */}
      <GlobalShortcuts />

      <Routes>
        {/* THE MASTER HOME SCREEN */}
        <Route path="/" element={<HomeDashboard />} />
        
        {/* INVOICE & STOCK SCREENS */}
        <Route path="/sale" element={<SaleInvoice />} />
        <Route path="/invoice-view" element={<InvoiceView />} />
        <Route path="/purchase" element={<StockPurchase />} />
        <Route path="/stock" element={<Inventory />} />
        
        {/* LEDGER & REPORT SCREENS */}
        <Route path="/daily-profit" element={<DailyProfitReport />} />
        <Route path="/customer-ledger" element={<CustomerLedger />} />
        <Route path="/customer-report" element={<CustomerReport />} />
        <Route path="/supplier-ledger" element={<SupplierLedger />} />
        <Route path="/supplier-report" element={<SupplierReport />} />
        
        {/* REGISTRATION SCREENS */}
        <Route path="/customers" element={<CustomerRegistration />} />
        <Route path="/suppliers" element={<SupplierRegistration />} />

        {/* FINANCIAL SUMMARY SCREEN */}
        <Route path="/finance" element={<FinancialSummary />} />
      </Routes>
    </Router>
  );
}

export default App;