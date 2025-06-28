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

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    lawyer_id: '',
    case_number: '',
    title: '',
    description: '',
    case_type: '',
    court: '',
    start_date: '',
    status: 'open',
  });

  useEffect(() => {
    fetchCases();
    fetchClients();
    fetchLawyers();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Erro ao buscar casos:', error);
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
      // Assumindo que existe uma rota para buscar usuários/advogados
      // Por enquanto, vamos usar dados mock
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
      if (editingCase) {
        await axios.put(`http://localhost:3000/api/cases/${editingCase.id}`, formData);
      } else {
        await axios.post('http://localhost:3000/api/cases', formData);
      }
      fetchCases();
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar caso:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCase(null);
    setFormData({
      client_id: '',
      lawyer_id: '',
      case_number: '',
      title: '',
      description: '',
      case_type: '',
      court: '',
      start_date: '',
      status: 'open',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'primary';
      case 'closed':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'closed':
        return 'Fechado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Casos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Novo Caso
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Advogado</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.map((caseItem) => (
              <TableRow key={caseItem.id}>
                <TableCell>{caseItem.case_number}</TableCell>
                <TableCell>{caseItem.title}</TableCell>
                <TableCell>{caseItem.client_name}</TableCell>
                <TableCell>{caseItem.lawyer_name}</TableCell>
                <TableCell>{caseItem.case_type}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(caseItem.status)}
                    color={getStatusColor(caseItem.status)}
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
        <DialogTitle>
          {editingCase ? 'Editar Caso' : 'Novo Caso'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Cliente"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              fullWidth
              required
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
              required
            >
              {lawyers.map((lawyer) => (
                <MenuItem key={lawyer.id} value={lawyer.id}>
                  {lawyer.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Número do Caso"
              value={formData.case_number}
              onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
              fullWidth
            />
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
              label="Tipo de Caso"
              value={formData.case_type}
              onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
              fullWidth
            >
              <MenuItem value="civil">Civil</MenuItem>
              <MenuItem value="criminal">Criminal</MenuItem>
              <MenuItem value="trabalhista">Trabalhista</MenuItem>
              <MenuItem value="tributario">Tributário</MenuItem>
              <MenuItem value="familia">Família</MenuItem>
            </TextField>
            <TextField
              label="Tribunal"
              value={formData.court}
              onChange={(e) => setFormData({ ...formData, court: e.target.value })}
              fullWidth
            />
            <TextField
              label="Data de Início"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCase ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Cases;


