import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  People as PeopleIcon,
  Gavel as GavelIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000'; 

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    cases: 0,
    tasks: 0,
    leads: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard');
      setStats(response.data.stats);
      setRecentTransactions(response.data.recentTransactions);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center">
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1,
              mr: 2,
              color: 'white',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Clientes Ativos"
            value={stats.clients}
            icon={<PeopleIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Casos Abertos"
            value={stats.cases}
            icon={<GavelIcon />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tarefas Pendentes"
            value={stats.tasks}
            icon={<AssignmentIcon />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Leads Ativos"
            value={stats.leads}
            icon={<TrendingUpIcon />}
            color="#7b1fa2"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Transações Recentes
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.client_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Typography
                      color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                    >
                      {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell align="right">
                    R$ {parseFloat(transaction.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;


