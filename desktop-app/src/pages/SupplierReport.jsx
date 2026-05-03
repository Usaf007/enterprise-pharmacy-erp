import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPrint, FaFileExcel, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function SupplierReport() {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [suppliers, setSuppliers] = useState([]);
    const [allLedgers, setAllLedgers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierLedger, setSupplierLedger] = useState([]);
    
    // Search & Dropdown State
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);

    // --- TOAST ENGINE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const suppRes = await axios.get('http://127.0.0.1:8000/api/suppliers/');
                setSuppliers(suppRes.data);

                // Assuming your API exposes supplier ledgers here. Adjust URL if needed!
                const ledgerRes = await axios.get('http://127.0.0.1:8000/api/supplier-ledgers/').catch(() => ({ data: [] }));
                setAllLedgers(ledgerRes.data);
            } catch (error) {
                console.error("Error fetching supplier data:", error);
                showToast("Failed to load databases. Check backend.", "error");
            }
        };
        fetchMasterData();
    }, []);

    // --- SEARCH LOGIC ---
    const filteredSuppliers = suppliers.filter(s => 
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.agent && s.agent.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelectSupplier = (supplier) => {
        setSelectedSupplier(supplier);
        setSearchQuery(supplier.name);
        setShowDropdown(false);
        setFocusedSearchIndex(-1);
        
        // Filter ledgers belonging to this supplier
        const relatedLedgers = allLedgers.filter(ledger => 
            ledger.supplier === supplier.id || ledger.supplier_id === supplier.id
        );
        setSupplierLedger(relatedLedgers);
        
        showToast(`${supplier.name} account loaded.`, "success");
    };

    const handleSearchKeyDown = (e) => {
        if (!showDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev < filteredSuppliers.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedSearchIndex >= 0 && filteredSuppliers[focusedSearchIndex]) {
                handleSelectSupplier(filteredSuppliers[focusedSearchIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    // --- ACTIONS ---
    const handlePrint = () => {
        if (!selectedSupplier) { showToast("Please select a supplier first.", "error"); return; }
        window.print();
    };
    
    const handleClose = () => navigate('/');
    
    const handleExportExcel = () => {
        if (!selectedSupplier || supplierLedger.length === 0) {
            showToast("No ledger data to export!", "error");
            return;
        }

        showToast("Generating Excel file...", "info");
        const headers = "Date,Ref #,Detail,Bill Amount (+),Paid Amount (-),Balance";
        
        const csvRows = supplierLedger.map(row => {
            return `"${row.date}","${row.ref_no || '-'}","${row.detail || '-'}","${row.amt_bill}","${row.amt_paid}","${row.running_balance}"`;
        }).join('\n');

        const csvContent = headers + '\n' + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `SupplierLedger_${selectedSupplier.name}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => showToast("Exported successfully!", "success"), 500);
    };

    // --- SHORTCUTS ---
    useEffect(() => {
        const handleShortcuts = (e) => {
            if (['F4', 'F2', 'Escape'].includes(e.key) || (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
            }
            switch(e.key) {
                case 'F4': handlePrint(); break;
                case 'F2': handleExportExcel(); break;
                case 'Escape': 
                    if (showDropdown) setShowDropdown(false);
                    else handleClose(); 
                    break;
                case 'p': if (e.ctrlKey) handlePrint(); break;
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [selectedSupplier, supplierLedger, showDropdown]);

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="print-fix-container" style={{ backgroundColor: '#e2e8f0', minHeight: '100vh', padding: '20px', fontFamily: '"Segoe UI", Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* 🚀 TOAST WITH NO-PRINT FIX 🚀 */}
            {toast.show && (
                <div className="no-print" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999, fontWeight: 'bold' }}>
                    {toast.type === 'success' ? <FaCheckCircle /> : <FaInfoCircle />} {toast.message}
                </div>
            )}

            <style>
                {`
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    * { background: transparent !important; box-shadow: none !important; }
                    .no-print { display: none !important; }
                    ::-webkit-scrollbar { display: none !important; }
                    body, html, .print-fix-container { background: #fff !important; padding: 0 !important; margin: 0 !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
                    .paper-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                }
                `}
            </style>

            {/* ACTION BAR (Hidden on Print) */}
            <div className="no-print" style={{ width: '100%', maxWidth: '900px', backgroundColor: '#fff', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                
                {/* SEARCH BOX */}
                <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px', display: 'flex', alignItems: 'center' }}>
                    <FaSearch style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search Supplier Name or Code..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setFocusedSearchIndex(-1); }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        onKeyDown={handleSearchKeyDown}
                        style={{ width: '100%', padding: '8px 10px 8px 35px', borderRadius: '4px', border: '1px solid #94a3b8', outline: 'none', fontWeight: 'bold', color: '#0f172a' }}
                    />
                    
                    {showDropdown && searchQuery && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #cbd5e1', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0px 4px 12px rgba(0,0,0,0.1)', borderRadius: '0 0 4px 4px' }}>
                            {filteredSuppliers.length > 0 ? filteredSuppliers.map((supp, index) => (
                                <div 
                                    key={supp.id || supp.code} 
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSupplier(supp); }}
                                    onMouseEnter={() => setFocusedSearchIndex(index)}
                                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', backgroundColor: focusedSearchIndex === index ? '#eff6ff' : '#fff', color: focusedSearchIndex === index ? '#1d4ed8' : '#0f172a' }}
                                >
                                    <span style={{ color: focusedSearchIndex === index ? '#1d4ed8' : '#64748b', marginRight: '8px' }}>{supp.code}</span> 
                                    {supp.name} 
                                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '10px', fontWeight: 'normal' }}>({supp.agent || 'No Agent'})</span>
                                </div>
                            )) : (
                                <div style={{ padding: '10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>No suppliers found...</div>
                            )}
                        </div>
                    )}
                </div>
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button onClick={handleExportExcel} style={actionBtnStyle}><strong style={{color:'#16a34a'}}>F2</strong> <FaFileExcel color="#16a34a"/> Excel</button>
                    <button onClick={handlePrint} style={actionBtnStyle}><strong style={{color:'#2563eb'}}>F4</strong> <FaPrint color="#2563eb"/> Print</button>
                    <button onClick={handleClose} style={actionBtnStyle}><strong style={{color:'#dc2626'}}>Esc</strong> <FaTimesCircle color="#dc2626"/> Close</button>
                </div>
            </div>

            {/* MAIN PAPER CONTAINER */}
            <div className="paper-container" style={{ width: '100%', maxWidth: '900px', backgroundColor: '#ffffff', padding: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', flexGrow: 1 }}>
                
                {/* HEADER */}
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>FARAN TRADERS</h1>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>MC PLAZA BANK ROAD MARDAN</div>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>PHONE NO: 0311-9245892</div>
                </div>

                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', textAlign: 'center', marginBottom: '25px' }}>
                    <strong style={{ fontSize: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        SUPPLIER ACCOUNT DETAILS
                    </strong>
                </div>

                {/* SUPPLIER DETAILS & DATE */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px', color: '#0f172a' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '16px' }}><strong>{selectedSupplier?.code || '---'} / Name: {selectedSupplier?.name || 'Please select a supplier'}</strong></div>
                        <div>Address: {selectedSupplier?.address || 'N/A'}</div>
                        <div>Phone: {selectedSupplier?.phone || 'N/A'}</div>
                        <div>Agent: {selectedSupplier?.agent || 'N/A'}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong>Reporting Date:</strong> {formattedDate}</div>
                        <div style={{ color: '#2563eb', fontWeight: 'bold' }}>Current Balance: Rs. {selectedSupplier ? parseFloat(selectedSupplier.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</div>
                    </div>
                </div>

                {/* LEDGER TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #000', borderTop: '1px solid #000' }}>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Ref #</th>
                            <th style={thStyle}>Detail</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Bill (+)</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Paid (-)</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {supplierLedger.length > 0 ? supplierLedger.map((row, index) => (
                            <tr key={index} style={{ borderBottom: '1px dashed #cbd5e1' }}>
                                <td style={tdStyle}>{row.date}</td>
                                <td style={tdStyle}>{row.ref_no || '-'}</td>
                                <td style={tdStyle}>{row.detail || '-'}</td>
                                <td style={{...tdStyle, textAlign: 'right'}}>{parseFloat(row.amt_bill || 0) > 0 ? parseFloat(row.amt_bill).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td style={{...tdStyle, textAlign: 'right'}}>{parseFloat(row.amt_paid || 0) > 0 ? parseFloat(row.amt_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '13px'}}>{parseFloat(row.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                    {selectedSupplier ? "No ledger entries found for this supplier." : "Search and select a supplier above to view their ledger."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    --- End of Supplier Report ---
                </div>

            </div>
        </div>
    );
}

// STYLES
const thStyle = { padding: '10px 8px', textAlign: 'left', fontWeight: 'bold', color: '#000' };
const tdStyle = { padding: '10px 8px', color: '#0f172a' };
const actionBtnStyle = { padding: '8px 16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' };

export default SupplierReport;