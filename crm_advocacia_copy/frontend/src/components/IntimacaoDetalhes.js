import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Link as LinkIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import axios from 'axios';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
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

const IntimacaoDetalhes = ({ open, onClose, intimacao, onUpdate }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para notas do advogado
  const [notasAdvogado, setNotasAdvogado] = useState('');
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  
  // Estados para clientes
  const [clientes, setClientes] = useState([]);
  const [clientesDisponiveis, setClientesDisponiveis] = useState([]);
  const [novoCliente, setNovoCliente] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    notas: ''
  });
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  
  // Estados para atividades
  const [atividades, setAtividades] = useState([]);
  const [novaAtividade, setNovaAtividade] = useState({
    description: '',
    data_atividade: '',
    local: '',
    observacoes: ''
  });
  const [mostrarFormAtividade, setMostrarFormAtividade] = useState(false);
  
  // Menu de download
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const [downloadType, setDownloadType] = useState('');

  useEffect(() => {
    if (open && intimacao) {
      setNotasAdvogado(intimacao.notas_advogado || '');
      carregarClientes();
      carregarClientesDisponiveis();
      carregarAtividades();
    }
  }, [open, intimacao]);

  const carregarClientes = async () => {
    if (!intimacao?.processo_id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/processos/${intimacao.processo_id}/clientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const carregarClientesDisponiveis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/clientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientesDisponiveis(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes disponíveis:', error);
    }
  };

  const carregarAtividades = async () => {
    if (!intimacao?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/atividades/intimacao/${intimacao.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAtividades(response.data);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const salvarNotas = async () => {
    setSalvandoNotas(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/juridico/intimacoes/${intimacao.id}/notas`, {
        notas_advogado: notasAdvogado
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Notas salvas com sucesso!');
      if (onUpdate) onUpdate();
    } catch (error) {
      setError('Erro ao salvar notas: ' + (error.response?.data?.erro || error.message));
    } finally {
      setSalvandoNotas(false);
    }
  };

  const criarCliente = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/clientes', novoCliente, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Vincular ao processo
      if (intimacao?.processo_id) {
        await axios.post('/api/clientes/vincular-processo', {
          processo_id: intimacao.processo_id,
          client_id: response.data.id,
          tipo_participacao: 'requerente'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setNovoCliente({
        nome_completo: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        notas: ''
      });
      setMostrarFormCliente(false);
      carregarClientes();
      setSuccess('Cliente criado e vinculado com sucesso!');
    } catch (error) {
      setError('Erro ao criar cliente: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const vincularClienteExistente = async () => {
    if (!clienteSelecionado || !intimacao?.processo_id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/clientes/vincular-processo', {
        processo_id: intimacao.processo_id,
        client_id: clienteSelecionado.id,
        tipo_participacao: 'requerente'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClienteSelecionado(null);
      carregarClientes();
      setSuccess('Cliente vinculado com sucesso!');
    } catch (error) {
      setError('Erro ao vincular cliente: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const registrarAtividadeExterna = async () => {
    if (!novaAtividade.description || !intimacao?.processo_id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/atividades/externa', {
        processo_id: intimacao.processo_id,
        description: novaAtividade.description,
        data_atividade: novaAtividade.data_atividade,
        local: novaAtividade.local,
        observacoes: novaAtividade.observacoes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNovaAtividade({
        description: '',
        data_atividade: '',
        local: '',
        observacoes: ''
      });
      setMostrarFormAtividade(false);
      carregarAtividades();
      setSuccess('Atividade registrada com sucesso!');
    } catch (error) {
      setError('Erro ao registrar atividade: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (tipo) => {
    setDownloadMenuAnchor(null);
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = tipo === 'parecer' ? 
        `/api/juridico/intimacoes/${intimacao.id}/download/parecer-word` :
        `/api/juridico/intimacoes/${intimacao.id}/download/minuta-word`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tipo}_${intimacao.numero_processo?.replace(/[^0-9]/g, '') || intimacao.id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError(`Erro ao baixar ${tipo}: ` + (error.response?.data?.erro || error.message));
    }
  };

  const formatarData = (data) => {
    if (!data) return 'Data não disponível';
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (!intimacao) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Detalhes da Intimação - Processo {intimacao.numero_processo}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Informações Gerais" />
          <Tab label="Cliente" icon={<PersonIcon />} />
          <Tab label="Histórico" icon={<HistoryIcon />} />
        </Tabs>

        {/* Aba Informações Gerais */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Dados do Processo</Typography>
                  <Typography><strong>Número:</strong> {intimacao.numero_processo}</Typography>
                  <Typography><strong>Tribunal:</strong> {intimacao.tribunal}</Typography>
                  <Typography><strong>Data de Disponibilização:</strong> {formatarData(intimacao.data_disponibilizacao)}</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={intimacao.status} 
                      color={intimacao.status === 'pendente' ? 'warning' : 'success'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Ações</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {intimacao.parecer && (
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => {
                          setDownloadType('parecer');
                          setDownloadMenuAnchor(e.currentTarget);
                        }}
                      >
                        Parecer
                      </Button>
                    )}
                    {intimacao.minuta_resposta && (
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => {
                          setDownloadType('minuta');
                          setDownloadMenuAnchor(e.currentTarget);
                        }}
                      >
                        Minuta
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Teor da Intimação</Typography>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {intimacao.teor || 'Teor não disponível'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Notas do Advogado</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={notasAdvogado}
                    onChange={(e) => setNotasAdvogado(e.target.value)}
                    placeholder="Adicione suas observações sobre esta intimação..."
                  />
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={salvarNotas}
                      disabled={salvandoNotas}
                    >
                      {salvandoNotas ? <CircularProgress size={20} /> : 'Salvar Notas'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Aba Cliente */}
        <TabPanel value={tabValue} index={1}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>Clientes Vinculados</Typography>
            {clientes.length > 0 ? (
              <List>
                {clientes.map((cliente) => (
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
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box mb={3}>
            <Typography variant="h6" gutterBottom>Vincular Cliente Existente</Typography>
            <Box display="flex" gap={2} alignItems="center">
              <Autocomplete
                options={clientesDisponiveis}
                getOptionLabel={(option) => option.nome_completo || option.name || ''}
                value={clienteSelecionado}
                onChange={(event, newValue) => setClienteSelecionado(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Selecionar Cliente" fullWidth />
                )}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={vincularClienteExistente}
                disabled={!clienteSelecionado || loading}
              >
                Vincular
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="h6" gutterBottom>Cadastrar Novo Cliente</Typography>
            {!mostrarFormCliente ? (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setMostrarFormCliente(true)}
              >
                Novo Cliente
              </Button>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    value={novoCliente.nome_completo}
                    onChange={(e) => setNovoCliente({...novoCliente, nome_completo: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CPF/CNPJ"
                    value={novoCliente.cpf_cnpj}
                    onChange={(e) => setNovoCliente({...novoCliente, cpf_cnpj: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Endereço"
                    value={novoCliente.endereco}
                    onChange={(e) => setNovoCliente({...novoCliente, endereco: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Cidade"
                    value={novoCliente.cidade}
                    onChange={(e) => setNovoCliente({...novoCliente, cidade: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Estado"
                    value={novoCliente.estado}
                    onChange={(e) => setNovoCliente({...novoCliente, estado: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="CEP"
                    value={novoCliente.cep}
                    onChange={(e) => setNovoCliente({...novoCliente, cep: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={novoCliente.notas}
                    onChange={(e) => setNovoCliente({...novoCliente, notas: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      onClick={criarCliente}
                      disabled={!novoCliente.nome_completo || loading}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Criar e Vincular'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setMostrarFormCliente(false)}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Aba Histórico */}
        <TabPanel value={tabValue} index={2}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>Histórico de Atividades</Typography>
            {atividades.length > 0 ? (
              <List>
                {atividades.map((atividade) => (
                  <ListItem key={atividade.id}>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={atividade.description}
                      secondary={`${atividade.user_name || 'Sistema'} - ${new Date(atividade.timestamp).toLocaleString('pt-BR')}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">Nenhuma atividade registrada</Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="h6" gutterBottom>Registrar Atividade Externa</Typography>
            {!mostrarFormAtividade ? (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setMostrarFormAtividade(true)}
              >
                Nova Atividade
              </Button>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descrição da Atividade"
                    value={novaAtividade.description}
                    onChange={(e) => setNovaAtividade({...novaAtividade, description: e.target.value})}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Data da Atividade"
                    type="datetime-local"
                    value={novaAtividade.data_atividade}
                    onChange={(e) => setNovaAtividade({...novaAtividade, data_atividade: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Local"
                    value={novaAtividade.local}
                    onChange={(e) => setNovaAtividade({...novaAtividade, local: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={novaAtividade.observacoes}
                    onChange={(e) => setNovaAtividade({...novaAtividade, observacoes: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      onClick={registrarAtividadeExterna}
                      disabled={!novaAtividade.description || loading}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Registrar'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setMostrarFormAtividade(false)}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      {/* Menu de Download */}
      <Menu
        anchorEl={downloadMenuAnchor}
        open={Boolean(downloadMenuAnchor)}
        onClose={() => setDownloadMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleDownload(downloadType)}>
          <DescriptionIcon sx={{ mr: 1 }} />
          Download Word
        </MenuItem>
      </Menu>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntimacaoDetalhes;