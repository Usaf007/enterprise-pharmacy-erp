import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaTrash, FaEraser, FaSearch, FaTruckLoading, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function SupplierRegistration() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    const blankForm = { code: 'AUTO', name: '', agent: '', phone: '', address: '', balance: '' };
    const [formData, setFormData] = useState(blankForm);
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/suppliers/');
            setSuppliers(response.data);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    };

   const handleSave = async () => {
        if (!formData.name) { alert('Supplier Name is required!'); return; }
        
        try {
            // FIX: Package the data EXACTLY how Django's model expects it
            const payload = {
                code: formData.code === 'AUTO' ? `S-${Math.floor(Math.random() * 900) + 100}` : formData.code,
                name: formData.name,
                agent: formData.agent,
                phone: formData.phone,
                address: formData.address,
                current_balance: parseFloat(formData.balance) || 0 // <-- The magic word!
            };

            console.log("📦 BOX READY TO SEND:", payload);

            if (isEditing) {
                await axios.put(`http://127.0.0.1:8000/api/suppliers/${formData.id}/`, payload);
                alert('Supplier Updated Successfully!');
            } else {
                await axios.post('http://127.0.0.1:8000/api/suppliers/', payload);
            }
            
            fetchSuppliers();
            setFormData(blankForm);
            setIsEditing(false);
            document.getElementById('input-name').focus();
        } catch (error) {
            console.error("Error saving to database:", error);
            alert("Database Error! Check your Django terminal.");
        }
    };

    const handleDelete = async () => {
        if (!isEditing || !formData.id) {
            alert('Please select a supplier from the list first to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to permanently delete ${formData.name}?`)) {
            try {
                await axios.delete(`http://127.0.0.1:8000/api/suppliers/${formData.id}/`);
                fetchSuppliers();
                setFormData(blankForm);
                setIsEditing(false);
                document.getElementById('input-name').focus();
            } catch (error) {
                console.error("Error deleting from database:", error);
                alert("Failed to delete supplier.");
            }
        }
    };

    // --- THE FIX IS HERE ---
   const loadSupplierForEdit = (supplier) => {
        setFormData({ 
            ...supplier, 
            // FIX: Pull 'current_balance' from Django into React's 'balance' box
            balance: supplier.current_balance ? supplier.current_balance.toString() : '0' 
        });
        setIsEditing(true);
        setTimeout(() => {
            const nameInput = document.getElementById('input-name');
            if (nameInput) nameInput.focus();
        }, 50);
    };

    const filteredSuppliers = suppliers.filter(s => 
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (s.agent && s.agent.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm))
    );

    const formFields = ['name', 'agent', 'phone', 'address', 'balance', 'saveBtn'];
    
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
                    else alert('Please click a supplier from the table to update first.');
                    break;
                case 'F9': handleDelete(); break;
                case 'F12': 
                    setFormData(blankForm); 
                    setIsEditing(false); 
                    document.getElementById('input-name').focus(); 
                    break;
                case 'Escape': navigate('/'); break;
            }
        };
        window.addEventListener('keydown', handleFKeys);
        return () => window.removeEventListener('keydown', handleFKeys);
    }, [formData, suppliers, isEditing]);

    return (
        <div style={{ backgroundColor: '#f0fdfa', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', color: '#0f172a', minWidth: '1100px' }}>
            
            <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10, borderBottom: '3px solid #0d9488' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTruckLoading /> Supplier Directory & Registration
                    </h1>
                </div>
                <div style={{ backgroundColor: '#f0fdfa', padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#0d9488', fontWeight: '600' }}>System Date:</span>
                    <span style={{ fontSize: '15px', color: '#0f766e', fontWeight: '800' }}>{formattedDate}</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
                
                <div style={{ width: '380px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: isEditing ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}>
                    
                    <div style={{ backgroundColor: isEditing ? '#fffbeb' : '#f0fdfa', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isEditing ? <FaEdit color="#d97706" /> : <FaTruckLoading color="#0d9488" />}
                        <span style={{ fontSize: '14px', fontWeight: '700', color: isEditing ? '#b45309' : '#0f766e', textTransform: 'uppercase' }}>
                            {isEditing ? 'Edit Supplier Profile' : 'Register New Supplier'}
                        </span>
                        {isEditing && <button onClick={() => {setFormData(blankForm); setIsEditing(false);}} style={{marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>Cancel (Esc)</button>}
                    </div>

                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, overflowY: 'auto' }}>
                        <div style={formRow}>
                            <span style={formLabel}>Supp ID:</span>
                            <input type="text" readOnly value={formData.code} style={{ ...readOnlyInput, width: '100px', textAlign: 'center', color: '#0d9488', fontWeight: '800' }} />
                        </div>

                        <div style={formRow}><span style={formLabel}>Company:</span><input id="input-name" type="text" autoComplete="off" value={formData.name} onChange={(e) => handleChange(e, 'name')} onKeyDown={(e) => handleKeyDown(e, 'name')} style={activeInput} placeholder="e.g. Pfizer Ltd" /></div>
                        <div style={formRow}><span style={formLabel}>Agent/Rep:</span><input id="input-agent" type="text" autoComplete="off" value={formData.agent} onChange={(e) => handleChange(e, 'agent')} onKeyDown={(e) => handleKeyDown(e, 'agent')} style={activeInput} placeholder="Contact Person" /></div>
                        <div style={formRow}><span style={formLabel}>Phone:</span><input id="input-phone" type="text" autoComplete="off" value={formData.phone} onChange={(e) => handleChange(e, 'phone')} onKeyDown={(e) => handleKeyDown(e, 'phone')} style={activeInput} /></div>
                        <div style={formRow}><span style={formLabel}>Address:</span><input id="input-address" type="text" autoComplete="off" value={formData.address} onChange={(e) => handleChange(e, 'address')} onKeyDown={(e) => handleKeyDown(e, 'address')} style={activeInput} /></div>
                        
                        <div style={formRow}>
                            <span style={formLabel}>Opening Bal:</span>
                            <input id="input-balance" type="number" autoComplete="off" value={formData.balance} onChange={(e) => handleChange(e, 'balance')} onKeyDown={(e) => handleKeyDown(e, 'balance')} style={{...activeInput, textAlign: 'right', fontWeight: 'bold', color: '#ea580c'}} placeholder="0.00" />
                        </div>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                        <button id="input-saveBtn" onClick={handleSave} style={{...btnPrimary, width: '100%', justifyContent: 'center'}}><FaSave /> {isEditing ? 'Update Record (F5)' : 'Save Record (F4)'}</button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleDelete} style={{...btnDanger, flexGrow: 1, justifyContent: 'center'}}><FaTrash /> Delete (F9)</button>
                            <button onClick={() => {setFormData(blankForm); setIsEditing(false);}} style={{...btnOutline, flexGrow: 1, justifyContent: 'center'}}><FaEraser /> Clear (F12)</button>
                        </div>
                    </div>
                </div>

                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    
                    <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '8px', flexGrow: 1, border: '1px solid #0d9488', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.1)' }}>
                            <FaSearch color="#0d9488" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search vendors by Name, Code, or Phone..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 'none', outline: 'none', padding: '0 10px', fontSize: '15px', flexGrow: 1, fontWeight: '500', color: '#334155' }} 
                            />
                        </div>
                        <div style={{ color: '#64748b', fontWeight: '600', fontSize: '14px', minWidth: '150px', textAlign: 'right' }}>
                            Registered Vendors: <span style={{color: '#0f766e', fontWeight: '800'}}>{filteredSuppliers.length}</span>
                        </div>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <tr>
                                    <th style={gridTh}>Supp ID</th>
                                    <th style={{ ...gridTh, textAlign: 'left' }}>Company Name</th>
                                    <th style={{ ...gridTh, textAlign: 'left' }}>Agent / Rep</th>
                                    <th style={gridTh}>Phone</th>
                                    <th style={{ ...gridTh, textAlign: 'left' }}>Address</th>
                                    <th style={{ ...gridTh, textAlign: 'right', color: '#ea580c' }}>Current Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((supp, index) => (
                                    <tr key={index} 
                                        onClick={() => loadSupplierForEdit(supp)}
                                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: supp.code === formData.code ? '#fef3c7' : (index % 2 === 0 ? '#ffffff' : '#f0fdfa'), transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => {if(supp.code !== formData.code) e.currentTarget.style.backgroundColor = '#ccfbf1'}}
                                        onMouseLeave={(e) => {if(supp.code !== formData.code) e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f0fdfa'}}
                                    >
                                        <td style={{...gridTd, fontWeight: '700', color: '#0d9488'}}>{supp.code}</td>
                                        <td style={{ ...gridTd, textAlign: 'left', fontWeight: '700', color: '#1e293b' }}>{supp.name}</td>
                                        <td style={{ ...gridTd, textAlign: 'left' }}>{supp.agent}</td>
                                        <td style={gridTd}>{supp.phone}</td>
                                        <td style={{ ...gridTd, textAlign: 'left', fontSize: '13px' }}>{supp.address}</td>
                                        <td style={{ ...gridTd, textAlign: 'right', fontWeight: '800', color: parseFloat(supp.current_balance) > 0 ? '#ea580c' : '#059669', fontSize: '15px' }}>
                                            {parseFloat(supp.current_balance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                                {filteredSuppliers.length === 0 && (
                                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Database is empty or no match found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const formRow = { display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 };
const formLabel = { color: '#475569', fontSize: '13px', fontWeight: '700' };

const activeInput = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' };
const readOnlyInput = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid transparent', outline: 'none', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: '600' };

const gridTh = { padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' };
const gridTd = { padding: '14px 16px', fontSize: '14px', color: '#334155', textAlign: 'center' }; 

const btnBase = { padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', border: 'none' };
const btnPrimary = { ...btnBase, backgroundColor: '#0d9488', color: '#ffffff', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.3)' };
const btnOutline = { ...btnBase, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155' };
const btnDanger = { ...btnBase, backgroundColor: '#fff1f2', color: '#e11d48' };

export default SupplierRegistration;