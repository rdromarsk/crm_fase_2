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

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    assigned_to: '',
    client_id: '',
    case_id: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchClients();
    fetchLawyers();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
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
      await axios.post('http://localhost:3000/api/tasks', formData);
      fetchTasks();
      handleClose();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      assigned_to: '',
      client_id: '',
      case_id: '',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluída';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tarefas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Nova Tarefa
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Prazo</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.client_name}</TableCell>
                <TableCell>{task.assigned_to_name}</TableCell>
                <TableCell>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getPriorityLabel(task.priority)}
                    color={getPriorityColor(task.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(task.status)}
                    color={getStatusColor(task.status)}
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
        <DialogTitle>Nova Tarefa</DialogTitle>
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
              rows={3}
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
              label="Responsável"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              fullWidth
            >
              {lawyers.map((lawyer) => (
                <MenuItem key={lawyer.id} value={lawyer.id}>
                  {lawyer.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Prazo"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              select
              label="Prioridade"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              fullWidth
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="urgent">Urgente</MenuItem>
            </TextField>
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

export default Tasks;


