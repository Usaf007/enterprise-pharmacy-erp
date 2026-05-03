import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBoxes, FaSearch, FaFileExcel, FaPrint, FaTimesCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function Inventory() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [liveInventory, setLiveInventory] = useState([]); // LIVE DATABASE STATE

    // --- 🚀 TOAST NOTIFICATION STATE 🚀 ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // --- FETCH LIVE STOCK ---
    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/items/');
            setLiveInventory(response.data);
        } catch (error) {
            console.error("Failed to fetch live stock:", error);
            showToast("Failed to fetch live stock from database.", "error");
        }
    };

    // Filter logic connected to LIVE data
    const filteredStock = liveInventory.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.batch && item.batch.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- 🚀 REAL EXCEL EXPORT ENGINE 🚀 ---
    const handleExportExcel = () => {
        const dataToExport = filteredStock; 

        if (!dataToExport || dataToExport.length === 0) {
            showToast("No data to export!", "error");
            return;
        }

        showToast("Generating Excel file...", "info");

        // 1. Set up the column headers for your Excel file
        const headers = "Item Code,Medicine Name,Batch No.,Trade Price (TP),Retail Price,Current Stock,Location";

        // 2. Loop through your data and format it into rows
        const csvRows = dataToExport.map(item => {
            // We wrap values in quotes so any commas inside item names don't break the Excel columns
            return `"${item.code || ''}","${item.name || ''}","${item.batch || ''}","${item.tp || 0}","${item.retail || 0}","${item.stock || 0}","${item.location || ''}"`;
        }).join('\n');

        // 3. Combine headers and rows
        const csvContent = headers + '\n' + csvRows;

        // 4. Create the file and force the browser to download it
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Current_Stock_Report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => showToast("Exported to Excel successfully!", "success"), 500);
    };

    const handlePrintStock = () => window.print();
    const handleClose = () => {
        navigate('/');
    };

    // --- KEYBOARD SHORTCUT ENGINE ---
    useEffect(() => {
        const handleFKeys = (e) => {
            if (['F2', 'F4', 'Escape'].includes(e.key)) {
                e.preventDefault();
                if (document.activeElement && document.activeElement.tagName !== 'INPUT') document.activeElement.blur();
            }
            switch(e.key) {
                case 'F2': handleExportExcel(); break; // 🚀 WIRED F2 TO EXCEL EXPORT
                case 'F4': handlePrintStock(); break;
                case 'Escape': handleClose(); break;
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, [filteredStock]); // Add filteredStock dependency so F2 grabs the latest search results

    const totalItems = filteredStock.length;
    const totalValue = filteredStock.reduce((sum, item) => sum + (parseFloat(item.tp) * parseInt(item.stock)), 0);

    return (
        <div className="inventory-container" style={{ backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", Arial, sans-serif', minWidth: '1000px', position: 'relative' }}>
            
            {/* 🚀 TOAST NOTIFICATION UI 🚀 */}
            {toast.show && (
                <div style={{
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

            {/* 🖨️ FIXED PRINT CSS 🖨️ */}
            <style>
                {`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    * { background: transparent !important; color: #000 !important; box-shadow: none !important; }
                    .hide-on-paper { display: none !important; }
                    body, html, .inventory-container, div { height: auto !important; overflow: visible !important; width: auto !important; }
                    .print-card-wrapper { border: none !important; border-radius: 0 !important; padding: 0 !important; }
                    .print-header { border-bottom: 2px solid black !important; margin-bottom: 15px !important; padding: 0 0 10px 0 !important; }
                    table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; table-layout: auto !important; }
                    th { border: 1px solid black !important; font-size: 10pt !important; padding: 8px !important; background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; text-align: left !important; }
                    td { border: 1px solid black !important; padding: 6px 8px !important; font-size: 10pt !important; font-weight: normal !important; }
                    .print-footer { border: none !important; padding: 15px 0 !important; display: flex !important; justify-content: space-between !important; }
                }
                `}
            </style>

            {/* HEADER */}
            <div className="print-header" style={{ backgroundColor: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <FaBoxes className="hide-on-paper" size={24} color="#8b5cf6" />
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Current Stock Report</h1>
                </div>
                
                <div className="hide-on-paper" style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '300px' }}>
                        <FaSearch color="#64748b" />
                        <input 
                            type="text" 
                            placeholder="Search by Name, Code, or Batch..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px' }} 
                        />
                    </div>
                </div>
            </div>

            {/* MAIN GRID */}
            <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="print-card-wrapper" style={{ backgroundColor: '#ffffff', borderRadius: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    
                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                                <tr>
                                    <th style={thStyle}>Item Code</th>
                                    <th style={{...thStyle, textAlign: 'left'}}>Medicine Name</th>
                                    <th style={thStyle}>Batch No.</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Trade Price (TP)</th>
                                    <th style={{...thStyle, textAlign: 'right'}}>Retail Price</th>
                                    <th style={{...thStyle, color: '#2563eb'}}>Current Stock</th>
                                    <th style={thStyle}>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStock.map((item, idx) => (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: item.stock <= 0 ? '#fef2f2' : '#ffffff' }}>
                                        <td style={{...tdStyle, fontWeight: 'bold', color: '#475569'}}>{item.code}</td>
                                        <td style={{...tdStyle, textAlign: 'left', fontWeight: '600', color: '#0f172a'}}>{item.name}</td>
                                        <td style={tdStyle}>{item.batch || '-'}</td>
                                        <td style={{...tdStyle, textAlign: 'right'}}>{parseFloat(item.tp || 0).toFixed(2)}</td>
                                        <td style={{...tdStyle, textAlign: 'right'}}>{parseFloat(item.retail || 0).toFixed(2)}</td>
                                        <td style={{...tdStyle, fontWeight: '800', color: item.stock <= 0 ? '#dc2626' : '#2563eb'}}>
                                            {item.stock} {item.stock <= 0 && <span className="hide-on-paper" style={{fontSize: '10px', color: '#ef4444', marginLeft: '5px'}}>(OUT)</span>}
                                        </td>
                                        <td style={{...tdStyle, fontSize: '13px'}}>{item.location || '-'}</td>
                                    </tr>
                                ))}
                                {filteredStock.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                            No inventory items found in the database.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* FOOTER TOTALS */}
                    <div className="print-footer" style={{ backgroundColor: '#f8fafc', padding: '15px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Total Unique Items: <span style={{color: '#0f172a'}}>{totalItems}</span></div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Estimated Inventory Value (TP): <span style={{color: '#16a34a', fontSize: '18px', fontWeight: '800'}}>Rs. {totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS - HIDDEN ON PRINT */}
            <div className="hide-on-paper" style={{ backgroundColor: '#ffffff', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button onClick={handleExportExcel} style={btnOutline}>
                    <strong style={{color: '#16a34a', marginRight: '4px'}}>F2</strong> <FaFileExcel color="#16a34a"/> Export to Excel
                </button>
                <button onClick={handlePrintStock} style={btnOutline}>
                    <strong style={{color: '#3b82f6', marginRight: '4px'}}>F4</strong> <FaPrint color="#475569"/> Print Stock List
                </button>
                <button onClick={handleClose} style={{...btnOutline, marginLeft: 'auto', color: '#e11d48', borderColor: '#fecaca'}}>
                    <strong style={{color: '#e11d48', marginRight: '4px'}}>Esc</strong> <FaTimesCircle /> Close
                </button>
            </div>
        </div>
    );
}

const thStyle = { padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', borderBottom: '2px solid #cbd5e1' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center' };
const btnOutline = { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155' };

export default Inventory;