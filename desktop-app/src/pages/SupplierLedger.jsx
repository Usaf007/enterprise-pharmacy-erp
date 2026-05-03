import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaEraser, FaTruckLoading, FaTimesCircle, FaSearch, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function SupplierLedger() {

    const navigate = useNavigate();

    const handleClose = () => {
        navigate('/');
    };

    // --- ESCAPE KEY LISTENER ---
    useEffect(() => {
        const handleShortcuts = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [navigate]);

    const [currentTime, setCurrentTime] = useState(new Date());
    
    // --- LIVE DATABASE STATES ---
    const [dbSuppliers, setDbSuppliers] = useState([]);
    const [ledgerGrid, setLedgerGrid] = useState([]); // This will hold the LIVE history
    const [totalMarketPayables, setTotalMarketPayables] = useState(0);

    // --- DROPDOWN & INPUT STATE ---
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [editingSno, setEditingSno] = useState(null);

    const blankEntry = { accNo: '', name: '', agent: '', prevBal: '', details: 'Cash Paid', amtBill: '', amtPaid: '', newBalance: '' };
    const [entryRow, setEntryRow] = useState(blankEntry);

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        fetchInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchInitialData = async () => {
        try {
            const suppRes = await axios.get('http://127.0.0.1:8000/api/suppliers/');
            setDbSuppliers(suppRes.data);
            
            // Calculate total market payables from all live suppliers
            const total = suppRes.data.reduce((sum, supp) => sum + parseFloat(supp.current_balance || 0), 0);
            setTotalMarketPayables(total);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        }
    };

    // --- 2. FETCH SPECIFIC SUPPLIER LEDGER ---
    const fetchSupplierLedger = async (supplierId) => {
        try {
            const ledgerRes = await axios.get('http://127.0.0.1:8000/api/supplier-ledgers/');
            // Filter the master list to only show the selected supplier's history
            const supplierHistory = ledgerRes.data.filter(entry => entry.supplier === supplierId);
            setLedgerGrid(supplierHistory);
        } catch (error) {
            console.error("Failed to fetch ledger history:", error);
        }
    };

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    // Filter suppliers for dropdown
    const filteredSuppliers = dbSuppliers.filter(s => 
        (s.name && s.name.toLowerCase().includes(entryRow.accNo.toLowerCase())) || 
        (s.code && s.code.toLowerCase().includes(entryRow.accNo.toLowerCase()))
    );

    // --- 3. INPUT HANDLING ---
    const handleEntryChange = (field, value) => {
        const updated = { ...entryRow, [field]: value };

        // Handle Dropdown trigger
        if (field === 'accNo' && !editingSno) {
            setShowDropdown(true);
            setFocusedIndex(-1);
        }

        // Live Math Calculation (Prev + Bill - Paid)
        if (['amtBill', 'amtPaid'].includes(field) || updated.prevBal !== '') {
            const prev = parseFloat(updated.prevBal) || 0;
            const bill = parseFloat(updated.amtBill) || 0;
            const paid = parseFloat(updated.amtPaid) || 0;
            if (updated.name !== '') updated.newBalance = (prev + bill - paid).toFixed(2);
        }
        setEntryRow(updated);
    };

    const selectSupplier = (supplier) => {
        setEntryRow({
            ...entryRow,
            accNo: supplier.code,
            name: supplier.name,
            agent: supplier.agent || 'N/A',
            prevBal: supplier.current_balance,
            newBalance: supplier.current_balance // Init new balance
        });
        setShowDropdown(false);
        setFocusedIndex(-1);
        fetchSupplierLedger(supplier.id); // Fetch their history!
        
        // Jump to Details
        document.getElementById('input-details').focus();
    };

    // --- 4. THE SAVE ENGINE ---
    const saveLedgerEntry = async () => {
        if (!entryRow.name || !entryRow.newBalance) { 
            alert('Invalid entry. Please select a supplier first.'); 
            return; 
        }

        const supplier = dbSuppliers.find(s => s.code === entryRow.accNo);
        if (!supplier) return;

        const payload = {
            supplier: supplier.id,
            date: currentTime.toISOString().split('T')[0], // YYYY-MM-DD
            ref_no: 'PAYMENT', // Manual ledger entry
            detail: entryRow.details || 'Cash Paid',
            amt_bill: parseFloat(entryRow.amtBill) || 0,
            amt_paid: parseFloat(entryRow.amtPaid) || 0,
            running_balance: parseFloat(entryRow.newBalance)
        };

        try {
            // 1. Save the Ledger Line
            await axios.post('http://127.0.0.1:8000/api/supplier-ledgers/', payload);
            
            // 2. Update the Supplier's Master Balance
            const updatedSupplier = { ...supplier, current_balance: payload.running_balance };
            await axios.put(`http://127.0.0.1:8000/api/suppliers/${supplier.id}/`, updatedSupplier);

            // 3. Refresh Data
            fetchInitialData();
            fetchSupplierLedger(supplier.id);
            setEntryRow(blankEntry);
            document.getElementById('input-accNo').focus();

        } catch (error) {
            console.error("Error saving ledger entry:", error);
            alert("Database Error! Is Django running?");
        }
    };

    // --- 5. KEYBOARD NAVIGATION ---
    const handleKeyDown = (e, currentField) => {
        if (showDropdown && currentField === 'accNo') {
            if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => (prev < filteredSuppliers.length - 1 ? prev + 1 : prev)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0)); return; }
            if (e.key === 'Enter') { e.preventDefault(); if (focusedIndex >= 0) selectSupplier(filteredSuppliers[focusedIndex]); return; }
            if (e.key === 'Escape') { setShowDropdown(false); return; }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentField === 'accNo' && !showDropdown) document.getElementById('input-details').focus();
            else if (currentField === 'details') document.getElementById('input-bill').focus();
            else if (currentField === 'amtBill') document.getElementById('input-paid').focus();
            else if (currentField === 'amtPaid') saveLedgerEntry(); // TRIGGER SAVE!
        }
    };

    // Calculate totals ONLY for the currently displayed history
    const totalBill = ledgerGrid.reduce((sum, row) => sum + parseFloat(row.amt_bill || 0), 0);
    const totalPaid = ledgerGrid.reduce((sum, row) => sum + parseFloat(row.amt_paid || 0), 0);

    return (
        <div style={{ backgroundColor: '#f0fdfa', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', color: '#0f172a', minWidth: '1100px' }}>
            {/* --- HEADER --- */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10, borderBottom: '3px solid #0d9488' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTruckLoading /> Supplier Ledger & Payments
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ backgroundColor: '#fffbeb', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '600' }}>Total Market Payables:</span>
                        <span style={{ fontSize: '18px', color: '#d97706', fontWeight: '800' }}>Rs. {totalMarketPayables.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>

            <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                
                {/* --- DATA ENTRY TOP BAR --- */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'visible', border: '1px solid #e2e8f0' }}>
                    <div style={{ backgroundColor: '#f0fdfa', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaSearch color="#0d9488" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' }}>
                            New Payment / Bill Entry
                        </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={entryTh}>Supp. ID</th><th style={{...entryTh, width: '22%'}}>Supplier Name</th><th style={{...entryTh, width: '15%'}}>Agent/Rep</th><th style={entryTh}>Date</th><th style={{...entryTh, textAlign: 'right'}}>Prev Balance</th><th style={{...entryTh, width: '18%'}}>Details</th><th style={{...entryTh, textAlign: 'right', color: '#ef4444'}}>Bill Amt (+)</th><th style={{...entryTh, textAlign: 'right', color: '#22c55e'}}>Paid Amt (-)</th><th style={{...entryTh, textAlign: 'right'}}>New Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{...entryTd, position: 'relative'}}>
                                    <input 
                                        id="input-accNo" type="text" autoComplete="off"
                                        value={entryRow.accNo} 
                                        onChange={(e) => handleEntryChange('accNo', e.target.value)} 
                                        onKeyDown={(e) => handleKeyDown(e, 'accNo')} 
                                        style={activeInput} autoFocus 
                                        placeholder="Search..."
                                    />
                                    {showDropdown && entryRow.accNo && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '300px', backgroundColor: '#fff', border: '2px solid #0d9488', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                            {filteredSuppliers.length > 0 ? filteredSuppliers.map((s, index) => (
                                                <div key={s.code} onClick={() => selectSupplier(s)} onMouseEnter={() => setFocusedIndex(index)}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #ccfbf1', backgroundColor: focusedIndex === index ? '#ccfbf1' : '#fff' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#0d9488' }}>{s.code}</span> - {s.name}
                                                </div>
                                            )) : <div style={{ padding: '8px', color: '#94a3b8', fontStyle: 'italic' }}>No matches found...</div>}
                                        </div>
                                    )}
                                </td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.name} style={readOnlyInput} /></td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.agent} style={readOnlyInput} /></td>
                                <td style={entryTd}><input type="text" readOnly value={formattedDate} style={{...readOnlyInput, textAlign: 'center'}} /></td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.prevBal} style={{...readOnlyInput, textAlign: 'right', color: '#ea580c', fontWeight: '700'}} /></td>
                                <td style={entryTd}><input id="input-details" type="text" autoComplete="off" value={entryRow.details} onChange={(e) => handleEntryChange('details', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'details')} style={activeInput} /></td>
                                <td style={entryTd}><input id="input-bill" type="number" value={entryRow.amtBill} onChange={(e) => handleEntryChange('amtBill', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'amtBill')} style={{...activeInput, textAlign: 'right', color: '#ef4444'}} placeholder="0.00" /></td>
                                <td style={entryTd}><input id="input-paid" type="number" value={entryRow.amtPaid} onChange={(e) => handleEntryChange('amtPaid', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'amtPaid')} style={{...activeInput, textAlign: 'right', color: '#16a34a'}} placeholder="0.00" /></td>
                                <td style={{...entryTd, backgroundColor: '#f0fdfa'}}><input type="text" readOnly value={entryRow.newBalance} style={{...readOnlyInput, textAlign: 'right', fontWeight: '800', backgroundColor: 'transparent'}} placeholder="0.00" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* --- THE HISTORY GRID --- */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexGrow: 1, minHeight: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>
                            {entryRow.name ? `${entryRow.name}'s Account History` : 'Select a supplier to view history...'}
                        </span>
                    </div>
                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                                <tr>
                                    <th style={gridTh}>Date</th><th style={gridTh}>Ref #</th><th style={{...gridTh, textAlign: 'left'}}>Details</th><th style={{...gridTh, textAlign: 'right', color: '#ef4444'}}>Bill Amt (+)</th><th style={{...gridTh, textAlign: 'right', color: '#22c55e'}}>Paid Amt (-)</th><th style={{...gridTh, textAlign: 'right'}}>Running Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerGrid.map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={gridTd}>{row.date}</td>
                                        <td style={{...gridTd, color: '#0d9488', fontWeight: '600'}}>{row.ref_no}</td>
                                        <td style={{...gridTd, textAlign: 'left'}}>{row.detail}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#ef4444'}}>{parseFloat(row.amt_bill) > 0 ? parseFloat(row.amt_bill).toFixed(2) : '-'}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#16a34a', fontWeight: '600'}}>{parseFloat(row.amt_paid) > 0 ? parseFloat(row.amt_paid).toFixed(2) : '-'}</td>
                                        <td style={{...gridTd, textAlign: 'right', fontWeight: '700', color: parseFloat(row.running_balance) > 0 ? '#ea580c' : '#059669'}}>{parseFloat(row.running_balance).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {ledgerGrid.length === 0 && entryRow.name && <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No prior transactions found for this supplier.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* TOTALS */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '40px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{entryRow.name} TOTALS:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>Total Billed</span><span style={{ fontSize: '16px', color: '#ef4444', fontWeight: '700' }}>{totalBill.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>Total Paid</span><span style={{ fontSize: '18px', color: '#16a34a', fontWeight: '800' }}>{totalPaid.toLocaleString()}</span></div>
                    </div>
                </div>
            </div>
            
            <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button style={btnSecondary} onClick={() => {setEntryRow(blankEntry); setLedgerGrid([]); document.getElementById('input-accNo').focus();}}><FaEraser /> Clear Screen</button>
                <button onClick={handleClose} style={btnDanger}><FaTimesCircle /> Close (Esc) 
                </button>
            </div>
        </div>
    );
}

const entryTh = { padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#334155', backgroundColor: '#ffffff' };
const entryTd = { padding: '8px', borderRight: '1px solid #f1f5f9' };
const activeInput = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '14px', backgroundColor: '#ffffff', transition: 'border-color 0.2s' };
const readOnlyInput = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid transparent', outline: 'none', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: '600' };
const gridTh = { padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' };
const gridTd = { padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center' };
const btnBase = { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: 'none' };
const btnSecondary = { ...btnBase, backgroundColor: '#f1f5f9', color: '#475569' };
const btnDanger = { ...btnBase, backgroundColor: '#fff1f2', color: '#e11d48', marginLeft: 'auto' };

export default SupplierLedger;