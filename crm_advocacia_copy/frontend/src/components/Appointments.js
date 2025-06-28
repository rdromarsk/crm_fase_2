import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000'; 

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    client_id: '',
    lawyer_id: '',
    case_id: '',
  });

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchLawyers();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/appointments');
      setAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchLawyers = async () => {
    try {
      setLawyers([
        { id: 1, name: 'Dr. João Silva' },
        { id: 2, name: 'Dra. Maria Santos' },
      ]);
    } catch (error) {
      console.error('Erro ao buscar advogados:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3000/api/appointments', formData);
      fetchAppointments();
      handleClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      title: '',
      description: '',
      start_datetime: '',
      end_datetime: '',
      location: '',
      client_id: '',
      lawyer_id: '',
      case_id: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Agendamentos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Novo Agendamento
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Advogado</TableCell>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>{appointment.title}</TableCell>
                <TableCell>{appointment.client_name}</TableCell>
                <TableCell>{appointment.lawyer_name}</TableCell>
                <TableCell>
                  {new Date(appointment.start_datetime).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>{appointment.location}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(appointment.status)}
                    color={getStatusColor(appointment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Novo Agendamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Cliente"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              fullWidth
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Advogado"
              value={formData.lawyer_id}
              onChange={(e) => setFormData({ ...formData, lawyer_id: e.target.value })}
              fullWidth
            >
              {lawyers.map((lawyer) => (
                <MenuItem key={lawyer.id} value={lawyer.id}>
                  {lawyer.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data/Hora de Início"
              type="datetime-local"
              value={formData.start_datetime}
              onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Data/Hora de Fim"
              type="datetime-local"
              value={formData.end_datetime}
              onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Local"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Appointments;


