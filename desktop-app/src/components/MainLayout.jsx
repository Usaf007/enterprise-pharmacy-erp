import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // --- GLOBAL SHORTCUT ENGINE (CTRL + KEY) ---
    useEffect(() => {
        const handleGlobalShortcuts = (e) => {
            if (e.ctrlKey) {
                switch(e.key.toLowerCase()) {
                    case 'i': e.preventDefault(); navigate('/sale-invoice'); break;
                    case 'v': e.preventDefault(); navigate('/invoice-view'); break;
                    case 'p': e.preventDefault(); navigate('/purchase'); break;
                    case 'e': e.preventDefault(); navigate('/inventory'); break;
                    case 'u': e.preventDefault(); navigate('/customers'); break;
                    case 'l': e.preventDefault(); navigate('/customer-ledger'); break;
                    case 's': e.preventDefault(); navigate('/suppliers'); break;
                    case 'k': e.preventDefault(); navigate('/supplier-ledger'); break;
                    case 'd': e.preventDefault(); navigate('/daily-profit'); break;
                    case 'r': e.preventDefault(); navigate('/customer-report'); break;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalShortcuts);
        return () => window.removeEventListener('keydown', handleGlobalShortcuts);
    }, [navigate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            
            <style>
                {`
                @media print { .global-nav { display: none !important; } }
                
                /* THE ULTIMATE HEIGHT FIX */
                /* This forces every older screen to ignore its 100vh rule and fit perfectly in the remaining space */
                .page-wrapper > div {
                    height: 100% !important;
                    max-height: 100% !important;
                    min-height: 0 !important;
                    box-sizing: border-box;
                }
                `}
            </style>

            {/* ULTRA-THIN COMMAND RIBBON */}
            <div className="global-nav" style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '4px 16px', display: 'flex', gap: '15px', fontSize: '11px', fontWeight: '600', alignItems: 'center', zIndex: 100, overflowX: 'auto', whiteSpace: 'nowrap', borderBottom: '2px solid #3b82f6' }}>
                <span style={{ color: '#3b82f6', fontWeight: '800', marginRight: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Faran ERP</span>
                
                <NavKey keys="Ctrl+I" label="Sale" path="/sale-invoice" current={location.pathname} />
                <NavKey keys="Ctrl+P" label="Purchase" path="/purchase" current={location.pathname} />
                <NavKey keys="Ctrl+E" label="Stock" path="/inventory" current={location.pathname} />
                <NavKey keys="Ctrl+U" label="Customers" path="/customers" current={location.pathname} />
                <NavKey keys="Ctrl+L" label="Cust Ldgr" path="/customer-ledger" current={location.pathname} />
                <NavKey keys="Ctrl+S" label="Suppliers" path="/suppliers" current={location.pathname} />
                <NavKey keys="Ctrl+K" label="Supp Ldgr" path="/supplier-ledger" current={location.pathname} />
                <NavKey keys="Ctrl+D" label="Daily Profit" path="/daily-profit" current={location.pathname} />
                <NavKey keys="Ctrl+R" label="Reports" path="/customer-report" current={location.pathname} />
                <NavKey keys="Ctrl+V" label="Inv View" path="/invoice-view" current={location.pathname} />
            </div>

            {/* PAGE CONTAINER */}
            <div className="page-wrapper" style={{ flexGrow: 1, overflow: 'hidden' }}>
                <Outlet />
            </div>
        </div>
    );
}

// Mini component for the ultra-thin nav links
function NavKey({ keys, label, path, current }) {
    const isActive = current === path;
    return (
        <span style={{ color: isActive ? '#ffffff' : '#94a3b8', backgroundColor: isActive ? '#1e293b' : 'transparent', padding: '2px 8px', borderRadius: '4px', display: 'flex', gap: '6px' }}>
            <strong style={{ color: isActive ? '#60a5fa' : '#cbd5e1' }}>{keys}</strong> {label}
        </span>
    );
}

export default MainLayout;