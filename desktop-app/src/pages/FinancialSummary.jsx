import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPrint, FaFileExcel, FaTimesCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function FinancialSummary() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('assets'); 
    
    const [inventoryValue, setInventoryValue] = useState(0);
    const [customers, setCustomers] = useState([]); 
    const [suppliers, setSuppliers] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    useEffect(() => {
        const fetchFinancialData = async () => {
            try {
                const itemRes = await axios.get('http://127.0.0.1:8000/api/items/');
                const totalStockVal = itemRes.data.reduce((sum, item) => sum + (parseFloat(item.tp) * parseInt(item.stock)), 0);
                setInventoryValue(totalStockVal);

                const custRes = await axios.get('http://127.0.0.1:8000/api/customers/');
                const debtors = custRes.data.filter(c => parseFloat(c.current_balance) > 0);
                setCustomers(debtors);

                const suppRes = await axios.get('http://127.0.0.1:8000/api/suppliers/');
                const creditors = suppRes.data.filter(s => parseFloat(s.current_balance) > 0);
                setSuppliers(creditors);

                setLoading(false);
            } catch (error) {
                console.error("Error fetching financial data:", error);
                showToast("Failed to load financial data from database.", "error");
                setLoading(false);
            }
        };
        fetchFinancialData();
    }, []);

    const totalAssets = customers.reduce((sum, c) => sum + parseFloat(c.current_balance), 0);
    const totalLiabilities = suppliers.reduce((sum, s) => sum + parseFloat(s.current_balance), 0);
    const netBusinessWorth = inventoryValue + totalAssets - totalLiabilities;

    const handlePrint = () => window.print();
    const handleClose = () => navigate('/');
    
    const handleExportExcel = () => {
        const dataToExport = viewMode === 'assets' ? customers : suppliers;
        if (dataToExport.length === 0) {
            showToast(`No ${viewMode} data to export!`, "error");
            return;
        }

        showToast(`Generating ${viewMode} Excel file...`, "info");
        
        const headers = viewMode === 'assets' 
            ? "Account Code,Customer Name,Area,Address,Contact,Balance Owed To Us" 
            : "Account Code,Supplier Name,Agent,Address,Contact,Balance We Owe";
        
        const csvRows = dataToExport.map(person => {
            const areaOrAgent = viewMode === 'assets' ? (person.area || '') : (person.agent || '');
            return `"${person.code || ''}","${person.name}","${areaOrAgent}","${person.address || ''}","${person.mobile || person.phone || ''}","${person.current_balance}"`;
        }).join('\n');

        const csvContent = headers + '\n' + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `FaranTraders_${viewMode.toUpperCase()}_Report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => showToast("Exported successfully!", "success"), 500);
    };

    useEffect(() => {
        const handleShortcuts = (e) => {
            if (['F4', 'F2', 'Escape'].includes(e.key) || (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
            }
            switch(e.key) {
                case 'F4': handlePrint(); break;
                case 'F2': handleExportExcel(); break;
                case 'Escape': handleClose(); break;
                case 'p': if (e.ctrlKey) handlePrint(); break;
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [viewMode, customers, suppliers]);

    if (loading) return <div style={{ padding: '40px', color: '#333', textAlign: 'center', fontFamily: 'Arial' }}>Loading Ledger Data...</div>;

    const activeList = viewMode === 'assets' ? customers : suppliers;
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="print-fix-container" style={{ backgroundColor: '#e2e8f0', minHeight: '100vh', padding: '20px', fontFamily: '"Segoe UI", Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {toast.show && (
                <div className="no-print" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999, fontWeight: 'bold' }}>
                    {toast.type === 'success' ? <FaCheckCircle /> : <FaInfoCircle />} {toast.message}
                </div>
            )}

            <style>
                {`
                @media print {
                    @page { size: A4 landscape; margin: 15mm; }
                    * { background: transparent !important; box-shadow: none !important; }
                    .no-print { display: none !important; }
                    
                    ::-webkit-scrollbar { display: none !important; }
                    body, html, .print-fix-container { 
                        background: #fff !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        height: auto !important; 
                        min-height: 0 !important; 
                        overflow: visible !important; 
                    }
                    
                    .paper-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                }
                `}
            </style>

            <div className="no-print" style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#fff', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
                <button onClick={() => setViewMode('assets')} style={viewMode === 'assets' ? activeTabStyle : inactiveTabStyle}>View Assets (Receivables)</button>
                <button onClick={() => setViewMode('liabilities')} style={viewMode === 'liabilities' ? activeTabStyle : inactiveTabStyle}>View Liabilities (Payables)</button>
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button onClick={handleExportExcel} style={actionBtnStyle}><strong style={{color:'#16a34a'}}>F2</strong> <FaFileExcel color="#16a34a"/> Excel</button>
                    <button onClick={handlePrint} style={actionBtnStyle}><strong style={{color:'#2563eb'}}>F4</strong> <FaPrint color="#2563eb"/> Print</button>
                    <button onClick={handleClose} style={actionBtnStyle}><strong style={{color:'#dc2626'}}>Esc</strong> <FaTimesCircle color="#dc2626"/> Close</button>
                </div>
            </div>

            <div className="paper-container" style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#ffffff', padding: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', flexGrow: 1 }}>
                
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>FARAN TRADERS</h1>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>MC PLAZA BANK ROAD MARDAN</div>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>PHONE NO: 0311-9245892</div>
                </div>

                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', textAlign: 'center', marginBottom: '25px' }}>
                    <strong style={{ fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        MARKET LEDGER & FINANCIAL SUMMARY - {viewMode === 'assets' ? 'ASSETS' : 'LIABILITIES'}
                    </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '13px', color: '#0f172a' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong style={{ display: 'inline-block', width: '130px' }}>Business Owner:</strong> Hamza</div>
                        <div><strong style={{ display: 'inline-block', width: '130px' }}>Total Stock (TP):</strong> Rs. {inventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div><strong style={{ display: 'inline-block', width: '130px' }}>Ledger Type:</strong> {viewMode === 'assets' ? 'Market Receivables' : 'Market Payables'}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong>Reporting Date:</strong> {formattedDate}</div>
                        <div style={{ color: '#16a34a' }}><strong>Total Assets (+):</strong> Rs. {totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div style={{ color: '#dc2626' }}><strong>Total Liabilities (-):</strong> Rs. {totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #94a3b8' }}>
                            <strong style={{ color: '#2563eb', fontSize: '15px' }}>Net Business Worth: Rs. {netBusinessWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #000', borderTop: '1px solid #000' }}>
                            <th style={{...thStyle, width: '10%'}}>Code</th>
                            <th style={{...thStyle, width: '25%'}}>Account Name</th>
                            <th style={{...thStyle, width: '15%'}}>{viewMode === 'assets' ? 'Area' : 'Agent'}</th>
                            <th style={{...thStyle, width: '25%'}}>Address</th>
                            <th style={{...thStyle, width: '12%'}}>Contact</th>
                            <th style={{...thStyle, width: '13%', textAlign: 'right'}}>Total Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeList.length > 0 ? activeList.map((person, index) => (
                            <tr key={index} style={{ borderBottom: '1px dashed #cbd5e1' }}>
                                <td style={{...tdStyle, color: '#64748b', fontWeight: 'bold'}}>{person.code || '-'}</td>
                                <td style={{...tdStyle, fontWeight: 'bold', fontSize: '13px'}}>{person.name}</td>
                                
                                <td style={tdStyle}>{viewMode === 'assets' ? (person.area || '-') : (person.agent || '-')}</td>
                                
                                <td style={{...tdStyle, color: '#475569', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={person.address}>
                                    {person.address || '-'}
                                </td>
                                
                                <td style={tdStyle}>{person.mobile || person.phone || person.contact || '-'}</td>
                                <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '13px'}}>
                                    {parseFloat(person.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                    No records found with an active balance.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    --- End of Financial Report ---
                </div>

            </div>
        </div>
    );
}

const thStyle = { padding: '10px 8px', textAlign: 'left', fontWeight: 'bold', color: '#000' };
const tdStyle = { padding: '10px 8px', color: '#0f172a' };

const activeTabStyle = { padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' };
const inactiveTabStyle = { padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' };

const actionBtnStyle = { padding: '6px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' };

export default FinancialSummary;