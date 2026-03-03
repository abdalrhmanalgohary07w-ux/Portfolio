"use client";
import { useState, useEffect } from 'react';
import portfolioDataFile from '@/data/portfolioData.json';

const LS_KEY = 'portfolio_admin_data';

export default function AdminPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [data, setData] = useState(portfolioDataFile);
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState('profile');

    // Selection states for Master-Detail views
    const [selectedProjectId, setSelectedProjectId] = useState(0);
    const [selectedCertId, setSelectedCertId] = useState(0);

    useEffect(() => {
        setIsMounted(true);
        // Load from localStorage (persists across sessions on this browser)
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.profile) setData(parsed);
            }
        } catch (e) {
            console.warn('Could not load from localStorage', e);
        }
    }, []);

    const handleProfileChange = (field, value) => {
        setData(prev => ({
            ...prev,
            profile: { ...prev.profile, [field]: value }
        }));
    };

    const handleFileUpload = async (e, section, field, index = null) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('Uploading...');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                if (section === 'profile') {
                    handleProfileChange(field, result.path);
                } else if (section === 'about-images') {
                    handleAboutImageChange(index, result.path);
                } else if (section === 'projects') {
                    handleProjectChange(index, field, result.path);
                } else if (section === 'certificates') {
                    handleCertChange(index, field, result.path);
                }
                setStatus('File uploaded successfully!');
                setTimeout(() => setStatus(''), 3000);
            } else {
                setStatus('Upload failed: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatus('Upload error occurred.');
        }
    };

    const handleAboutTextChange = (index, value) => {
        const newText = [...data.about.text];
        newText[index] = value;
        setData(prev => ({ ...prev, about: { ...prev.about, text: newText } }));
    };

    const handleHighlightChange = (index, value) => {
        const newHighlights = [...data.about.highlights];
        newHighlights[index] = value;
        setData(prev => ({ ...prev, about: { ...prev.about, highlights: newHighlights } }));
    };

    const handleAboutImageChange = (index, value) => {
        const newImages = [...data.about.images];
        newImages[index] = value;
        setData(prev => ({ ...prev, about: { ...prev.about, images: newImages } }));
    };

    const handleAddAboutImage = () => {
        setData(prev => ({
            ...prev,
            about: { ...prev.about, images: [...(prev.about.images || []), ''] }
        }));
    };

    const handleRemoveAboutImage = (index) => {
        const newImages = data.about.images.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, about: { ...prev.about, images: newImages } }));
    };

    const handleProjectChange = (index, field, value) => {
        const updatedProjects = [...data.projects];
        if (field === 'tech' && typeof value === 'string') {
            updatedProjects[index] = { ...updatedProjects[index], [field]: value.split(',').map(s => s.trim()) };
        } else {
            updatedProjects[index] = { ...updatedProjects[index], [field]: value };
        }
        setData(prev => ({ ...prev, projects: updatedProjects }));
    };

    const addProject = () => {
        const newProject = { title: 'New Project', description: '', image: '', tech: [], github: '', link: '' };
        setData(prev => ({
            ...prev,
            projects: [...prev.projects, newProject]
        }));
        setSelectedProjectId(data.projects.length);
    };

    const removeProject = (index) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        const updatedProjects = data.projects.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, projects: updatedProjects }));
        setSelectedProjectId(0);
    };

    const handleCertChange = (index, field, value) => {
        const updatedCerts = [...data.certificates];
        if (field === 'details' && typeof value === 'string') {
            updatedCerts[index] = { ...updatedCerts[index], [field]: value.split('\n').filter(s => s.trim()) };
        } else {
            updatedCerts[index] = { ...updatedCerts[index], [field]: value };
        }
        setData(prev => ({ ...prev, certificates: updatedCerts }));
    };

    const addCert = () => {
        const newCert = { title: 'New Certificate', organization: '', fullOrgName: '', year: '', image: '', details: [] };
        setData(prev => ({
            ...prev,
            certificates: [...prev.certificates, newCert]
        }));
        setSelectedCertId(data.certificates.length);
    };

    const removeCert = (index) => {
        if (!confirm('Are you sure you want to delete this certificate Entry?')) return;
        const updatedCerts = data.certificates.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, certificates: updatedCerts }));
        setSelectedCertId(0);
    };

    const handleTechChange = (index, field, value) => {
        const updatedTech = [...data.techStack];
        updatedTech[index] = { ...updatedTech[index], [field]: value };
        setData(prev => ({ ...prev, techStack: updatedTech }));
    };

    const addTech = () => {
        setData(prev => ({
            ...prev,
            techStack: [...prev.techStack, { name: '', icon: '', color: '' }]
        }));
    };

    const removeTech = (index) => {
        const updatedTech = data.techStack.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, techStack: updatedTech }));
    };

    const handleSave = () => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(data));
            setStatus('✅ Changes saved! They persist in this browser. Click "Export JSON" to make them live.');
            setTimeout(() => setStatus(''), 5000);
        } catch (e) {
            setStatus('❌ Could not save to localStorage.');
        }
    };

    const handleExportJSON = () => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolioData.json';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('📥 JSON downloaded! Replace data/portfolioData.json in your project, then git push to go live.');
        setTimeout(() => setStatus(''), 7000);
    };

    const handleReset = () => {
        if (!confirm('Reset to the last deployed version? All unsaved local changes will be lost.')) return;
        localStorage.removeItem(LS_KEY);
        setData(portfolioDataFile);
        setStatus('🔄 Reset to deployed version.');
        setTimeout(() => setStatus(''), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'fa-user' },
        { id: 'about', label: 'About Text', icon: 'fa-address-card' },
        { id: 'techStack', label: 'Skills/Tech', icon: 'fa-code' },
        { id: 'projects', label: 'Projects', icon: 'fa-briefcase' },
        { id: 'certificates', label: 'Certificates', icon: 'fa-award' },
    ];

    if (!isMounted) return null;

    return (
        <div className="admin-dashboard" style={{
            background: '#0a192f',
            color: '#ccd6f6',
            minHeight: '100vh',
            display: 'flex',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Sidebar */}
            <aside style={{
                width: '280px',
                background: '#112240',
                borderRight: '1px solid #233554',
                padding: '30px 0',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 10
            }}>
                <div style={{ padding: '0 30px 40px' }}>
                    <div style={{ color: '#64ffda', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {"{"} AE {"}"} ADMIN
                    </div>
                </div>

                <nav style={{ flex: 1 }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                width: '100%',
                                padding: '16px 30px',
                                background: activeTab === tab.id ? 'rgba(100, 255, 218, 0.05)' : 'transparent',
                                color: activeTab === tab.id ? '#64ffda' : '#8892b0',
                                border: 'none',
                                borderLeft: activeTab === tab.id ? '3px solid #64ffda' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '15px',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}
                        >
                            <i className={`fa-solid ${tab.icon}`} style={{ width: '20px' }}></i>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: '30px' }}>
                    <a href="/" target="_blank" style={{
                        display: 'block',
                        padding: '12px',
                        background: 'rgba(230, 241, 255, 0.05)',
                        color: '#64ffda',
                        textDecoration: 'none',
                        textAlign: 'center',
                        borderRadius: '4px',
                        fontSize: '14px',
                        border: '1px solid #233554'
                    }}>
                        Go to Main Site
                    </a>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ marginLeft: '280px', flex: 1, padding: '40px 60px' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '50px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '28px', color: '#e6f1ff', margin: 0 }}>
                            {tabs.find(t => t.id === activeTab).label} Settings
                        </h2>
                        <p style={{ color: '#8892b0', marginTop: '8px' }}>Manage your portfolio's {activeTab} section items.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={handleReset}
                            style={{
                                background: 'transparent',
                                color: '#8892b0',
                                border: '1px solid #233554',
                                padding: '12px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleExportJSON}
                            style={{
                                background: 'transparent',
                                color: '#64ffda',
                                border: '1px solid #64ffda',
                                padding: '15px 25px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '600',
                            }}
                        >
                            <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i>
                            Export JSON
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                background: '#64ffda',
                                color: '#0a192f',
                                border: 'none',
                                padding: '15px 35px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                                transition: 'all 0.3s',
                                boxShadow: '0 10px 20px -10px rgba(100, 255, 218, 0.3)'
                            }}
                        >
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '10px' }}></i>
                            Save Changes
                        </button>
                    </div>
                </header>

                {status && (
                    <div style={{
                        padding: '18px',
                        background: status.includes('successfully') ? 'rgba(100, 255, 218, 0.1)' : 'rgba(255, 100, 100, 0.1)',
                        border: `1px solid ${status.includes('successfully') ? '#64ffda' : '#ff6464'}`,
                        borderRadius: '8px',
                        marginBottom: '40px',
                        textAlign: 'center',
                        fontWeight: '500',
                        color: status.includes('successfully') ? '#64ffda' : '#ff6464'
                    }}>
                        {status}
                    </div>
                )}

                {/* Tab Contents */}
                <div style={{ animation: 'adminFadeIn 0.4s ease' }}>
                    {activeTab === 'profile' && (
                        <section style={cardStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <Field label="Full Name" value={data.profile.name} onChange={(v) => handleProfileChange('name', v)} />
                                <Field label="Professional Role" value={data.profile.role} onChange={(v) => handleProfileChange('role', v)} />
                                <Field label="Hero Tagline" value={data.profile.tagline} onChange={(v) => handleProfileChange('tagline', v)} />
                                <Field label="Email Address" value={data.profile.email} onChange={(v) => handleProfileChange('email', v)} />
                                <Field label="WhatsApp" value={data.profile.whatsapp} onChange={(v) => handleProfileChange('whatsapp', v)} />
                                <Field label="GitHub URL" value={data.profile.github} onChange={(v) => handleProfileChange('github', v)} />
                                <Field label="LinkedIn URL" value={data.profile.linkedin} onChange={(v) => handleProfileChange('linkedin', v)} />
                                <div style={{ gridColumn: 'span 2' }}>
                                    <ImageUploadField
                                        label="Hero Section Avatar"
                                        value={data.profile.heroImage || ''}
                                        onUpload={(e) => handleFileUpload(e, 'profile', 'heroImage')}
                                        onTextChange={(v) => handleProfileChange('heroImage', v)}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Hero Bio / Description</label>
                                    <textarea
                                        style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                                        value={data.profile.description}
                                        onChange={(e) => handleProfileChange('description', e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'about' && (
                        <section style={cardStyle}>
                            <h4 style={{ color: '#64ffda', marginBottom: '20px' }}>Biography Paragraphs</h4>
                            {data.about.text.map((text, idx) => (
                                <div key={idx} style={{ marginBottom: '20px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: '-10px', left: '15px', background: '#112240', padding: '0 10px', fontSize: '12px', color: '#8892b0' }}>Paragraph {idx + 1}</span>
                                    <textarea
                                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                                        value={text}
                                        onChange={(e) => handleAboutTextChange(idx, e.target.value)}
                                    />
                                </div>
                            ))}
                            <div style={{ marginTop: '30px' }}>
                                <h4 style={{ color: '#64ffda', marginBottom: '20px' }}>Core Highlights</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {data.about.highlights.map((h, idx) => (
                                        <input
                                            key={idx}
                                            style={inputStyle}
                                            value={h}
                                            onChange={(e) => handleHighlightChange(idx, e.target.value)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '30px', borderTop: '1px solid #233554', paddingTop: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#64ffda', margin: 0 }}>About Me Images (Photo Stack)</h4>
                                    <button onClick={handleAddAboutImage} style={addBtnMiniStyle}>+ Add Image</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {(data.about.images || []).map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', background: 'rgba(10, 25, 47, 0.3)', padding: '20px', borderRadius: '12px', border: '1px solid #233554' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <span style={{ fontSize: '13px', color: '#8892b0', fontWeight: '600' }}>Card {idx + 1}</span>
                                                <button
                                                    onClick={() => handleRemoveAboutImage(idx)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ff6464', cursor: 'pointer', fontSize: '18px' }}
                                                    title="Remove Image"
                                                >
                                                    <i className="fa-solid fa-circle-xmark"></i>
                                                </button>
                                            </div>
                                            <ImageUploadField
                                                label=""
                                                value={img}
                                                onUpload={(e) => handleFileUpload(e, 'about-images', 'images', idx)}
                                                onTextChange={(v) => handleAboutImageChange(idx, v)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {(data.about.images?.length === 0) && (
                                    <p style={{ textAlign: 'center', color: '#8892b0', padding: '30px', border: '1px dashed #233554', borderRadius: '12px' }}>
                                        No images in stack. Add some to enable the Photo Stack effect!
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'techStack' && (
                        <section>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {data.techStack.map((tech, idx) => (
                                    <div key={idx} style={itemBoxStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(100, 255, 218, 0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className={tech.icon} style={{ color: tech.color, fontSize: '20px' }}></i>
                                            </div>
                                            <button onClick={() => removeTech(idx)} style={iconBtnStyle} title="Delete"><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                        <Field label="Name" value={tech.name} onChange={(v) => handleTechChange(idx, 'name', v)} />
                                        <Field label="Icon Class" value={tech.icon} onChange={(v) => handleTechChange(idx, 'icon', v)} />
                                        <Field label="Brand Color" value={tech.color} onChange={(v) => handleTechChange(idx, 'color', v)} />
                                    </div>
                                ))}
                                <button onClick={addTech} style={addItemBoxStyle}>
                                    <i className="fa-solid fa-plus-circle" style={{ fontSize: '28px', marginBottom: '10px' }}></i>
                                    Add New Skill
                                </button>
                            </div>
                        </section>
                    )}

                    {activeTab === 'projects' && (
                        <section style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '40px', alignItems: 'start' }}>
                            {/* Master List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <button onClick={addProject} style={addBtnStyleMaster}>+ Add Project</button>
                                <div style={{
                                    maxHeight: '70vh',
                                    overflowY: 'auto',
                                    paddingRight: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    // Custom scrollbar classes or styles
                                }}>
                                    {data.projects.map((p, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedProjectId(idx)}
                                            style={{
                                                padding: '15px',
                                                background: selectedProjectId === idx ? 'rgba(100, 255, 218, 0.1)' : '#112240',
                                                border: `1px solid ${selectedProjectId === idx ? '#64ffda' : '#233554'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ width: '40px', height: '40px', background: '#0a192f', borderRadius: '4px', overflow: 'hidden' }}>
                                                {p.image && !p.image.startsWith('placeholder') ? (
                                                    <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className="fa-solid fa-folder" style={{ color: '#8892b0' }}></i>
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '14px', color: selectedProjectId === idx ? '#64ffda' : '#ccd6f6', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.title || 'Untitled'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Details View */}
                            {data.projects[selectedProjectId] && (
                                <div style={cardStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #233554', paddingBottom: '15px' }}>
                                        <h3 style={{ margin: 0, color: '#e6f1ff' }}>Details: {data.projects[selectedProjectId].title}</h3>
                                        <button onClick={() => removeProject(selectedProjectId)} style={deleteBtnStyle}>Delete Project</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                        <Field label="Project Title" value={data.projects[selectedProjectId].title} onChange={(v) => handleProjectChange(selectedProjectId, 'title', v)} />
                                        <ImageUploadField
                                            label="Project Image"
                                            value={data.projects[selectedProjectId].image}
                                            onUpload={(e) => handleFileUpload(e, 'projects', 'image', selectedProjectId)}
                                            onTextChange={(v) => handleProjectChange(selectedProjectId, 'image', v)}
                                        />
                                        <Field label="GitHub URL" value={data.projects[selectedProjectId].github} onChange={(v) => handleProjectChange(selectedProjectId, 'github', v)} />
                                        <Field label="Live URL" value={data.projects[selectedProjectId].link} onChange={(v) => handleProjectChange(selectedProjectId, 'link', v)} />
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <Field label="Tech Stack (comma separated)" value={data.projects[selectedProjectId].tech.join(', ')} onChange={(v) => handleProjectChange(selectedProjectId, 'tech', v)} />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={labelStyle}>Project Description</label>
                                            <textarea
                                                style={{ ...inputStyle, minHeight: '120px' }}
                                                value={data.projects[selectedProjectId].description}
                                                onChange={(e) => handleProjectChange(selectedProjectId, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'certificates' && (
                        <section style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '40px', alignItems: 'start' }}>
                            {/* Master List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <button onClick={addCert} style={addBtnStyleMaster}>+ Add Certificate</button>
                                <div style={{
                                    maxHeight: '70vh',
                                    overflowY: 'auto',
                                    paddingRight: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    {data.certificates.map((c, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedCertId(idx)}
                                            style={{
                                                padding: '15px',
                                                background: selectedCertId === idx ? 'rgba(100, 255, 218, 0.1)' : '#112240',
                                                border: `1px solid ${selectedCertId === idx ? '#64ffda' : '#233554'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ width: '40px', height: '40px', background: '#0a192f', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className="fa-solid fa-award" style={{ color: selectedCertId === idx ? '#64ffda' : '#8892b0' }}></i>
                                            </div>
                                            <span style={{ fontSize: '14px', color: selectedCertId === idx ? '#64ffda' : '#ccd6f6', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.title || 'New Entry'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Details View */}
                            {data.certificates[selectedCertId] && (
                                <div style={cardStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #233554', paddingBottom: '15px' }}>
                                        <h3 style={{ margin: 0, color: '#e6f1ff' }}>Credential: {data.certificates[selectedCertId].title}</h3>
                                        <button onClick={() => removeCert(selectedCertId)} style={deleteBtnStyle}>Delete Entry</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                        <Field label="Cert Title" value={data.certificates[selectedCertId].title} onChange={(v) => handleCertChange(selectedCertId, 'title', v)} />
                                        <Field label="Organization" value={data.certificates[selectedCertId].organization} onChange={(v) => handleCertChange(selectedCertId, 'organization', v)} />
                                        <Field label="Full Org Name" value={data.certificates[selectedCertId].fullOrgName} onChange={(v) => handleCertChange(selectedCertId, 'fullOrgName', v)} />
                                        <Field label="Year" value={data.certificates[selectedCertId].year} onChange={(v) => handleCertChange(selectedCertId, 'year', v)} />
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <ImageUploadField
                                                label="Certificate Scan"
                                                value={data.certificates[selectedCertId].image}
                                                onUpload={(e) => handleFileUpload(e, 'certificates', 'image', selectedCertId)}
                                                onTextChange={(v) => handleCertChange(selectedCertId, 'image', v)}
                                            />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={labelStyle}>Achievement Details (one per line)</label>
                                            <textarea
                                                style={{ ...inputStyle, minHeight: '120px' }}
                                                value={data.certificates[selectedCertId].details.join('\n')}
                                                onChange={(e) => handleCertChange(selectedCertId, 'details', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

// Subcomponents
function Field({ label, value, onChange }) {
    return (
        <div style={{ marginBottom: '5px' }}>
            <label style={labelStyle}>{label}</label>
            <input
                style={inputStyle}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function ImageUploadField({ label, value, onUpload, onTextChange }) {
    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>{label}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={value}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder="/path-to-image.png"
                />
                <label style={{
                    background: '#112240',
                    border: '1px solid #64ffda',
                    color: '#64ffda',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <i className="fa-solid fa-upload"></i>
                    Upload
                    <input type="file" style={{ display: 'none' }} onChange={onUpload} accept="image/*" />
                </label>
            </div>
        </div>
    );
}

// Styles
const cardStyle = {
    background: '#112240',
    padding: '35px',
    borderRadius: '12px',
    border: '1px solid #233554',
    boxShadow: '0 20px 40px -20px rgba(2,12,27,0.7)',
};

const itemBoxStyle = {
    background: '#112240',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #233554',
};

const addItemBoxStyle = {
    background: 'transparent',
    border: '2px dashed #233554',
    borderRadius: '12px',
    color: '#8892b0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    minHeight: '180px'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#8892b0',
    fontFamily: 'monospace',
    fontWeight: '500'
};

const inputStyle = {
    width: '100%',
    background: '#0a192f',
    border: '1px solid #233554',
    padding: '12px 16px',
    color: '#ccd6f6',
    borderRadius: '6px',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
};

const deleteBtnStyle = {
    background: 'transparent',
    color: '#ff6464',
    border: '1px solid #ff6464',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
};

const iconBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: '#8892b0',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'color 0.2s'
};

const addBtnStyleMaster = {
    width: '100%',
    padding: '15px',
    background: 'rgba(100, 255, 218, 0.1)',
    color: '#64ffda',
    border: '1px solid #64ffda',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '10px'
};

const addBtnMiniStyle = {
    padding: '8px 16px',
    background: 'rgba(100, 255, 218, 0.1)',
    color: '#64ffda',
    border: '1px solid #64ffda',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer'
};
