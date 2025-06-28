const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar os serviços jurídicos e o router
const JuridicoService = require('./src/juridico/juridicoService');
const ProcessadorNLP = require('./src/juridico/processadorNLP');
const ClientService = require('./src/juridico/clientService');
const ProcessoService = require('./src/juridico/processoService');
const ActivityService = require('./src/juridico/activityService');
const DocumentService = require('./src/juridico/documentService');

// Importar routers
const juridicoRoutes = require('./routes/juridico');
const clientesRoutes = require('./routes/clientes');
const processosRoutes = require('./routes/processos');
const atividadesRoutes = require('./routes/atividades');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do banco de dados PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crm_advocacia',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Instanciar os serviços
const juridicoService = new JuridicoService();
const processadorNLP = new ProcessadorNLP();
const clientService = new ClientService();
const processoService = new ProcessoService();
const activityService = new ActivityService();
const documentService = new DocumentService();

// Função assíncrona para inicializar a aplicação
async function initializeApp() {
    try {
        console.log("Iniciando serviços jurídicos...");
        // Chame o método init() do JuridicoService para inicializar as automações
        await juridicoService.init();
        console.log("Serviços jurídicos inicializados com sucesso.");

        // Passe as instâncias inicializadas para os routers
        // Isso permite que as rotas acessem os serviços já configurados
        juridicoRoutes.setServices(juridicoService, processadorNLP);
        juridicoRoutes.setNewServices(documentService, activityService);
        clientesRoutes.setServices(clientService);
        processosRoutes.setServices(processoService, clientService);
        atividadesRoutes.setServices(activityService);

        // Rotas de autenticação
        app.post('/api/auth/login', async (req, res) => {
          try {
            const { email, password } = req.body;

            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user || !await bcrypt.compare(password, user.password_hash)) {
              return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const token = jwt.sign(
              { id: user.id, email: user.email, role: user.role },
              process.env.JWT_SECRET || 'secret_key',
              { expiresIn: '24h' }
            );

            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
          } catch (error) {
            res.status(500).json({ error: 'Erro interno do servidor' });
          }
        });

        app.post('/api/auth/register', async (req, res) => {
          try {
            const { name, email, password, role = 'lawyer' } = req.body;

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
              'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
              [name, email, hashedPassword, role]
            );

            const user = result.rows[0];
            const token = jwt.sign(
              { id: user.id, email: user.email, role: user.role },
              process.env.JWT_SECRET || 'secret_key',
              { expiresIn: '24h' }
            );

            res.status(201).json({ token, user });
          } catch (error) {
            if (error.code === '23505') {
              res.status(400).json({ error: 'Email já cadastrado' });
            } else {
              res.status(500).json({ error: 'Erro interno do servidor' });
            }
          }
        });

        // Rotas de clientes
        app.get('/api/clients', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar clientes' });
          }
        });

        app.post('/api/clients', authenticateToken, async (req, res) => {
          try {
            const { name, email, phone, cpf_cnpj, address, city, state, zip_code, notes } = req.body;

            const result = await pool.query(
              'INSERT INTO clients (name, email, phone, cpf_cnpj, address, city, state, zip_code, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
              [name, email, phone, cpf_cnpj, address, city, state, zip_code, notes]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar cliente' });
          }
        });

        app.get('/api/clients/:id', authenticateToken, async (req, res) => {
          try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

            if (result.rows.length === 0) {
              return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            res.json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar cliente' });
          }
        });

        app.put('/api/clients/:id', authenticateToken, async (req, res) => {
          try {
            const { id } = req.params;
            const { name, email, phone, cpf_cnpj, address, city, state, zip_code, notes, status } = req.body;

            const result = await pool.query(
              'UPDATE clients SET name = $1, email = $2, phone = $3, cpf_cnpj = $4, address = $5, city = $6, state = $7, zip_code = $8, notes = $9, status = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
              [name, email, phone, cpf_cnpj, address, city, state, zip_code, notes, status, id]
            );

            if (result.rows.length === 0) {
              return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            res.json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao atualizar cliente' });
          }
        });

        app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
          try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
              return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            res.json({ message: 'Cliente removido com sucesso' });
          } catch (error) {
            res.status(500).json({ error: 'Erro ao remover cliente' });
          }
        });

        // Rotas de casos
        app.get('/api/cases', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query(`
              SELECT c.*, cl.name as client_name, u.name as lawyer_name
              FROM cases c
              LEFT JOIN clients cl ON c.client_id = cl.id
              LEFT JOIN users u ON c.lawyer_id = u.id
              ORDER BY c.created_at DESC
            `);
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar casos' });
          }
        });

        app.post('/api/cases', authenticateToken, async (req, res) => {
          try {
            const { client_id, lawyer_id, case_number, title, description, case_type, court, start_date } = req.body;

            const result = await pool.query(
              'INSERT INTO cases (client_id, lawyer_id, case_number, title, description, case_type, court, start_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              [client_id, lawyer_id, case_number, title, description, case_type, court, start_date]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar caso' });
          }
        });

        // Rotas de agendamentos
        app.get('/api/appointments', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query(`
              SELECT a.*, c.name as client_name, u.name as lawyer_name
              FROM appointments a
              LEFT JOIN clients c ON a.client_id = c.id
              LEFT JOIN users u ON a.lawyer_id = u.id
              ORDER BY a.start_datetime ASC
            `);
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar agendamentos' });
          }
        });

        app.post('/api/appointments', authenticateToken, async (req, res) => {
          try {
            const { title, description, start_datetime, end_datetime, location, client_id, lawyer_id, case_id } = req.body;

            const result = await pool.query(
              'INSERT INTO appointments (title, description, start_datetime, end_datetime, location, client_id, lawyer_id, case_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              [title, description, start_datetime, end_datetime, location, client_id, lawyer_id, case_id]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar agendamento' });
          }
        });

        // Rotas de tarefas
        app.get('/api/tasks', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query(`
              SELECT t.*, c.name as client_name, u1.name as assigned_to_name, u2.name as created_by_name
              FROM tasks t
              LEFT JOIN clients c ON t.client_id = c.id
              LEFT JOIN users u1 ON t.assigned_to = u1.id
              LEFT JOIN users u2 ON t.created_by = u2.id
              ORDER BY t.due_date ASC
            `);
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar tarefas' });
          }
        });

        app.post('/api/tasks', authenticateToken, async (req, res) => {
          try {
            const { title, description, due_date, priority, assigned_to, client_id, case_id } = req.body;

            const result = await pool.query(
              'INSERT INTO tasks (title, description, due_date, priority, assigned_to, client_id, case_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              [title, description, due_date, priority, assigned_to, client_id, case_id, req.user.id]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar tarefa' });
          }
        });

        // Rotas financeiras
        app.get('/api/financial', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query(`
              SELECT f.*, c.name as client_name
              FROM financial_transactions f
              LEFT JOIN clients c ON f.client_id = c.id
              ORDER BY f.transaction_date DESC
            `);
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar transações financeiras' });
          }
        });

        app.post('/api/financial', authenticateToken, async (req, res) => {
          try {
            const { client_id, case_id, type, category, amount, description, transaction_date, payment_method } = req.body;

            const result = await pool.query(
              'INSERT INTO financial_transactions (client_id, case_id, type, category, amount, description, transaction_date, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              [client_id, case_id, type, category, amount, description, transaction_date, payment_method]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar transação financeira' });
          }
        });

        // Rotas de leads
        app.get('/api/leads', authenticateToken, async (req, res) => {
          try {
            const result = await pool.query(`
              SELECT l.*, u.name as assigned_to_name
              FROM leads l
              LEFT JOIN users u ON l.assigned_to = u.id
              ORDER BY l.created_at DESC
            `);
            res.json(result.rows);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar leads' });
          }
        });

        app.post('/api/leads', authenticateToken, async (req, res) => {
          try {
            const { name, email, phone, company, source, notes, assigned_to } = req.body;

            const result = await pool.query(
              'INSERT INTO leads (name, email, phone, company, source, notes, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
              [name, email, phone, company, source, notes, assigned_to]
            );

            res.status(201).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: 'Erro ao criar lead' });
          }
        });

        // Rota de dashboard/estatísticas
        app.get('/api/dashboard', authenticateToken, async (req, res) => {
          try {
            const clientsCount = await pool.query('SELECT COUNT(*) FROM clients WHERE status = $1', ['active']);
            const casesCount = await pool.query('SELECT COUNT(*) FROM cases WHERE status = $1', ['open']);
            const tasksCount = await pool.query('SELECT COUNT(*) FROM tasks WHERE status = $1', ['pending']);
            const leadsCount = await pool.query('SELECT COUNT(*) FROM leads WHERE status IN ($1, $2)', ['new', 'contacted']);

            const recentTransactions = await pool.query(`
              SELECT f.*, c.name as client_name
              FROM financial_transactions f
              LEFT JOIN clients c ON f.client_id = c.id
              ORDER BY f.created_at DESC
              LIMIT 5
            `);

            res.json({
              stats: {
                clients: parseInt(clientsCount.rows[0].count),
                cases: parseInt(casesCount.rows[0].count),
                tasks: parseInt(tasksCount.rows[0].count),
                leads: parseInt(leadsCount.rows[0].count)
              },
              recentTransactions: recentTransactions.rows
            });
          } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
          }
        });

        // Rotas do módulo jurídico (agora usando o router configurado)
        app.use('/api/juridico', juridicoRoutes);
        
        // Novas rotas da Fase 1
        app.use('/api/clientes', clientesRoutes);
        app.use('/api/processos', processosRoutes);
        app.use('/api/atividades', atividadesRoutes);

        // Rota principal (mantida)
        app.get('/', (req, res) => {
            res.json({ message: 'API do CRM para Advocacia está funcionando!' });
        });

        // Iniciar servidor APENAS DEPOIS que os serviços estiverem inicializados
        app.listen(port, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${port}`);
        });

    } catch (error) {
        console.error("Erro fatal ao inicializar a aplicação:", error);
        process.exit(1); // Encerra a aplicação se a inicialização falhar
    }
}

// Chame a função de inicialização para iniciar tudo
initializeApp();

module.exports = app;

