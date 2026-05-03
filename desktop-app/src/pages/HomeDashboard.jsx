import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaShoppingCart, FaFileInvoiceDollar, FaBoxOpen, 
    FaBoxes, FaChartLine, FaAddressBook, FaUsers, 
    FaClipboardList, FaBook, FaTruck, FaCube, 
    FaDatabase, FaLaptopCode, FaStoreAlt, FaWallet
} from 'react-icons/fa';

function HomeDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Sales & Billing');
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- LIVE CLOCK FOR STATUS BAR ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- MENU STRUCTURE (UPDATED FOR GLOBAL CTRL + F-KEYS) ---
    const menuStructure = {
        "Sales & Billing": [
            { title: "Sale Invoice", path: "/sale", shortcut: "Ctrl + F1", icon: <FaShoppingCart size={36} />, color: "#2563eb", desc: "Create a new POS sale invoice" },
            { title: "Invoice View", path: "/invoice-view", shortcut: "Ctrl + F2", icon: <FaFileInvoiceDollar size={36} />, color: "#7c3aed", desc: "View, edit, or reprint invoices" },
        ],
        "Customer Management": [
            { title: "Customer Registration", path: "/customers", shortcut: "Ctrl + F3", icon: <FaUsers size={36} />, color: "#0891b2", desc: "Add or update customer profiles" },
            { title: "Customer Ledger", path: "/customer-ledger", shortcut: "Ctrl + F4", icon: <FaAddressBook size={36} />, color: "#db2777", desc: "Manage customer payments & balances" },
            { title: "Customer Report", path: "/customer-report", shortcut: "Ctrl + F5", icon: <FaClipboardList size={36} />, color: "#c026d3", desc: "Print customer account history" },
        ],
        "Supplier Management": [
            { title: "Supplier Registration", path: "/suppliers", shortcut: "Ctrl + F6", icon: <FaTruck size={36} />, color: "#475569", desc: "Add or update supplier profiles" },
            { title: "Supplier Ledger", path: "/supplier-ledger", shortcut: "Ctrl + F7", icon: <FaBook size={36} />, color: "#ea580c", desc: "Manage supplier payments" },
            { title: "Supplier Report", path: "/supplier-report", shortcut: "Ctrl + F8", icon: <FaClipboardList size={36} />, color: "#8b5cf6", desc: "Print supplier account history" }
        ],
        "Inventory & Stock": [
            { title: "Stock Purchase", path: "/purchase", shortcut: "Ctrl + F9", icon: <FaBoxOpen size={36} />, color: "#059669", desc: "Enter new stock & purchase invoices" },
            { title: "Current Stock", path: "/stock", shortcut: "Ctrl + F10", icon: <FaBoxes size={36} />, color: "#d97706", desc: "View available inventory & pricing" },
        ],
        "Analytics & Reports": [
            { title: "Daily Profit Report", path: "/daily-profit", shortcut: "Ctrl + F11", icon: <FaChartLine size={36} />, color: "#dc2626", desc: "View sales, gross, and net profit" },
            { title: "Financial Dashboard", path: "/finance", shortcut: "Ctrl + F12", icon: <FaWallet size={36} />, color: "#0ea5e9", desc: "Real-time Net Worth, Assets & Liabilities" }
        ]
    };

    // NOTE: The local shortcut engine useEffect was safely removed here!
    // App.jsx now handles all the Ctrl + F navigation globally.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#e2e8f0', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', overflow: 'hidden' }}>
            
            {/* ⬛ TOP APP TITLE BAR */}
            <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: '13px', borderBottom: '1px solid #020617', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaCube color="#3b82f6" size={16} />
                    <span style={{ fontWeight: '800', letterSpacing: '1px' }}>FARAN NEXUS ERP</span>
                    <span style={{ color: '#64748b', marginLeft: '10px' }}>|</span>
                    <span style={{ color: '#94a3b8', fontWeight: '500' }}>System Dashboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                </div>
            </div>

            {/* 🔲 MAIN APPLICATION WINDOW */}
            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                
                {/* 🟦 COMPACT LEFT NAVIGATION PANE */}
                <div style={{ width: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.03)' }}>
                    
                    {/* SHOP DETAILS HEADER */}
                    <div style={{ padding: '24px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <FaStoreAlt size={32} color="#0f172a" style={{ marginBottom: '10px' }} />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>Faran Traders</h2>
                        <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>MC Plaza, Mardan</div>
                        <div style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '10px' }}>
                            Owner: Hamza
                        </div>
                    </div>

                    {/* DESKTOP NAVIGATION TABS */}
                    <div style={{ padding: '16px 12px', overflowY: 'auto', flexGrow: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '8px', marginBottom: '10px', letterSpacing: '1px' }}>System Modules</div>
                        {Object.keys(menuStructure).map((category) => (
                            <button 
                                key={category}
                                onClick={() => setActiveTab(category)}
                                style={{
                                    width: '100%', backgroundColor: activeTab === category ? '#eff6ff' : 'transparent',
                                    color: activeTab === category ? '#1d4ed8' : '#475569',
                                    border: 'none', padding: '12px 16px', borderRadius: '6px',
                                    textAlign: 'left', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                    borderLeft: activeTab === category ? '4px solid #2563eb' : '4px solid transparent',
                                    transition: 'all 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '4px'
                                }}
                                onMouseEnter={(e) => { if (activeTab !== category) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                onMouseLeave={(e) => { if (activeTab !== category) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ⬜ RIGHT CONTENT WORKSPACE */}
                <div style={{ flexGrow: 1, backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* WORKSPACE HEADER */}
                    <div style={{ padding: '20px 32px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: '800' }}>{activeTab}</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Select an application module to open its interface.</p>
                        </div>
                    </div>

                    {/* 🚀 PERFECTLY CENTERED TILE GRID 🚀 */}
                    <div style={{ flexGrow: 1, padding: '32px', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        
                        <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                            {menuStructure[activeTab].map((item, index) => (
                                <div 
                                    key={index}
                                    onClick={() => navigate(item.path)}
                                    style={{
                                        backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px',
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        border: '1px solid #cbd5e1', cursor: 'pointer',
                                        transition: 'all 0.15s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = item.color;
                                        e.currentTarget.style.boxShadow = `0 4px 12px ${item.color}20`;
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ backgroundColor: `${item.color}15`, padding: '16px', borderRadius: '8px', color: item.color }}>
                                        {item.icon}
                                    </div>
                                    <div style={{ flexGrow: 1 }}>
                                        <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '16px', fontWeight: '800' }}>
                                            {item.title}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                                            {item.desc}
                                        </p>
                                    </div>

                                    {/* 🚀 SHORTCUT BADGE 🚀 */}
                                    <div style={{ 
                                        backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', 
                                        color: '#334155', padding: '6px 10px', borderRadius: '6px', 
                                        fontSize: '12px', fontWeight: 'bold',
                                        whiteSpace: 'nowrap', flexShrink: 0 
                                    }}>
                                        {item.shortcut}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* ⬛ BOTTOM DESKTOP STATUS BAR */}
            <div style={{ backgroundColor: '#1e293b', color: '#cbd5e1', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: '12px', borderTop: '1px solid #0f172a', zIndex: 20 }}>
                
                {/* Left Side: DB Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaDatabase color="#3b82f6" />
                        <span>Database:</span>
                        <strong style={{ color: '#f8fafc' }}>D:\Faran_Shop_Database\db.sqlite3</strong>
                    </div>
                </div>

                {/* Right Side: Licensing & Clock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaLaptopCode color="#10b981" />
                        <span>Licensed to:</span>
                        <strong style={{ color: '#f8fafc' }}>Yousaf Atiq</strong>
                        <span style={{ color: '#64748b' }}>(Software Engineer)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#f8fafc', borderLeft: '1px solid #334155', paddingLeft: '16px' }}>
                        {currentTime.toLocaleDateString('en-GB')} | {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                    </div>
                </div>
            </div>

        </div>
    );
}

export default HomeDashboard;