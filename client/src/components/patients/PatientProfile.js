import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const PatientProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [patientRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/patients/${id}`),
                axios.get(`${API_URL}/tests/patient/${id}`)
            ]);
            setPatient(patientRes.data);
            setTestHistory(historyRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (birthDate) => {
        const hoy = new Date();
        const nacimiento = new Date(birthDate);
        let edadAnos = hoy.getFullYear() - nacimiento.getFullYear();
        let edadMeses = hoy.getMonth() - nacimiento.getMonth();
        if (edadMeses < 0) {
            edadAnos--;
            edadMeses += 12;
        }
        return `${edadAnos} años y ${edadMeses} meses`;
    };

    const getRiesgoColor = (nivel) => {
        switch (nivel) {
            case 'alto': return '#dc2626';
            case 'medio': return '#d97706';
            default: return '#16a34a';
        }
    };

    const getRiesgoText = (nivel) => {
        switch (nivel) {
            case 'alto': return 'ALTO';
            case 'medio': return 'MEDIO';
            default: return 'BAJO';
        }
    };

    const downloadPDF = async (applicationId) => {
        try {
            const response = await axios.get(`${API_URL}/reports/${applicationId}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `informe_${applicationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Error al descargar el informe');
        }
    };

    if (loading) {
        return <div className="loading">Cargando perfil del paciente...</div>;
    }

    if (!patient) {
        return <div className="error-message">Paciente no encontrado</div>;
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
                    <h2>Perfil del Paciente</h2>
                    <div className="header-actions">
                        <Link to={`/tests?patient=${id}`} className="btn-primary">
                            Aplicar Test
                        </Link>
                        <Link to={`/patients/${id}/diagnostic`} className="btn-secondary">
                            Evaluaciones Diagnósticas
                        </Link>
                        <Link to={`/patients/${id}/edit`} className="btn-secondary">
                            Editar
                        </Link>
                    </div>
                </div>

                <div className="patient-profile">
                    <div className="profile-card">
                        <h3>Datos Personales</h3>
                        <div className="profile-info">
                            <div className="info-item">
                                <span className="label">Nombre Completo:</span>
                                <span className="value">{patient.nombre} {patient.apellido}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Fecha de Nacimiento:</span>
                                <span className="value">{patient.fecha_nacimiento}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Edad:</span>
                                <span className="value">{calculateAge(patient.fecha_nacimiento)}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Sexo:</span>
                                <span className="value">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
                            </div>
                            {patient.cedula && (
                                <div className="info-item">
                                    <span className="label">Cédula:</span>
                                    <span className="value">{patient.cedula}</span>
                                </div>
                            )}
                        </div>

                        <h3>Información de Contacto</h3>
                        <div className="profile-info">
                            {patient.direccion && (
                                <div className="info-item">
                                    <span className="label">Dirección:</span>
                                    <span className="value">{patient.direccion}</span>
                                </div>
                            )}
                            {patient.telefono_contacto && (
                                <div className="info-item">
                                    <span className="label">Teléfono:</span>
                                    <span className="value">{patient.telefono_contacto}</span>
                                </div>
                            )}
                            {patient.nombre_padre && (
                                <div className="info-item">
                                    <span className="label">Padre:</span>
                                    <span className="value">{patient.nombre_padre}</span>
                                </div>
                            )}
                            {patient.nombre_madre && (
                                <div className="info-item">
                                    <span className="label">Madre:</span>
                                    <span className="value">{patient.nombre_madre}</span>
                                </div>
                            )}
                        </div>

                        {patient.motivo_consulta && (
                            <>
                                <h3>Motivo de Consulta</h3>
                                <p className="motivo-text">{patient.motivo_consulta}</p>
                            </>
                        )}
                    </div>

                    <div className="history-card">
                        <h3>Historial de Evaluaciones</h3>
                        
                        {testHistory.length === 0 ? (
                            <div className="empty-history">
                                <p>No hay evaluaciones registradas para este paciente.</p>
                                <Link to={`/tests?patient=${id}`} className="btn-primary">
                                    Aplicar Primer Test
                                </Link>
                            </div>
                        ) : (
                            <div className="history-list">
                                {testHistory.map(app => (
                                    <div key={app.id} className="history-item">
                                        <div className="history-header">
                                            <div className="test-info">
                                                <span className="test-name">{app.test_nombre}</span>
                                                <span className="test-code">{app.test_codigo}</span>
                                            </div>
                                            <div className="history-date">
                                                {new Date(app.fecha_aplicacion).toLocaleDateString('es-EC')}
                                            </div>
                                        </div>
                                        
                                        <div className="history-results">
                                            <div className="score">
                                                <span className="label">Puntuación:</span>
                                                <span className="value">{app.puntuacion_total}</span>
                                            </div>
                                            <div className="risk">
                                                <span className="label">Riesgo:</span>
                                                <span 
                                                    className="value risk-badge"
                                                    style={{ backgroundColor: getRiesgoColor(app.nivel_riesgo) }}
                                                >
                                                    {getRiesgoText(app.nivel_riesgo)}
                                                </span>
                                            </div>
                                        </div>

                                        {Object.keys(app.puntuacion_por_seccion || {}).length > 0 && (
                                            <div className="section-scores">
                                                {Object.entries(app.puntuacion_por_seccion).map(([seccion, puntos]) => (
                                                    <span key={seccion} className="section-score">
                                                        {seccion}: {puntos}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {app.observaciones && (
                                            <div className="observations">
                                                <strong>Observaciones:</strong> {app.observaciones}
                                            </div>
                                        )}

                                        <div className="history-actions">
                                            <button 
                                                onClick={() => navigate(`/reports/${app.id}`)}
                                                className="btn-small"
                                            >
                                                Ver Informe
                                            </button>
                                            <button 
                                                onClick={() => downloadPDF(app.id)}
                                                className="btn-small"
                                            >
                                                Descargar PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <Link to="/patients" className="back-link">← Volver a Pacientes</Link>
            </main>
        </div>
    );
};

export default PatientProfile;