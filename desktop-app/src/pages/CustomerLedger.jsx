import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaEraser, FaFileInvoice, FaUsers, FaTimesCircle, FaSearch, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function CustomerLedger() {

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
    const [dbCustomers, setDbCustomers] = useState([]);
    const [ledgerGrid, setLedgerGrid] = useState([]); // This will hold the LIVE history
    const [totalMarketBalance, setTotalMarketBalance] = useState(0);

    // --- DROPDOWN & INPUT STATE ---
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [editingSno, setEditingSno] = useState(null);

    const blankEntry = { accNo: '', name: '', sMan: '0 GENERAL SALE', prevBal: '', details: 'Cash', amtDue: '', amtRec: '', newBalance: '' };
    const [entryRow, setEntryRow] = useState(blankEntry);

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        fetchInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchInitialData = async () => {
        try {
            const custRes = await axios.get('http://127.0.0.1:8000/api/customers/');
            setDbCustomers(custRes.data);
            
            // Calculate total market dues from all live customers
            const total = custRes.data.reduce((sum, cust) => sum + parseFloat(cust.current_balance || 0), 0);
            setTotalMarketBalance(total);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        }
    };

    // --- 2. FETCH SPECIFIC CUSTOMER LEDGER ---
    const fetchCustomerLedger = async (customerId) => {
        try {
            const ledgerRes = await axios.get('http://127.0.0.1:8000/api/customer-ledgers/');
            // Filter the master list to only show the selected customer's history
            const customerHistory = ledgerRes.data.filter(entry => entry.customer === customerId);
            setLedgerGrid(customerHistory);
        } catch (error) {
            console.error("Failed to fetch ledger history:", error);
        }
    };

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    // Filter customers for dropdown
    const filteredCustomers = dbCustomers.filter(c => 
        (c.name && c.name.toLowerCase().includes(entryRow.accNo.toLowerCase())) || 
        (c.code && c.code.toLowerCase().includes(entryRow.accNo.toLowerCase()))
    );

    // --- 3. INPUT HANDLING ---
    const handleEntryChange = (field, value) => {
        const updated = { ...entryRow, [field]: value };

        // Handle Dropdown trigger
        if (field === 'accNo' && !editingSno) {
            setShowDropdown(true);
            setFocusedIndex(-1);
        }

        // Live Math Calculation
        if (['amtDue', 'amtRec'].includes(field) || updated.prevBal !== '') {
            const prev = parseFloat(updated.prevBal) || 0;
            const due = parseFloat(updated.amtDue) || 0;
            const rec = parseFloat(updated.amtRec) || 0;
            if (updated.name !== '') updated.newBalance = (prev + due - rec).toFixed(2);
        }
        setEntryRow(updated);
    };

    const selectCustomer = (customer) => {
        setEntryRow({
            ...entryRow,
            accNo: customer.code,
            name: customer.name,
            prevBal: customer.current_balance,
            newBalance: customer.current_balance // Init new balance
        });
        setShowDropdown(false);
        setFocusedIndex(-1);
        fetchCustomerLedger(customer.id); // Fetch their history!
        
        // Jump to Details
        document.getElementById('input-details').focus();
    };

    // --- 4. THE SAVE ENGINE ---
    const saveLedgerEntry = async () => {
        if (!entryRow.name || !entryRow.newBalance) { 
            alert('Invalid entry. Please select a customer first.'); 
            return; 
        }

        const customer = dbCustomers.find(c => c.code === entryRow.accNo);
        if (!customer) return;

        const payload = {
            customer: customer.id,
            date: currentTime.toISOString().split('T')[0], // YYYY-MM-DD
            ref_no: 'PAYMENT', // Or whatever you want to call manual ledger entries
            detail: entryRow.details || 'Cash',
            amt_due: parseFloat(entryRow.amtDue) || 0,
            amt_rec: parseFloat(entryRow.amtRec) || 0,
            running_balance: parseFloat(entryRow.newBalance)
        };

        try {
            // 1. Save the Ledger Line
            await axios.post('http://127.0.0.1:8000/api/customer-ledgers/', payload);
            
            // 2. Update the Customer's Master Balance
            const updatedCustomer = { ...customer, current_balance: payload.running_balance };
            await axios.put(`http://127.0.0.1:8000/api/customers/${customer.id}/`, updatedCustomer);

            // 3. Refresh Data
            fetchInitialData();
            fetchCustomerLedger(customer.id);
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
            if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0)); return; }
            if (e.key === 'Enter') { e.preventDefault(); if (focusedIndex >= 0) selectCustomer(filteredCustomers[focusedIndex]); return; }
            if (e.key === 'Escape') { setShowDropdown(false); return; }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentField === 'accNo' && !showDropdown) document.getElementById('input-details').focus();
            else if (currentField === 'details') document.getElementById('input-due').focus();
            else if (currentField === 'amtDue') document.getElementById('input-rec').focus();
            else if (currentField === 'amtRec') saveLedgerEntry(); // TRIGGER SAVE!
        }
    };

    // Calculate totals ONLY for the currently displayed history
    const totalDue = ledgerGrid.reduce((sum, row) => sum + parseFloat(row.amt_due || 0), 0);
    const totalRec = ledgerGrid.reduce((sum, row) => sum + parseFloat(row.amt_rec || 0), 0);

    return (
        <div style={{ backgroundColor: '#f1f5f9', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', color: '#0f172a', minWidth: '1100px' }}>
            {/* ... HEADER ... */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Customer Ledger & Receipts</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ backgroundColor: '#fff1f2', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#be123c', fontWeight: '600' }}>Total Market Dues:</span>
                        <span style={{ fontSize: '18px', color: '#e11d48', fontWeight: '800' }}>Rs. {totalMarketBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>

            <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                
                {/* --- DATA ENTRY TOP BAR --- */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'visible', border: '1px solid #e2e8f0' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaSearch color="#64748b" />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>
                            New Transaction / Receipt Entry
                        </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={entryTh}>Acc. No</th><th style={{...entryTh, width: '22%'}}>Customer Name</th><th style={{...entryTh, width: '15%'}}>Salesman</th><th style={entryTh}>Date</th><th style={{...entryTh, textAlign: 'right'}}>Prev Balance</th><th style={{...entryTh, width: '18%'}}>Details</th><th style={{...entryTh, textAlign: 'right', color: '#ef4444'}}>Amt Due (+)</th><th style={{...entryTh, textAlign: 'right', color: '#22c55e'}}>Amt Rec (-)</th><th style={{...entryTh, textAlign: 'right'}}>New Balance</th>
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
                                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '300px', backgroundColor: '#fff', border: '1px solid #cbd5e1', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                            {filteredCustomers.length > 0 ? filteredCustomers.map((c, index) => (
                                                <div key={c.code} onClick={() => selectCustomer(c)} onMouseEnter={() => setFocusedIndex(index)}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', backgroundColor: focusedIndex === index ? '#e0e7ff' : '#fff' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>{c.code}</span> - {c.name}
                                                </div>
                                            )) : <div style={{ padding: '8px', color: '#94a3b8', fontStyle: 'italic' }}>No matches found...</div>}
                                        </div>
                                    )}
                                </td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.name} style={readOnlyInput} /></td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.sMan} style={readOnlyInput} /></td>
                                <td style={entryTd}><input type="text" readOnly value={formattedDate} style={{...readOnlyInput, textAlign: 'center'}} /></td>
                                <td style={entryTd}><input type="text" readOnly value={entryRow.prevBal} style={{...readOnlyInput, textAlign: 'right', color: '#e11d48', fontWeight: '700'}} /></td>
                                <td style={entryTd}><input id="input-details" type="text" autoComplete="off" value={entryRow.details} onChange={(e) => handleEntryChange('details', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'details')} style={activeInput} /></td>
                                <td style={entryTd}><input id="input-due" type="number" value={entryRow.amtDue} onChange={(e) => handleEntryChange('amtDue', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'amtDue')} style={{...activeInput, textAlign: 'right', color: '#ef4444'}} placeholder="0.00" /></td>
                                <td style={entryTd}><input id="input-rec" type="number" value={entryRow.amtRec} onChange={(e) => handleEntryChange('amtRec', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'amtRec')} style={{...activeInput, textAlign: 'right', color: '#16a34a'}} placeholder="0.00" /></td>
                                <td style={{...entryTd, backgroundColor: '#f8fafc'}}><input type="text" readOnly value={entryRow.newBalance} style={{...readOnlyInput, textAlign: 'right', fontWeight: '800', backgroundColor: 'transparent'}} placeholder="0.00" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* --- THE HISTORY GRID --- */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexGrow: 1, minHeight: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>
                            {entryRow.name ? `${entryRow.name}'s Account History` : 'Select a customer to view history...'}
                        </span>
                    </div>
                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                                <tr>
                                    <th style={gridTh}>Date</th><th style={gridTh}>Ref #</th><th style={{...gridTh, textAlign: 'left'}}>Details</th><th style={{...gridTh, textAlign: 'right', color: '#ef4444'}}>Due (+)</th><th style={{...gridTh, textAlign: 'right', color: '#22c55e'}}>Received (-)</th><th style={{...gridTh, textAlign: 'right'}}>Running Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerGrid.map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={gridTd}>{row.date}</td>
                                        <td style={{...gridTd, color: '#4f46e5', fontWeight: '600'}}>{row.ref_no}</td>
                                        <td style={{...gridTd, textAlign: 'left'}}>{row.detail}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#ef4444'}}>{parseFloat(row.amt_due) > 0 ? parseFloat(row.amt_due).toFixed(2) : '-'}</td>
                                        <td style={{...gridTd, textAlign: 'right', color: '#16a34a', fontWeight: '600'}}>{parseFloat(row.amt_rec) > 0 ? parseFloat(row.amt_rec).toFixed(2) : '-'}</td>
                                        <td style={{...gridTd, textAlign: 'right', fontWeight: '700'}}>{parseFloat(row.running_balance).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {ledgerGrid.length === 0 && entryRow.name && <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No prior transactions found for this customer.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* TOTALS */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '40px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{entryRow.name} TOTALS:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>Total Due</span><span style={{ fontSize: '16px', color: '#ef4444', fontWeight: '700' }}>{totalDue.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>Total Received</span><span style={{ fontSize: '18px', color: '#16a34a', fontWeight: '800' }}>{totalRec.toLocaleString()}</span></div>
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

const entryTh = { padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#475569', backgroundColor: '#ffffff' };
const entryTd = { padding: '8px', borderRight: '1px solid #f1f5f9' };
const activeInput = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '14px', backgroundColor: '#ffffff' };
const readOnlyInput = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid transparent', outline: 'none', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: '500' };
const gridTh = { padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' };
const gridTd = { padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center' };
const btnBase = { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: 'none' };
const btnSecondary = { ...btnBase, backgroundColor: '#f1f5f9', color: '#475569' };
const btnDanger = { ...btnBase, backgroundColor: '#fff1f2', color: '#e11d48', marginLeft: 'auto' };

export default CustomerLedger;