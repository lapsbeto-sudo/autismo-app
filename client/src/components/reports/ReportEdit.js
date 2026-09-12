import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

import API_URL from '../../config';

const ReportEdit = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        observaciones: '',
        recomendaciones: '',
        nivel_riesgo: ''
    });

    useEffect(() => {
        fetchReport();
    }, [applicationId]);

    const fetchReport = async () => {
        try {
            const response = await axios.get(`${API_URL}/reports/${applicationId}`);
            setReport(response.data);
            setFormData({
                observaciones: response.data.observaciones || '',
                recomendaciones: response.data.recomendaciones || '',
                nivel_riesgo: response.data.nivel_riesgo || 'bajo'
            });
        } catch (err) {
            setError('Error al cargar el informe');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await axios.put(`${API_URL}/reports/${applicationId}`, formData);
            navigate(`/reports/${applicationId}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const getRiesgoColor = (nivel) => {
        switch (nivel) {
            case 'alto': return '#dc2626';
            case 'medio': return '#d97706';
            default: return '#16a34a';
        }
    };

    if (loading) {
        return <div className="loading">Cargando informe...</div>;
    }

    if (error && !report) {
        return <div className="error-message">{error}</div>;
    }

    if (!report) {
        return <div className="error-message">Informe no encontrado</div>;
    }

    return (
        <div className="dashboard">
            <header className="main-header">
                <div className="header-content">
                    <h1>AutismoApp</h1>
                    <div className="user-info">
                        <span>{user?.nombre}</span>
                        <button onClick={logout} className="btn-secondary">Cerrar Sesión</button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="page-header">
                    <h2>Editar Informe</h2>
                </div>

                <div className="edit-report-container">
                    <div className="report-summary">
                        <h3>Resumen del Informe</h3>
                        <div className="summary-row">
                            <span><strong>Paciente:</strong> {report.patient_nombre} {report.patient_apellido}</span>
                            <span><strong>Test:</strong> {report.test_nombre}</span>
                            <span><strong>Fecha:</strong> {new Date(report.fecha_aplicacion).toLocaleDateString('es-EC')}</span>
                        </div>
                        <div className="summary-row">
                            <span><strong>Puntuación:</strong> {report.puntuacion_total}</span>
                            <span><strong>Riesgo Actual:</strong> 
                                <span 
                                    className="risk-badge"
                                    style={{ backgroundColor: getRiesgoColor(report.nivel_riesgo), marginLeft: '5px' }}
                                >
                                    {report.nivel_riesgo.toUpperCase()}
                                </span>
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="edit-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="nivel_riesgo">Nivel de Riesgo</label>
                            <select
                                id="nivel_riesgo"
                                value={formData.nivel_riesgo}
                                onChange={(e) => setFormData({...formData, nivel_riesgo: e.target.value})}
                            >
                                <option value="bajo">Bajo</option>
                                <option value="medio">Medio</option>
                                <option value="alto">Alto</option>
                            </select>
                            <small className="form-help">
                                Puede modificar la clasificación automática si lo considera necesario.
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="observaciones">Observaciones del Evaluador</label>
                            <textarea
                                id="observaciones"
                                value={formData.observaciones}
                                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                                rows="6"
                                placeholder="Ingrese observaciones adicionales sobre la evaluación, comportamiento del paciente, condiciones de aplicación, etc."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="recomendaciones">Recomendaciones</label>
                            <textarea
                                id="recomendaciones"
                                value={formData.recomendaciones}
                                onChange={(e) => setFormData({...formData, recomendaciones: e.target.value})}
                                rows="6"
                                placeholder="Ingrese recomendaciones personalizadas para el paciente y su familia. Si deja este campo vacío, se usarán las recomendaciones por defecto."
                            />
                            <small className="form-help">
                                Si no ingresa recomendaciones, se usarán las recomendaciones estándar del sistema.
                            </small>
                        </div>

                        <div className="form-actions">
                            <Link 
                                to={`/reports/${applicationId}`} 
                                className="btn-secondary"
                            >
                                Cancelar
                            </Link>
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>

                <Link to={`/reports/${applicationId}`} className="back-link">← Volver al Informe</Link>
            </main>
        </div>
    );
};

export default ReportEdit;