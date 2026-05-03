import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChartBar, FaPrint, FaTimesCircle, FaFileAlt, FaSearch, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function DailyProfitReport() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filterType, setFilterType] = useState('Today');
    const [reportFormat, setReportFormat] = useState('Summary');

    // --- LIVE DATABASE STATES ---
    const [allSales, setAllSales] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    
    // --- DATE STATES FOR FILTERING ---
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // --- 🚀 NEW: TOAST NOTIFICATION STATE 🚀 ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // The magical non-blocking notification function
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 2500); // Fades away after 2.5 seconds
    };

    // --- CLOCK & BULLETPROOF DATE MATCHING ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Formats today exactly how Django saved it: "11-Apr-2026"
    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const currentMonthStr = formattedDate.substring(3); // Extracts just "Apr-2026"

    // --- FETCH LIVE SALES ON LOAD ---
    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/sales/');
                setAllSales(response.data);
            } catch (error) {
                console.error("Failed to fetch sales data:", error);
                showToast("Failed to connect to database!", "error");
            }
        };
        fetchSales();
    }, []);

    // --- 🚀 THE FIXED FILTER ENGINE 🚀 ---
    useEffect(() => {
        applyFilters();
    }, [allSales, filterType]); 

    const applyFilters = () => {
        const result = allSales.filter(invoice => {
            if (filterType === 'Today') {
                // Now they match perfectly! "11-Apr-2026" === "11-Apr-2026"
                return invoice.date === formattedDate;
            }
            if (filterType === 'Month') {
                return invoice.date && invoice.date.includes(currentMonthStr);
            }
            if (filterType === 'DateWise') {
                if (!fromDate || !toDate) return true; 
                
                // Convert both string types into real Date objects for fair math comparison
                const invDate = new Date(invoice.date.replace(/-/g, ' ')); 
                const start = new Date(fromDate);
                const end = new Date(toDate);
                
                invDate.setHours(0,0,0,0);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                
                return invDate >= start && invDate <= end;
            }
            return true;
        });
        setFilteredData(result);
    };

    // --- LIVE CALCULATIONS ---
    const grossSale = filteredData.reduce((sum, row) => sum + parseFloat(row.net_total || 0), 0);
    const grossProfit = filteredData.reduce((sum, row) => sum + parseFloat(row.profit || 0), 0);

    // --- ACTIONS ---
    const handlePrint = () => {
        showToast("Preparing document for printing...", "info");
        setTimeout(() => window.print(), 500);
    };
    
    const handleClose = () => {
        navigate('/');
    };

    // --- KEYBOARD SHORTCUT ENGINE ---
    useEffect(() => {
        const handleFKeys = (e) => {
            if (['F4', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }
            switch(e.key) {
                case 'F4': handlePrint(); break;
                case 'Escape': handleClose(); break;
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, []);

    return (
        <div className="report-container" style={{ backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', color: '#0f172a', minWidth: '1100px', position: 'relative' }}>
            
            {/* 🚀 TOAST NOTIFICATION UI 🚀 */}
            {toast.show && (
                <div className="no-print" style={{
                    position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
                    color: 'white', padding: '12px 24px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                    fontWeight: 'bold', fontSize: '14px',
                    animation: 'fadeInOut 2.5s ease-in-out forwards'
                }}>
                    {toast.type === 'success' ? <FaCheckCircle size={18} /> : <FaInfoCircle size={18} />}
                    {toast.message}
                </div>
            )}

            {/* 🖨️ PROFESSIONAL PRINT CSS 🖨️ */}
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
                    * { background: transparent !important; color: #000 !important; box-shadow: none !important; border-color: #000 !important; text-shadow: none !important; }
                    .no-print { display: none !important; }
                    body, html, .report-container, .print-content-wrapper, .print-table-wrapper, .table-scroll-container { 
                        display: block !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important;
                        height: auto !important; overflow: visible !important; background-color: white !important; 
                        border: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important;
                    }
                    .print-only-header { display: flex !important; justify-content: space-between !important; align-items: flex-end !important; margin-bottom: 20px !important; border-bottom: 2px solid black !important; padding-bottom: 10px !important; }
                    .print-only-header h1 { margin: 0 !important; font-size: 22pt !important; font-weight: bold !important; text-transform: uppercase !important; }
                    table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; table-layout: auto !important; }
                    th { border: 1px solid black !important; font-size: 11pt !important; padding: 8px !important; background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; text-transform: uppercase !important; }
                    td { border: 1px solid black !important; padding: 6px 8px !important; font-size: 11pt !important; }
                    .print-totals { display: flex !important; justify-content: flex-start !important; gap: 40px !important; border: 2px solid black !important; border-top: none !important; padding: 15px !important; }
                    .print-totals span { font-size: 14pt !important; color: black !important; }
                }
                @media screen { .print-only-header { display: none !important; } }
                `}
            </style>

            {/* TOP NAVIGATION BAR */}
            <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10, borderBottom: '3px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <FaChartBar size={24} color="#3b82f6" />
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Sales & Profit Analytics</h1>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', fontWeight: '600', color: '#1d4ed8' }}>
                    Current Date: {formattedDate}
                </div>
            </div>

            {/* MAIN DASHBOARD AREA */}
            <div className="print-content-wrapper" style={{ padding: '24px', display: 'flex', gap: '24px', flexGrow: 1, overflow: 'hidden' }}>
                
                {/* LEFT CONTROL PANEL */}
                <div className="no-print" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={radioLabel}><input type="radio" checked={filterType === 'Today'} onChange={() => { setFilterType('Today'); showToast("Filtering Today's Data", "info"); }} style={radioInput} /> Today</label>
                            <label style={radioLabel}><input type="radio" checked={filterType === 'Month'} onChange={() => { setFilterType('Month'); showToast("Filtering This Month's Data", "info"); }} style={radioInput} /> This Month</label>
                            <label style={radioLabel}><input type="radio" checked={filterType === 'DateWise'} onChange={() => setFilterType('DateWise')} style={radioInput} /> Date Wise</label>
                        </div>
                        {filterType === 'DateWise' && (
                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>From:</span>
                                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateInput} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>To:</span>
                                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dateInput} />
                                </div>
                                <button onClick={() => { applyFilters(); showToast("Custom Report Generated", "success"); }} style={{...btnPrimary, width: '100%', justifyContent: 'center', marginTop: '5px'}}><FaSearch /> Generate</button>
                            </div>
                        )}
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Report Format</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={radioLabel}><input type="radio" checked={reportFormat === 'Summary'} onChange={() => setReportFormat('Summary')} style={radioInput} /> Summary</label>
                            <label style={radioLabel}><input type="radio" checked={reportFormat === 'Detail'} onChange={() => setReportFormat('Detail')} style={radioInput} /> Detail Report</label>
                        </div>
                    </div>
                </div>

                {/* RIGHT DATA GRID PANEL */}
                <div className="print-table-wrapper" style={{ flexGrow: 1, backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    
                    {/* Header exclusively for paper */}
                    <div className="print-only-header">
                        <h1>{filterType === 'Today' ? 'Daily Profit Report' : filterType === 'DateWise' ? 'Custom Profit Report' : 'Monthly Profit Report'}</h1>
                        <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>Date: {formattedDate}</span>
                    </div>

                    {/* Web Grid Header */}
                    <div className="no-print" style={{ padding: '15px 20px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaFileAlt color="#64748b" /> {filterType === 'Today' ? 'Daily Sale Report' : filterType === 'DateWise' ? 'Custom Dates Report' : 'Monthly Report'}
                        </div>
                        <button onClick={handlePrint} style={{...btnOutline, padding: '6px 12px', fontSize: '13px'}}>
                            <strong style={{color: '#3b82f6', marginRight: '6px'}}>F4</strong> <FaPrint /> Print List
                        </button>
                    </div>

                    <div className="table-scroll-container" style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <tr className="no-print">
                                    <th colSpan="2" style={thCategory}>Customer Details</th>
                                    <th colSpan="2" style={{...thCategory, backgroundColor: '#f0fdfa', color: '#0f766e'}}>Profit Metrics</th>
                                    <th colSpan="1" style={{...thCategory, backgroundColor: '#eff6ff', color: '#1d4ed8'}}>Summary</th>
                                </tr>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{...gridTh, textAlign: 'left'}}>Name</th>
                                    <th style={gridTh}>Invoice No</th>
                                    <th style={{...gridTh, textAlign: 'right'}}>Gross Profit</th>
                                    <th style={{...gridTh, textAlign: 'right'}}>Net Profit</th>
                                    <th style={{...gridTh, textAlign: 'right', color: '#1e293b'}}>Invoice Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? filteredData.map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{...gridTd, textAlign: 'left', fontWeight: '700', color: '#3b82f6'}}>{row.customer_name || 'Cash Customer'}</td>
                                        <td style={gridTd}>INV-{row.id}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#059669', fontWeight: '600'}}>{parseFloat(row.profit || 0).toFixed(2)}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#059669', fontWeight: '600'}}>{parseFloat(row.profit || 0).toFixed(2)}</td>
                                        <td style={{...gridTd, textAlign: 'right', fontWeight: '800', color: '#0f172a'}}>{parseFloat(row.net_total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No sales found for the selected duration.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* BOTTOM TOTALS BAR */}
                    <div className="print-totals" style={{ backgroundColor: '#f8fafc', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '50px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Gross Sale:</span>
                                <span style={{ fontSize: '24px', color: '#0f172a', fontWeight: '800', letterSpacing: '-0.5px' }}>{grossSale.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Gross Profit:</span>
                                <span style={{ fontSize: '24px', color: '#059669', fontWeight: '800', letterSpacing: '-0.5px' }}>{grossProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                        <button onClick={handleClose} className="no-print" style={btnDanger}>
                            <strong style={{marginRight: '6px'}}>Esc</strong> <FaTimesCircle /> Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

// --- Styles ---
const radioLabel = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#334155', fontWeight: '500', cursor: 'pointer' };
const radioInput = { accentColor: '#3b82f6', width: '18px', height: '18px', cursor: 'pointer' };
const dateInput = { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', color: '#334155' };

const thCategory = { padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0' };
const gridTh = { padding: '16px 20px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', borderRight: '1px solid #f1f5f9' };
const gridTd = { padding: '16px 20px', fontSize: '15px', color: '#334155', textAlign: 'center', borderRight: '1px solid #f1f5f9' };

const btnBase = { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', transition: 'all 0.2s' };
const btnPrimary = { ...btnBase, backgroundColor: '#3b82f6', color: '#ffffff', boxShadow: '0 1px 2px rgba(59, 130, 246, 0.5)' };
const btnOutline = { ...btnBase, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155' };
const btnDanger = { ...btnBase, backgroundColor: '#fff1f2', color: '#e11d48' };

export default DailyProfitReport;