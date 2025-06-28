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

const Financial = () => {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    case_id: '',
    type: 'income',
    category: '',
    amount: '',
    description: '',
    transaction_date: '',
    payment_method: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchClients();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/financial');
      setTransactions(response.data);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
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

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3000/api/financial', formData);
      fetchTransactions();
      handleClose();
    } catch (error) {
      console.error('Erro ao criar transação:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      client_id: '',
      case_id: '',
      type: 'income',
      category: '',
      amount: '',
      description: '',
      transaction_date: '',
      payment_method: '',
    });
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 'success' : 'error';
  };

  const getTypeLabel = (type) => {
    return type === 'income' ? 'Receita' : 'Despesa';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Financeiro</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Nova Transação
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.client_name || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={getTypeLabel(transaction.type)}
                    color={getTypeColor(transaction.type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell align="right">
                  R$ {parseFloat(transaction.amount).toFixed(2)}
                </TableCell>
                <TableCell>
                  {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{transaction.payment_method}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(transaction.status)}
                    color={getStatusColor(transaction.status)}
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
        <DialogTitle>Nova Transação</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Tipo"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="income">Receita</MenuItem>
              <MenuItem value="expense">Despesa</MenuItem>
            </TextField>
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
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="honorarios">Honorários</MenuItem>
              <MenuItem value="custas">Custas Processuais</MenuItem>
              <MenuItem value="despesas">Despesas Gerais</MenuItem>
              <MenuItem value="consultoria">Consultoria</MenuItem>
              <MenuItem value="outros">Outros</MenuItem>
            </TextField>
            <TextField
              label="Valor"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              InputProps={{
                startAdornment: 'R$',
              }}
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
              label="Data da Transação"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              select
              label="Método de Pagamento"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              fullWidth
            >
              <MenuItem value="cash">Dinheiro</MenuItem>
              <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
              <MenuItem value="debit_card">Cartão de Débito</MenuItem>
              <MenuItem value="bank_transfer">Transferência Bancária</MenuItem>
              <MenuItem value="pix">PIX</MenuItem>
              <MenuItem value="check">Cheque</MenuItem>
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

export default Financial;


