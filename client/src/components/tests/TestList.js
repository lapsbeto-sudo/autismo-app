import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const TestList = () => {
    const { user, logout } = useAuth();
    const [tests, setTests] = useState([]);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [testsRes, patientsRes] = await Promise.all([
                axios.get(`${API_URL}/tests`),
                axios.get(`${API_URL}/patients?limit=100`)
            ]);
            setTests(testsRes.data);
            setPatients(patientsRes.data.patients || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAgeRange = (minMonths, maxMonths) => {
        const minYears = Math.floor(minMonths / 12);
        const maxYears = Math.floor(maxMonths / 12);
        if (minMonths < 12) {
            return `${minMonths}-${maxMonths} meses`;
        }
        return `${minYears}-${maxYears} años`;
    };

    if (loading) {
        return <div className="loading">Cargando tests...</div>;
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
                    <h2>Tests Disponibles</h2>
                </div>

                <div className="patient-selector">
                    <label>Seleccionar Paciente para Evaluar:</label>
                    <select
                        value={selectedPatient}
                        onChange={(e) => setSelectedPatient(e.target.value)}
                    >
                        <option value="">-- Seleccionar paciente --</option>
                        {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>
                                {patient.nombre} {patient.apellido} - {patient.fecha_nacimiento}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="tests-grid">
                    {tests.map(test => (
                        <div key={test.id} className="test-card">
                            <div className="test-header">
                                <h3>{test.nombre}</h3>
                                <span className="test-code">{test.codigo}</span>
                            </div>
                            <p className="test-description">{test.descripcion}</p>
                            <div className="test-info">
                                <div className="test-info-item">
                                    <span className="label">Edad:</span>
                                    <span className="value">{getAgeRange(test.edad_min_meses, test.edad_max_meses)}</span>
                                </div>
                                <div className="test-info-item">
                                    <span className="label">Método:</span>
                                    <span className="value">
                                        {test.metodo_aplicacion === 'autoadmin' ? 'Autoadministrado' :
                                         test.metodo_aplicacion === 'observacion' ? 'Observación directa' :
                                         'Entrevista'}
                                    </span>
                                </div>
                            </div>
                            <div className="test-actions">
                                {selectedPatient ? (
                                    <Link 
                                        to={`/tests/${test.id}/apply?patient=${selectedPatient}`}
                                        className="btn-primary"
                                    >
                                        Aplicar Test
                                    </Link>
                                ) : (
                                    <button disabled className="btn-primary disabled">
                                        Seleccione un paciente
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="tests-legend">
                    <h4>Información de los Tests</h4>
                    <ul>
                        <li><strong>M-CHAT-R/F:</strong> Cuestionario de tamizaje para niños de 16-30 meses. Se aplica a padres/cuidadores.</li>
                        <li><strong>ADEC:</strong> Instrumento de observación directa para niños de 12-48 meses.</li>
                        <li><strong>ITEA:</strong> Instrumento desarrollado y validado en Ecuador para niños de 4-17 años.</li>
                        <li><strong>Denver II:</strong> Escala de neurodesarrollo para niños de 0-6 años.</li>
                    </ul>
                </div>

                <Link to="/dashboard" className="back-link">← Volver al Dashboard</Link>
            </main>
        </div>
    );
};

export default TestList;