import { useState, useEffect } from 'react';
import axios from 'axios'; // IMPORTING THE API BRIDGE
import { FaSave, FaUserEdit, FaTrash, FaEraser, FaTimesCircle, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function CustomerRegistration() {
    const navigate = useNavigate();

    // --- 🚀 THE MASTER CLOSE FUNCTION 🚀 ---
    const handleClose = () => {
        navigate('/');
    };

    const [currentTime, setCurrentTime] = useState(new Date());

    // --- 1. CLOCK ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    // --- 2. STATE MANAGEMENT ---
    const blankForm = { code: 'AUTO', name: '', address: '', mobile: '', cnic: '', license: '', type: '0 General', area: '0 Local', balance: 0.00 };
    const [formData, setFormData] = useState(blankForm);
    const [customers, setCustomers] = useState([]); // STARTS EMPTY! No more mock data.
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // --- 3. LIVE DATABASE FETCH (GET) ---
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/customers/');
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    // --- 4. LIVE DATABASE SAVE/UPDATE (POST & PUT) ---
   const handleSave = async () => {
        if (!formData.name) { alert('Customer Name is required!'); return; }
        
        try {
            // --- THE FIX: Translate React's 'balance' to Django's 'current_balance' ---
            const payload = { ...formData };
            payload.current_balance = parseFloat(payload.balance) || 0;
            delete payload.balance; // Remove the word Django doesn't recognize

            if (payload.code === 'AUTO') {
                payload.code = `C-${Math.floor(Math.random() * 10000)}`; 
            }

            if (isEditing) {
                // UPDATE EXISTING RECORD
                await axios.put(`http://127.0.0.1:8000/api/customers/${formData.id}/`, payload);
                alert("Customer Updated Successfully!");
            } else {
                // CREATE NEW RECORD
                await axios.post('http://127.0.0.1:8000/api/customers/', payload);
            }
            
            // Refresh the grid
            fetchCustomers();
            setFormData(blankForm);
            setIsEditing(false);
            document.getElementById('input-name').focus();
        } catch (error) {
            console.error("Error saving to database:", error);
            alert("Database Error! Is your Django server running?");
        }
    };

    // --- 5. LIVE DATABASE DELETE (DELETE) ---
    const handleDelete = async () => {
        if (!isEditing || !formData.id) {
            alert('Please click on a customer from the table below first to select them for deletion.');
            return;
        }
        if (window.confirm(`Are you sure you want to completely delete ${formData.name} from the database?`)) {
            try {
                // Tell Django to permanently delete this row
                await axios.delete(`http://127.0.0.1:8000/api/customers/${formData.id}/`);
                
                fetchCustomers(); // Refresh the grid
                setFormData(blankForm);
                setIsEditing(false);
                document.getElementById('input-name').focus();
            } catch (error) {
                console.error("Error deleting from database:", error);
                alert("Failed to delete customer.");
            }
        }
    };

    // --- 6. UI HELPERS ---
   const loadCustomerForEdit = (customer) => {
        setFormData({ 
            ...customer, 
            // Translate Django's 'current_balance' back to React's 'balance'
            balance: customer.current_balance ? customer.current_balance.toString() : '0' 
        });
        setIsEditing(true);
        
        // A tiny delay ensures React has time to update the state before we force the cursor into the box
        setTimeout(() => {
            const nameInput = document.getElementById('input-name');
            if (nameInput) nameInput.focus();
        }, 50);
    };

    const filteredCustomers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (c.code && c.code.includes(searchTerm)) || 
        (c.mobile && c.mobile.includes(searchTerm))
    );

    const formFields = ['name', 'address', 'mobile', 'cnic', 'license', 'type', 'area', 'saveBtn'];
    
    const handleKeyDown = (e, currentField) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentIndex = formFields.indexOf(currentField);
            if (currentIndex < formFields.length - 1) {
                const nextField = formFields[currentIndex + 1];
                const nextElement = document.getElementById(`input-${nextField}`);
                if (nextElement) {
                    nextElement.focus();
                    if (nextElement.tagName === 'INPUT') nextElement.select();
                }
            } else if (currentField === 'saveBtn') {
                handleSave();
            }
        }
    };

    const handleChange = (e, field) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    // --- 7. KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleFKeys = (e) => {
            if (['F4', 'F5', 'F9', 'F12', 'Escape'].includes(e.key)) {
                e.preventDefault();
                if (document.activeElement) document.activeElement.blur();
            }
            switch(e.key) {
                case 'F4': handleSave(); break;
                case 'F5': 
                    if (isEditing) handleSave(); 
                    else alert('Please click a customer from the table to update first.');
                    break;
                case 'F9': handleDelete(); break;
                case 'F12': 
                    setFormData(blankForm); 
                    setIsEditing(false); 
                    document.getElementById('input-name').focus(); 
                    break;
                case 'Escape': handleClose(); break; // 🚀 WIRED TO ROUTER
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, [formData, customers, isEditing]);

    return (
        <div style={{ backgroundColor: '#202040', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', minWidth: '1100px' }}>
            
            {/* TOP HEADER */}
            <div style={{ position: 'relative', padding: '10px', height: '70px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', boxSizing: 'border-box', backgroundColor: '#1a1a33' }}>
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#000', padding: '4px 60px', color: '#ff9900', fontWeight: 'bold', fontSize: '22px', border: '2px solid #ff9900', letterSpacing: '2px' }}>
                        CUSTOMER REGISTRATION & INQUIRY
                    </div>
                </div>
                <div></div> 
                <div style={{ backgroundColor: '#8a4444', width: '200px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', height: '100%', boxSizing: 'border-box' }}>
                    <span style={{ color: '#00ffff', fontWeight: 'bold', fontSize: '14px', marginRight: '10px' }}>Date:</span>
                    <input type="text" readOnly value={formattedDate} style={{ width: '110px', backgroundColor: '#4d1a1a', color: '#fff', border: '1px solid #333', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', height: '24px' }} />
                </div>
            </div>

            {/* MAIN SPLIT VIEW */}
            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                
                {/* LEFT PANEL: Data Entry Form */}
                <div style={{ width: '380px', backgroundColor: '#33334d', borderRight: '2px solid #111', display: 'flex', flexDirection: 'column', padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid #555', paddingBottom: '8px', marginBottom: '15px' }}>
                        {isEditing ? 'EDIT CUSTOMER' : 'ADD NEW CUSTOMER'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={formRow}>
                            <span style={formLabel}>Code:</span>
                            <div style={{ display: 'flex', gap: '5px', flexGrow: 1 }}>
                                <input type="text" readOnly value={formData.code} style={{ ...formInput, backgroundColor: '#1a1a1a', color: '#00ffcc', width: '80px', textAlign: 'center' }} />
                                <button style={{ backgroundColor: '#d9d9d9', border: '1px solid #555', cursor: 'pointer', padding: '0 10px', fontWeight: 'bold', fontSize: '12px' }}>{'>>'}</button>
                            </div>
                        </div>

                        <div style={formRow}><span style={formLabel}>Name:</span><input id="input-name" type="text" autoComplete="off" value={formData.name} onChange={(e) => handleChange(e, 'name')} onKeyDown={(e) => handleKeyDown(e, 'name')} style={{ ...formInput, flexGrow: 1 }} /></div>
                        <div style={formRow}><span style={formLabel}>Address:</span><input id="input-address" type="text" autoComplete="off" value={formData.address} onChange={(e) => handleChange(e, 'address')} onKeyDown={(e) => handleKeyDown(e, 'address')} style={{ ...formInput, flexGrow: 1 }} /></div>
                        <div style={formRow}><span style={formLabel}>Mobile No:</span><input id="input-mobile" type="text" autoComplete="off" value={formData.mobile} onChange={(e) => handleChange(e, 'mobile')} onKeyDown={(e) => handleKeyDown(e, 'mobile')} style={{ ...formInput, flexGrow: 1 }} /></div>
                        <div style={formRow}><span style={formLabel}>CNIC:</span><input id="input-cnic" type="text" autoComplete="off" value={formData.cnic} onChange={(e) => handleChange(e, 'cnic')} onKeyDown={(e) => handleKeyDown(e, 'cnic')} style={{ ...formInput, flexGrow: 1 }} /></div>
                        <div style={formRow}><span style={formLabel}>Licence No:</span><input id="input-license" type="text" autoComplete="off" value={formData.license} onChange={(e) => handleChange(e, 'license')} onKeyDown={(e) => handleKeyDown(e, 'license')} style={{ ...formInput, flexGrow: 1 }} /></div>

                        <div style={formRow}>
                            <span style={formLabel}>Type:</span>
                            <select id="input-type" value={formData.type} onChange={(e) => handleChange(e, 'type')} onKeyDown={(e) => handleKeyDown(e, 'type')} style={{ ...formInput, flexGrow: 1, cursor: 'pointer' }}>
                                <option value="0 General">0 General</option>
                                <option value="1 Retail">1 Retail</option>
                                <option value="2 Wholesale">2 Wholesale</option>
                            </select>
                        </div>
                        <div style={formRow}>
                            <span style={formLabel}>Area:</span>
                            <select id="input-area" value={formData.area} onChange={(e) => handleChange(e, 'area')} onKeyDown={(e) => handleKeyDown(e, 'area')} style={{ ...formInput, flexGrow: 1, cursor: 'pointer' }}>
                                <option value="0 Local">0 Local</option>
                                <option value="1 MARDAN">1 MARDAN</option>
                                <option value="2 Out of City">2 Out of City</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button id="input-saveBtn" onClick={handleSave} style={{...actionBtnStyle, backgroundColor: '#e6ffe6', color: '#006600', height: '35px'}}><FaSave size={14} /> {isEditing ? 'Update Record (F5)' : 'Save Record (F4)'}</button>
                        <button onClick={handleDelete} style={{...actionBtnStyle, height: '30px'}}><FaTrash size={14} color="#cc0000" /> Delete (F9)</button>
                        <button onClick={() => {setFormData(blankForm); setIsEditing(false);}} style={{...actionBtnStyle, height: '30px'}}><FaEraser size={14} color="#e6b800" /> Clear Form (F12)</button>
                        
                        {/* 🚀 NEW WORKING CLOSE BUTTON 🚀 */}
                        <button onClick={handleClose} style={{...actionBtnStyle, height: '30px', marginTop: '10px', backgroundColor: '#ffe6e6', color: '#cc0000'}}><FaTimesCircle size={14} color="#cc0000" /> Close Screen (Esc)</button>
                    </div>
                </div>

                {/* RIGHT PANEL: Live Search Database Grid */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#e6e6e6' }}>
                    <div style={{ padding: '10px 15px', backgroundColor: '#1a1a33', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '20px', flexGrow: 1, border: '2px solid #00ffcc' }}>
                            <FaSearch color="#666" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search by Name, Code, or Mobile Number..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 'none', outline: 'none', padding: '6px 10px', fontSize: '15px', flexGrow: 1, fontWeight: 'bold' }} 
                            />
                        </div>
                        <div style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '14px', minWidth: '150px', textAlign: 'right' }}>
                            Total Records: {filteredCustomers.length}
                        </div>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                            <thead style={{ backgroundColor: '#ccf2ff', color: '#003366', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                <tr>
                                    <th style={thStyle}>AccNo</th>
                                    <th style={{ ...thStyle, textAlign: 'left', width: '220px' }}>Name</th>
                                    <th style={{ ...thStyle, textAlign: 'left', width: '200px' }}>Address</th>
                                    <th style={thStyle}>Area</th>
                                    <th style={thStyle}>CellNo</th>
                                    <th style={thStyle}>CNIC</th>
                                    <th style={{ ...thStyle, textAlign: 'right', color: '#cc0000' }}>Balance (Dues)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((cust, index) => (
                                    <tr key={index} 
                                        onClick={() => loadCustomerForEdit(cust)}
                                        style={{ borderBottom: '1px solid #ddd', cursor: 'pointer', backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6ffff'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#fff'}
                                    >
                                        <td style={{...tdStyle, fontWeight: 'bold', color: '#0066cc'}}>{cust.code}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold' }}>{cust.name}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontSize: '12px' }}>{cust.address}</td>
                                        <td style={{ ...tdStyle, fontSize: '12px' }}>{cust.area}</td>
                                        <td style={tdStyle}>{cust.mobile}</td>
                                        <td style={{ ...tdStyle, fontSize: '12px' }}>{cust.cnic}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: parseFloat(cust.current_balance) > 0 ? '#cc0000' : '#009900', fontSize: '14px' }}>
                                                {parseFloat(cust.current_balance || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666', fontWeight: 'bold' }}>Database is empty or no match found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* STATUS BAR */}
            <div style={{ backgroundColor: '#1a1a33', padding: '6px 15px', display: 'flex', gap: '20px', borderTop: '2px solid #000' }}>
                <div style={{ display: 'flex', gap: '15px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                    <span><span style={{ color: '#00ffcc' }}>F4</span> Save</span>
                    <span><span style={{ color: '#00ffcc' }}>F5</span> Update</span>
                    <span><span style={{ color: '#00ffcc' }}>F9</span> Delete</span>
                    <span><span style={{ color: '#00ffcc' }}>F12</span> Clear Form</span>
                    <span><span style={{ color: '#00ffcc' }}>Esc</span> Close</span>
                    <span><span style={{ color: '#00ffcc' }}>Click Row</span> Edit/View Details</span>
                </div>
            </div>

        </div>
    );
}

// --- Styles ---
const formRow = { display: 'flex', alignItems: 'center' };
const formLabel = { color: '#b3d9ff', fontSize: '13px', fontWeight: 'bold', width: '90px', textShadow: '1px 1px 1px #000' };
const formInput = { height: '26px', padding: '0 6px', backgroundColor: '#e6f2ff', border: '1px solid #6699cc', outline: 'none', color: '#000', fontWeight: 'bold', fontSize: '13px', boxSizing: 'border-box' };

const thStyle = { padding: '8px', borderRight: '1px solid #99ccff', fontSize: '12px', textAlign: 'center' };
const tdStyle = { borderRight: '1px solid #ddd', padding: '6px 8px', fontSize: '13px', color: '#333', textAlign: 'center' }; 

const actionBtnStyle = { backgroundColor: '#f2f2f2', border: '1px solid #aaa', cursor: 'pointer', fontWeight: 'bold', color: '#333', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxSizing: 'border-box' };

export default CustomerRegistration;