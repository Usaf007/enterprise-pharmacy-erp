import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaPrint, FaUserPlus, FaEraser, FaTimesCircle, FaUndo, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const initialRowsTemplate = Array.from({ length: 15 }, (_, index) => ({
    id: index, code: '', name: '', batch: '', tp: 0, salePrice: '', qty: '', sTax: '', disc: '', cpDisc: 0, itemTotal: 0, profit: 0
}));

function SaleInvoice() {

    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [rows, setRows] = useState(initialRowsTemplate);
    const [activeRow, setActiveRow] = useState(0);

    // --- 🚀 TOAST NOTIFICATION STATE 🚀 ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
    };

    // --- LIVE DATABASES ---
    const [dbCustomers, setDbCustomers] = useState([]);
    const [dbInventory, setDbInventory] = useState([]); 

    // --- ITEM SUGGESTIONS STATE ---
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const [dropdownCell, setDropdownCell] = useState({ row: null, col: null });

    // --- CUSTOMER HEADER STATE ---
    const [headerData, setHeaderData] = useState({
        customerCode: '',
        customerName: '',
        address: '',
        salesman: 'GENERAL SALE',
        paidAmount: ''
    });
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [focusedCustomerIndex, setFocusedCustomerIndex] = useState(-1);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const custRes = await axios.get('http://127.0.0.1:8000/api/customers/');
                setDbCustomers(custRes.data);
                
                const itemRes = await axios.get('http://127.0.0.1:8000/api/items/');
                setDbInventory(itemRes.data);
            } catch (error) {
                console.error("Error fetching master databases:", error);
            }
        };
        fetchMasterData();
    }, []);

    const filteredCustomers = dbCustomers.filter(c => 
        (c.name && c.name.toLowerCase().includes(headerData.customerName.toLowerCase())) || 
        (c.code && c.code.toLowerCase().includes(headerData.customerName.toLowerCase())) ||
        (c.phone && c.phone.includes(headerData.customerName))
    );

    const handleSelectCustomer = (customer) => {
        setHeaderData({
            ...headerData,
            customerCode: customer.code,
            customerName: customer.name,
            address: customer.address || ''
        });
        setShowCustomerDropdown(false);
        setFocusedCustomerIndex(-1);
        const firstGridCell = document.getElementById('cell-0-0');
        if (firstGridCell) firstGridCell.focus();
    };

    const handleCustomerKeyDown = (e) => {
        if (!showCustomerDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedCustomerIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedCustomerIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedCustomerIndex >= 0 && filteredCustomers[focusedCustomerIndex]) {
                handleSelectCustomer(filteredCustomers[focusedCustomerIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowCustomerDropdown(false);
            setFocusedCustomerIndex(-1);
        }
    };

    const handleUndo = () => {
        setRows(prevRows => {
            const newRows = [...prevRows];
            newRows[activeRow] = { 
                id: prevRows[activeRow].id, code: '', name: '', batch: '', 
                tp: 0, salePrice: '', qty: '', sTax: '', disc: '', cpDisc: 0, itemTotal: 0, profit: 0 
            };
            return newRows;
        });
        showToast("Undo: Row changes cleared.", "info");
        const codeInput = document.getElementById(`cell-${activeRow}-0`);
        if (codeInput) codeInput.focus();
    };
    
    const executeSaleSave = async (shouldPrint) => {
        const validItems = rows.filter(row => row.code.trim() !== '' || row.name.trim() !== '');
        if (validItems.length === 0) {
            showToast("Cannot save an empty invoice.", "error");
            return;
        }

        const safeGrandTotal = parseFloat(grandTotal.toString().replace(/,/g, '')) || 0;

        const payload = {
            customer_code: headerData.customerCode,
            customer_name: headerData.customerName || 'Cash Customer', 
            address: headerData.address,
            salesman: headerData.salesman,
            date: formattedDate,
            time: formattedTime,
            net_total: safeGrandTotal,
            profit: parseFloat(totalProfit).toFixed(2),
            paid_amount: parseFloat(headerData.paidAmount) || 0,
            items: validItems.map(item => ({
                code: item.code,
                name: item.name,
                batch: item.batch,
                tp: parseFloat(item.tp) || 0, 
                sale_price: parseFloat(item.salePrice) || 0,
                qty: parseInt(item.qty) || 0,
                s_tax: parseFloat(item.sTax) || 0,
                discount: parseFloat(item.disc) || 0,
                item_total: parseFloat(item.itemTotal) || 0,
                profit: parseFloat(item.profit).toFixed(2) || 0
            }))
        };

        try {
            await axios.post('http://127.0.0.1:8000/api/sales/', payload);
            
            if (shouldPrint) {
                window.print();
            } else {
                showToast("Sale Invoice Saved & Accounting Updated!", "success");
            }
            
            const itemRes = await axios.get('http://127.0.0.1:8000/api/items/');
            setDbInventory(itemRes.data);

            handleNewBill(true); 
        } catch (error) {
            console.error("Error saving sale invoice:", error);
            showToast("Database Error! Check console.", "error");
        }
    };

    const handleSaveAndPrint = () => executeSaleSave(true);
    const handleSaveOnly = () => executeSaleSave(false);
    
    const handleDeleteRow = () => {
        if(window.confirm(`Delete data in row ${activeRow + 1}?`)) {
            handleUndo();
        }
    };
    
    const handleNewBill = (forceClear = false) => {
        setRows(initialRowsTemplate.map(row => ({...row})));
        setHeaderData({ customerCode: '', customerName: '', address: '', salesman: 'GENERAL SALE', paidAmount: '' });
        setActiveRow(0);
        
        if(!forceClear) {
            showToast("New bill initiated. Screen cleared.", "success");
        }
    };

    const handleClose = () => {
        navigate('/');
    }
    const handleAddCustomer = () => alert("Opening Customer Registration Panel...");

    useEffect(() => {
        const handleFKeys = (e) => {
            if (['F4', 'F5', 'F9', 'F10', 'F12', 'Escape'].includes(e.key)) {
                e.preventDefault();
                if (document.activeElement && document.activeElement.tagName !== 'INPUT') document.activeElement.blur();
            }
            switch(e.key) {
                case 'F10': handleUndo(); break;
                case 'F4': handleSaveAndPrint(); break;
                case 'F5': handleSaveOnly(); break;
                case 'F9': handleDeleteRow(); break;
                case 'F12': handleNewBill(); break;
                case 'Escape': 
                    if(!showCustomerDropdown && suggestions.length === 0) handleClose(); 
                    break;
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, [activeRow, rows, headerData, showCustomerDropdown, suggestions]); 

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: true });

    const applySuggestion = (rowIndex, item) => {
        const updatedRows = [...rows];
        
        const dbSalePrice = item.retail || item.sale_price || 0;
        const dbCompanyDisc = item.cp_disc || item.cpDisc || item.company_discount || 0;
        const dbTradePrice = item.tp || 0;

        updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            code: item.code,
            name: item.name,
            batch: item.batch || '',
            tp: dbTradePrice, 
            salePrice: dbSalePrice, 
            cpDisc: dbCompanyDisc, 
            qty: 1,
            itemTotal: dbSalePrice * 1,
            profit: (dbSalePrice - dbTradePrice) * 1
        };
        setRows(updatedRows);
        setSuggestions([]);
        setDropdownCell({ row: null, col: null });
        
        setTimeout(() => {
            const qtyInput = document.getElementById(`cell-${rowIndex}-4`);
            if(qtyInput) { qtyInput.focus(); qtyInput.select(); }
        }, 10);
    };

    const handleCellChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };

        const salePrice = parseFloat(updatedRows[index].salePrice) || 0;
        const tp = parseFloat(updatedRows[index].tp) || 0; 
        const qty = parseFloat(updatedRows[index].qty) || 0;
        const sTax = parseFloat(updatedRows[index].sTax) || 0;
        const disc = parseFloat(updatedRows[index].disc) || 0;

        if (['salePrice', 'qty', 'sTax', 'disc'].includes(field)) {
            let baseTotal = salePrice * qty;
            let discountAmount = baseTotal * (disc / 100);
            let finalTotal = (baseTotal - discountAmount) + sTax;
            updatedRows[index].itemTotal = finalTotal;

            let costTotal = tp * qty;
            updatedRows[index].profit = finalTotal > 0 ? (finalTotal - costTotal) : 0;
        }
        setRows(updatedRows);

        if (field === 'name' || field === 'code') {
            if (value.trim().length > 0) {
                const filtered = dbInventory.filter(item => 
                    (item[field] && item[field].toLowerCase().includes(value.toLowerCase()))
                );
                setSuggestions(filtered);
                setDropdownCell({ row: index, col: field });
                setSuggestionIndex(-1);
            } else {
                setSuggestions([]);
                setDropdownCell({ row: null, col: null });
            }
        }
    };

    const handleKeyDown = (e, rowIndex, colIndex) => {
        if (dropdownCell.row === rowIndex && suggestions.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1)); return; }
            if (e.key === 'Enter' && suggestionIndex >= 0) { e.preventDefault(); applySuggestion(rowIndex, suggestions[suggestionIndex]); return; }
        }

        let nextRow = rowIndex; let nextCol = colIndex; let shouldMove = false;
        
        if (e.key === 'ArrowUp') { nextRow = rowIndex - 1; shouldMove = true; }
        else if (e.key === 'ArrowDown') { nextRow = rowIndex + 1; shouldMove = true; }
        else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { nextCol = colIndex - 1; shouldMove = true; }
        else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.toString().length) { nextCol = colIndex + 1; shouldMove = true; }
        else if (e.key === 'Enter') {
            setSuggestions([]); setDropdownCell({row: null, col: null});
            
            if (colIndex < 6) { nextCol = colIndex + 1; }  
            else {
                nextCol = 0; nextRow = rowIndex + 1;
                if (rowIndex === rows.length - 1) {
                    setRows(prev => [...prev, { id: Date.now(), code: '', name: '', batch: '', tp: 0, salePrice: '', qty: '', sTax: '', disc: '', cpDisc: 0, itemTotal: 0, profit: 0 }]);
                }
            }
            shouldMove = true;
        }

        if (shouldMove) {
            e.preventDefault();
            setActiveRow(nextRow);
            setSuggestions([]);
            setDropdownCell({row: null, col: null});
            const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
            if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 0); }
        }
    };

    const totalItems = rows.filter(row => row.code !== '' || row.name !== '').length;
    const grandTotal = rows.reduce((sum, row) => sum + (parseFloat(row.itemTotal) || 0), 0);
    const totalProfit = rows.reduce((sum, row) => sum + (parseFloat(row.profit) || 0), 0);

    // 🚀 STEALTH BOX DATA CAPTURE 🚀
    const currentActiveItem = rows[activeRow] || {};
    const activeItemCompanyDiscount = parseFloat(currentActiveItem.cpDisc) || 0; 
    const activeItemProfit = parseFloat(currentActiveItem.profit) || 0;

    return (
        <div className="invoice-container" style={{ backgroundColor: '#452b45', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', minWidth: '1000px', position: 'relative' }}>
            
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
                    @page { size: A4; margin: 10mm; }
                    * { background: transparent !important; color: #000 !important; box-shadow: none !important; text-shadow: none !important; border-color: #000 !important; }
                    .hide-on-paper { display: none !important; }
                    body, html, .invoice-container, .grid-container { height: auto !important; overflow: visible !important; background-color: white !important; min-width: 0 !important; }
                    .print-header { display: flex !important; justify-content: space-between !important; border: none !important; padding: 0 !important; margin-bottom: 20px !important; height: auto !important; }
                    .print-header-box { border: none !important; padding: 0 !important; width: auto !important; }
                    .print-title-container { position: static !important; transform: none !important; text-align: center !important; }
                    .print-title { font-size: 28pt !important; border: none !important; padding: 0 !important; font-weight: bold !important; text-decoration: underline !important; letter-spacing: 2px !important; }
                    table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; }
                    th { border: 1px solid black !important; font-size: 11pt !important; padding: 8px !important; background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                    td { border: 1px solid black !important; padding: 4px 8px !important; }
                    input { border: none !important; font-size: 11pt !important; width: 100% !important; padding: 0 !important; }
                    .print-footer-container { display: flex !important; justify-content: flex-end !important; padding: 10px 0 0 0 !important; border: none !important; height: auto !important; }
                    .print-total-box { width: 300px !important; border: 2px solid black !important; padding: 10px !important; flex-direction: column !important; justify-content: flex-start !important; }
                }
                `}
            </style>

            <div className="print-header" style={{ position: 'relative', padding: '10px', height: '110px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', boxSizing: 'border-box' }}>
                <div className="print-header-box" style={{ backgroundColor: '#8a4444', width: '420px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #333', boxSizing: 'border-box', height: '100%', zIndex: 50 }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                        <span style={paleGreenLabel}>Customer:</span>
                        <div style={{ display: 'flex', flex: 1, gap: '4px', height: '100%' }}>
                            <input className="hide-on-paper" readOnly type="text" value={headerData.customerCode} placeholder="ID" style={{ width: '60px', ...paleCyanInput, cursor: 'not-allowed', backgroundColor: '#aaffff' }} />
                            <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                                <input 
                                    type="text" 
                                    value={headerData.customerName} 
                                    onChange={(e) => {
                                        setHeaderData({...headerData, customerName: e.target.value});
                                        setShowCustomerDropdown(true);
                                        setFocusedCustomerIndex(-1);
                                    }} 
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                    onKeyDown={handleCustomerKeyDown}
                                    placeholder="Search by Name or Phone..." 
                                    style={{ flex: 1, minWidth: 0, ...paleCyanInput }} 
                                />
                                {showCustomerDropdown && headerData.customerName && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '2px solid #333', zIndex: 100, maxHeight: '150px', overflowY: 'auto', boxShadow: '0px 4px 8px rgba(0,0,0,0.5)' }}>
                                        {filteredCustomers.length > 0 ? filteredCustomers.map((c, index) => (
                                            <div 
                                                key={c.code} 
                                                onClick={() => handleSelectCustomer(c)}
                                                onMouseEnter={() => setFocusedCustomerIndex(index)}
                                                style={{ 
                                                    padding: '6px 8px', 
                                                    cursor: 'pointer', 
                                                    borderBottom: '1px solid #eee', 
                                                    color: '#000', 
                                                    fontSize: '13px', 
                                                    fontWeight: 'bold',
                                                    backgroundColor: focusedCustomerIndex === index ? '#aaffff' : '#fff'
                                                }}
                                            >
                                                <span style={{ color: '#0d9488' }}>{c.code}</span> - {c.name}
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
                    <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                        <span style={paleGreenLabel}>Salesman:</span>
                        <input type="text" value={headerData.salesman} onChange={(e) => setHeaderData({...headerData, salesman: e.target.value})} autoComplete="off" style={{ flex: 1, minWidth: 0, height: '24px', ...paleCyanInput }} />
                    </div>
                </div>

                <div className="print-title-container" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div className="print-title" style={{ backgroundColor: '#111', padding: '4px 60px', color: '#00ffcc', fontWeight: 'bold', fontSize: '22px', border: '2px solid #00ffcc', letterSpacing: '2px' }}>
                        SALE INVOICE
                    </div>
                </div>

                <div className="print-header-box" style={{ backgroundColor: '#8a4444', width: '290px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #333', boxSizing: 'border-box', height: '100%' }}>
                    <div style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Date:</span>
                        <input type="text" readOnly value={formattedDate} style={{ ...redInputRight, color: '#fff' }} />
                    </div>
                    <div style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Time:</span>
                        <input type="text" readOnly value={formattedTime} style={{ ...redInputRight, color: '#4dff4d' }} />
                    </div>
                    <div style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
                        <span style={blueLabelRight}>Inv #:</span>
                        <input type="text" readOnly value="AUTO" style={{ ...redInputRight, color: '#ffff00' }} />
                    </div>
                </div>
            </div>

            <div className="grid-container" style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#e60073' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#000', color: '#ffea00', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={thStyle}>Code</th>
                            <th style={{ ...thStyle, textAlign: 'left', width: '350px' }}>Item Name</th>
                            <th style={thStyle}>Batch</th>
                            <th style={thStyle}>Sale Price</th>
                            <th style={thStyle}>Qty</th>
                            <th style={thStyle}>S.Tax</th>
                            <th style={thStyle}>Disc %</th>
                            <th style={{...thStyle, color: '#fff', fontSize: '15px'}}>ITEM TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td style={tdStyle}>
                                    <input id={`cell-${index}-0`} type="text" autoComplete="off" spellCheck="false" value={row.code} onChange={(e) => handleCellChange(index, 'code', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 0)} onFocus={() => setActiveRow(index)} style={gridInputStyle} />
                                </td>
                                <td style={tdStyle}>
                                    <div style={{ position: 'relative' }}>
                                        <input id={`cell-${index}-1`} type="text" autoComplete="off" spellCheck="false" value={row.name} onChange={(e) => handleCellChange(index, 'name', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 1)} onFocus={() => setActiveRow(index)} style={{ ...gridInputStyle, textAlign: 'left' }} />
                                        
                                        <ul className="hide-on-paper" style={{ display: dropdownCell.row === index && dropdownCell.col === 'name' && suggestions.length > 0 ? 'block' : 'none', position: 'absolute', top: '100%', left: 0, width: '400px', backgroundColor: '#000', border: '2px solid #00ffcc', zIndex: 100, listStyle: 'none', margin: 0, padding: 0, textAlign: 'left', boxShadow: '5px 5px 15px rgba(0,0,0,0.7)' }}>
                                            {suggestions.map((item, idx) => (
                                                <li key={item.id || item.code} 
                                                    style={{ padding: '8px 12px', borderBottom: '1px solid #333', backgroundColor: suggestionIndex === idx ? '#00ffcc' : 'transparent', color: suggestionIndex === idx ? '#000' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    onClick={() => applySuggestion(index, item)}>
                                                    <span>{item.name} <span style={{fontSize: '11px', opacity: 0.7}}>({item.code})</span></span>
                                                    <span style={{ fontWeight: 'bold', color: suggestionIndex === idx ? '#cc0000' : '#ffff00', backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px' }}>
                                                        Stock: {item.stock}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </td>
                                <td style={tdStyle}><input id={`cell-${index}-2`} type="text" autoComplete="off" spellCheck="false" value={row.batch} onChange={(e) => handleCellChange(index, 'batch', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 2)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-3`} type="text" autoComplete="off" spellCheck="false" value={row.salePrice} onChange={(e) => handleCellChange(index, 'salePrice', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 3)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-4`} type="text" autoComplete="off" spellCheck="false" value={row.qty} onChange={(e) => handleCellChange(index, 'qty', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 4)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-5`} type="text" autoComplete="off" spellCheck="false" value={row.sTax} onChange={(e) => handleCellChange(index, 'sTax', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 5)} onFocus={() => setActiveRow(index)} style={gridInputStyle} /></td>
                                <td style={tdStyle}><input id={`cell-${index}-6`} type="text" autoComplete="off" spellCheck="false" value={row.disc} onChange={(e) => handleCellChange(index, 'disc', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 6)} onFocus={() => setActiveRow(index)} style={{...gridInputStyle, color: '#00ffff'}} /></td>
                                <td style={{ ...tdStyle, color: '#fff', fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', fontSize: '16px', backgroundColor: '#cc0066' }}>
                                    {row.itemTotal > 0 ? row.itemTotal.toFixed(2) : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="print-footer-container" style={{ display: 'flex', padding: '6px 10px', gap: '8px', alignItems: 'stretch', height: '80px', boxSizing: 'border-box' }}>
                <div className="hide-on-paper" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', border: '2px solid #00ffcc', padding: '4px', height: '42px', boxSizing: 'border-box' }}>
                        <button onClick={handleSaveOnly} style={actionBtnStyle}><FaSave size={14} color="#888" /> Save</button>
                        <button onClick={handleSaveAndPrint} style={{...actionBtnStyle, color: '#0066cc'}}><FaPrint size={14} color="#0066cc" /> Save & Print</button>
                        <button onClick={handleAddCustomer} style={actionBtnStyle}><FaUserPlus size={14} color="#a64dff" /> Add Customer</button>
                        <button onClick={handleUndo} style={actionBtnStyle}><FaUndo size={14} color="#d97300" /> Undo Row</button>
                        <button onClick={() => handleNewBill()} style={actionBtnStyle}><FaEraser size={14} color="#e6b800" /> Clear</button>
                        <button onClick={handleClose} style={actionBtnStyle}><FaTimesCircle size={14} color="#cc0000" /> Close</button>
                    </div>

                    <div style={{ backgroundColor: '#6c4bf5', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '15px', border: '1px solid #4b2cc5', height: '22px', boxSizing: 'border-box' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '11px', minWidth: '70px', borderRight: '1px solid #9c27b0', paddingRight: '10px' }}>Items : {totalItems}</span>
                        
                        {/* 🚀 SCREENSHOT ACCURATE STEALTH BOXES 🚀 */}
                        <div className="hide-on-paper" style={{ display: 'flex', gap: '4px', borderRight: '1px solid #9c27b0', paddingRight: '10px' }}>
                            <div title="Company Discount %" style={stealthBoxStyle}>
                                {activeItemCompanyDiscount.toFixed(1)}
                            </div>
                            <div title="Item Profit" style={stealthBoxStyle}>
                                {activeItemProfit > 0 ? activeItemProfit.toFixed(0) : ''}
                            </div>
                            <div title="Total Bill Profit" style={stealthBoxStyle}>
                                {totalProfit > 0 ? totalProfit.toFixed(0) : ''}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', color: '#ffff00', fontSize: '11px', fontWeight: 'bold' }}>
                            <span><span style={{ color: '#fff' }}>F10</span> Undo Row</span>
                            <span><span style={{ color: '#fff' }}>F4</span> Save/Print</span>
                            <span><span style={{ color: '#fff' }}>F5</span> Save</span>
                            <span><span style={{ color: '#fff' }}>F9</span> Del Row</span>
                            <span><span style={{ color: '#fff' }}>F12</span> New Bill</span>
                            <span><span style={{ color: '#fff' }}>Esc</span> Close</span>
                        </div>
                    </div>
                </div>

                {/* 🚀 NEW PRINTABLE TOTALS & BALANCE BOX 🚀 */}
                <div className="print-total-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', backgroundColor: '#6c4bf5', padding: '6px 12px', width: '250px', border: '1px solid #999', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>NET TOTAL:</span>
                        <span style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '24px', textShadow: '1px 1px 2px #000' }}>
                            {grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '13px' }}>Paid / Received:</span>
                        <input 
                            type="number" 
                            value={headerData.paidAmount} 
                            onChange={(e) => setHeaderData({...headerData, paidAmount: e.target.value})} 
                            placeholder="0.00" 
                            style={{ width: '100px', padding: '2px 4px', textAlign: 'right', border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent', color: '#ffff00', fontWeight: 'bold' }} 
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #fff', paddingTop: '4px' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                            {((parseFloat(headerData.paidAmount) || 0) > grandTotal) ? 'Change Due:' : 'Remaining Balance:'}
                        </span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                            {Math.abs(grandTotal - (parseFloat(headerData.paidAmount) || 0)).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// STYLING PRESETS
const paleGreenLabel = { color: '#99ff99', fontSize: '13px', fontWeight: 'bold', width: '75px', whiteSpace: 'nowrap' }; 
const paleCyanInput = { height: '100%', padding: '0 6px', backgroundColor: '#ccffff', border: '1px solid #82a8a8', outline: 'none', color: '#000', fontWeight: 'bold', fontSize: '13px', boxSizing: 'border-box' }; 
const blueLabelRight = { backgroundColor: '#4d4dff', color: '#00ffff', fontWeight: 'bold', width: '60px', paddingLeft: '6px', display: 'flex', alignItems: 'center', border: '1px solid #333', fontSize: '13px', height: '100%', boxSizing: 'border-box', whiteSpace: 'nowrap' }; 
const redInputRight = { flex: 1, minWidth: 0, backgroundColor: '#800000', border: '1px solid #4a0000', outline: 'none', fontWeight: 'bold', textAlign: 'center', fontSize: '14px', height: '100%', boxSizing: 'border-box' };
const thStyle = { padding: '6px', borderRight: '1px solid #444', borderLeft: '1px solid #444', fontSize: '13px', textAlign: 'center' };
const tdStyle = { border: '1px solid #99004d', padding: '0' }; 
const gridInputStyle = { width: '100%', padding: '6px', boxSizing: 'border-box', backgroundColor: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' };
const actionBtnStyle = { flexGrow: 1, backgroundColor: '#f2f2f2', border: '1px solid #aaa', cursor: 'pointer', fontWeight: 'bold', color: '#333', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '100%', boxSizing: 'border-box' };

// 🚀 STEALTH BOX STYLE 🚀
const stealthBoxStyle = {
    backgroundColor: '#e2e8f0', 
    color: '#1e293b',         
    border: '1px solid #94a3b8',
    borderRadius: '3px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '40px',
    height: '18px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

export default SaleInvoice;