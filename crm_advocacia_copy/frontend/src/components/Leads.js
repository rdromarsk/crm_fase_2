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

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchLawyers();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/leads');
      setLeads(response.data);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
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
      await axios.post('http://localhost:3000/api/leads', formData);
      fetchLeads();
      handleClose();
    } catch (error) {
      console.error('Erro ao criar lead:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: '',
      notes: '',
      assigned_to: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'info';
      case 'contacted':
        return 'warning';
      case 'qualified':
        return 'primary';
      case 'converted':
        return 'success';
      case 'lost':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new':
        return 'Novo';
      case 'contacted':
        return 'Contatado';
      case 'qualified':
        return 'Qualificado';
      case 'converted':
        return 'Convertido';
      case 'lost':
        return 'Perdido';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Leads</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Novo Lead
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Origem</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.name}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.assigned_to_name}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(lead.status)}
                    color={getStatusColor(lead.status)}
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
        <DialogTitle>Novo Lead</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Empresa"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Origem"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              fullWidth
            >
              <MenuItem value="website">Website</MenuItem>
              <MenuItem value="referral">Indicação</MenuItem>
              <MenuItem value="advertising">Publicidade</MenuItem>
              <MenuItem value="social_media">Redes Sociais</MenuItem>
              <MenuItem value="cold_call">Ligação Fria</MenuItem>
              <MenuItem value="event">Evento</MenuItem>
              <MenuItem value="other">Outros</MenuItem>
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
              label="Observações"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
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

export default Leads;


