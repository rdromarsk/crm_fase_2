import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Gavel as GavelIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from 'axios';
import IntimacaoDetalhes from './IntimacaoDetalhes';

axios.defaults.baseURL = 'http://localhost:3000'; 

const Juridico = () => {
  const [intimacoes, setIntimacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    numeroProcesso: '',
    status: '',
    tribunal: '',
    dataInicio: '',
    dataFim: ''
  });

  // Estados para modal de detalhes
  const [dialogAberto, setDialogAberto] = useState(false);
  const [intimacaoSelecionada, setIntimacaoSelecionada] = useState(null);

  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    pendentes: 0,
    processadas: 0,
    ultimaAtualizacao: null
  });

  useEffect(() => {
    carregarIntimacoes();
    carregarEstatisticas();
  }, []);

  const carregarIntimacoes = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params.append(key, filtros[key]);
        }
      });

      const response = await axios.get(`/api/juridico/intimacoes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIntimacoes(response.data);
    } catch (error) {
      setError('Erro ao carregar intimações: ' + (error.response?.data?.erro || error.message));
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const carregarEstatisticas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/juridico/estatisticas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEstatisticas(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const abrirDetalhes = (intimacao) => {
    setIntimacaoSelecionada(intimacao);
    setDialogAberto(true);
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      numeroProcesso: '',
      status: '',
      tribunal: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  const formatarData = (data) => {
    if (!data) return '-';
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'warning';
      case 'processada': return 'success';
      case 'erro': return 'error';
      default: return 'default';
    }
  };

  const sincronizarIntimacoes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/juridico/sincronizar', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await carregarIntimacoes();
      await carregarEstatisticas();
    } catch (error) {
      setError('Erro ao sincronizar: ' + (error.response?.data?.erro || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <GavelIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Módulo Jurídico
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Intimações
              </Typography>
              <Typography variant="h4">
                {estatisticas.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                {estatisticas.pendentes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Processadas
              </Typography>
              <Typography variant="h4" color="success.main">
                {estatisticas.processadas}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Última Atualização
              </Typography>
              <Typography variant="body2">
                {estatisticas.ultimaAtualizacao ? 
                  new Date(estatisticas.ultimaAtualizacao).toLocaleString('pt-BR') : 
                  'Nunca'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Número do Processo"
                value={filtros.numeroProcesso}
                onChange={(e) => handleFiltroChange('numeroProcesso', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filtros.status}
                  onChange={(e) => handleFiltroChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="processada">Processada</MenuItem>
                  <MenuItem value="erro">Erro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tribunal</InputLabel>
                <Select
                  value={filtros.tribunal}
                  onChange={(e) => handleFiltroChange('tribunal', e.target.value)}
                  label="Tribunal"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="TJCE">TJCE</MenuItem>
                  <MenuItem value="TJSP">TJSP</MenuItem>
                  <MenuItem value="STJ">STJ</MenuItem>
                  <MenuItem value="STF">STF</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Box display="flex" gap={1}>
                <Tooltip title="Buscar">
                  <IconButton onClick={carregarIntimacoes} color="primary">
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Limpar filtros">
                  <Button onClick={limparFiltros} size="small">
                    Limpar
                  </Button>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Intimações */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Intimações</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={sincronizarIntimacoes}
              disabled={loading}
            >
              Sincronizar
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Processo</TableCell>
                    <TableCell>Tribunal</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Resumo</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {intimacoes.map((intimacao) => (
                    <TableRow key={intimacao.id}>
                      <TableCell>{intimacao.numero_processo}</TableCell>
                      <TableCell>{intimacao.tribunal}</TableCell>
                      <TableCell>{formatarData(intimacao.data_disponibilizacao)}</TableCell>
                      <TableCell>
                        <Chip
                          label={intimacao.status}
                          color={getStatusColor(intimacao.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {intimacao.resumo || 'Sem resumo'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            onClick={() => abrirDetalhes(intimacao)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {intimacoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhuma intimação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Intimação */}
      <IntimacaoDetalhes
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        intimacao={intimacaoSelecionada}
        onUpdate={carregarIntimacoes}
      />
    </Box>
  );
};

export default Juridico;