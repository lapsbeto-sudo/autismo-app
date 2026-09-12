import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({
        totalPatients: 0,
        totalTests: 0,
        recentTests: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const patientsRes = await axios.get(`${API_URL}/patients?limit=1`);
            const testsRes = await axios.get(`${API_URL}/tests`);
            
            setStats({
                totalPatients: patientsRes.data.pagination?.total || 0,
                totalTests: testsRes.data?.length || 0,
                recentTests: []
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Cargando dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <header className="main-header">
                <div className="header-content">
                    <h1>AutismoApp</h1>
                    <div className="user-info">
                        <span>Bienvenido, {user?.nombre}</span>
                        <button onClick={logout} className="btn-secondary">Cerrar Sesión</button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="welcome-section">
                    <h2>Panel de Control</h2>
                    <p>Sistema de Evaluación de Autismo - Ecuador</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalPatients}</div>
                        <div className="stat-label">Pacientes Registrados</div>
                        <Link to="/patients" className="stat-link">Ver todos →</Link>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalTests}</div>
                        <div className="stat-label">Tests Disponibles</div>
                        <Link to="/tests" className="stat-link">Ver tests →</Link>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-number">4</div>
                        <div className="stat-label">Instrumentos Válidos</div>
                        <span className="stat-detail">Ecuador</span>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-number">0-17</div>
                        <div className="stat-label">Edad (años)</div>
                        <span className="stat-detail">Cobertura</span>
                    </div>
                </div>

                <div className="quick-actions">
                    <h3>Acciones Rápidas</h3>
                    <div className="action-buttons">
                        <Link to="/patients/new" className="action-btn">
                            <span className="action-icon">+</span>
                            Nuevo Paciente
                        </Link>
                        <Link to="/tests" className="action-btn">
                            <span className="action-icon">▶</span>
                            Aplicar Test
                        </Link>
                        <Link to="/patients" className="action-btn">
                            <span className="action-icon">📋</span>
                            Ver Pacientes
                        </Link>
                        <Link to="/admin" className="action-btn">
                            <span className="action-icon">⚙</span>
                            Administrar Tests
                        </Link>
                    </div>
                </div>

                <div className="tests-overview">
                    <h3>Tests Disponibles</h3>
                    <div className="tests-grid">
                        <div className="test-card">
                            <h4>M-CHAT-R/F</h4>
                            <p>16-30 meses | Entrevista a padres</p>
                            <span className="test-badge">Tamizaje</span>
                        </div>
                        <div className="test-card">
                            <h4>ADEC</h4>
                            <p>12-48 meses | Observación directa</p>
                            <span className="test-badge">Detección temprana</span>
                        </div>
                        <div className="test-card">
                            <h4>ITEA</h4>
                            <p>4-17 años | Cuestionario</p>
                            <span className="test-badge">Ecuador</span>
                        </div>
                        <div className="test-card">
                            <h4>Denver II</h4>
                            <p>0-6 años | Evaluación directa</p>
                            <span className="test-badge">Neurodesarrollo</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;