import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const PatientList = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        pages: 1
    });

    useEffect(() => {
        fetchPatients();
    }, [pagination.page, search]);

    const fetchPatients = async () => {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: 10,
                ...(search && { search })
            });
            
            const response = await axios.get(`${API_URL}/patients?${params}`);
            setPatients(response.data.patients);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este paciente?')) {
            try {
                await axios.delete(`${API_URL}/patients/${id}`);
                fetchPatients();
            } catch (error) {
                alert('Error al eliminar paciente');
            }
        }
    };

    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const calculateAgeMonths = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        const months = (today.getFullYear() - birth.getFullYear()) * 12 + 
                       today.getMonth() - birth.getMonth();
        return months;
    };

    if (loading) {
        return <div className="loading">Cargando pacientes...</div>;
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
                    <h2>Pacientes</h2>
                    <Link to="/patients/new" className="btn-primary">+ Nuevo Paciente</Link>
                </div>

                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o cédula..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {patients.length === 0 ? (
                    <div className="empty-state">
                        <p>No se encontraron pacientes</p>
                        <Link to="/patients/new" className="btn-primary">Agregar Primer Paciente</Link>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Edad</th>
                                        <th>Sexo</th>
                                        <th>Cédula</th>
                                        <th>Teléfono</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map(patient => (
                                        <tr key={patient.id}>
                                            <td>{patient.nombre} {patient.apellido}</td>
                                            <td>
                                                {calculateAgeMonths(patient.fecha_nacimiento)} meses
                                                <br />
                                                <small>({calculateAge(patient.fecha_nacimiento)} años)</small>
                                            </td>
                                            <td>{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</td>
                                            <td>{patient.cedula || '-'}</td>
                                            <td>{patient.telefono_contacto || '-'}</td>
                                            <td className="actions-cell">
                                                <Link 
                                                    to={`/patients/${patient.id}`}
                                                    className="btn-small"
                                                >
                                                    Ver
                                                </Link>
                                                <Link 
                                                    to={`/patients/${patient.id}/edit`}
                                                    className="btn-small"
                                                >
                                                    Editar
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(patient.id)}
                                                    className="btn-small btn-danger"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pagination">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                            >
                                Anterior
                            </button>
                            <span>Página {pagination.page} de {pagination.pages}</span>
                            <button
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                            >
                                Siguiente
                            </button>
                        </div>
                    </>
                )}

                <Link to="/dashboard" className="back-link">← Volver al Dashboard</Link>
            </main>
        </div>
    );
};

export default PatientList;