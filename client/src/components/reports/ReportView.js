import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const ReportView = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [applicationId]);

    const fetchReport = async () => {
        try {
            const response = await axios.get(`${API_URL}/reports/${applicationId}`);
            setReport(response.data);
        } catch (err) {
            setError('Error al cargar el informe');
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        try {
            const response = await axios.get(`${API_URL}/reports/${applicationId}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `informe_${report.test_codigo}_${report.patient_apellido}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Error al descargar el informe');
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

    if (loading) {
        return <div className="loading">Cargando informe...</div>;
    }

    if (error) {
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
                    <h2>Informe de Evaluación</h2>
                    <div className="header-actions">
                        <Link to={`/reports/${applicationId}/edit`} className="btn-primary">
                            Editar Informe
                        </Link>
                        <button onClick={downloadPDF} className="btn-secondary">
                            Descargar PDF
                        </button>
                    </div>
                </div>

                <div className="report-container">
                    <div className="report-header">
                        <h3>INFORME DE EVALUACIÓN</h3>
                        <p>Trastorno del Espectro Autista</p>
                    </div>

                    <div className="report-section">
                        <h4>DATOS DEL PROFESIONAL</h4>
                        <p><strong>Nombre:</strong> {report.doctor_nombre} {report.doctor_apellido}</p>
                        <p><strong>Especialidad:</strong> {report.especialidad || 'Psicología Clínica'}</p>
                    </div>

                    <div className="report-section">
                        <h4>DATOS DEL PACIENTE</h4>
                        <p><strong>Nombre:</strong> {report.patient_nombre} {report.patient_apellido}</p>
                        <p><strong>Fecha de Nacimiento:</strong> {report.fecha_nacimiento}</p>
                        <p><strong>Edad:</strong> {calculateAge(report.fecha_nacimiento)}</p>
                        <p><strong>Sexo:</strong> {report.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
                        {report.cedula && <p><strong>Cédula:</strong> {report.cedula}</p>}
                        {report.motivo_consulta && <p><strong>Motivo de Consulta:</strong> {report.motivo_consulta}</p>}
                    </div>

                    <div className="report-section">
                        <h4>DATOS DE LA EVALUACIÓN</h4>
                        <p><strong>Test Aplicado:</strong> {report.test_nombre}</p>
                        <p><strong>Código:</strong> {report.test_codigo}</p>
                        <p><strong>Fecha de Aplicación:</strong> {report.fecha_aplicacion}</p>
                    </div>

                    <div className="report-section results">
                        <h4>RESULTADOS</h4>
                        <div className="score-box">
                            <div className="total-score">
                                <span className="label">Puntuación Total:</span>
                                <span className="value">{report.puntuacion_total}</span>
                            </div>
                            <div className="risk-level" style={{ backgroundColor: getRiesgoColor(report.nivel_riesgo) }}>
                                <span className="label">Nivel de Riesgo:</span>
                                <span className="value">{getRiesgoText(report.nivel_riesgo)}</span>
                            </div>
                        </div>

                        {Object.keys(report.puntuacion_por_seccion).length > 0 && (
                            <div className="section-scores">
                                <h5>Desglose por Secciones:</h5>
                                <ul>
                                    {Object.entries(report.puntuacion_por_seccion).map(([seccion, puntos]) => (
                                        <li key={seccion}>{seccion}: {puntos} puntos</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="report-section interpretation">
                        <h4>INTERPRETACIÓN</h4>
                        {report.nivel_riesgo === 'alto' && (
                            <p className="risk-text high">
                                Se recomienda derivación urgente a evaluación diagnóstica especializada. 
                                Se identificaron indicadores significativos que sugieren la necesidad de 
                                una evaluación completa del Trastorno del Espectro Autista.
                            </p>
                        )}
                        {report.nivel_riesgo === 'medio' && (
                            <p className="risk-text medium">
                                Se recomienda seguimiento y reevaluación. Se identificaron algunos 
                                indicadores que requieren atención. Se sugiere realizar entrevista de 
                                seguimiento o aplicación de instrumentos complementarios.
                            </p>
                        )}
                        {report.nivel_riesgo === 'bajo' && (
                            <p className="risk-text low">
                                No se identificaron indicadores significativos de riesgo de TEA en esta 
                                evaluación. Se recomienda mantener seguimiento del desarrollo en consultas regulares.
                            </p>
                        )}
                    </div>

                    {report.observaciones && (
                        <div className="report-section">
                            <h4>OBSERVACIONES DEL EVALUADOR</h4>
                            <p>{report.observaciones}</p>
                        </div>
                    )}

                    <div className="report-section recommendations">
                        <h4>RECOMENDACIONES</h4>
                        {report.recomendaciones ? (
                            <p>{report.recomendaciones}</p>
                        ) : (
                            <ol>
                                <li>Este instrumento es de tamizaje y no sustituye una evaluación diagnóstica completa.</li>
                                <li>Los resultados deben ser interpretados por un profesional especializado.</li>
                                <li>Se recomienda integrar los resultados con observación clínica directa.</li>
                                <li>Considerar factores culturales y ambientales en la interpretación.</li>
                            </ol>
                        )}
                    </div>

                    <div className="report-footer">
                        <div className="signatures">
                            <div className="signature">
                                <div className="line"></div>
                                <p>Firma del Profesional</p>
                            </div>
                            <div className="signature">
                                <div className="line"></div>
                                <p>Sello</p>
                            </div>
                        </div>
                        <p className="generated">
                            Informe generado el {new Date(report.created_at || report.fecha_aplicacion).toLocaleDateString('es-EC')} a las {new Date(report.created_at || report.fecha_aplicacion).toLocaleTimeString('es-EC')}
                            {report.modified_at && (
                                <span> | Última modificación: {new Date(report.modified_at).toLocaleDateString('es-EC')} a las {new Date(report.modified_at).toLocaleTimeString('es-EC')}</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="report-actions">
                    <Link to="/patients" className="btn-secondary">← Volver a Pacientes</Link>
                    <button onClick={downloadPDF} className="btn-primary">Descargar PDF</button>
                </div>
            </main>
        </div>
    );
};

export default ReportView;