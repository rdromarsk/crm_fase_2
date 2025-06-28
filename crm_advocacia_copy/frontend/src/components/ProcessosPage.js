import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import IntimacaoDetalhes from './IntimacaoDetalhes';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`processo-tabpanel-${index}`}
      aria-labelledby={`processo-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProcessosPage = () => {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    numero_processo: '',
    status: '',
    tribunal: '',
    tipo_acao: ''
  });

  // Estados para modal de detalhes do processo
  const [processoSelecionado, setProcessoSelecionado] = useState(null);
  const [detalhesProcesso, setDetalhesProcesso] = useState(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Estados para modal de intimação
  const [intimacaoSelecionada, setIntimacaoSelecionada] = useState(null);
  const [modalIntimacaoAberto, setModalIntimacaoAberto] = useState(false);

  useEffect(() => {
    carregarProcessos();
  }, []);

  const carregarProcessos = async () => {
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

      const response = await axios.get(`/api/processos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProcessos(response.data);
    } catch (error) {
      setError('Erro ao carregar processos: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhesProcesso = async (processoId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/processos/${processoId}/detalhes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDetalhesProcesso(response.data);
      setModalDetalhesAberto(true);
    } catch (error) {
      setError('Erro ao carregar detalhes do processo: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      numero_processo: '',
      status: '',
      tribunal: '',
      tipo_acao: ''
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
      case 'ativo': return 'success';
      case 'arquivado': return 'default';
      case 'suspenso': return 'warning';
      default: return 'primary';
    }
  };

  const abrirDetalhesIntimacao = (intimacao) => {
    setIntimacaoSelecionada(intimacao);
    setModalIntimacaoAberto(true);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <GavelIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Processos
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Número do Processo"
                value={filtros.numero_processo}
                onChange={(e) => handleFiltroChange('numero_processo', e.target.value)}
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
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="arquivado">Arquivado</MenuItem>
                  <MenuItem value="suspenso">Suspenso</MenuItem>
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
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Tipo de Ação"
                value={filtros.tipo_acao}
                onChange={(e) => handleFiltroChange('tipo_acao', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={carregarProcessos}
                  size="small"
                >
                  Buscar
                </Button>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  size="small"
                >
                  Limpar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Processos */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Lista de Processos</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {/* TODO: Implementar criação de processo */}}
            >
              Novo Processo
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
                    <TableCell>Número do Processo</TableCell>
                    <TableCell>Tribunal</TableCell>
                    <TableCell>Tipo de Ação</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Intimações</TableCell>
                    <TableCell>Última Intimação</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processos.map((processo) => (
                    <TableRow key={processo.id}>
                      <TableCell>{processo.numero_processo}</TableCell>
                      <TableCell>{processo.tribunal}</TableCell>
                      <TableCell>{processo.tipo_acao || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={processo.status}
                          color={getStatusColor(processo.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{processo.total_intimacoes || 0}</TableCell>
                      <TableCell>{formatarData(processo.ultima_intimacao)}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => carregarDetalhesProcesso(processo.id)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {processos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Nenhum processo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Processo */}
      <Dialog
        open={modalDetalhesAberto}
        onClose={() => setModalDetalhesAberto(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Detalhes do Processo - {detalhesProcesso?.numero_processo}
            </Typography>
            <IconButton onClick={() => setModalDetalhesAberto(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {detalhesProcesso && (
            <>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Informações Gerais" />
                <Tab label="Intimações" icon={<AssignmentIcon />} />
                <Tab label="Clientes" icon={<PersonIcon />} />
                <Tab label="Histórico" icon={<HistoryIcon />} />
              </Tabs>

              {/* Aba Informações Gerais */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Dados do Processo</Typography>
                        <Typography><strong>Número:</strong> {detalhesProcesso.numero_processo}</Typography>
                        <Typography><strong>Tribunal:</strong> {detalhesProcesso.tribunal}</Typography>
                        <Typography><strong>Tipo de Ação:</strong> {detalhesProcesso.tipo_acao || 'Não informado'}</Typography>
                        <Typography><strong>Status:</strong> 
                          <Chip 
                            label={detalhesProcesso.status} 
                            color={getStatusColor(detalhesProcesso.status)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography><strong>Valor da Causa:</strong> {
                          detalhesProcesso.valor_causa ? 
                          `R$ ${parseFloat(detalhesProcesso.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                          'Não informado'
                        }</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Estatísticas</Typography>
                        <Typography><strong>Total de Intimações:</strong> {detalhesProcesso.intimacoes?.length || 0}</Typography>
                        <Typography><strong>Intimações Pendentes:</strong> {
                          detalhesProcesso.intimacoes?.filter(i => i.status === 'pendente').length || 0
                        }</Typography>
                        <Typography><strong>Clientes Vinculados:</strong> {detalhesProcesso.clientes?.length || 0}</Typography>
                        <Typography><strong>Colaboradores:</strong> {detalhesProcesso.colaboradores?.length || 0}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {detalhesProcesso.observacoes && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Observações</Typography>
                          <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                            {detalhesProcesso.observacoes}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* Aba Intimações */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>Intimações do Processo</Typography>
                {detalhesProcesso.intimacoes?.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Resumo</TableCell>
                          <TableCell>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalhesProcesso.intimacoes.map((intimacao) => (
                          <TableRow key={intimacao.id}>
                            <TableCell>{formatarData(intimacao.data_disponibilizacao)}</TableCell>
                            <TableCell>
                              <Chip
                                label={intimacao.status}
                                color={intimacao.status === 'pendente' ? 'warning' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{intimacao.resumo || 'Sem resumo'}</TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => abrirDetalhesIntimacao(intimacao)}
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="textSecondary">Nenhuma intimação encontrada</Typography>
                )}
              </TabPanel>

              {/* Aba Clientes */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>Clientes Vinculados</Typography>
                {detalhesProcesso.clientes?.length > 0 ? (
                  <List>
                    {detalhesProcesso.clientes.map((cliente) => (
                      <ListItem key={cliente.id}>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={cliente.nome_completo || cliente.name}
                          secondary={`${cliente.email || 'Email não informado'} - ${cliente.tipo_participacao}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">Nenhum cliente vinculado</Typography>
                )}
              </TabPanel>

              {/* Aba Histórico */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>Histórico de Atividades</Typography>
                <Typography color="textSecondary">
                  Funcionalidade em desenvolvimento - histórico de atividades será exibido aqui
                </Typography>
              </TabPanel>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setModalDetalhesAberto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Detalhes da Intimação */}
      <IntimacaoDetalhes
        open={modalIntimacaoAberto}
        onClose={() => setModalIntimacaoAberto(false)}
        intimacao={intimacaoSelecionada}
        onUpdate={() => {
          // Recarregar detalhes do processo se necessário
          if (detalhesProcesso) {
            carregarDetalhesProcesso(detalhesProcesso.id);
          }
        }}
      />
    </Box>
  );
};

export default ProcessosPage;