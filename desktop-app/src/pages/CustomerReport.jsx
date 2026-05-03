import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 🚀 1. THE IMPORT
import { FaPrint, FaTimesCircle, FaFilePdf, FaCheckCircle, FaInfoCircle, FaSearch } from 'react-icons/fa';

function CustomerReport() {
    const navigate = useNavigate(); // 🚀 2. THE ENGINE

    // --- 🚀 3. THE MASTER CLOSE FUNCTION ---
    const handleClose = () => {
        navigate('/');
    };

    const [currentTime, setCurrentTime] = useState(new Date());

    // --- LIVE DATABASE STATES ---
    const [dbCustomers, setDbCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);

    // --- SELECTED REPORT STATES ---
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledgerRows, setLedgerRows] = useState([]);

    // --- TOAST NOTIFICATION STATE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // --- CLOCK ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    const formattedDate = currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- FETCH CUSTOMERS ON LOAD ---
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/customers/');
                setDbCustomers(response.data);
            } catch (error) {
                console.error("Failed to fetch customers:", error);
                showToast("Database connection failed!", "error");
            }
        };
        fetchCustomers();
    }, []);

    // --- SMART SEARCH FILTER ---
    const filteredCustomers = dbCustomers.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // --- LOAD LEDGER FOR SELECTED CUSTOMER ---
    const loadCustomerLedger = async (customer) => {
        setSelectedCustomer(customer);
        setSearchQuery('');
        setShowDropdown(false);
        setFocusedSearchIndex(-1);
        showToast(`Loading ledger for ${customer.name}...`, "info");

        try {
            const response = await axios.get('http://127.0.0.1:8000/api/customer-ledgers/');
            
            const myLedger = response.data.filter(record => 
                record.customer === customer.id || record.customer === customer.code
            );

            myLedger.sort((a, b) => a.id - b.id);

            const formattedRows = myLedger.map(record => ({
                id: record.id,
                date: record.created_at ? new Date(record.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                ref: record.ref_no || '0',
                entry: record.id.toString(),
                detail: record.detail || 'Transaction',
                invTotal: parseFloat(record.amt_due) || 0.00,
                credit: parseFloat(record.amt_due) || 0.00, 
                debit: parseFloat(record.amt_rec) || 0.00,  
                balance: parseFloat(record.running_balance) || 0.00
            }));

            if (formattedRows.length > 0 && formattedRows[0].detail !== 'Opening Balance') {
                const firstBal = formattedRows[0].balance;
                const firstCredit = formattedRows[0].credit;
                const firstDebit = formattedRows[0].debit;
                const startingBal = firstBal - firstCredit + firstDebit;
                
                formattedRows.unshift({
                    id: 'open', date: formattedRows[0].date, ref: '-', entry: '-', 
                    detail: 'Opening Balance', invTotal: 0, credit: startingBal > 0 ? startingBal : 0, 
                    debit: startingBal < 0 ? Math.abs(startingBal) : 0, balance: startingBal
                });
            }

            setLedgerRows(formattedRows);
            showToast("Ledger loaded successfully!", "success");

            setTimeout(() => {
                const scrollArea = document.getElementById('scrollable-area');
                if (scrollArea) scrollArea.focus();
            }, 100);

        } catch (error) {
            console.error("Error fetching ledger:", error);
            showToast("Failed to load ledger history.", "error");
        }
    };

    // --- KEYBOARD NAVIGATION FOR SEARCH ---
    const handleSearchKeyDown = (e) => {
        if (!showDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedSearchIndex >= 0 && filteredCustomers[focusedSearchIndex]) {
                loadCustomerLedger(filteredCustomers[focusedSearchIndex]);
            } else if (filteredCustomers.length === 1) {
                loadCustomerLedger(filteredCustomers[0]);
            }
        }
    };

    useEffect(() => {
        if (focusedSearchIndex >= 0 && showDropdown) {
            const activeItem = document.getElementById(`cust-dropdown-${focusedSearchIndex}`);
            if (activeItem) activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }
    }, [focusedSearchIndex, showDropdown]);

    const totalCredit = ledgerRows.reduce((sum, t) => sum + t.credit, 0);
    const totalDebit = ledgerRows.reduce((sum, t) => sum + t.debit, 0);
    const finalBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].balance : (selectedCustomer?.current_balance || 0);

    const handlePrint = () => {
        if (!selectedCustomer) {
            showToast("Please select a customer first!", "error");
            return;
        }
        showToast("Preparing document...", "info");
        setTimeout(() => window.print(), 500);
    };

    const handleExportPdf = () => {
        showToast('Select "Save as PDF" in the printer dialog.', "info");
        setTimeout(() => window.print(), 800);
    };

    // --- 🚀 4. THE ESCAPE KEY LISTENER 🚀 ---
    useEffect(() => {
        const handleShortcuts = (e) => {
            if (e.key === 'F4' || (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                handlePrint();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                // If the search dropdown is open, Esc just closes the dropdown. 
                // If it is already closed, Esc teleports you to the Home Screen!
                if (showDropdown) { 
                    setShowDropdown(false); 
                    setFocusedSearchIndex(-1); 
                }
                else {
                    handleClose(); 
                }
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [showDropdown, selectedCustomer, navigate]);

    return (
        <div className="app-background" style={{ backgroundColor: '#f1f5f9', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', position: 'relative' }}>
            
            {/* TOAST NOTIFICATION UI */}
            {toast.show && (
                <div className="no-print" style={{
                    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
                    color: 'white', padding: '12px 24px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999,
                    fontWeight: 'bold', fontSize: '14px', animation: 'fadeInOut 2.5s ease-in-out forwards'
                }}>
                    {toast.type === 'success' ? <FaCheckCircle size={18} /> : <FaInfoCircle size={18} />}
                    {toast.message}
                </div>
            )}

            <style>
                {`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body, html, .app-background, .document-wrapper { 
                        background-color: #fff !important; margin: 0 !important; padding: 0 !important; 
                        display: block !important; width: 100% !important; min-width: 0 !important; 
                        height: auto !important; overflow: visible !important; 
                    }
                    .no-print { display: none !important; }
                    .print-paper { 
                        box-shadow: none !important; margin: 0 !important; padding: 0 !important; 
                        width: 100% !important; max-width: 100% !important; border: none !important; min-height: auto !important;
                    }
                    .print-text { color: #000 !important; }
                    .print-border { border-color: #000 !important; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                }
                `}
            </style>

            {/* MODERN TOOLBAR (Hidden during print) */}
            <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Report Viewer</h1>
                    
                    {/* SMART SEARCH BOX */}
                    <div style={{ position: 'relative', width: '300px', marginLeft: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px' }}>
                            <FaSearch color="#64748b" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setFocusedSearchIndex(-1); }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search Customer Name..." 
                                style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', marginLeft: '10px', width: '100%', fontSize: '14px', fontWeight: '600', color: '#0f172a' }} 
                            />
                        </div>

                        {showDropdown && searchQuery && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 200, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                {filteredCustomers.length > 0 ? filteredCustomers.map((cust, index) => {
                                    const isFocused = focusedSearchIndex === index;
                                    return (
                                        <div 
                                            key={cust.id} 
                                            id={`cust-dropdown-${index}`}
                                            onMouseDown={(e) => { e.preventDefault(); loadCustomerLedger(cust); }}
                                            onMouseEnter={() => setFocusedSearchIndex(index)}
                                            style={{ 
                                                padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                backgroundColor: isFocused ? '#0d9488' : '#fff', color: isFocused ? '#fff' : '#0f172a'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{cust.name}</div>
                                            <div style={{ fontSize: '12px', color: isFocused ? '#ccfbf1' : '#64748b', marginTop: '2px' }}>Code: {cust.code} | Bal: Rs.{parseFloat(cust.current_balance || 0).toFixed(2)}</div>
                                        </div>
                                    );
                                }) : (
                                    <div style={{ padding: '10px 12px', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>No customers found...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginRight: '10px' }}>Press <strong style={{color: '#4f46e5'}}>F4</strong> to Print</span>
                    <button onClick={handlePrint} style={btnPrimary}><FaPrint /> Print Document</button>
                    <button onClick={handleExportPdf} style={btnOutline}><FaFilePdf /> Export PDF</button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 4px' }}></div>
                    {/* 🚀 5. THE WORKING BUTTON 🚀 */}
                    <button onClick={handleClose} style={btnDanger}><FaTimesCircle /> Close (Esc)</button>
                </div>
            </div>

            <div 
                id="scrollable-area"
                className="document-wrapper no-print-flex" 
                tabIndex="0" 
                style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', flexGrow: 1, overflowY: 'auto', outline: 'none' }}
            >
                <div className="print-paper" style={{ backgroundColor: '#ffffff', width: '210mm', minHeight: '297mm', padding: '40px', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    
                    {!selectedCustomer ? (
                        <div className="no-print" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <FaSearch size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <h2 style={{ margin: 0, fontWeight: '600' }}>Search a customer above to view their ledger</h2>
                        </div>
                    ) : (
                        <>
                            <div className="print-text" style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px', textTransform: 'uppercase' }}>FARAN TRADERS</h1>
                                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>MC PLAZA BANK ROAD MARDAN</div>
                                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginTop: '4px' }}>PHONE NO: 0311-9245892</div>
                            </div>

                            <div className="print-border print-text" style={{ textAlign: 'center', margin: '24px 0', borderTop: '2px solid #1e293b', borderBottom: '2px solid #1e293b', padding: '8px 0', backgroundColor: '#f8fafc' }}>
                                <span style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase', color: '#0f172a' }}>Customer Account Details</span>
                            </div>

                            <div className="print-text" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                <div>
                                    <div style={{ marginBottom: '6px', fontSize: '15px' }}>{selectedCustomer.code} / Name: <span style={{fontSize: '16px', textTransform: 'uppercase'}}>{selectedCustomer.name}</span></div>
                                    <div style={{ color: '#475569' }}>Address: {selectedCustomer.address || 'N/A'}</div>
                                    <div style={{ color: '#475569', marginTop: '4px' }}>Phone: {selectedCustomer.phone || 'N/A'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ marginBottom: '6px' }}>Reporting Date: <span style={{ fontWeight: '500'}}>{formattedDate}</span></div>
                                    {ledgerRows.length > 0 && (
                                        <div style={{ color: '#4f46e5' }}>Opening Bal = {ledgerRows[0].balance.toFixed(2)}</div>
                                    )}
                                </div>
                            </div>

                            <table className="print-border" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', borderTop: '2px solid #1e293b', borderBottom: '2px solid #1e293b' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #64748b' }}>
                                        <th style={{...thStyle, textAlign: 'left'}}>Date</th>
                                        <th style={{...thStyle, textAlign: 'left'}}>Ref #</th>
                                        <th style={{...thStyle, textAlign: 'left'}}>Entry #</th>
                                        <th style={{...thStyle, textAlign: 'left'}}>Detail</th>
                                        <th style={{...thStyle, textAlign: 'right'}}>Invoice Total</th>
                                        <th style={{...thStyle, textAlign: 'right'}}>Credit (+)</th>
                                        <th style={{...thStyle, textAlign: 'right'}}>Debit (-)</th>
                                        <th style={{...thStyle, textAlign: 'right'}}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerRows.length > 0 ? ledgerRows.map((row, index) => (
                                        <tr key={index} className="print-border print-text" style={{ borderBottom: '1px dashed #cbd5e1', color: '#334155' }}>
                                            <td style={{...tdStyle, textAlign: 'left', fontWeight: '500'}}>{row.date}</td>
                                            <td style={{...tdStyle, textAlign: 'left'}}>{row.ref}</td>
                                            <td style={{...tdStyle, textAlign: 'left'}}>{row.entry}</td>
                                            <td style={{...tdStyle, textAlign: 'left', fontWeight: '600', color: '#0f172a'}}>{row.detail}</td>
                                            <td style={{...tdStyle, textAlign: 'right'}}>{row.invTotal > 0 ? row.invTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
                                            <td style={{...tdStyle, textAlign: 'right'}}>{row.credit > 0 ? row.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
                                            <td style={{...tdStyle, textAlign: 'right'}}>{row.debit > 0 ? row.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
                                            <td style={{...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a'}}>{row.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#64748b' }}>No transactions found for this customer.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {ledgerRows.length > 0 && (
                                <div className="print-border print-text" style={{ marginTop: '16px', borderTop: '2px solid #1e293b', borderBottom: '2px solid #1e293b', padding: '10px 0', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                    <div style={{ color: '#4f46e5', textTransform: 'uppercase' }}>Closing Balance</div>
                                    <div style={{ display: 'flex', width: '420px' }}>
                                        <div style={{ flex: 1 }}></div>
                                        <div style={{ width: '90px', textAlign: 'right', paddingRight: '5px' }}>{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 0})}</div>
                                        <div style={{ width: '90px', textAlign: 'right', paddingRight: '5px' }}>{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 0})}</div>
                                        <div style={{ width: '90px', textAlign: 'right' }}>{finalBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                                    </div>
                                </div>
                            )}

                            <div className="print-text" style={{ marginTop: '40px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Pages: </span>
                                    <span style={{ border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>1 / 1</span>
                                </div>
                                <div>System Generated Report</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const btnBase = { padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', border: 'none' };
const btnPrimary = { ...btnBase, backgroundColor: '#4f46e5', color: '#ffffff', boxShadow: '0 1px 2px rgba(79, 70, 229, 0.3)' };
const btnOutline = { ...btnBase, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155' };
const btnDanger = { ...btnBase, backgroundColor: '#fff1f2', color: '#e11d48' };

const thStyle = { padding: '12px 8px', fontWeight: '800', color: '#0f172a' };
const tdStyle = { padding: '10px 8px' };

export default CustomerReport;