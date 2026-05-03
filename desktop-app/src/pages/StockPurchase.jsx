import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaPrint, FaFileInvoiceDollar, FaEraser, FaTimesCircle, FaUndo, FaFileExcel, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const initialRowsTemplate = Array.from({ length: 15 }, (_, index) => ({
    id: index, code: '', name: '', batch: '', cmp: '', retail: '', cpDisc: '', tp: '', qty: '', bon: '', sTax: '', disc: '', sPrice: '', itemTotal: 0
}));

function StockPurchase() {

    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeRow, setActiveRow] = useState(0); 
    const [rows, setRows] = useState(initialRowsTemplate);

    const [headerData, setHeaderData] = useState({
        supplierCode: '',
        supplierName: '',
        address: '',
        cardNo: '',
        paidAmount: ''
    });

    // --- TOAST NOTIFICATION STATE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // --- SUPPLIER DATABASE STATE & DROPDOWN ---
    const [dbSuppliers, setDbSuppliers] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/suppliers/');
                setDbSuppliers(response.data);
            } catch (error) {
                console.error("Error fetching suppliers:", error);
            }
        };
        fetchSuppliers();
    }, []);

    const filteredSuppliers = dbSuppliers.filter(s => 
        s.name.toLowerCase().includes(headerData.supplierName.toLowerCase()) || 
        s.code.toLowerCase().includes(headerData.supplierName.toLowerCase())
    );

    const handleSelectSupplier = (supplier) => {
        setHeaderData({
            ...headerData,
            supplierCode: supplier.code,
            supplierName: supplier.name,
            address: supplier.address || ''
        });
        setShowSupplierDropdown(false);
        setFocusedIndex(-1); 
        document.getElementById('input-card-no').focus();
    };

    const handleSupplierKeyDown = (e) => {
        if (!showSupplierDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev < filteredSuppliers.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0)); 
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && filteredSuppliers[focusedIndex]) {
                handleSelectSupplier(filteredSuppliers[focusedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSupplierDropdown(false);
            setFocusedIndex(-1);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const totalItems = rows.filter(row => row.code !== '' || row.name !== '').length;
    const grandTotal = rows.reduce((sum, row) => sum + (parseFloat(row.itemTotal) || 0), 0);

    // --- LIVE DATABASE SAVE ---
    const executePurchaseSave = async (shouldPrint) => {
        // 🚀 CHANGED: Removed the strict check for supplierName!
        if (!headerData.cardNo) {
            showToast("Card # is required!", "error");
            return;
        }

        const validItems = rows.filter(row => row.code.trim() !== '' || row.name.trim() !== '');
        if (validItems.length === 0) {
            showToast("Cannot save an empty invoice.", "error");
            return;
        }

        const safeGrandTotal = parseFloat(grandTotal.toString().replace(/,/g, '')) || 0;

        const payload = {
            supplier_code: headerData.supplierCode || '',
            // 🚀 CHANGED: If supplierName is completely blank, it defaults to Walk-in
            supplier_name: headerData.supplierName || 'Walk-in / Direct',
            address: headerData.address || '',
            invoice_no: headerData.cardNo,
            date: formattedDate,
            grand_total: safeGrandTotal,
            paid_amount: parseFloat(headerData.paidAmount) || 0,
            items: validItems.map(item => ({
                code: item.code,
                name: item.name,
                batch: item.batch || '',
                cmp: parseFloat(item.cmp) || 0,
                retail: parseFloat(item.retail) || 0,
                cp_disc: parseFloat(item.cpDisc) || 0,
                tp: parseFloat(item.tp) || 0,
                qty: parseInt(item.qty) || 0,
                bonus: parseInt(item.bon) || 0,
                s_tax: parseFloat(item.sTax) || 0,
                discount: parseFloat(item.disc) || 0,
                sale_price: parseFloat(item.sPrice) || 0,
                item_total: parseFloat(item.itemTotal) || 0
            }))
        };

        try {
            await axios.post('http://127.0.0.1:8000/api/purchases/', payload);
            if (shouldPrint) {
                window.print();
            } else {
                showToast("Purchase Invoice saved successfully!", "success");
            }
            handleNewBill(true); 
        } catch (error) {
            console.error("Error saving purchase invoice:", error);
            showToast("Database Error! Check console.", "error");
        }
    };

    // --- ACTIONS ---
    const handleSaveAndPrint = () => executePurchaseSave(true);
    const handleSaveOnly = () => executePurchaseSave(false);
    
    const handleUndo = () => {
        setRows(prevRows => {
            const newRows = [...prevRows];
            newRows[activeRow] = { ...initialRowsTemplate[0], id: prevRows[activeRow].id };
            return newRows;
        });
        showToast("Undo: Row cleared.", "info");
        const codeInput = document.getElementById(`cell-${activeRow}-0`);
        if (codeInput) codeInput.focus();
    };

    const handleDeleteRow = () => {
        if(window.confirm(`Delete data in row ${activeRow + 1}?`)) {
            handleUndo();
        }
    };

    const handleNewBill = (forceClear = false) => {
        setRows(initialRowsTemplate.map(row => ({...row})));
        setHeaderData({ supplierCode: '', supplierName: '', address: '', cardNo: '', paidAmount: '' });
        setActiveRow(0);
        if(!forceClear) {
            showToast("New Stock Purchase bill initiated. Screen cleared.", "success");
        }
    };

    const handleExportExcel = () => {
        const validItems = rows.filter(row => row.code.trim() !== '' || row.name.trim() !== '');
        if (validItems.length === 0) {
            showToast("No data to export!", "error");
            return;
        }

        const headers = "Code,Item Name,Batch,CMP,Retail,CP Disc,TP,Qty,Bon,S.Tax,Disc,S.Price,Item Total";
        const csvRows = validItems.map(row => {
            return `"${row.code}","${row.name}","${row.batch}","${row.cmp}","${row.retail}","${row.cpDisc}","${row.tp}","${row.qty}","${row.bon}","${row.sTax}","${row.disc}","${row.sPrice}","${row.itemTotal}"`;
        }).join('\n');

        const csvContent = headers + '\n' + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Stock_Purchase_${formattedDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Exported to Excel successfully!", "success");
    };

    const handleClose = () => navigate('/');
    const handleSaleInvoiceJump = () => navigate('/sale');

    // --- MATH ENGINE ---
    const handleCellChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };

        const row = updatedRows[index];
        const retail = parseFloat(row.retail) || 0;
        const cpDisc = parseFloat(row.cpDisc) || 0;
        let tp = parseFloat(row.tp) || 0;
        const qty = parseFloat(row.qty) || 0;
        const sTax = parseFloat(row.sTax) || 0;
        const disc = parseFloat(row.disc) || 0;

        if (field === 'retail' || field === 'cpDisc') {
            tp = retail - (retail * (cpDisc / 100));
            updatedRows[index].tp = tp > 0 ? tp.toFixed(2) : '';
            updatedRows[index].sPrice = retail > 0 ? retail.toFixed(2) : ''; 
        }

        if (['retail', 'cpDisc', 'tp', 'qty', 'sTax', 'disc'].includes(field)) {
            const activeTp = field === 'tp' ? (parseFloat(value) || 0) : tp; 
            let baseTotal = activeTp * qty;
            let discountAmount = baseTotal * (disc / 100);
            let finalTotal = (baseTotal - discountAmount) + sTax;
            updatedRows[index].itemTotal = finalTotal;
        }

        setRows(updatedRows);
    };

    const handleKeyDown = (e, rowIndex, colIndex) => {
        let nextRow = rowIndex; let nextCol = colIndex; let shouldMove = false;
        if (e.key === 'ArrowUp') { nextRow = rowIndex - 1; shouldMove = true; }
        else if (e.key === 'ArrowDown') { nextRow = rowIndex + 1; shouldMove = true; }
        else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { nextCol = colIndex - 1; shouldMove = true; }
        else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.toString().length) { nextCol = colIndex + 1; shouldMove = true; }
        else if (e.key === 'Enter') {
            if (colIndex < 11) { nextCol = colIndex + 1; } 
            else {
                nextCol = 0; nextRow = rowIndex + 1;
                if (rowIndex === rows.length - 1) {
                    setRows(prev => [...prev, { id: Date.now(), code: '', name: '', batch: '', cmp: '', retail: '', cpDisc: '', tp: '', qty: '', bon: '', sTax: '', disc: '', sPrice: '', itemTotal: 0 }]);
                }
            }
            shouldMove = true;
        }
        if (shouldMove) {
            e.preventDefault();
            setActiveRow(nextRow);
            const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
            if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 0); }
        }
    };

    useEffect(() => {
        const handleFKeys = (e) => {
            if (['F4', 'F5', 'F8', 'F9', 'F10', 'F12', 'Escape'].includes(e.key)) {
                e.preventDefault();
                if (document.activeElement && document.activeElement.tagName !== 'INPUT') document.activeElement.blur();
            }
            switch(e.key) {
                case 'F4': handleSaveAndPrint(); break;
                case 'F5': handleSaveOnly(); break;
                case 'F8': handleExportExcel(); break; 
                case 'F9': handleDeleteRow(); break;
                case 'F10': handleUndo(); break; 
                case 'F12': handleNewBill(); break; 
                case 'Escape': 
                    if(!showSupplierDropdown) handleClose(); 
                    break;
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, [activeRow, rows, headerData, showSupplierDropdown]);

    return (
        <div className="purchase-container" style={{ backgroundColor: '#3b3b9f', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', minWidth: '1000px', position: 'relative' }}>
            
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

            <style>
                {`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    * { background: transparent !important; color: #000 !important; box-shadow: none !important; text-shadow: none !important; border-color: #000 !important; }
                    .hide-on-paper { display: none !important; }
                    body, html, .purchase-container, .grid-container { height: auto !important; overflow: visible !important; background-color: white !important; }
                    .print-header { display: flex !important; justify-content: space-between !important; border: none !important; padding: 0 !important; margin-bottom: 20px !important; height: auto !important; }
                    table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; }
                    th { border: 1px solid black !important; font-size: 10pt !important; padding: 6px !important; background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                    td { border: 1px solid black !important; padding: 2px 4px !important; }
                    input { border: none !important; font-size: 10pt !important; width: 100% !important; padding: 0 !important; }
                    .print-footer-container { display: flex !important; justify-content: flex-end !important; padding: 10px 0 0 0 !important; border: none !important; height: auto !important; }
                }
                `}
            </style>

            <div className="print-header" style={{ position: 'relative', padding: '10px', height: '110px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', boxSizing: 'border-box' }}>
                
                <div style={{ display: 'flex', gap: '6px', height: '100%' }}>
                    <div style={{ backgroundColor: '#8a4444', width: '420px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #333', boxSizing: 'border-box', zIndex: 50 }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                            <span style={paleGreenLabel}>Supplier:</span>
                            <div style={{ display: 'flex', flex: 1, gap: '4px', height: '100%' }}>
                                <input className="hide-on-paper" readOnly type="text" value={headerData.supplierCode} placeholder="ID" style={{ width: '60px', ...paleCyanInput, cursor: 'not-allowed', backgroundColor: '#aaffff' }} />
                                
                                <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                                    <input 
                                        type="text" 
                                        value={headerData.supplierName} 
                                        onChange={(e) => {
                                            setHeaderData({...headerData, supplierName: e.target.value});
                                            setShowSupplierDropdown(true);
                                            setFocusedIndex(-1); 
                                        }} 
                                        onFocus={() => setShowSupplierDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                        onKeyDown={handleSupplierKeyDown} 
                                        placeholder="Search by Name or Code..." 
                                        style={{ flex: 1, minWidth: 0, ...paleCyanInput }} 
                                    />
                                    {/* 🚀 CHANGED: Now it always shows when focused, even if empty */}
                                    {showSupplierDropdown && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '2px solid #333', zIndex: 100, maxHeight: '150px', overflowY: 'auto', boxShadow: '0px 4px 8px rgba(0,0,0,0.5)' }}>
                                            
                                            {/* 🚀 NEW: THE WALK-IN OPTION BUTTON */}
                                            <div 
                                                onClick={() => {
                                                    setHeaderData({...headerData, supplierCode: '', supplierName: 'Walk-in / Direct', address: ''});
                                                    setShowSupplierDropdown(false);
                                                    document.getElementById('input-card-no').focus();
                                                }}
                                                style={{ padding: '8px', cursor: 'pointer', borderBottom: '2px solid #000', backgroundColor: '#e6ffe6', color: '#006600', fontSize: '13px', fontWeight: 'bold' }}
                                            >
                                                -- Walk-in / Direct Purchase --
                                            </div>

                                            {filteredSuppliers.length > 0 ? filteredSuppliers.map((s, index) => (
                                                <div 
                                                    key={s.code} 
                                                    onClick={() => handleSelectSupplier(s)}
                                                    onMouseEnter={() => setFocusedIndex(index)}
                                                    style={{ 
                                                        padding: '6px 8px', 
                                                        cursor: 'pointer', 
                                                        borderBottom: '1px solid #eee', 
                                                        color: '#000', 
                                                        fontSize: '13px', 
                                                        fontWeight: 'bold',
                                                        backgroundColor: focusedIndex === index ? '#aaffff' : '#fff' 
                                                    }}
                                                >
                                                    <span style={{ color: '#0d9488' }}>{s.code}</span> - {s.name}
                                                </div>
                                            )) : (
                                                <div style={{ padding: '6px 8px', color: '#888', fontSize: '12px', fontStyle: 'italic' }}>No matches found...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                            <span style={paleGreenLabel}>Address:</span>
                            <input type="text" readOnly value={headerData.address} style={{ flex: 1, minWidth: 0, height: '24px', ...paleCyanInput, backgroundColor: '#aaffff' }} />
                        </div>
                        <div className="hide-on-paper" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                            <span style={paleGreenLabel}>Status:</span>
                            <div style={{ display: 'flex', flex: 1, gap: '4px', height: '100%' }}>
                                <div style={{ flex: 1, backgroundColor: '#4d1a1a', color: '#00ff00', fontWeight: 'bold', fontSize: '13px', paddingLeft: '8px', display: 'flex', alignItems: 'center' }}>SAVED</div>
                                <div style={{ width: '40px', backgroundColor: '#4d1a1a', color: '#fff', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>0</div>
                            </div>
                        </div>
                    </div>

                    <div className="hide-on-paper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '85px', height: '100%' }}>
                        <button style={{...graySquareBtn, flex: 1}}>Report</button>
                        <button style={{...graySquareBtn, flex: 1}}>Account</button>
                    </div>
                </div>

                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ backgroundColor: '#000', padding: '4px 50px', color: '#ffff00', fontWeight: 'bold', fontSize: '22px', border: '2px solid #ffff00' }}>
                        STOCK PURCHASE
                    </div>
                    <label className="hide-on-paper" style={{ color: '#00ffff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                        <input type="checkbox" style={{ margin: 0, transform: 'scale(1.2)' }} /> Return Stock
                    </label>
                </div>

                <div style={{ backgroundColor: '#8a4444', width: '290px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #333', boxSizing: 'border-box', height: '100%' }}>
                    <div style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Card #:</span>
                        <input id="input-card-no" type="text" value={headerData.cardNo} onChange={(e) => setHeaderData({...headerData, cardNo: e.target.value})} style={{ ...redInputRight, color: '#00ffff' }} />
                    </div>
                    <div style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Date:</span>
                        <input type="text" readOnly value={formattedDate} style={{ ...redInputRight, color: '#fff' }} />
                    </div>
                    <div className="hide-on-paper" style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Edit Card #</span>
                        <div style={{ display: 'flex', flex: 1, minWidth: 0, gap: '2px', height: '100%' }}>
                            <input type="text" style={{ flex: 1, minWidth: 0, ...redInputRight }} />
                            <button style={{ width: '50px', backgroundColor: '#ff3300', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', height: '100%' }}>End</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-container" style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#ff1a1a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#000', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={thStyle}>Code</th>
                            <th style={{ ...thStyle, textAlign: 'left', width: '220px' }}>Item Name</th>
                            <th style={thStyle}>Batch</th>
                            <th style={thStyle}>CMP</th>
                            <th style={thStyle}>Retail</th>
                            <th style={thStyle}>CP Disc</th>
                            <th style={thStyle}>TP</th>
                            <th style={thStyle}>Qty</th>
                            <th style={thStyle}>Bon</th>
                            <th style={thStyle}>S.Tax</th>
                            <th style={thStyle}>Disc</th>
                            <th style={thStyle}>S.Price</th>
                            <th style={thStyle}>Item Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr 
                                key={row.id}
                                onClick={() => setActiveRow(index)} 
                                style={{ 
                                    backgroundColor: activeRow === index ? '#cc0000' : 'transparent',
                                    cursor: 'pointer' 
                                }}
                            >
                                <td style={tdStyle}><input id={`cell-${index}-0`} type="text" value={row.code} onChange={(e) => handleCellChange(index, 'code', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 0)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-1`} type="text" value={row.name} onChange={(e) => handleCellChange(index, 'name', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 1)} onFocus={() => setActiveRow(index)} style={{ ...gridInputStyle, textAlign: 'left' }} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-2`} type="text" value={row.batch} onChange={(e) => handleCellChange(index, 'batch', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 2)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-3`} type="text" value={row.cmp} onChange={(e) => handleCellChange(index, 'cmp', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 3)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-4`} type="text" value={row.retail} onChange={(e) => handleCellChange(index, 'retail', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 4)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-5`} type="text" value={row.cpDisc} onChange={(e) => handleCellChange(index, 'cpDisc', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 5)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-6`} type="text" value={row.tp} onChange={(e) => handleCellChange(index, 'tp', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 6)} onFocus={() => setActiveRow(index)} style={{ ...gridInputStyle, color: '#ffff00' }} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-7`} type="text" value={row.qty} onChange={(e) => handleCellChange(index, 'qty', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 7)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-8`} type="text" value={row.bon} onChange={(e) => handleCellChange(index, 'bon', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 8)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-9`} type="text" value={row.sTax} onChange={(e) => handleCellChange(index, 'sTax', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 9)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-10`} type="text" value={row.disc} onChange={(e) => handleCellChange(index, 'disc', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 10)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-11`} type="text" value={row.sPrice} onChange={(e) => handleCellChange(index, 'sPrice', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 11)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={{ ...tdStyle, color: '#fff', fontWeight: 'bold', textAlign: 'right', paddingRight: '5px', fontSize: '14px' }}>
                                    {row.itemTotal > 0 ? row.itemTotal.toFixed(2) : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="print-footer-container" style={{ display: 'flex', padding: '6px 10px', gap: '8px', alignItems: 'stretch', height: '80px', boxSizing: 'border-box' }}>
                <div className="hide-on-paper" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', border: '2px solid #00ff00', padding: '4px', height: '42px', boxSizing: 'border-box' }}>
                        <button onClick={handleSaveOnly} style={actionBtnStyle}><FaSave size={14} color="#888" /> Save</button>
                        <button onClick={handleUndo} style={{...actionBtnStyle, color: '#aaa'}}><FaUndo size={14} color="#aaa" /> Undo Row</button>
                        <button onClick={handleSaveAndPrint} style={actionBtnStyle}><FaPrint size={14} color="#555" /> Print</button>
                        <button onClick={handleExportExcel} style={actionBtnStyle}><FaFileExcel size={14} color="#10b981" /> Excel</button>
                        <button onClick={handleSaleInvoiceJump} style={actionBtnStyle}><FaFileInvoiceDollar size={14} color="#a64dff" /> Sale Inv</button>
                        <button onClick={handleNewBill} style={actionBtnStyle}><FaEraser size={14} color="#e6b800" /> Clear</button>
                        <button onClick={handleClose} style={actionBtnStyle}><FaTimesCircle size={14} color="#cc0000" /> Close</button>
                    </div>

                    <div style={{ backgroundColor: '#7a1fa2', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '15px', border: '1px solid #5a1082', height: '22px', boxSizing: 'border-box' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '11px', minWidth: '70px', borderRight: '1px solid #9c27b0', paddingRight: '10px' }}>Items : {totalItems}</span>
                        <div style={{ display: 'flex', gap: '12px', color: '#00ffff', fontSize: '11px', fontWeight: 'bold' }}>
                            <span><span style={{ color: '#00ff00' }}>F8</span> Export</span>
                            <span><span style={{ color: '#00ff00' }}>F10</span> Undo Row</span>
                            <span><span style={{ color: '#00ff00' }}>F4</span> Save / Print</span>
                            <span><span style={{ color: '#00ff00' }}>F5</span> Save</span>
                            <span><span style={{ color: '#00ff00' }}>F9</span> Delete Row</span>
                            <span><span style={{ color: '#00ff00' }}>F12</span> New</span>
                            <span><span style={{ color: '#00ff00' }}>Esc</span> Close</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', backgroundColor: '#7a1fa2', padding: '8px 12px', width: '230px', border: '1px solid #d4a5ea', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>TOTAL:</span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '22px', textShadow: '1px 1px 2px #000' }}>{grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="hide-on-paper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '13px' }}>Paid:</span>
                        <input type="number" value={headerData.paidAmount} onChange={(e) => setHeaderData({...headerData, paidAmount: e.target.value})} placeholder="Payments" style={{ width: '120px', padding: '2px 4px', textAlign: 'right', border: 'none', outline: 'none', fontSize: '13px' }} />
                    </div>
                </div>
            </div>

        </div>
    );
}

const paleGreenLabel = { color: '#99ff99', fontSize: '13px', fontWeight: 'bold', width: '75px', whiteSpace: 'nowrap' }; 
const paleCyanInput = { height: '100%', padding: '0 6px', backgroundColor: '#ccffff', border: '1px solid #82a8a8', outline: 'none', color: '#000', fontWeight: 'bold', fontSize: '13px', boxSizing: 'border-box' }; 
const graySquareBtn = { backgroundColor: '#e6e6ff', border: '1px solid #777', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#000', padding: '0' };

const blueLabelRight = { backgroundColor: '#4d4dff', color: '#00ffff', fontWeight: 'bold', width: '90px', paddingLeft: '6px', display: 'flex', alignItems: 'center', border: '1px solid #333', fontSize: '13px', height: '100%', boxSizing: 'border-box', whiteSpace: 'nowrap' }; 
const redInputRight = { flex: 1, minWidth: 0, backgroundColor: '#800000', border: '1px solid #4a0000', outline: 'none', fontWeight: 'bold', textAlign: 'center', fontSize: '14px', height: '100%', boxSizing: 'border-box' };

const thStyle = { padding: '6px', borderRight: '1px solid #333', borderLeft: '1px solid #333', fontSize: '13px', textAlign: 'center' };
const tdStyle = { border: '1px solid #cc0000', padding: '0' }; 
const gridInputStyle = { width: '100%', padding: '6px', box: 'border-box', backgroundColor: 'transparent', color: '#000', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' };

const actionBtnStyle = { flexGrow: 1, backgroundColor: '#f2f2f2', border: '1px solid #aaa', cursor: 'pointer', fontWeight: 'bold', color: '#333', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '100%', boxSizing: 'border-box' };

export default StockPurchase;