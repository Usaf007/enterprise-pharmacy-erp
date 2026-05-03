import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPrint, FaEdit, FaClipboardCheck, FaFileExcel, FaTimesCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function InvoiceView() {
    const navigate = useNavigate();
    const [invoiceMeta, setInvoiceMeta] = useState({
        date: '', time: '', invNo: '', customer: '', address: '', salesman: ''
    });

    const initialRows = Array.from({ length: 15 }, (_, index) => ({
        id: index, code: '', name: '', salePrice: '', qty: '', sTax: '', disc: '', cpDisc: 0, profit: 0, itemTotal: 0
    }));
    const [rows, setRows] = useState(initialRows);
    const [activeRow, setActiveRow] = useState(0); 

    // --- 🚀 TOAST NOTIFICATION STATE 🚀 ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // 🚀 MASTER INVOICE DATABASE FOR SUGGESTIONS
    const [dbInvoices, setDbInvoices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);

    useEffect(() => {
        const fetchAllInvoices = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/sales/');
                setDbInvoices(response.data);
            } catch (error) {
                console.error("Error fetching invoice history:", error);
            }
        };
        fetchAllInvoices();
    }, []);

    const filteredInvoices = dbInvoices.filter(inv => 
        inv.id.toString().includes(searchQuery) || 
        (inv.customer_name && inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => {
        if (focusedSearchIndex >= 0 && showDropdown) {
            const activeItem = document.getElementById(`inv-dropdown-item-${focusedSearchIndex}`);
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        }
    }, [focusedSearchIndex, showDropdown]);

    const handlePrint = () => window.print();
    const handleEditReturn = () => showToast("Opening Edit/Return Invoice mode... (Coming Soon)", "info");
    const handlePostMissed = () => showToast("Posting missed invoices... (Coming Soon)", "info");
    
    // --- 🚀 EXCEL EXPORT ENGINE 🚀 ---
    const handleExportExcel = () => {
        const validItems = rows.filter(row => row.code.trim() !== '' || row.name.trim() !== '');
        if (validItems.length === 0) {
            showToast("No data to export! Please load an invoice first.", "error");
            return;
        }
        showToast("Generating Excel file...", "info");

        const headers = "Code,Item Name,Sale Price,Quantity,S.Tax,Discount %,Item Total";
        const csvRows = validItems.map(row => {
            return `"${row.code}","${row.name}","${row.salePrice}","${row.qty}","${row.sTax}","${row.disc}","${row.itemTotal}"`;
        }).join('\n');

        const csvContent = headers + '\n' + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const fileName = invoiceMeta.invNo && invoiceMeta.invNo !== '' ? `Invoice_${invoiceMeta.invNo}.csv` : `Invoice_Export.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => showToast("Exported to Excel successfully!", "success"), 500);
    };

    const handleClose = () => { navigate('/'); };

    useEffect(() => {
        const handleShortcuts = (e) => {
            if (['F4', 'F2', 'F10', 'Escape'].includes(e.key) || (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                if (document.activeElement && document.activeElement.tagName !== 'INPUT') document.activeElement.blur();
            }
            switch(e.key) {
                case 'F4': handlePrint(); break;
                case 'F10': handleEditReturn(); break;
                case 'F2': handleExportExcel(); break;
                case 'Escape': 
                    if (showDropdown) {
                        setShowDropdown(false);
                        setFocusedSearchIndex(-1);
                    } else handleClose(); 
                    break;
                case 'p': if (e.ctrlKey) handlePrint(); break;
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [showDropdown, rows, invoiceMeta]);

    // 🚀 LOAD SPECIFIC INVOICE 🚀
    const loadInvoiceData = async (invoiceId) => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/sales/${invoiceId}/`);
            const invoice = response.data;

            setInvoiceMeta({
                date: invoice.date || '', 
                time: invoice.time || '',
                invNo: `INV-${invoice.id}`,
                customer: `${invoice.customer_code || ''} ${invoice.customer_name || 'Cash Customer'}`.trim(),
                address: invoice.address || '',
                salesman: invoice.salesman || 'GENERAL SALE'
            });
            
            const fetchedItems = invoice.items || [];
            const updatedRows = initialRows.map((emptyRow, index) => {
                if (index < fetchedItems.length) {
                    const item = fetchedItems[index];
                    return {
                        id: index, 
                        code: item.code || '', 
                        name: item.name || '', 
                        salePrice: item.sale_price || '',
                        qty: item.qty || '', 
                        sTax: item.s_tax || '', 
                        disc: item.discount || '', 
                        itemTotal: parseFloat(item.item_total) || 0,
                        profit: parseFloat(item.profit) || 0,
                        cpDisc: parseFloat(item.cp_disc || item.company_discount || 0)
                    };
                }
                return emptyRow;
            });
            
            setRows(updatedRows);
            setActiveRow(0);
            setSearchQuery(''); 
            setShowDropdown(false);
            setFocusedSearchIndex(-1);
            showToast(`Invoice INV-${invoiceId} loaded.`, "success");
        } catch (error) {
            console.error("Error fetching invoice:", error);
            showToast("Invoice not found!", "error");
        }
    };

    const handleSearchKeyDown = (e) => {
        if (!showDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev < filteredInvoices.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedSearchIndex >= 0 && filteredInvoices[focusedSearchIndex]) {
                loadInvoiceData(filteredInvoices[focusedSearchIndex].id);
            } else if (filteredInvoices.length === 1) {
                loadInvoiceData(filteredInvoices[0].id);
            } else {
                let searchedInv = searchQuery.replace(/[^0-9]/g, '');
                if (searchedInv !== '') loadInvoiceData(searchedInv);
            }
        }
    };

    const handleKeyDown = (e, rowIndex, colIndex) => {
        let nextRow = rowIndex; let nextCol = colIndex; let shouldMove = false;

        if (e.key === 'ArrowUp') { nextRow = rowIndex - 1; shouldMove = true; } 
        else if (e.key === 'ArrowDown') { nextRow = rowIndex + 1; shouldMove = true; } 
        else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { nextCol = colIndex - 1; shouldMove = true; } 
        else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.toString().length) { nextCol = colIndex + 1; shouldMove = true; } 
        
        if (shouldMove) {
            e.preventDefault();
            if(nextRow >= 0 && nextRow < rows.length) {
                setActiveRow(nextRow); 
                const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
                if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 0); }
            }
        }
    };

    const totalItems = rows.filter(row => row.code !== '' || row.name !== '').length;
    const grandTotal = rows.reduce((sum, row) => sum + (parseFloat(row.itemTotal) || 0), 0);

    return (
        <div className="invoice-view-container" style={{ backgroundColor: '#2b2b45', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
            
            {toast.show && (
                <div style={{
                    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
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
                    * { background: transparent !important; color: #000 !important; box-shadow: none !important; text-shadow: none !important; border-color: #000 !important; }
                    .no-print { display: none !important; }
                    .hide-on-paper { display: none !important; }
                    
                    .show-on-paper-only { 
                        display: block !important; 
                        white-space: normal !important; 
                        word-wrap: break-word !important; 
                        overflow-wrap: break-word !important;
                        text-align: left;
                    }

                    body, html, .invoice-view-container, .print-table-wrapper { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
                    .print-only-header { display: flex !important; flex-direction: column !important; margin-bottom: 20px !important; border-bottom: 2px solid black !important; padding-bottom: 15px !important; }
                    .print-header-top { display: flex !important; justify-content: space-between !important; align-items: flex-end !important; margin-bottom: 15px !important; }
                    .print-header-top h1 { margin: 0 !important; font-size: 24pt !important; font-weight: 900 !important; }
                    .print-header-details { display: flex !important; justify-content: space-between !important; font-size: 12pt !important; font-weight: bold !important; }
                    table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; }
                    th { border: 1px solid black !important; padding: 8px !important; background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; color: #000 !important; }
                    td { border: 1px solid black !important; padding: 6px 8px !important; color: #000 !important; }
                    input { color: #000 !important; border: none !important; padding: 0 !important; font-weight: normal !important; width: 100% !important; }
                    .print-totals { display: flex !important; justify-content: space-between !important; padding: 10px 20px !important; border: 2px solid black !important; border-top: none !important; font-size: 14pt !important; font-weight: bold !important; }
                }

                @media screen { 
                    .print-only-header { display: none !important; } 
                    .print-totals { display: none !important; } 
                    .show-on-paper-only { display: none !important; } 
                }
                `}
            </style>

            <div className="print-only-header">
                <div className="print-header-top">
                    <h1>FARAN TRADERS</h1>
                    <span style={{ fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline' }}>INVOICE REPRINT</span>
                </div>
                <div className="print-header-details">
                    <div>
                        <div>Customer: {invoiceMeta.customer}</div>
                        <div>Address: {invoiceMeta.address}</div>
                        <div>Salesman: {invoiceMeta.salesman}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div>Date: {invoiceMeta.date}</div>
                        <div>Time: {invoiceMeta.time}</div>
                        <div>Invoice #: {invoiceMeta.invNo}</div>
                    </div>
                </div>
            </div>

            <div className="no-print" style={{ backgroundColor: '#6c4bf5', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', borderBottom: '2px solid #333', zIndex: 100 }}>
                <div style={{ backgroundColor: '#8b4a4a', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', width: '380px', border: '1px solid #5a3030' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={leftLabelStyle}>Customer:</span><input type="text" readOnly value={invoiceMeta.customer} style={{ flexGrow: 1, ...leftInputStyle }} /></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={leftLabelStyle}>Address</span><input type="text" readOnly value={invoiceMeta.address} style={{ flexGrow: 1, ...leftInputStyle }} /></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={leftLabelStyle}>Salesman</span><input type="text" readOnly value={invoiceMeta.salesman} style={{ flexGrow: 1, ...leftInputStyle }} /></div>
                </div>

                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '25px' }}>
                    <div style={{ border: '1px solid #ffea00', padding: '4px 60px', color: '#ffea00', fontWeight: 'bold', fontSize: '18px', borderRadius: '3px' }}>
                        INVOICE VIEW
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '280px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={rightLabelStyle}>Date</span><input type="text" readOnly value={invoiceMeta.date} style={rightInputStyle} /></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={rightLabelTimeStyle}>Time</span><input type="text" readOnly value={invoiceMeta.time} style={{ ...rightInputStyle, color: '#4dff4d' }} /></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={rightLabelStyle}>Inv #</span><input type="text" readOnly value={invoiceMeta.invNo} style={{ ...rightInputStyle, color: '#ffcc00', fontWeight: 'bold', fontSize: '16px' }} /></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', width: '80px', textAlign: 'left', paddingLeft: '5px' }}>Search Inv:</span>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => { 
                                setSearchQuery(e.target.value); 
                                setShowDropdown(true); 
                                setFocusedSearchIndex(-1);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Inv # or Name" 
                            style={{ width: '100%', padding: '4px', backgroundColor: '#00ffff', border: '1px solid #117777', outline: 'none', fontWeight: 'bold' }} 
                        />
                        
                        {showDropdown && searchQuery && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, width: '250px', backgroundColor: '#fff', border: '2px solid #333', zIndex: 200, maxHeight: '200px', overflowY: 'auto', boxShadow: '0px 4px 8px rgba(0,0,0,0.5)' }}>
                                {filteredInvoices.length > 0 ? filteredInvoices.map((inv, index) => {
                                    const isFocused = focusedSearchIndex === index;
                                    return (
                                        <div 
                                            key={inv.id} 
                                            id={`inv-dropdown-item-${index}`} 
                                            onMouseDown={(e) => { 
                                                e.preventDefault(); 
                                                loadInvoiceData(inv.id); 
                                            }}
                                            onMouseEnter={() => setFocusedSearchIndex(index)}
                                            style={{ 
                                                padding: '8px', 
                                                cursor: 'pointer', 
                                                borderBottom: '1px solid #eee', 
                                                fontSize: '12px', 
                                                fontWeight: 'bold',
                                                backgroundColor: isFocused ? '#0d9488' : '#fff',
                                                color: isFocused ? '#fff' : '#000'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: isFocused ? '#fff' : '#cc0000' }}>INV-{inv.id}</span>
                                                <span style={{ color: isFocused ? '#fff' : '#0d9488' }}>Rs. {inv.net_total}</span>
                                            </div>
                                            <div style={{ color: isFocused ? '#ccfbf1' : '#666', fontSize: '11px', marginTop: '2px' }}>
                                                {inv.customer_name || 'Cash Customer'} | {inv.date}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div style={{ padding: '8px', color: '#888', fontSize: '12px', fontStyle: 'italic' }}>No invoices found...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="print-table-wrapper" style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#e60073' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#000', color: '#ffea00', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={thStyle}>CODE</th>
                            <th style={{...thStyle, textAlign: 'left', paddingLeft: '10px', width: '40%'}}>ITEM NAME</th>
                            <th style={thStyle}>Sale Price</th><th style={thStyle}>Quantity</th><th style={thStyle}>S.Tax</th><th style={thStyle}>DISC</th><th style={thStyle}>ITEM TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id} 
                                onClick={() => setActiveRow(index)} 
                                style={{ backgroundColor: activeRow === index ? '#cc0052' : 'transparent' }} 
                            >
                                <td style={tdStyle}><input id={`cell-${index}-0`} readOnly value={row.code} onKeyDown={(e) => handleKeyDown(e, index, 0)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                
                                <td style={tdStyle}>
                                    <input className="hide-on-paper" id={`cell-${index}-1`} readOnly value={row.name} onKeyDown={(e) => handleKeyDown(e, index, 1)} onFocus={() => setActiveRow(index)} style={{ ...gridInputStyle, textAlign: 'left', paddingLeft: '10px' }} />
                                    <div className="show-on-paper-only" style={{ padding: '4px 10px', fontSize: '11pt' }}>
                                        {row.name}
                                    </div>
                                </td>

                                <td style={tdStyle}><input id={`cell-${index}-2`} readOnly value={row.salePrice} onKeyDown={(e) => handleKeyDown(e, index, 2)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-3`} readOnly value={row.qty} onKeyDown={(e) => handleKeyDown(e, index, 3)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-4`} readOnly value={row.sTax} onKeyDown={(e) => handleKeyDown(e, index, 4)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-5`} readOnly value={row.disc} onKeyDown={(e) => handleKeyDown(e, index, 5)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={{ ...tdStyle, color: '#ffea00', fontWeight: 'bold', textAlign: 'right', paddingRight: '15px', fontSize: '16px' }}>
                                    {row.itemTotal > 0 ? row.itemTotal.toFixed(2) : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="print-totals">
                <span>TOTAL ITEMS: {totalItems}</span><span>NET INVOICE TOTAL: {grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}</span>
            </div>

            <div className="no-print" style={{ backgroundColor: '#6c4bf5', display: 'flex', alignItems: 'center', padding: '6px 20px', gap: '15px', border: '1px solid #4b2cc5', boxSizing: 'border-box' }}>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', minWidth: '70px', borderRight: '1px solid #9c27b0', paddingRight: '10px' }}>Items : {totalItems}</div>
                
                <div style={{ color: '#ffea00', fontWeight: 'bold', fontSize: '24px', marginLeft: 'auto' }}>{grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}</div>
            </div>

            <div className="no-print" style={{ backgroundColor: '#d9d9d9', padding: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={handlePrint} style={buttonStyle}><strong style={{color:'#3b82f6'}}>F4</strong> <FaPrint size={16} color="#444" /> Print Invoice</button>
                <button onClick={handleEditReturn} style={buttonStyle}><strong style={{color:'#3b82f6'}}>F10</strong> <FaEdit size={16} color="#0066cc" /> Edit / Return</button>
                <button onClick={handlePostMissed} style={buttonStyle}><FaClipboardCheck size={16} color="#d97300" /> Post Missed</button>
                <button onClick={handleExportExcel} style={buttonStyle}><strong style={{color:'#16a34a'}}>F2</strong> <FaFileExcel size={16} color="#107c41" /> Export to Excel</button>
                <button onClick={handleClose} style={{ ...buttonStyle, marginLeft: 'auto', color: '#cc0000' }}><strong style={{color:'#cc0000'}}>Esc</strong> <FaTimesCircle size={16} color="#cc0000" /> Close</button>
            </div>
        </div>
    );
}

const leftLabelStyle = { color: '#66d9ff', fontSize: '13px', fontWeight: 'bold', width: '70px', textShadow: '1px 1px 1px #333' };
const leftInputStyle = { padding: '3px', backgroundColor: '#4ae1e1', border: '1px solid #228888', outline: 'none', fontWeight: 'bold', fontSize: '13px', color: '#000' };
const rightLabelStyle = { backgroundColor: '#8b4a4a', color: '#ffcc00', fontWeight: 'bold', width: '80px', padding: '4px', border: '1px solid #5a3030', fontSize: '13px', textAlign: 'left', paddingLeft: '8px' };
const rightLabelTimeStyle = { ...rightLabelStyle, color: '#4dff4d' };
const rightInputStyle = { width: '100%', padding: '4px', backgroundColor: '#6b3030', color: '#fff', border: '1px solid #5a3030', outline: 'none', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' };
const thStyle = { padding: '8px', borderRight: '1px solid #444', borderLeft: '1px solid #444', fontSize: '13px' };
const tdStyle = { border: '1px solid #d90066', padding: '0' }; 
const gridInputStyle = { width: '100%', padding: '6px', boxSizing: 'border-box', backgroundColor: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' };
const buttonStyle = { padding: '6px 16px', backgroundColor: '#f0f0f0', border: '1px solid #aaa', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', color: '#333', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' };

export default InvoiceView;